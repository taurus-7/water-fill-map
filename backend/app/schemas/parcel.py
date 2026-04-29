from typing import Optional, Any
from pydantic import BaseModel


class ParcelBase(BaseModel):
    name:             str
    water_limit:      float = 0
    water_fact:       float = 0
    notes:            Optional[str] = None
    phone:            Optional[str] = None
    iin:              Optional[str] = None
    cadastral_number: Optional[str] = None


class ParcelCreate(ParcelBase):
    pass


class ParcelUpdate(BaseModel):
    name:             Optional[str] = None
    water_limit:      Optional[float] = None
    water_fact:       Optional[float] = None
    notes:            Optional[str] = None
    phone:            Optional[str] = None
    iin:              Optional[str] = None
    cadastral_number: Optional[str] = None


class ParcelFactUpdate(BaseModel):
    water_fact: float


class ParcelLimitUpdate(BaseModel):
    water_limit: float


class ParcelResponse(ParcelBase):
    id:         int
    fill_pct:   float
    status:     str
    updated_at: str

    model_config = {"from_attributes": True}


class ParcelMapFeature(BaseModel):
    id:               int
    name:             str
    iin:              Optional[str]
    cadastral_number: Optional[str]
    water_limit:      float
    water_fact:       float
    fill_pct:         float
    status:           str
    fill_color:       list[int]
    notes:            Optional[str]
    lon:              Optional[float]
    lat:              Optional[float]


class MapGeoJSON(BaseModel):
    outlines: Any
    fills:    Any
