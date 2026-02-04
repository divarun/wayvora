import { LatLng, POI, POICategory } from "@/types";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/api";

/* ------------------------------------------------------------------ */
/* Overpass protection state                                           */
/* ------------------------------------------------------------------ */

let lastRequestTime = 0;
let overpassCooldownUntil = 0;

// simple in-memory cache (keyed by rounded coords + params)
const cache = new Map<string, POI[]>();

const MIN_REQUEST_INTERVAL = 1500; // ms
const COOLDOWN_AFTER_429 = 60_000; // ms
const CACHE_TTL = 5 * 60_000; // 5 minutes

const cacheTimestamps = new Map<string, number>();

/* ------------------------------------------------------------------ */
/* Mock fallback                                                       */
/* ------------------------------------------------------------------ */

function generateMockPOIs(
  center: LatLng,
  category: POICategory,
  count: number = 5
): POI[] {
  const mockData: Record<POICategory, string[]> = {
    restaurant: ["Le Bistro", "Pasta House", "Sushi Bar", "Steakhouse", "Pizzeria"],
    cafe: ["Coffee Corner", "Tea Time", "Espresso Bar", "Brew Cafe", "Morning Cup"],
    museum: ["City Museum", "Art Gallery", "History Museum", "Science Center", "Cultural Center"],
    park: ["Central Park", "Green Gardens", "River Walk", "Memorial Park", "City Plaza"],
    attraction: ["Monument", "Theater", "Concert Hall", "Zoo", "Aquarium"],
  };

  const names = mockData[category] || ["Place 1", "Place 2", "Place 3"];

  return names.slice(0, count).map((name, i) => ({
    id: `mock-${category}-${i}`,
    name,
    category,
    address: `${i + 1} Main Street`,
    coordinates: {
      lat: center.lat + (Math.random() - 0.5) * 0.01,
      lng: center.lng + (Math.random() - 0.5) * 0.01,
    },
    tags: category === "restaurant" ? ["international"] : undefined,
  }));
}

/* ------------------------------------------------------------------ */
/* Main fetch                                                          */
/* ------------------------------------------------------------------ */

export async function fetchPOIs(
  center: LatLng,
  radiusMeters: number = 500,
  categories: POICategory[] = ["restaurant", "cafe"]
): Promise<POI[]> {
  const now = Date.now();

  // Respect cooldown after 429
  if (now < overpassCooldownUntil) {
    return fallback(center, categories);
  }

  // Throttle request frequency
  if (now - lastRequestTime < MIN_REQUEST_INTERVAL) {
    return fallback(center, categories);
  }

  lastRequestTime = now;

  // Limit categories
  const limitedCategories = categories.slice(0, 2);

  // Cache key (rounded coords prevent spam while dragging)
  const key = buildCacheKey(center, radiusMeters, limitedCategories);

  const cached = cache.get(key);
  const cachedAt = cacheTimestamps.get(key);

  if (cached && cachedAt && now - cachedAt < CACHE_TTL) {
    return cached;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    const response = await fetch(`${BASE_URL}/proxy/overpass`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: buildOptimizedQuery(center, radiusMeters, limitedCategories),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 429) {
      console.warn("🚨 Overpass rate-limited — entering cooldown");
      overpassCooldownUntil = Date.now() + COOLDOWN_AFTER_429;
      return fallback(center, categories);
    }

    if (!response.ok) {
      return fallback(center, categories);
    }

    const data = await response.json();

    if (!data.elements?.length) {
      return fallback(center, categories);
    }

    const pois = data.elements
      .map(mapElementToPOI)
      .filter((p): p is POI => p !== null)
      .slice(0, 20);

    if (pois.length) {
      cache.set(key, pois);
      cacheTimestamps.set(key, Date.now());
      console.log(`✅ Loaded ${pois.length} POIs from Overpass`);
      return pois;
    }
  } catch {
    // ignored – fallback below
  }

  return fallback(center, categories);
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function fallback(center: LatLng, categories: POICategory[]): POI[] {
  const limited = categories.slice(0, 2);
  const mock: POI[] = [];
  limited.forEach((cat) => mock.push(...generateMockPOIs(center, cat, 3)));
  return mock;
}

function buildCacheKey(
  center: LatLng,
  radius: number,
  categories: POICategory[]
) {
  const lat = center.lat.toFixed(3);
  const lng = center.lng.toFixed(3);
  return `${lat},${lng}:${radius}:${categories.sort().join(",")}`;
}

/**
 * SINGLE Overpass operation
 * (critical for avoiding 429s)
 */
function buildOptimizedQuery(
  center: LatLng,
  radius: number,
  categories: POICategory[]
): string {
  const amenityValues = categories
    .filter((c) => c === "restaurant" || c === "cafe")
    .join("|");

  return `
    [out:json][timeout:10];
    node["amenity"~"${amenityValues}"]
      (around:${radius},${center.lat},${center.lng});
    out body 20;
  `;
}

function mapElementToPOI(el: any): POI | null {
  if (!el.lat || !el.lon) return null;

  const tags = el.tags || {};
  const name = tags.name || "Unnamed Place";

  let category: POICategory = "attraction";
  if (tags.amenity === "restaurant") category = "restaurant";
  else if (tags.amenity === "cafe") category = "cafe";
  else if (tags.tourism === "museum") category = "museum";
  else if (tags.leisure === "park") category = "park";

  return {
    id: `osm-${el.type}-${el.id}`,
    name,
    category,
    address: tags["addr:street"] || "Address not available",
    coordinates: { lat: el.lat, lng: el.lon },
    openingHours: tags.opening_hours,
    tags: tags.cuisine ? [tags.cuisine] : undefined,
  };
}
