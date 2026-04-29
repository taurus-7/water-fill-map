from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..schemas.parcel import ParcelFactUpdate, ParcelLimitUpdate
from ..services import parcels as svc

router = APIRouter()


@router.get("/parcels/map")
async def get_map_geojson(db: AsyncSession = Depends(get_db)):
    return await svc.get_map_geojson(db)


@router.get("/parcels/search")
async def search_parcel(q: str = Query(..., min_length=2), db: AsyncSession = Depends(get_db)):
    result = await svc.search_parcel(db, q.strip())
    if not result:
        raise HTTPException(status_code=404, detail="Участок не найден")
    return result


@router.get("/parcels")
async def list_parcels(
    status: Optional[str] = None,
    limit: int = Query(default=200, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    return await svc.list_parcels(db, status, limit, offset)


@router.get("/stats")
async def get_stats(db: AsyncSession = Depends(get_db)):
    return await svc.get_stats(db)


@router.get("/parcels/{parcel_id}")
async def get_parcel(parcel_id: int, db: AsyncSession = Depends(get_db)):
    result = await svc.get_parcel(db, parcel_id)
    if not result:
        raise HTTPException(status_code=404, detail="Участок не найден")
    return result


@router.patch("/parcels/{parcel_id}/fact")
async def update_fact(parcel_id: int, body: ParcelFactUpdate, db: AsyncSession = Depends(get_db)):
    result = await svc.update_fact(db, parcel_id, body.water_fact)
    if not result:
        raise HTTPException(status_code=404, detail="Участок не найден")
    return result


@router.patch("/parcels/{parcel_id}/limit")
async def update_limit(parcel_id: int, body: ParcelLimitUpdate, db: AsyncSession = Depends(get_db)):
    result = await svc.update_limit(db, parcel_id, body.water_limit)
    if not result:
        raise HTTPException(status_code=404, detail="Участок не найден")
    return result
