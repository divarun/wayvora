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

-- Wayvora Database Schema - Passport System Extension
-- Run: psql -U wayvora -d wayvora -f schema_passport.sql

-- Explorer Passports Table
CREATE TABLE IF NOT EXISTS explorer_passports (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  level       INTEGER     NOT NULL DEFAULT 1,
  title       TEXT        NOT NULL DEFAULT 'Tourist',
  xp          INTEGER     NOT NULL DEFAULT 0,
  xp_to_next  INTEGER     NOT NULL DEFAULT 100,
  statistics  JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT  uq_user_passport UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_passports_user ON explorer_passports (user_id);
CREATE INDEX IF NOT EXISTS idx_passports_level ON explorer_passports (level);

-- Stamps Table
CREATE TABLE IF NOT EXISTS stamps (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  neighborhood_name     TEXT        NOT NULL,
  city_name             TEXT        NOT NULL,
  country_code          TEXT        NOT NULL,
  coordinates           JSONB       NOT NULL,
  rarity                TEXT        NOT NULL CHECK (rarity IN ('common', 'rare', 'legendary')),
  unique_pois_visited   INTEGER     NOT NULL DEFAULT 1,
  ai_description        TEXT,
  earned_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_neighborhood UNIQUE (user_id, neighborhood_name, city_name)
);

CREATE INDEX IF NOT EXISTS idx_stamps_user ON stamps (user_id);
CREATE INDEX IF NOT EXISTS idx_stamps_city ON stamps (city_name);
CREATE INDEX IF NOT EXISTS idx_stamps_country ON stamps (country_code);
CREATE INDEX IF NOT EXISTS idx_stamps_rarity ON stamps (rarity);
CREATE INDEX IF NOT EXISTS idx_stamps_user_city ON stamps (user_id, city_name);
CREATE INDEX IF NOT EXISTS idx_stamps_earned ON stamps (earned_at DESC);

-- Badges Table
CREATE TABLE IF NOT EXISTS badges (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id    TEXT        NOT NULL,
  name        TEXT        NOT NULL,
  description TEXT        NOT NULL,
  category    TEXT        NOT NULL,
  icon_emoji  TEXT        NOT NULL,
  rarity      TEXT        NOT NULL CHECK (rarity IN ('bronze', 'silver', 'gold', 'platinum')),
  earned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT  uq_user_badge UNIQUE (user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_badges_user ON badges (user_id);
CREATE INDEX IF NOT EXISTS idx_badges_category ON badges (category);
CREATE INDEX IF NOT EXISTS idx_badges_rarity ON badges (rarity);

-- Achievements Table
CREATE TABLE IF NOT EXISTS achievements (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id  TEXT        NOT NULL,
  name            TEXT        NOT NULL,
  description     TEXT        NOT NULL,
  category        TEXT        NOT NULL,
  icon_emoji      TEXT        NOT NULL,
  tier            TEXT        NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
  xp_reward       INTEGER     NOT NULL DEFAULT 0,
  earned_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT      uq_user_achievement UNIQUE (user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_achievements_user ON achievements (user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_category ON achievements (category);
CREATE INDEX IF NOT EXISTS idx_achievements_tier ON achievements (tier);

-- Quests Table
CREATE TABLE IF NOT EXISTS quests (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quest_id      TEXT        NOT NULL,
  title         TEXT        NOT NULL,
  description   TEXT        NOT NULL,
  type          TEXT        NOT NULL,
  difficulty    TEXT        NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard', 'epic')),
  requirements  JSONB       NOT NULL DEFAULT '[]',
  reward        JSONB       NOT NULL DEFAULT '{}',
  progress      INTEGER     NOT NULL DEFAULT 0,
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  is_completed  BOOLEAN     NOT NULL DEFAULT FALSE,
  ai_generated  BOOLEAN     NOT NULL DEFAULT FALSE,
  city_name     TEXT,
  expires_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quests_user ON quests (user_id);
CREATE INDEX IF NOT EXISTS idx_quests_active ON quests (user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_quests_completed ON quests (user_id, is_completed);
CREATE INDEX IF NOT EXISTS idx_quests_city ON quests (city_name);

-- Mystery Boxes Table
CREATE TABLE IF NOT EXISTS mystery_boxes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rarity      TEXT        NOT NULL CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  reward      JSONB       NOT NULL DEFAULT '{}',
  opened      BOOLEAN     NOT NULL DEFAULT FALSE,
  earned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  opened_at   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mystery_boxes_user ON mystery_boxes (user_id);
CREATE INDEX IF NOT EXISTS idx_mystery_boxes_opened ON mystery_boxes (user_id, opened);
CREATE INDEX IF NOT EXISTS idx_mystery_boxes_rarity ON mystery_boxes (rarity);

-- Trip History Table
CREATE TABLE IF NOT EXISTS trip_history (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trip_date       TIMESTAMPTZ NOT NULL,
  city_name       TEXT        NOT NULL,
  route_data      JSONB,
  pois_visited    JSONB       NOT NULL DEFAULT '[]',
  distance        INTEGER     NOT NULL DEFAULT 0,
  duration        INTEGER     NOT NULL DEFAULT 0,
  photos          JSONB       DEFAULT '[]',
  notes           TEXT,
  mood            TEXT,
  weather         TEXT,
  achievements    JSONB       DEFAULT '[]',
  quests_completed JSONB      DEFAULT '[]',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trip_history_user ON trip_history (user_id);
CREATE INDEX IF NOT EXISTS idx_trip_history_date ON trip_history (trip_date DESC);
CREATE INDEX IF NOT EXISTS idx_trip_history_city ON trip_history (city_name);

-- Triggers for auto-updating timestamps
DROP TRIGGER IF EXISTS set_updated_at_passports ON explorer_passports;
CREATE TRIGGER set_updated_at_passports
  BEFORE UPDATE ON explorer_passports
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS set_updated_at_quests ON quests;
CREATE TRIGGER set_updated_at_quests
  BEFORE UPDATE ON quests
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

-- Function to get user's passport summary
CREATE OR REPLACE FUNCTION get_passport_summary(p_user_id UUID)
RETURNS TABLE (
  total_stamps INTEGER,
  total_badges INTEGER,
  total_achievements INTEGER,
  total_cities INTEGER,
  total_countries INTEGER,
  level INTEGER,
  title TEXT,
  xp INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::INTEGER FROM stamps WHERE user_id = p_user_id),
    (SELECT COUNT(*)::INTEGER FROM badges WHERE user_id = p_user_id),
    (SELECT COUNT(*)::INTEGER FROM achievements WHERE user_id = p_user_id),
    (SELECT COUNT(DISTINCT city_name)::INTEGER FROM stamps WHERE user_id = p_user_id),
    (SELECT COUNT(DISTINCT country_code)::INTEGER FROM stamps WHERE user_id = p_user_id),
    COALESCE((SELECT level FROM explorer_passports WHERE user_id = p_user_id), 1),
    COALESCE((SELECT title FROM explorer_passports WHERE user_id = p_user_id), 'Tourist'),
    COALESCE((SELECT xp FROM explorer_passports WHERE user_id = p_user_id), 0);
END;
$$ LANGUAGE plpgsql;

-- Function to get stamps grouped by city
CREATE OR REPLACE FUNCTION get_stamps_by_city(p_user_id UUID)
RETURNS TABLE (
  city_name TEXT,
  country_code TEXT,
  stamp_count INTEGER,
  neighborhoods JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.city_name,
    s.country_code,
    COUNT(*)::INTEGER as stamp_count,
    jsonb_agg(
      jsonb_build_object(
        'id', s.id,
        'neighborhoodName', s.neighborhood_name,
        'rarity', s.rarity,
        'uniquePOIsVisited', s.unique_pois_visited,
        'earnedAt', s.earned_at,
        'aiDescription', s.ai_description
      ) ORDER BY s.earned_at DESC
    ) as neighborhoods
  FROM stamps s
  WHERE s.user_id = p_user_id
  GROUP BY s.city_name, s.country_code
  ORDER BY stamp_count DESC, s.city_name;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user earned a city badge
CREATE OR REPLACE FUNCTION check_city_badge(p_user_id UUID, p_city_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  stamp_count INTEGER;
  badge_exists BOOLEAN;
BEGIN
  -- Count stamps in this city
  SELECT COUNT(*) INTO stamp_count
  FROM stamps
  WHERE user_id = p_user_id AND city_name = p_city_name;

  -- Check if badge already exists
  SELECT EXISTS(
    SELECT 1 FROM badges
    WHERE user_id = p_user_id
    AND badge_id = 'city_' || LOWER(REPLACE(p_city_name, ' ', '_'))
  ) INTO badge_exists;

  -- Award badge if 5+ stamps and doesn't exist
  IF stamp_count >= 5 AND NOT badge_exists THEN
    INSERT INTO badges (user_id, badge_id, name, description, category, icon_emoji, rarity)
    VALUES (
      p_user_id,
      'city_' || LOWER(REPLACE(p_city_name, ' ', '_')),
      p_city_name || ' Explorer',
      'Explored 5+ neighborhoods in ' || p_city_name,
      'special',
      '🏙️',
      'gold'
    );
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user earned a country badge
CREATE OR REPLACE FUNCTION check_country_badge(p_user_id UUID, p_country_code TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  city_count INTEGER;
  badge_exists BOOLEAN;
  country_name TEXT;
BEGIN
  -- Count unique cities in this country
  SELECT COUNT(DISTINCT city_name) INTO city_count
  FROM stamps
  WHERE user_id = p_user_id AND country_code = p_country_code;

  -- Check if badge already exists
  SELECT EXISTS(
    SELECT 1 FROM badges
    WHERE user_id = p_user_id
    AND badge_id = 'country_' || LOWER(p_country_code)
  ) INTO badge_exists;

  -- Get country name (simplified mapping)
  country_name := CASE p_country_code
    WHEN 'US' THEN 'United States'
    WHEN 'FR' THEN 'France'
    WHEN 'GB' THEN 'United Kingdom'
    WHEN 'JP' THEN 'Japan'
    WHEN 'ES' THEN 'Spain'
    WHEN 'IT' THEN 'Italy'
    WHEN 'DE' THEN 'Germany'
    ELSE p_country_code
  END;

  -- Award badge if 3+ cities and doesn't exist
  IF city_count >= 3 AND NOT badge_exists THEN
    INSERT INTO badges (user_id, badge_id, name, description, category, icon_emoji, rarity)
    VALUES (
      p_user_id,
      'country_' || LOWER(p_country_code),
      country_name || ' Explorer',
      'Visited 3+ cities in ' || country_name,
      'special',
      '🌍',
      'platinum'
    );
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE explorer_passports IS 'Stores user explorer passport data including level and XP';
COMMENT ON TABLE stamps IS 'Stores neighborhood stamps collected by users';
COMMENT ON TABLE badges IS 'Stores special badges earned by users (city, country, etc.)';
COMMENT ON TABLE achievements IS 'Stores achievements unlocked by users';
COMMENT ON TABLE quests IS 'Stores active and completed quests for users';
COMMENT ON TABLE mystery_boxes IS 'Stores mystery boxes earned by users';
COMMENT ON TABLE trip_history IS 'Stores historical trip data and memories';