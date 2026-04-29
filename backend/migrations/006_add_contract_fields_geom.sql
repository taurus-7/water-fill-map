-- Migration 006: Add actual_water_volume, tariff_amount to contracts;
-- Add rural_district and geom to contract_parcels

-- 1. contracts: actual water volume (фактический объем взятой воды)
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS actual_water_volume DECIMAL(12, 3);

-- 2. contracts: tariff amount (сумма тарифа)
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS tariff_amount DECIMAL(12, 2) DEFAULT 0;

-- 3. contract_parcels: rural district (сельский округ)
ALTER TABLE contract_parcels ADD COLUMN IF NOT EXISTS rural_district VARCHAR(255);

-- 4. contract_parcels: PostGIS geometry (EPSG:4326)
ALTER TABLE contract_parcels ADD COLUMN IF NOT EXISTS geom geometry(Geometry, 4326);

-- Spatial index
CREATE INDEX IF NOT EXISTS idx_contract_parcels_geom ON contract_parcels USING GIST(geom);

-- Index on rural_district for analytics
CREATE INDEX IF NOT EXISTS idx_contract_parcels_rural_district ON contract_parcels(rural_district);