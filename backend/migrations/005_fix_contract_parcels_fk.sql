-- Migration 005: Make contract_parcels.parcel_id nullable (allow parcels not linked to parcels table)

-- Drop the existing foreign key constraint
ALTER TABLE contract_parcels DROP CONSTRAINT IF EXISTS contract_parcels_parcel_id_fkey;

-- Make parcel_id nullable so we can store inline parcel data without linking to parcels table
ALTER TABLE contract_parcels ALTER COLUMN parcel_id DROP NOT NULL;

-- Recreate the FK as nullable (ON DELETE SET NULL instead of CASCADE)
ALTER TABLE contract_parcels 
    ADD CONSTRAINT contract_parcels_parcel_id_fkey 
    FOREIGN KEY (parcel_id) REFERENCES parcels(id) ON DELETE SET NULL;