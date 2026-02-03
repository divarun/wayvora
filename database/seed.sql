-- Wayvora Seed Data
-- Run AFTER schema.sql:  psql -U wayvora -d wayvora -f seed.sql
-- Password hash below is bcrypt of "password123"

BEGIN;

-- Clean existing seed data (idempotent)
DELETE FROM itineraries WHERE user_id IN (
  SELECT id FROM users WHERE email IN ('alice@wayvora.dev', 'bob@wayvora.dev')
);
DELETE FROM favorites WHERE user_id IN (
  SELECT id FROM users WHERE email IN ('alice@wayvora.dev', 'bob@wayvora.dev')
);
DELETE FROM users WHERE email IN ('alice@wayvora.dev', 'bob@wayvora.dev');

-- Seed users
-- bcrypt("password123", rounds=12) — use these for login in dev
INSERT INTO users (id, email, password, created_at) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'alice@wayvora.dev', '$2a$12$WApznUPhDubNqmw1Dv.5tO1gHmFmAcXODcHp9sAIBBsRzUk8LPSJy', NOW() - INTERVAL '3 days'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bob@wayvora.dev',   '$2a$12$WApznUPhDubNqmw1Dv.5tO1gHmFmAcXODcHp9sAIBBsRzUk8LPSJy', NOW() - INTERVAL '1 day');

-- Seed Alice's favorites — Paris landmarks
INSERT INTO favorites (user_id, poi_id, poi_data, saved_at) VALUES
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'osm-node-1001',
    '{
      "name": "Café de Flore",
      "category": "cafe",
      "address": "172 Rue de Saint-Germain-des-Prés, 75006 Paris",
      "coordinates": {"lat": 48.8538, "lng": 2.3337},
      "openingHours": "07:00–23:00 daily",
      "tags": ["historic", "literary"]
    }',
    EXTRACT(EPOCH FROM NOW())::BIGINT * 1000 - 86400000
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'osm-node-1002',
    '{
      "name": "Jardin du Luxembourg",
      "category": "park",
      "address": "Rue de Vaugirard, 75006 Paris",
      "coordinates": {"lat": 48.8462, "lng": 2.3372},
      "openingHours": "Sunrise–Sunset"
    }',
    EXTRACT(EPOCH FROM NOW())::BIGINT * 1000 - 3600000
  );

-- Seed Bob's favorites — also Paris
INSERT INTO favorites (user_id, poi_id, poi_data, saved_at) VALUES
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'osm-node-2001',
    '{
      "name": "Musée d''Orsay",
      "category": "museum",
      "address": "1 Rue de Bellay, 75007 Paris",
      "coordinates": {"lat": 48.8600, "lng": 2.3266},
      "openingHours": "09:00–18:00 (closed Mon)"
    }',
    EXTRACT(EPOCH FROM NOW())::BIGINT * 1000
  );

-- Seed Alice's itinerary
INSERT INTO itineraries (id, user_id, name, route_data, notes, created_at, updated_at) VALUES
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Left Bank Morning Walk',
    '{
      "id": "cccccccc-cccc-cccc-cccc-cccccccccccc",
      "transportMode": "walk",
      "totalDistance": 1850,
      "totalDuration": 2400,
      "pois": [
        {"id":"osm-node-1001","name":"Café de Flore","category":"cafe","address":"172 Rue de Saint-Germain-des-Prés, 75006 Paris","coordinates":{"lat":48.8538,"lng":2.3337}},
        {"id":"osm-node-1002","name":"Jardin du Luxembourg","category":"park","address":"Rue de Vaugirard, 75006 Paris","coordinates":{"lat":48.8462,"lng":2.3372}}
      ],
      "segments": []
    }',
    'Start with a croissant, then stroll through the gardens.',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days'
  );

COMMIT;
