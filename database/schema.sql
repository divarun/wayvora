-- Wayvora Database Schema
-- Run: psql -U wayvora -d wayvora -f schema.sql

CREATE TABLE IF NOT EXISTS users (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT        NOT NULL UNIQUE,
  password    TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

CREATE TABLE IF NOT EXISTS favorites (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  poi_id      TEXT        NOT NULL,
  poi_data    JSONB       NOT NULL,
  saved_at    BIGINT      NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT * 1000,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT  uq_user_poi UNIQUE (user_id, poi_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user    ON favorites (user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_poi     ON favorites (poi_id);
CREATE INDEX IF NOT EXISTS idx_favorites_poi_data ON favorites USING GIN (poi_data);

CREATE TABLE IF NOT EXISTS itineraries (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL DEFAULT 'My Trip',
  route_data  JSONB       NOT NULL DEFAULT '{}',
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_itineraries_user ON itineraries (user_id);
CREATE INDEX IF NOT EXISTS idx_itineraries_route ON itineraries USING GIN (route_data);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON itineraries;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON itineraries
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();
