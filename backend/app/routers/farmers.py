from typing import Optional, List
from fastapi import APIRouter, Depends, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..schemas.farmer import FarmerCreate, FarmerUpdate, FarmerResponse
from ..services import farmers as svc

router = APIRouter()


@router.get("/farmers", response_model=List[FarmerResponse])
async def list_farmers(
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    return await svc.list_farmers(db, search)


@router.get("/farmers/{farmer_id}", response_model=FarmerResponse)
async def get_farmer(farmer_id: int, db: AsyncSession = Depends(get_db)):
    return await svc.get_farmer(db, farmer_id)


@router.post("/farmers", response_model=FarmerResponse, status_code=201)
async def create_farmer(body: FarmerCreate, db: AsyncSession = Depends(get_db)):
    return await svc.create_farmer(db, body)


@router.put("/farmers/{farmer_id}", response_model=FarmerResponse)
async def update_farmer(farmer_id: int, body: FarmerUpdate, db: AsyncSession = Depends(get_db)):
    return await svc.update_farmer(db, farmer_id, body)


@router.delete("/farmers/{farmer_id}")
async def delete_farmer(farmer_id: int, db: AsyncSession = Depends(get_db)):
    return await svc.delete_farmer(db, farmer_id)


@router.post("/farmers/import-excel")
async def import_excel(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    if not file.filename or not (file.filename.endswith(".xlsx") or file.filename.endswith(".xls")):
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Поддерживаются только .xlsx / .xls файлы")
    contents = await file.read()
    return await svc.import_excel(db, contents)
