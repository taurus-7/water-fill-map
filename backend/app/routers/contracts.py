from typing import Optional, List
from fastapi import APIRouter, Depends, Query, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..schemas.contract import ContractCreate, ContractUpdate, ContractResponse, ContractParcelItem
from ..services import contracts as svc

router = APIRouter()


# ── БАГ 1 FIX: /contracts/parcels/map должен быть ВЫШЕ /contracts/{contract_id} ──
@router.get("/contracts/parcels/map")
async def get_contracts_map(db: AsyncSession = Depends(get_db)):
    """GeoJSON для карты: все контрактные участки с геометрией."""
    return await svc.get_contracts_map(db)


@router.get("/contracts/stats")
async def get_contracts_stats(
    year: Optional[int] = Query(None),
    rural_district: Optional[str] = Query(None),
    culture: Optional[str] = Query(None),
    farmer_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    return await svc.get_contracts_stats(db, year, rural_district, culture, farmer_id)


@router.get("/contracts", response_model=List[ContractResponse])
async def list_contracts(
    farmer_id: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    return await svc.list_contracts(db, farmer_id, year, search)


@router.get("/contracts/{contract_id}", response_model=ContractResponse)
async def get_contract(contract_id: int, db: AsyncSession = Depends(get_db)):
    return await svc.get_contract(db, contract_id)


@router.post("/contracts", response_model=ContractResponse, status_code=201)
async def create_contract(body: ContractCreate, db: AsyncSession = Depends(get_db)):
    return await svc.create_contract(db, body)


# ── БАГ 4 FIX: PUT сохраняет и участки тоже ──
@router.put("/contracts/{contract_id}", response_model=ContractResponse)
async def update_contract(
    contract_id: int,
    body: ContractUpdate,
    db: AsyncSession = Depends(get_db),
):
    return await svc.update_contract(db, contract_id, body)


@router.put("/contracts/{contract_id}/full", response_model=ContractResponse)
async def update_contract_full(
    contract_id: int,
    body: ContractCreate,
    db: AsyncSession = Depends(get_db),
):
    """Обновляет договор вместе с участками (полная замена)."""
    from ..schemas.contract import ContractUpdate
    update_body = ContractUpdate(
        contract_number=body.contract_number,
        contract_date=body.contract_date,
        total_water_volume=body.total_water_volume,
        actual_water_volume=body.actual_water_volume,
        tariff_amount=body.tariff_amount,
        year=body.year,
    )
    return await svc.update_contract_with_parcels(db, contract_id, update_body, body.parcels)


@router.delete("/contracts/{contract_id}")
async def delete_contract(contract_id: int, db: AsyncSession = Depends(get_db)):
    return await svc.delete_contract(db, contract_id)


# ── БАГ 2 FIX: импорт договоров из Excel ──
@router.post("/contracts/import-excel")
async def import_contracts_excel(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    if not file.filename or not (
        file.filename.endswith(".xlsx") or file.filename.endswith(".xls")
    ):
        raise HTTPException(status_code=400, detail="Поддерживаются только .xlsx / .xls файлы")
    contents = await file.read()
    return await svc.import_excel(db, contents)
