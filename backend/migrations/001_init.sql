-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================
-- Таблица участков
-- geom хранится в UTM Zone 42N (EPSG:32642) — Казахстан
-- ============================================================
CREATE TABLE IF NOT EXISTS parcels (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(255) NOT NULL,
    geom          GEOMETRY(MultiPolygon, 32642) NOT NULL,
    water_limit   NUMERIC(15, 2) NOT NULL DEFAULT 0,  -- лимит м³
    water_fact    NUMERIC(15, 2) NOT NULL DEFAULT 0,  -- факт м³
    notes         TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Вычисляемый вид для удобства
CREATE OR REPLACE VIEW parcels_with_pct AS
SELECT
    id,
    name,
    geom,
    water_limit,
    water_fact,
    notes,
    created_at,
    updated_at,
    CASE
        WHEN water_limit > 0 THEN LEAST(ROUND((water_fact / water_limit * 100)::NUMERIC, 2), 100)
        ELSE 0
    END AS fill_pct
FROM parcels;

-- Индексы
CREATE INDEX IF NOT EXISTS idx_parcels_geom ON parcels USING GIST(geom);

-- Триггер обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER parcels_updated_at
    BEFORE UPDATE ON parcels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
