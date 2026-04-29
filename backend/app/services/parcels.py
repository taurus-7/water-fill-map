from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

SRID = 32642

MAP_QUERY = f"""
WITH bounds AS (
    SELECT id, name, iin, cadastral_number, water_limit, water_fact, notes,
        geom,
        CASE WHEN water_limit > 0
             THEN LEAST(ROUND((water_fact/water_limit*100)::NUMERIC,2),100)
             ELSE 0 END AS fill_pct,
        ST_XMin(geom) AS xmin, ST_YMin(geom) AS ymin,
        ST_XMax(geom) AS xmax, ST_YMax(geom) AS ymax
    FROM parcels
    WHERE geom IS NOT NULL
),
filled AS (
    SELECT id, name, iin, cadastral_number, water_limit, water_fact, notes, fill_pct,
        geom AS full_geom,
        CASE
            WHEN fill_pct >= 100 THEN geom
            WHEN fill_pct <= 0   THEN NULL
            ELSE ST_CollectionExtract(
                ST_Intersection(
                    geom,
                    ST_SetSRID(ST_MakeBox2D(
                        ST_Point(xmin-1, ymin-1),
                        ST_Point(xmax+1, ymin+(ymax-ymin)*fill_pct/100.0)
                    ), {SRID})
                ), 3)
        END AS clipped_geom
    FROM bounds
)
SELECT id, name, iin, cadastral_number, water_limit, water_fact, notes, fill_pct,
    ST_AsGeoJSON(ST_Transform(full_geom,    4326))::jsonb AS outline_geom,
    ST_AsGeoJSON(ST_Transform(clipped_geom, 4326))::jsonb AS fill_geom,
    ST_AsGeoJSON(ST_Centroid(ST_Transform(full_geom, 4326)))::jsonb AS centroid_geom
FROM filled ORDER BY id
"""


def fill_color(pct: float) -> list[int]:
    if pct < 60: return [52,  199,  89, 170]
    if pct < 80: return [245, 158,  11, 175]
    if pct < 95: return [249, 115,  22, 185]
    return              [255,  59,  48, 195]


def status_label(pct: float) -> str:
    if pct < 60: return "Норма"
    if pct < 80: return "Внимание"
    if pct < 95: return "Высокое"
    return              "Критично"


async def get_map_geojson(db: AsyncSession) -> dict:
    result = await db.execute(text(MAP_QUERY))
    rows = result.mappings().all()
    outlines, fills = [], []
    for row in rows:
        pct = float(row["fill_pct"])
        centroid = row["centroid_geom"]
        lon = centroid["coordinates"][0] if centroid else None
        lat = centroid["coordinates"][1] if centroid else None
        props = {
            "id": row["id"], "name": row["name"],
            "iin": row["iin"], "cadastral_number": row["cadastral_number"],
            "water_limit": float(row["water_limit"]),
            "water_fact":  float(row["water_fact"]),
            "fill_pct": pct, "status": status_label(pct),
            "notes": row["notes"],
            "fill_color": fill_color(pct),
            "lon": lon, "lat": lat,
        }
        outlines.append({"type": "Feature", "geometry": row["outline_geom"], "properties": props})
        if row["fill_geom"]:
            fills.append({"type": "Feature", "geometry": row["fill_geom"], "properties": props})
    return {
        "outlines": {"type": "FeatureCollection", "features": outlines},
        "fills":    {"type": "FeatureCollection", "features": fills},
    }


async def search_parcel(db: AsyncSession, term: str) -> Optional[dict]:
    result = await db.execute(text("""
        SELECT id, name, iin, cadastral_number, water_limit, water_fact, notes,
            CASE WHEN water_limit>0
                 THEN LEAST(ROUND((water_fact/water_limit*100)::NUMERIC,2),100)
                 ELSE 0 END AS fill_pct,
            ST_AsGeoJSON(ST_Transform(geom,4326))::jsonb AS geom_json,
            ST_AsGeoJSON(ST_Centroid(ST_Transform(geom,4326)))::jsonb AS centroid_json
        FROM parcels
        WHERE geom IS NOT NULL AND (iin = :term OR cadastral_number = :term)
        LIMIT 1
    """), {"term": term})
    row = result.mappings().first()
    if not row:
        return None
    pct = float(row["fill_pct"])
    c = row["centroid_json"]["coordinates"]
    return {
        "id": row["id"], "name": row["name"],
        "iin": row["iin"], "cadastral_number": row["cadastral_number"],
        "water_limit": float(row["water_limit"]),
        "water_fact":  float(row["water_fact"]),
        "fill_pct": pct, "status": status_label(pct),
        "fill_color": fill_color(pct),
        "notes": row["notes"],
        "lon": c[0], "lat": c[1],
        "geometry": row["geom_json"],
    }


async def list_parcels(db: AsyncSession, status: Optional[str], limit: int, offset: int) -> list:
    result = await db.execute(text("""
        SELECT id, name, iin, cadastral_number, water_limit, water_fact, notes, updated_at,
            CASE WHEN water_limit>0
                 THEN LEAST(ROUND((water_fact/water_limit*100)::NUMERIC,2),100)
                 ELSE 0 END AS fill_pct
        FROM parcels ORDER BY id
        LIMIT :limit OFFSET :offset
    """), {"limit": limit, "offset": offset})
    rows = result.mappings().all()
    out = []
    for row in rows:
        pct = float(row["fill_pct"])
        sl = status_label(pct)
        if status and sl != status:
            continue
        out.append({
            "id": row["id"], "name": row["name"],
            "iin": row["iin"], "cadastral_number": row["cadastral_number"],
            "water_limit": float(row["water_limit"]),
            "water_fact":  float(row["water_fact"]),
            "fill_pct": pct, "status": sl,
            "notes": row["notes"],
            "updated_at": row["updated_at"].isoformat(),
        })
    return out


async def get_parcel(db: AsyncSession, parcel_id: int) -> Optional[dict]:
    result = await db.execute(text("""
        SELECT id, name, iin, cadastral_number, water_limit, water_fact, notes, updated_at,
            CASE WHEN water_limit>0
                 THEN LEAST(ROUND((water_fact/water_limit*100)::NUMERIC,2),100)
                 ELSE 0 END AS fill_pct,
            ST_AsGeoJSON(ST_Transform(geom,4326))::jsonb AS geom_json
        FROM parcels WHERE id = :id
    """), {"id": parcel_id})
    row = result.mappings().first()
    if not row:
        return None
    pct = float(row["fill_pct"])
    return {
        "id": row["id"], "name": row["name"],
        "iin": row["iin"], "cadastral_number": row["cadastral_number"],
        "water_limit": float(row["water_limit"]),
        "water_fact":  float(row["water_fact"]),
        "fill_pct": pct, "status": status_label(pct),
        "fill_color": fill_color(pct),
        "notes": row["notes"],
        "updated_at": row["updated_at"].isoformat(),
        "geometry": row["geom_json"],
    }


async def update_fact(db: AsyncSession, parcel_id: int, water_fact: float) -> Optional[dict]:
    result = await db.execute(text("""
        UPDATE parcels SET water_fact = :fact, updated_at = NOW()
        WHERE id = :id
        RETURNING id, name, water_limit, water_fact, updated_at,
            CASE WHEN water_limit>0
                 THEN LEAST(ROUND((water_fact/water_limit*100)::NUMERIC,2),100)
                 ELSE 0 END AS fill_pct
    """), {"fact": water_fact, "id": parcel_id})
    await db.commit()
    row = result.mappings().first()
    if not row:
        return None
    pct = float(row["fill_pct"])
    return {
        "id": row["id"], "name": row["name"],
        "water_limit": float(row["water_limit"]),
        "water_fact":  float(row["water_fact"]),
        "fill_pct": pct, "status": status_label(pct),
        "fill_color": fill_color(pct),
        "updated_at": row["updated_at"].isoformat(),
    }


async def update_limit(db: AsyncSession, parcel_id: int, water_limit: float) -> Optional[dict]:
    result = await db.execute(text("""
        UPDATE parcels SET water_limit = :lim, updated_at = NOW()
        WHERE id = :id
        RETURNING id, name, water_limit, water_fact, updated_at,
            CASE WHEN water_limit>0
                 THEN LEAST(ROUND((water_fact/water_limit*100)::NUMERIC,2),100)
                 ELSE 0 END AS fill_pct
    """), {"lim": water_limit, "id": parcel_id})
    await db.commit()
    row = result.mappings().first()
    if not row:
        return None
    pct = float(row["fill_pct"])
    return {
        "id": row["id"], "name": row["name"],
        "water_limit": float(row["water_limit"]),
        "water_fact":  float(row["water_fact"]),
        "fill_pct": pct, "status": status_label(pct),
        "fill_color": fill_color(pct),
        "updated_at": row["updated_at"].isoformat(),
    }


async def get_stats(db: AsyncSession) -> dict:
    result = await db.execute(text("""
        SELECT
            COUNT(*)                                        AS total,
            COUNT(*) FILTER (WHERE fill_pct <  60)         AS normal,
            COUNT(*) FILTER (WHERE fill_pct >= 60 AND fill_pct < 80)  AS attention,
            COUNT(*) FILTER (WHERE fill_pct >= 80 AND fill_pct < 95)  AS high,
            COUNT(*) FILTER (WHERE fill_pct >= 95)         AS critical,
            SUM(water_limit) AS total_limit,
            SUM(water_fact)  AS total_fact
        FROM parcels_with_pct
    """))
    row = result.mappings().first()
    tl = float(row["total_limit"] or 0)
    tf = float(row["total_fact"] or 0)
    return {
        "total": int(row["total"]), "normal": int(row["normal"]),
        "attention": int(row["attention"]), "high": int(row["high"]),
        "critical": int(row["critical"]),
        "total_limit": tl, "total_fact": tf,
        "overall_pct": round(tf / tl * 100, 2) if tl > 0 else 0,
    }
