from typing import Optional, List, Any
from datetime import date
from pydantic import BaseModel


class ContractParcelItem(BaseModel):
    parcel_id:            Optional[int]   = None
    cadastral_number:     Optional[str]   = None
    distribution_channel: Optional[str]   = None
    main_channel:         Optional[str]   = None
    culture:              Optional[str]   = None
    doc_hectares:         Optional[float] = None
    irrigated_hectares:   Optional[float] = None
    rural_district:       Optional[str]   = None
    geom:                 Optional[Any]   = None


class ContractParcelResponse(ContractParcelItem):
    id:          int
    contract_id: int
    created_at:  str
    updated_at:  str


class ContractCreate(BaseModel):
    farmer_id:           int
    contract_number:     str
    contract_date:       Optional[date]  = None
    total_water_volume:  Optional[float] = None
    actual_water_volume: Optional[float] = None
    tariff_amount:       Optional[float] = None
    year:                Optional[int]   = None
    parcels:             List[ContractParcelItem] = []


class ContractUpdate(BaseModel):
    contract_number:     Optional[str]   = None
    contract_date:       Optional[date]  = None
    total_water_volume:  Optional[float] = None
    actual_water_volume: Optional[float] = None
    tariff_amount:       Optional[float] = None
    year:                Optional[int]   = None


class ContractResponse(BaseModel):
    id:                  int
    farmer_id:           int
    farmer_name:         Optional[str]   = None
    contract_number:     str
    contract_date:       Optional[str]   = None
    total_water_volume:  Optional[float] = None
    actual_water_volume: Optional[float] = None
    tariff_amount:       Optional[float] = None
    year:                Optional[int]   = None
    created_at:          str
    updated_at:          str
    parcels:             List[ContractParcelResponse] = []
