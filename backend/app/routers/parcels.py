import json
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from ..database import get_pool

router = APIRouter()
SRID = 32642

def fill_color(pct: float) -> list[int]:
    if pct < 60:  return [52, 199, 89,  170]
    if pct < 80:  return [245,158, 11,  175]
    if pct < 95:  return [249,115, 22,  185]
    return              [255, 59, 48,  195]

def status_label(pct: float) -> str:
    if pct < 60:  return "Норма"
    if pct < 80:  return "Внимание"
    if pct < 95:  return "Высокое"
    return              "Критично"

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

@router.get("/parcels/map")
async def get_map_geojson():
    pool = get_pool()
    rows = await pool.fetch(MAP_QUERY)
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
        outlines.append({"type":"Feature","geometry":row["outline_geom"],"properties":props})
        if row["fill_geom"]:
            fills.append({"type":"Feature","geometry":row["fill_geom"],"properties":props})
    return {
        "outlines": {"type":"FeatureCollection","features":outlines},
        "fills":    {"type":"FeatureCollection","features":fills},
    }

@router.get("/parcels/search")
async def search_parcel(q: str = Query(..., min_length=2)):
    pool = get_pool()
    term = q.strip()
    row = await pool.fetchrow("""
        SELECT id, name, iin, cadastral_number, water_limit, water_fact, notes,
            CASE WHEN water_limit>0
                 THEN LEAST(ROUND((water_fact/water_limit*100)::NUMERIC,2),100)
                 ELSE 0 END AS fill_pct,
            ST_AsGeoJSON(ST_Transform(geom,4326))::jsonb AS geom_json,
            ST_AsGeoJSON(ST_Centroid(ST_Transform(geom,4326)))::jsonb AS centroid_json
        FROM parcels
        WHERE iin = $1 OR cadastral_number = $1
        LIMIT 1
    """, term)
    if not row:
        raise HTTPException(status_code=404, detail="Участок не найден")
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

@router.get("/parcels")
async def list_parcels(
    status: Optional[str] = None,
    limit: int = Query(default=200, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
):
    pool = get_pool()
    rows = await pool.fetch("""
        SELECT id, name, iin, cadastral_number, water_limit, water_fact, notes, updated_at,
            CASE WHEN water_limit>0
                 THEN LEAST(ROUND((water_fact/water_limit*100)::NUMERIC,2),100)
                 ELSE 0 END AS fill_pct
        FROM parcels ORDER BY id
        LIMIT $1 OFFSET $2
    """, limit, offset)
    result = []
    for row in rows:
        pct = float(row["fill_pct"])
        sl  = status_label(pct)
        if status and sl != status:
            continue
        result.append({
            "id": row["id"], "name": row["name"],
            "iin": row["iin"], "cadastral_number": row["cadastral_number"],
            "water_limit": float(row["water_limit"]),
            "water_fact":  float(row["water_fact"]),
            "fill_pct": pct, "status": sl,
            "notes": row["notes"],
            "updated_at": row["updated_at"].isoformat(),
        })
    return result

@router.get("/stats")
async def get_stats():
    pool = get_pool()
    row = await pool.fetchrow("""
        SELECT
            COUNT(*)                                        AS total,
            COUNT(*) FILTER (WHERE fill_pct <  60)         AS normal,
            COUNT(*) FILTER (WHERE fill_pct >= 60 AND fill_pct < 80)  AS attention,
            COUNT(*) FILTER (WHERE fill_pct >= 80 AND fill_pct < 95)  AS high,
            COUNT(*) FILTER (WHERE fill_pct >= 95)         AS critical,
            SUM(water_limit) AS total_limit,
            SUM(water_fact)  AS total_fact
        FROM parcels_with_pct
    """)
    tl = float(row["total_limit"] or 0)
    tf = float(row["total_fact"]  or 0)
    return {
        "total": int(row["total"]), "normal": int(row["normal"]),
        "attention": int(row["attention"]), "high": int(row["high"]),
        "critical": int(row["critical"]),
        "total_limit": tl, "total_fact": tf,
        "overall_pct": round(tf/tl*100,2) if tl>0 else 0,
    }

@router.get("/parcels/{parcel_id}")
async def get_parcel(parcel_id: int):
    pool = get_pool()
    row = await pool.fetchrow("""
        SELECT id, name, iin, cadastral_number, water_limit, water_fact, notes,
            created_at, updated_at,
            CASE WHEN water_limit>0
                 THEN LEAST(ROUND((water_fact/water_limit*100)::NUMERIC,2),100)
                 ELSE 0 END AS fill_pct,
            ST_AsGeoJSON(ST_Transform(geom,4326))::jsonb AS geom_json
        FROM parcels WHERE id=$1
    """, parcel_id)
    if not row: raise HTTPException(status_code=404, detail="Участок не найден")
    pct = float(row["fill_pct"])
    return {
        "id": row["id"], "name": row["name"],
        "iin": row["iin"], "cadastral_number": row["cadastral_number"],
        "water_limit": float(row["water_limit"]),
        "water_fact":  float(row["water_fact"]),
        "fill_pct": pct, "status": status_label(pct),
        "notes": row["notes"],
        "created_at": row["created_at"].isoformat(),
        "updated_at": row["updated_at"].isoformat(),
        "geometry": row["geom_json"],
    }

class UpdateFact(BaseModel):
    water_fact: float

@router.patch("/parcels/{parcel_id}/fact")
async def update_water_fact(parcel_id: int, body: UpdateFact):
    if body.water_fact < 0:
        raise HTTPException(400, "water_fact не может быть отрицательным")
    pool = get_pool()
    row = await pool.fetchrow("""
        UPDATE parcels SET water_fact=$1 WHERE id=$2
        RETURNING id, name, water_limit, water_fact,
            LEAST(ROUND((water_fact/water_limit*100)::NUMERIC,2),100) AS fill_pct
    """, body.water_fact, parcel_id)
    if not row: raise HTTPException(404, "Участок не найден")
    pct = float(row["fill_pct"])
    return {"id":row["id"],"name":row["name"],
            "water_limit":float(row["water_limit"]),
            "water_fact":float(row["water_fact"]),
            "fill_pct":pct,"status":status_label(pct)}
