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

**See [Full Developer Guide](Developer_Guide.md) for more details**



