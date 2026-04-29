from sqlalchemy import Column, Integer, String, Text, TIMESTAMP, func
from ..database import Base


class Farmer(Base):
    __tablename__ = "farmers"

    id              = Column(Integer, primary_key=True, index=True)
    full_name       = Column(String(255), nullable=False)
    iin             = Column(String(20), nullable=False, unique=True, index=True)
    contract_number = Column(String(100), nullable=True, index=True)
    phone           = Column(String(50), nullable=True)
    address         = Column(Text, nullable=True)
    created_at      = Column(TIMESTAMP, server_default=func.now(), nullable=False)
    updated_at      = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now(), nullable=False)
