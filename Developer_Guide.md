# Wayvora - Complete Developer Guide

## Overview

**Wayvora** is a travel exploration app that combines POI discovery with gamification. Users can explore places near them, plan multi-stop routes, and earn rewards through the "Explorer Passport" system.

### Tech Stack
- **Frontend**: Next.js 14, TypeScript, Tailwind, Leaflet maps
- **Backend**: Express.js, PostgreSQL, Redis, Ollama AI
- **APIs**: Overpass (POIs), Nominatim (geocoding), OSRM (routing)

---

## Application Startup

### When App First Loads

```
1. page.tsx mounts
   ├─ Sets default center: NYC (40.7128, -74.0060)
   └─ Initializes state (mode=explorer, pois=[], plannerPois=[])

2. useEffect runs (line 37-63)
   ├─ Checks browser geolocation
   ├─ Success: setMapCenter(user's location)
   └─ Failure: Use default NYC location

3. Call load(mapCenter)
   ├─ usePOIs hook: sets loading=true
   └─ Calls fetchPOIs(center, 1500m, categories)

4. Frontend → POST /api/proxy/overpass
   ├─ Backend checks Redis cache
   ├─ Miss: Query Overpass API  
   ├─ Save to Redis (TTL: 6hrs)
   └─ Return POI data

5. Frontend maps OSM elements → POI objects
   ├─ Extract name, category, coordinates
   ├─ Filter nulls
   └─ Limit to 30 POIs

6. setPois(results) → UI updates
   ├─ ExplorerSidebar shows list
   ├─ WayvMap shows markers
   └─ Loading indicator disappears

7. PassportPanel initializes
   ├─ Load from localStorage: wayvora_user_progress
   └─ If none: Create new progress (level 1, 0 XP)
```

---

## User Flow: City Search

```
User types "Paris" → Presses Enter
  ↓
handleSearch()
  ├─ setSearchLoading(true)
  └─ geocodeSearch("Paris", 5)
      ↓
GET /api/proxy/nominatim/search?q=Paris&limit=5
  ├─ Backend checks Redis
  ├─ Miss: Query Nominatim API
  └─ Return 5 results
      ↓
Dropdown appears with cities
  ├─ 📍 Paris, Île-de-France, France
  ├─ 📍 Paris, Texas, USA
  └─ ... (3 more)
      ↓
User clicks "Paris, France"
  ↓
onSearchResult(48.8566, 2.3522)
  ├─ setMapCenter({lat: 48.8566, lng: 2.3522})
  ├─ load(newCenter) → Fetch Paris POIs
  └─ Map animates to Paris
      ↓
Result: Map shows Paris with new POIs
```

**Key Detail:** `load()` is called IMMEDIATELY when city is selected, before map finishes animating. This prevents users waiting for map animation to finish before seeing POIs.

---

## User Flow: POI Click

```
User clicks marker → onPoiClick(poi)
  ↓
setSelectedPoi(poi) → Modal opens
  ↓
gamificationService.visitPOI(poi)
  ↓
┌─ Already visited? → Return {isNew: false}
└─ First visit →
    ├─ Mark visited: visitedPOIs.add(poi.id)
    ├─ Create stamp:
    │   ├─ reverseGeocode(coordinates) → "7th arr, Paris, FR"
    │   ├─ Calculate rarity (common/rare/legendary)
    │   └─ Save stamp to passport.stamps[]
    ├─ Update stats: poisVisited++
    ├─ Award XP: +10
    ├─ Check level up: xp >= xpToNextLevel?
    ├─ Check achievements: Visit 1/50/100 POIs?
    ├─ Mystery box: Every 10 POIs
    └─ saveProgress() to localStorage
        ↓
PassportPanel updates in real-time
  ├─ Level bar increases
  ├─ New stamp appears
  └─ Statistics update
```

---

## User Flow: Route Planning

```
User adds POIs to planner (clicks "+" or "Add to Planner")
  ↓
addToPlanner(poi)
  ├─ setPlannerPois([...prev, poi])
  └─ Triggers:
      ├─ Map: Numbered markers (1,2,3...)
      ├─ Planner badge: "3 stops → View Route"
      └─ Clear route (segments=[])
          ↓
User switches to Planner mode
  ↓
PlannerSidebar shows:
  ├─ Drag-to-reorder list
  ├─ Transport mode selector (🚶🚴🚗🚌)
  └─ "Compute Route" button
      ↓
User selects transport mode & clicks "Compute Route"
  ↓
computeTheRoute()
  ├─ Validate: 2+ POIs with real coordinates
  ├─ setRouteLoading(true)
  └─ For each POI pair (A→B, B→C, C→D):
      └─ GET /route/v1/foot/{lon1},{lat1};{lon2},{lat2}
          ↓
OSRM returns:
{
  distance: 1234.5 (meters)
  duration: 987.6 (seconds)
  geometry: [[lng,lat], [lng,lat], ...]
}
  ↓
Convert to RouteSegment:
{
  from: POI_A,
  to: POI_B,
  distance: 1234.5,
  duration: 987.6,
  geometry: [{lat,lng}, ...]
}
  ↓
Aggregate all segments → setRouteSegments()
  ↓
Map renders:
  ├─ Blue polylines connecting POIs
  └─ Auto-fit bounds to show full route
      ↓
Sidebar shows summary:
  ├─ Total: 3.2 km, 45 min
  └─ Each segment with details
```

---

## Explorer Passport System

### Components

**1. Levels & XP**
- Start at level 1 (Tourist)
- Earn 10 XP per new POI
- Formula: `xpToNextLevel = 100 * 1.5^(level-1)`
- Titles: Tourist → Wanderer → Explorer → ... → Legend

**2. Stamps**
- Earned when visiting new neighborhood
- Contains: neighborhood, city, country, coordinates, rarity
- Rarity: common (major city + hotspot), rare (major city), legendary (small town)

**3. Achievements**
- Predefined goals (visit 1/50/100 POIs, walk 26 miles, etc.)
- Tiers: bronze, silver, gold, platinum
- Auto-unlock when requirements met

**4. Quests**
- Daily challenges (e.g., visit 3 POIs today)
- Progress tracking (0-100%)
- Rewards: XP + mystery box

**5. Mystery Boxes**
- Earned every 10 POIs or quest completion
- Can be opened for AI-generated rewards

### Storage

All data in **localStorage**:
```javascript
wayvora_user_progress: {
  passport: {
    stamps: [],
    badges: [],
    statistics: { poisVisited, citiesVisited, ... },
    level: { level: 1, xp: 0, title: "Tourist" }
  },
  activeQuests: [],
  achievements: [],
  mysteryBoxes: []
}
wayvora_visited_pois: ["poi-id-1", "poi-id-2", ...]
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                   FRONTEND                          │
│  ┌────────────────────────────────────────────┐    │
│  │ page.tsx (Main orchestrator)               │    │
│  │ • State: mode, mapCenter, selectedPoi,     │    │
│  │   plannerPois, routeSegments               │    │
│  └────────────────────────────────────────────┘    │
│           │                                          │
│  ┌────────┴──────────┬──────────┬──────────┐       │
│  │                   │          │          │       │
│  ▼                   ▼          ▼          ▼       │
│ ┌────────┐  ┌──────────┐  ┌──────┐  ┌──────────┐  │
│ │Explorer│  │ WayvMap  │  │Plan  │  │Passport  │  │
│ │Sidebar │  │(Leaflet) │  │Sidebar│ │Panel     │  │
│ └────────┘  └──────────┘  └──────┘  └──────────┘  │
│                                                     │
│  ┌──────────────────── Services ─────────────────┐ │
│  │ • overpass.ts  - Fetch POIs                  │ │
│  │ • nominatim.ts - Geocoding                   │ │
│  │ • routing.ts   - OSRM routes                 │ │
│  │ • gamification - Passport system             │ │
│  └──────────────────────────────────────────────┘ │
└─────────────┬───────────────────────────────────────┘
              │
              ▼ HTTP Requests
┌─────────────────────────────────────────────────────┐
│                   BACKEND                           │
│  ┌──────────────────── Routes ──────────────────┐  │
│  │ • /api/proxy/overpass   - POI proxy         │  │
│  │ • /api/proxy/nominatim  - Geocoding proxy   │  │
│  │ • /api/ai/recommend     - AI suggestions    │  │
│  │ • /api/auth/*           - Authentication    │  │
│  └────────────────────────────────────────────── ┘  │
│                                                     │
│  ┌──────────────── Services ────────────────────┐  │
│  │ • cache.ts  - Redis caching                  │  │
│  │ • ollama.ts - AI integration                 │  │
│  └──────────────────────────────────────────────┘  │
└──────┬──────────┬──────────┬────────────────────────┘
       │          │          │
       ▼          ▼          ▼
   ┌─────┐   ┌─────┐   ┌──────┐
   │Postgr│   │Redis│   │Ollama│
   │SQL   │   │     │   │ AI   │
   └─────┘   └─────┘   └──────┘
```

---

## Key Components

### page.tsx (Main)
**State:**
- `mode`: explorer | planner
- `mapCenter`: { lat, lng }
- `selectedPoi`: POI | null
- `plannerPois`: POI[]
- `routeSegments`: RouteSegment[]

**Key Callbacks:**
- `handlePoiClick`: Show modal + gamification
- `handleMapMoved`: Load POIs for new center
- `handleSearchResult`: Jump to city + load POIs
- `addToPlanner`: Add POI to route
- `computeTheRoute`: Calculate route

### WayvMap (Leaflet)
**Features:**
- OpenStreetMap tiles
- POI markers (category-specific)
- Planner markers (numbered 1,2,3)
- Route polylines (blue lines)
- Auto-pan to selected POI
- Auto-fit bounds for routes

**Important:**
- `moveEndHandlerRef` prevents duplicate POI loads during programmatic pans
- Disabled for 500ms when center changes from search

### ExplorerSidebar
**Features:**
- City search with geocoding dropdown
- POI list (filtered by categories)
- Favorite button (♥)
- Add to planner (+)

### PlannerSidebar
**Features:**
- Transport mode selector
- Drag-to-reorder POI list
- Remove POI (×)
- Compute route button
- Route summary (distance, duration, segments)

### PassportPanel
**Features:**
- Level badge with XP progress bar
- 5 tabs: Overview, Stamps, Quests, Achievements, Mystery Boxes
- Real-time updates when POI visited

---

## API Flows

### POI Loading
```
Frontend → POST /api/proxy/overpass
  ↓
Backend checks Redis: overpass:{hash}
  ├─ Hit: Return cached
  └─ Miss:
      ↓
  POST https://overpass-api.de/api/interpreter
  query: [out:json]...(node["amenity"="restaurant"]...)...
      ↓
  Overpass returns OSM elements
      ↓
  Save to Redis (TTL: 6hrs)
      ↓
  Return to frontend
      ↓
Frontend maps elements to POI objects
```

### Geocoding
```
Frontend → GET /api/proxy/nominatim/search?q=Paris
  ↓
Backend checks Redis: nominatim:search:Paris:5
  ├─ Hit: Return cached
  └─ Miss:
      ↓
  GET https://nominatim.openstreetmap.org/search
      ↓
  Save to Redis (TTL: 24hrs)
      ↓
  Return to frontend
```

### Routing
```
Frontend → Direct to OSRM (no backend proxy)
GET http://router.project-osrm.org/route/v1/foot/
    2.3522,48.8566;2.2945,48.8584
    ?overview=full&geometries=geojson
  ↓
OSRM returns route with geometry
  ↓
Frontend converts [lng,lat] → {lat,lng}
```

---

## Adding Features

### Example: Add "Hotels" Category

**1. Add type:**
```typescript
// types/index.ts
export type POICategory = "restaurant" | "cafe" | "attraction" | 
                          "park" | "museum" | "hotel";
```

**2. Add config:**
```typescript
// utils/constants.ts
hotel: {
  emoji: "🏨",
  markerColor: "#EC4899",
  bgColor: "bg-pink-500/[0.15]",
  borderColor: "border-pink-500/[0.3]",
  textColor: "text-pink-300",
}
```

**3. Update Overpass query:**
```typescript
// services/overpass.ts
case "hotel":
  queries.push(`node["tourism"="hotel"](around:${radius},...);`);
  queries.push(`way["tourism"="hotel"](around:${radius},...);`);
  break;
```

**4. Update mapping:**
```typescript
// services/overpass.ts
else if (tags.tourism === "hotel") category = "hotel";
```

**5. Add to defaults:**
```typescript
// hooks/usePOIs.ts
const [activeCategories] = useState([
  "restaurant", "cafe", "attraction", "park", "museum", "hotel"
]);
```

Done! Hotels now appear everywhere.

---

## Debugging

### POIs Not Loading
**Check:**
1. Console for errors
2. Network tab: `/api/proxy/overpass` request
3. Redis connection: `docker compose ps`
4. Overpass query format in logs

**Common fixes:**
- Reduce radius (1000 instead of 1500)
- Restart Redis: `docker compose restart redis`
- Clear cache: `docker exec -it wayvora-redis redis-cli FLUSHALL`

### Map Not Appearing
**Check:**
1. Leaflet CSS imported: `import "leaflet/dist/leaflet.css"`
2. Container has height: `height: 100vh`
3. Ref is set: `<div ref={containerRef} />`

### Passport Not Saving
**Check:**
1. localStorage available: `localStorage.getItem('wayvora_user_progress')`
2. Quota not exceeded
3. saveProgress() is called (add console.log)

### Route Fails
**Check:**
1. POI coordinates valid (not 0,0)
2. OSRM endpoint accessible
3. Transport mode supported

---

## Performance Tips

**1. Memoize expensive components:**
```typescript
export default React.memo(POICard);
```

**2. Debounce map movements:**
```typescript
const handleMapMoved = debounce((center) => load(center), 500);
```

**3. Virtualize long lists:**
```bash
npm install react-window
```

**4. Cache markers instead of recreating:**
```typescript
const markerCache = useRef(new Map());
// Reuse existing markers, only create new ones
```

---

## Project Structure

```
wayvora/
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx          # Main app component
│   │   │   └── layout.tsx        # Root layout
│   │   ├── components/
│   │   │   ├── Navbar.tsx
│   │   │   ├── ExplorerSidebar.tsx
│   │   │   ├── PlannerSidebar.tsx
│   │   │   ├── WayvMap.tsx       # Leaflet map
│   │   │   ├── PassportPanel.tsx # Gamification UI
│   │   │   ├── POIDetailCard.tsx
│   │   │   └── CategoryFilter.tsx
│   │   ├── hooks/
│   │   │   ├── usePOIs.ts        # POI state management
│   │   │   ├── useFavorites.ts   # Favorites localStorage
│   │   │   └── useAuth.tsx       # Authentication
│   │   ├── services/
│   │   │   ├── overpass.ts       # POI fetching
│   │   │   ├── nominatim.ts      # Geocoding
│   │   │   ├── routing.ts        # OSRM routing
│   │   │   ├── gamification.ts   # Passport system
│   │   │   └── api.ts            # Backend calls
│   │   ├── types/
│   │   │   ├── index.ts          # Main types
│   │   │   └── gamification.ts   # Passport types
│   │   └── utils/
│   │       └── constants.ts      # Category configs
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── proxy.ts          # API proxies
│   │   │   ├── ai.ts             # AI recommendations
│   │   │   ├── auth.ts           # Authentication
│   │   │   ├── favorites.ts      # Favorites CRUD
│   │   │   └── itineraries.ts    # Routes CRUD
│   │   ├── services/
│   │   │   ├── cache.ts          # Redis wrapper
│   │   │   └── ollama.ts         # AI integration
│   │   └── index.ts              # Express server
│   └── package.json
├── database/
│   ├── schema.sql                # DB schema
│   └── seed.sql                  # Sample data
└── docker-compose.yml            # Infrastructure
```

---

## Environment Variables

```bash
# Backend (.env)
DATABASE_URL=postgresql://wayvora:wayvora@localhost:5432/wayvora
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3
PORT=3001
JWT_SECRET=your-secret-key

# Frontend (.env.local)
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api
NEXT_PUBLIC_OSRM_URL=http://router.project-osrm.org
```

---

## Quick Start Commands

```bash
# Install
npm install

# Start infrastructure
docker compose up -d

# Pull AI model (first time)
docker exec wayvora-ollama ollama pull llama3

# Configure
cp .env.example .env
cp .env backend/.env

# Start app
npm run dev
# → Frontend: http://localhost:3000
# → Backend: http://localhost:3001

# Optional: Warm cache
cd backend && npm run warm-cache

# View Redis data
# Open http://localhost:5540 (RedisInsight)
```

---

## Summary

**What happens when app loads:**
1. Get user location → Load nearby POIs → Show on map
2. POIs fetched from Overpass API (cached in Redis)
3. Passport system loads from localStorage

**What happens when user searches city:**
1. Geocode query → Get coordinates → Jump to location
2. Immediately fetch POIs for new location
3. Map animates while POIs load

**What happens when user clicks POI:**
1. Show detail modal
2. Check if first visit → Create stamp → Award XP
3. Check level up → Check achievements → Check mystery box
4. Save progress to localStorage
5. Update Passport UI in real-time

**What happens when user computes route:**
1. Validate 2+ POIs with real coordinates
2. For each pair: Query OSRM for route segment
3. Aggregate segments → Calculate totals
4. Draw polylines on map → Fit bounds
5. Show summary in sidebar

**Key files to understand:**
- `frontend/src/app/page.tsx` - Main state & logic
- `frontend/src/hooks/usePOIs.ts` - POI loading & filtering
- `frontend/src/services/gamification.ts` - Passport system
- `frontend/src/components/WayvMap.tsx` - Map rendering
- `backend/src/routes/proxy.ts` - API proxy with caching

With this guide, you should be able to navigate the codebase, understand data flows, add features, and debug issues effectively.