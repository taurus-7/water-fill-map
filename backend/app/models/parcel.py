from sqlalchemy import Column, Integer, String, Numeric, Text, TIMESTAMP, func
from geoalchemy2 import Geometry
from ..database import Base


class Parcel(Base):
    __tablename__ = "parcels"

    id               = Column(Integer, primary_key=True, index=True)
    name             = Column(String(255), nullable=False)
    geom             = Column(Geometry("MULTIPOLYGON", srid=32642), nullable=True)
    water_limit      = Column(Numeric(15, 2), nullable=False, default=0)
    water_fact       = Column(Numeric(15, 2), nullable=False, default=0)
    notes            = Column(Text, nullable=True)
    phone            = Column(String(50), nullable=True)
    iin              = Column(String(20), nullable=True, index=True)
    cadastral_number = Column(String(100), nullable=True, index=True)
    created_at       = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    updated_at       = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
