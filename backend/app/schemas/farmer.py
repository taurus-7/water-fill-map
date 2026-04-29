from typing import Optional
from pydantic import BaseModel


class FarmerCreate(BaseModel):
    full_name:       str
    iin:             str
    contract_number: Optional[str] = None
    phone:           Optional[str] = None
    address:         Optional[str] = None


class FarmerUpdate(BaseModel):
    full_name:       Optional[str] = None
    iin:             Optional[str] = None
    contract_number: Optional[str] = None
    phone:           Optional[str] = None
    address:         Optional[str] = None


class FarmerResponse(BaseModel):
    id:              int
    full_name:       str
    iin:             str
    contract_number: Optional[str] = None
    phone:           Optional[str] = None
    address:         Optional[str] = None
    created_at:      str
    updated_at:      str

    model_config = {"from_attributes": True}
