# Wayvora — Smart Local Explorer & Travel Planner

## Quick Start

```bash
# 1. Clone & install
git clone https://github.com/divarun/wayvora.git
cd wayvora
npm install

# 2. Start infrastructure (PostgreSQL + Ollama)
docker compose up -d

# 3. Pull a model into Ollama (first time)
docker exec wayvora-ollama ollama pull llama3

# 4. Configure environment
cp .env.example .env
# Edit .env if you changed any defaults

# 5. Copy .env into backend
cp .env backend/.env

# 6. Start everything
npm run dev
# → Frontend: http://localhost:3000
# → Backend:  http://localhost:3001
```

## Architecture

```
wayvora/
├── frontend/          # Next.js 14 + TypeScript + TailwindCSS
│   └── src/
│       ├── app/       # Next.js app router (page.tsx, layout.tsx)
│       ├── components/# React components (map, sidebars, modals)
│       ├── hooks/     # Custom hooks (auth, favorites, POIs)
│       ├── services/  # API clients (Overpass, Nominatim, OSRM, backend)
│       ├── types/     # Shared TypeScript interfaces
│       └── utils/     # Constants, export helpers
├── backend/           # Express + TypeScript
│   └── src/
│       ├── routes/    # auth, favorites, itineraries, ai
│       ├── middleware/# JWT auth middleware
│       ├── services/  # Ollama HTTP client
│       └── db/        # pg Pool + schema init
├── database/          # schema.sql + seed.sql
├── docker-compose.yml # PostgreSQL + Ollama
└── .env.example       # All env vars
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://wayvora:wayvora@localhost:5432/wayvora` | PostgreSQL connection |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama server URL |
| `OLLAMA_MODEL` | `llama3` | Model to use |
| `PORT` | `3001` | Backend port |
| `JWT_SECRET` | dev default | Change in production |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:3001/api` | Frontend → Backend |
| `NEXT_PUBLIC_OSRM_URL` | `http://router.project-osrm.org` | Routing engine |

## Features

### Guest Mode (no login required)
- Full Explorer + Planner access
- Favorites saved to localStorage
- AI recommendations via Ollama proxy
- Route export as JSON and PDF

### Account Mode (optional)
- Register / login with email + password
- Favorites and itineraries synced to PostgreSQL
- Guest data migrated on first login

### Maps & Routing
- OpenStreetMap tiles via Leaflet.js
- POI discovery via Overpass API
- Geocoding via Nominatim
- Route computation via OSRM (public instance or self-hosted)

### AI (local only)
- Powered by Ollama running locally
- No cloud API keys required
- Generates POI descriptions, travel tips, and route-aware recommendations

## Open Source Stack
- **Frontend**: Next.js, React, TypeScript, TailwindCSS, Leaflet.js
- **Backend**: Node.js, Express, TypeScript, pg
- **Database**: PostgreSQL
- **Maps**: OpenStreetMap, Overpass API, Nominatim, OSRM
- **AI**: Ollama (llama3 or any compatible model)

All dependencies are open source. No Google Maps, Mapbox, OpenAI, or proprietary services.
