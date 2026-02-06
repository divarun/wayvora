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
## Optional
### Load Redis with data

```bash
# Warm everything (geocoding + POI data)
cd backend
npm run warm-cache

# Or just geocoding
npm run warm-geocoding
```
### Redis Insights
1. Open browser: http://localhost:5540
2. Add a Standalone Redis database:
   
   | Field| Value|
   |---|---|
   |Host | wayvora-redis |
   |Port | 6379 |
   |Password | (leave blank)|
   |Database | 0|

3. Test connection → should succeed ✅
4. Browse keys and view data immediately.


## Architecture

```
wayvora/
├── frontend/          
│   └── src/
│       ├── app/       
│       ├── components/
│       ├── data/
│       ├── hooks/     
│       ├── services/ 
│       ├── styles/ 
│       ├── types/     
│       └── utils/     
├── backend/           
│   └── src/
│       ├── data/ 
│       ├── db/ 
│       ├── middleware/   
│       ├── routes/
│       ├── services/  
│       ├── scripts/ 
│       └── services/        
├── database/          
├── docker-compose.yml 
└── .env.example       
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



All dependencies are open source. No Google Maps, Mapbox, OpenAI, or proprietary services.
