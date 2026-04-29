from sqlalchemy import (
    Column, Integer, String, Date, Numeric, TIMESTAMP, ForeignKey, func, UniqueConstraint
)
from geoalchemy2 import Geometry
from ..database import Base


class Contract(Base):
    __tablename__ = "contracts"
    __table_args__ = (UniqueConstraint("contract_number", "year", name="uq_contract_number_year"),)

    id                  = Column(Integer, primary_key=True, index=True)
    farmer_id           = Column(Integer, ForeignKey("farmers.id", ondelete="CASCADE"), nullable=False, index=True)
    contract_number     = Column(String(100), nullable=False, index=True)
    contract_date       = Column(Date, nullable=True)
    total_water_volume  = Column(Numeric(12, 3), nullable=True)
    actual_water_volume = Column(Numeric(12, 3), nullable=True)
    tariff_amount       = Column(Numeric(12, 2), nullable=True, default=0)
    year                = Column(Integer, nullable=True, index=True)
    created_at          = Column(TIMESTAMP, server_default=func.now(), nullable=False)
    updated_at          = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now(), nullable=False)


class ContractParcel(Base):
    __tablename__ = "contract_parcels"

    id                   = Column(Integer, primary_key=True, index=True)
    contract_id          = Column(Integer, ForeignKey("contracts.id", ondelete="CASCADE"), nullable=False, index=True)
    parcel_id            = Column(Integer, ForeignKey("parcels.id", ondelete="SET NULL"), nullable=True, index=True)
    cadastral_number     = Column(String(100), nullable=True)
    distribution_channel = Column(String(255), nullable=True)
    main_channel         = Column(String(255), nullable=True)
    culture              = Column(String(255), nullable=True)
    doc_hectares         = Column(Numeric(10, 3), nullable=True)
    irrigated_hectares   = Column(Numeric(10, 3), nullable=True)
    rural_district       = Column(String(255), nullable=True, index=True)
    geom                 = Column(Geometry("GEOMETRY", srid=4326), nullable=True)
    created_at           = Column(TIMESTAMP, server_default=func.now(), nullable=False)
    updated_at           = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now(), nullable=False)
