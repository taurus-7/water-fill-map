from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..schemas.contract import ContractCreate, ContractUpdate, ContractResponse
from ..services import contracts as svc

router = APIRouter()


@router.get("/contracts", response_model=List[ContractResponse])
async def list_contracts(
    farmer_id: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    return await svc.list_contracts(db, farmer_id, year, search)


@router.get("/contracts/stats")
async def get_contracts_stats(
    year: Optional[int] = Query(None),
    rural_district: Optional[str] = Query(None),
    culture: Optional[str] = Query(None),
    farmer_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    return await svc.get_contracts_stats(db, year, rural_district, culture, farmer_id)


@router.get("/contracts/{contract_id}", response_model=ContractResponse)
async def get_contract(contract_id: int, db: AsyncSession = Depends(get_db)):
    return await svc.get_contract(db, contract_id)


@router.post("/contracts", response_model=ContractResponse, status_code=201)
async def create_contract(body: ContractCreate, db: AsyncSession = Depends(get_db)):
    return await svc.create_contract(db, body)


@router.put("/contracts/{contract_id}", response_model=ContractResponse)
async def update_contract(contract_id: int, body: ContractUpdate, db: AsyncSession = Depends(get_db)):
    return await svc.update_contract(db, contract_id, body)


@router.delete("/contracts/{contract_id}")
async def delete_contract(contract_id: int, db: AsyncSession = Depends(get_db)):
    return await svc.delete_contract(db, contract_id)
