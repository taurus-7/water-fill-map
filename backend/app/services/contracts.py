import json
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from fastapi import HTTPException
from ..schemas.contract import ContractCreate, ContractUpdate, ContractParcelItem

TARIFF_BY_YEAR = {
    2019: 1.0, 2020: 1.0, 2021: 1.0, 2022: 1.0, 2023: 1.0, 2024: 1.0,
    2026: 1.8,
}

CONTRACT_WITH_FARMER = """
    SELECT c.id, c.farmer_id, f.full_name AS farmer_name,
           c.contract_number, c.contract_date, c.total_water_volume,
           c.actual_water_volume, c.tariff_amount,
           c.year, c.created_at, c.updated_at
    FROM contracts c
    LEFT JOIN farmers f ON f.id = c.farmer_id
"""


async def _fetch_parcels(db: AsyncSession, contract_id: int) -> list:
    result = await db.execute(text("""
        SELECT cp.id, cp.contract_id, cp.parcel_id, cp.cadastral_number,
               cp.distribution_channel, cp.main_channel, cp.culture,
               cp.doc_hectares, cp.irrigated_hectares, cp.rural_district,
               ST_AsGeoJSON(COALESCE(cp.geom, ST_Transform(p.geom,4326)))::jsonb AS geom_json,
               cp.created_at, cp.updated_at
        FROM contract_parcels cp
        LEFT JOIN parcels p ON p.id = cp.parcel_id
        WHERE cp.contract_id = :cid ORDER BY cp.id
    """), {"cid": contract_id})
    rows = result.mappings().all()
    return [
        {
            "id": r["id"], "contract_id": r["contract_id"], "parcel_id": r["parcel_id"],
            "cadastral_number": r["cadastral_number"],
            "distribution_channel": r["distribution_channel"],
            "main_channel": r["main_channel"], "culture": r["culture"],
            "doc_hectares": float(r["doc_hectares"]) if r["doc_hectares"] is not None else None,
            "irrigated_hectares": float(r["irrigated_hectares"]) if r["irrigated_hectares"] is not None else None,
            "rural_district": r["rural_district"],
            "geom": r["geom_json"],
            "created_at": r["created_at"].isoformat(),
            "updated_at": r["updated_at"].isoformat(),
        }
        for r in rows
    ]


def _contract_dict(row, parcels: list) -> dict:
    return {
        "id": row["id"], "farmer_id": row["farmer_id"],
        "farmer_name": row["farmer_name"],
        "contract_number": row["contract_number"],
        "contract_date": row["contract_date"].isoformat() if row["contract_date"] else None,
        "total_water_volume": float(row["total_water_volume"]) if row["total_water_volume"] is not None else None,
        "actual_water_volume": float(row["actual_water_volume"]) if row["actual_water_volume"] is not None else None,
        "tariff_amount": float(row["tariff_amount"]) if row["tariff_amount"] is not None else None,
        "year": row["year"],
        "created_at": row["created_at"].isoformat(),
        "updated_at": row["updated_at"].isoformat(),
        "parcels": parcels,
    }


async def list_contracts(
    db: AsyncSession,
    farmer_id: Optional[int] = None,
    year: Optional[int] = None,
    search: Optional[str] = None,
) -> list:
    conditions, params = [], {}
    if farmer_id is not None:
        conditions.append("c.farmer_id = :farmer_id")
        params["farmer_id"] = farmer_id
    if year is not None:
        conditions.append("c.year = :year")
        params["year"] = year
    if search:
        conditions.append("c.contract_number ILIKE :search")
        params["search"] = f"%{search.strip()}%"
    where = " WHERE " + " AND ".join(conditions) if conditions else ""
    result = await db.execute(text(CONTRACT_WITH_FARMER + where + " ORDER BY c.year DESC, c.id"), params)
    rows = result.mappings().all()
    out = []
    for r in rows:
        parcels = await _fetch_parcels(db, r["id"])
        out.append(_contract_dict(r, parcels))
    return out


async def get_contract(db: AsyncSession, contract_id: int) -> dict:
    result = await db.execute(
        text(CONTRACT_WITH_FARMER + " WHERE c.id = :id"), {"id": contract_id}
    )
    row = result.mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Договор не найден")
    parcels = await _fetch_parcels(db, contract_id)
    return _contract_dict(row, parcels)


async def create_contract(db: AsyncSession, body: ContractCreate) -> dict:
    try:
        result = await db.execute(text("""
            INSERT INTO contracts
                (farmer_id, contract_number, contract_date, total_water_volume,
                 actual_water_volume, tariff_amount, year)
            VALUES
                (:farmer_id, :contract_number, :contract_date, :total_water_volume,
                 :actual_water_volume, :tariff_amount, :year)
            RETURNING id
        """), {
            "farmer_id": body.farmer_id,
            "contract_number": body.contract_number,
            "contract_date": body.contract_date,
            "total_water_volume": body.total_water_volume,
            "actual_water_volume": body.actual_water_volume,
            "tariff_amount": body.tariff_amount,
            "year": body.year,
        })
        contract_id = result.mappings().first()["id"]

        for p in body.parcels:
            geom_val = f"ST_SetSRID(ST_GeomFromGeoJSON('{json.dumps(p.geom)}'),4326)" if p.geom else "NULL"
            await db.execute(text(f"""
                INSERT INTO contract_parcels
                    (contract_id, parcel_id, cadastral_number, distribution_channel,
                     main_channel, culture, doc_hectares, irrigated_hectares, rural_district, geom)
                VALUES
                    (:cid, :pid, :cn, :dc, :mc, :cu, :dh, :ih, :rd, {geom_val})
            """), {
                "cid": contract_id, "pid": p.parcel_id, "cn": p.cadastral_number,
                "dc": p.distribution_channel, "mc": p.main_channel, "cu": p.culture,
                "dh": p.doc_hectares, "ih": p.irrigated_hectares, "rd": p.rural_district,
            })

        await db.commit()
        return await get_contract(db, contract_id)
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        err = str(e)
        if "unique" in err.lower():
            raise HTTPException(status_code=409, detail="Договор с таким номером и годом уже существует")
        raise HTTPException(status_code=500, detail=err)


async def update_contract(db: AsyncSession, contract_id: int, body: ContractUpdate) -> dict:
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Нет полей для обновления")
    set_clause = ", ".join(f"{k} = :{k}" for k in updates)
    updates["id"] = contract_id
    try:
        result = await db.execute(
            text(f"UPDATE contracts SET {set_clause}, updated_at=NOW() WHERE id=:id RETURNING id"),
            updates
        )
        if not result.mappings().first():
            raise HTTPException(status_code=404, detail="Договор не найден")
        await db.commit()
        return await get_contract(db, contract_id)
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


async def delete_contract(db: AsyncSession, contract_id: int) -> dict:
    result = await db.execute(
        text("DELETE FROM contracts WHERE id=:id RETURNING id"), {"id": contract_id}
    )
    await db.commit()
    if not result.mappings().first():
        raise HTTPException(status_code=404, detail="Договор не найден")
    return {"deleted": True}


async def get_contracts_stats(
    db: AsyncSession,
    year: Optional[int] = None,
    rural_district: Optional[str] = None,
    culture: Optional[str] = None,
    farmer_id: Optional[int] = None,
) -> dict:
    c_conds, p_conds, params = [], [], {}
    if year is not None:
        c_conds.append("c.year = :year"); p_conds.append("c.year = :year")
        params["year"] = year
    if farmer_id is not None:
        c_conds.append("c.farmer_id = :farmer_id"); p_conds.append("c.farmer_id = :farmer_id")
        params["farmer_id"] = farmer_id
    if rural_district:
        p_conds.append("cp.rural_district ILIKE :rd")
        params["rd"] = f"%{rural_district.strip()}%"
    if culture:
        p_conds.append("cp.culture ILIKE :culture")
        params["culture"] = f"%{culture.strip()}%"

    c_where = (" WHERE " + " AND ".join(c_conds)) if c_conds else ""
    p_where = (" WHERE " + " AND ".join(p_conds)) if p_conds else ""

    c_row = (await db.execute(text(f"""
        SELECT COUNT(*) AS total_contracts,
               COALESCE(SUM(c.total_water_volume),0) AS total_plan_volume,
               COALESCE(SUM(c.actual_water_volume),0) AS total_actual_volume,
               COALESCE(SUM(c.tariff_amount),0) AS total_tariff
        FROM contracts c {c_where}
    """), params)).mappings().first()

    p_row = (await db.execute(text(f"""
        SELECT COUNT(*) AS total_parcels,
               COALESCE(SUM(cp.doc_hectares),0) AS total_doc_hectares,
               COALESCE(SUM(cp.irrigated_hectares),0) AS total_irrigated_hectares
        FROM contract_parcels cp JOIN contracts c ON c.id=cp.contract_id {p_where}
    """), params)).mappings().first()

    years = (await db.execute(text(f"""
        SELECT c.year, COUNT(*) AS cnt,
               COALESCE(SUM(c.total_water_volume),0) AS plan_vol,
               COALESCE(SUM(c.actual_water_volume),0) AS actual_vol,
               COALESCE(SUM(c.tariff_amount),0) AS tariff
        FROM contracts c {c_where} GROUP BY c.year ORDER BY c.year
    """), params)).mappings().all()

    cultures = (await db.execute(text(f"""
        SELECT cp.culture, COUNT(*) AS cnt,
               COALESCE(SUM(cp.doc_hectares),0) AS doc_ha,
               COALESCE(SUM(cp.irrigated_hectares),0) AS irr_ha
        FROM contract_parcels cp JOIN contracts c ON c.id=cp.contract_id {p_where}
        GROUP BY cp.culture ORDER BY cnt DESC
    """), params)).mappings().all()

    return {
        "overview": {
            "total_contracts": c_row["total_contracts"],
            "total_plan_volume": float(c_row["total_plan_volume"]),
            "total_actual_volume": float(c_row["total_actual_volume"]),
            "total_tariff": float(c_row["total_tariff"]),
            "total_parcels": p_row["total_parcels"],
            "total_doc_hectares": float(p_row["total_doc_hectares"]),
            "total_irrigated_hectares": float(p_row["total_irrigated_hectares"]),
        },
        "by_year": [
            {"year": r["year"], "contracts": r["cnt"],
             "plan_volume": float(r["plan_vol"]),
             "actual_volume": float(r["actual_vol"]),
             "tariff": float(r["tariff"])}
            for r in years
        ],
        "by_culture": [
            {"culture": r["culture"], "parcels": r["cnt"],
             "doc_hectares": float(r["doc_ha"]),
             "irrigated_hectares": float(r["irr_ha"])}
            for r in cultures
        ],
    }
