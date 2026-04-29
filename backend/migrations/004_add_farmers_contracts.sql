-- Migration 004: Add phone to parcels, create farmers, contracts, and contract_parcels tables

-- 1. Add phone column to parcels
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS phone VARCHAR(50);

-- 2. Create farmers (Крестьянин) table
CREATE TABLE IF NOT EXISTS farmers (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,             -- ФИО
    iin VARCHAR(20) NOT NULL UNIQUE,              -- ИИН
    contract_number VARCHAR(100),                 -- Номер договора (текущий)
    phone VARCHAR(50),                            -- Тел номер
    address TEXT,                                 -- Адрес
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Create contracts (Договор) table
CREATE TABLE IF NOT EXISTS contracts (
    id SERIAL PRIMARY KEY,
    farmer_id INTEGER NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
    contract_number VARCHAR(100) NOT NULL,        -- Номер договора (из готового списка)
    contract_date DATE,                           -- Дата договора
    total_water_volume DECIMAL(12, 3),            -- Общий обьем воды положеный по договору (м³)
    year INTEGER,                                 -- Год договора
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(contract_number, year)
);

-- 4. Create contract_parcels junction table (участки внутри договора)
CREATE TABLE IF NOT EXISTS contract_parcels (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    parcel_id INTEGER NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
    cadastral_number VARCHAR(100),                -- Кадастровый номер
    distribution_channel VARCHAR(255),            -- Распределительный канал
    main_channel VARCHAR(255),                    -- Магистральный канал
    culture VARCHAR(255),                         -- Культура
    doc_hectares DECIMAL(10, 3),                  -- Гектары по документам
    irrigated_hectares DECIMAL(10, 3),            -- Орошаемые гектары
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. Update parcel polygon to be nullable (for parcels that are listed without geometry)
ALTER TABLE parcels ALTER COLUMN geom DROP NOT NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_farmers_iin ON farmers(iin);
CREATE INDEX IF NOT EXISTS idx_farmers_contract_number ON farmers(contract_number);
CREATE INDEX IF NOT EXISTS idx_contracts_farmer_id ON contracts(farmer_id);
CREATE INDEX IF NOT EXISTS idx_contracts_contract_number ON contracts(contract_number);
CREATE INDEX IF NOT EXISTS idx_contracts_year ON contracts(year);
CREATE INDEX IF NOT EXISTS idx_contract_parcels_contract_id ON contract_parcels(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_parcels_parcel_id ON contract_parcels(parcel_id);