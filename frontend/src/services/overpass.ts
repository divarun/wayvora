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

const MIN_REQUEST_INTERVAL = 2000; // Increased from 1500ms
const COOLDOWN_AFTER_429 = 60_000; // ms
const COOLDOWN_AFTER_504 = 30_000; // Added cooldown for timeouts
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
  radiusMeters: number = 1500,
  categories: POICategory[] = ["restaurant", "cafe"]
): Promise<POI[]> {
  const now = Date.now();

  // Respect cooldown after 429 or 504
  if (now < overpassCooldownUntil) {
    console.log(`⏳ Cooldown active until ${new Date(overpassCooldownUntil).toLocaleTimeString()}`);
    return fallback(center, categories);
  }

  // Throttle request frequency
  if (now - lastRequestTime < MIN_REQUEST_INTERVAL) {
    console.log("⏸️  Throttled: too many requests");
    return fallback(center, categories);
  }

  lastRequestTime = now;

  // Use smaller, safer radius (cap at 1500m instead of 2500m)
  const safeRadius = Math.min(radiusMeters, 1500);

  // Cache key (rounded coords prevent spam while dragging)
  const key = buildCacheKey(center, safeRadius, categories);

  const cached = cache.get(key);
  const cachedAt = cacheTimestamps.get(key);

  if (cached && cachedAt && now - cachedAt < CACHE_TTL) {
    console.log("✅ Using cached POIs");
    return cached;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15_000); // Increased to 15s

    const response = await fetch(`${BASE_URL}/proxy/overpass`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: buildOptimizedQuery(center, safeRadius, categories),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 429) {
      console.warn("🚨 Overpass rate-limited — entering cooldown");
      overpassCooldownUntil = Date.now() + COOLDOWN_AFTER_429;
      return fallback(center, categories);
    }

    if (response.status === 504) {
      console.warn("⏱️ Overpass timeout — entering short cooldown");
      overpassCooldownUntil = Date.now() + COOLDOWN_AFTER_504;
      return fallback(center, categories);
    }

    if (!response.ok) {
      console.error(`❌ Overpass error ${response.status}`);
      return fallback(center, categories);
    }

    const data = await response.json();

    if (!data.elements?.length) {
      console.log("📭 No POIs found, using fallback");
      return fallback(center, categories);
    }

    const pois = data.elements
      .map(mapElementToPOI)
      .filter((p): p is POI => p !== null)
      .slice(0, 30); // Increased from 20 to 30

    if (pois.length) {
      cache.set(key, pois);
      cacheTimestamps.set(key, Date.now());
      console.log(`✅ Loaded ${pois.length} POIs from Overpass`);
      return pois;
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.error("⏱️ Frontend request timeout");
      overpassCooldownUntil = Date.now() + COOLDOWN_AFTER_504;
    } else {
      console.error("❌ Fetch error:", err);
    }
  }

  return fallback(center, categories);
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function fallback(center: LatLng, categories: POICategory[]): POI[] {
  const mock: POI[] = [];
  categories.forEach((cat) => mock.push(...generateMockPOIs(center, cat, 3)));
  console.log(`🎭 Using ${mock.length} mock POIs`);
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
 * Build optimized Overpass query supporting ALL categories
 * Uses union query format for better performance
 */
function buildOptimizedQuery(
  center: LatLng,
  radius: number,
  categories: POICategory[]
): string {
  const queries: string[] = [];

  categories.forEach((category) => {
    switch (category) {
      case "restaurant":
        queries.push(`node["amenity"="restaurant"](around:${radius},${center.lat},${center.lng});`);
        break;
      case "cafe":
        queries.push(`node["amenity"="cafe"](around:${radius},${center.lat},${center.lng});`);
        break;
      case "museum":
        queries.push(`node["tourism"="museum"](around:${radius},${center.lat},${center.lng});`);
        queries.push(`way["tourism"="museum"](around:${radius},${center.lat},${center.lng});`);
        break;
      case "park":
        queries.push(`node["leisure"="park"](around:${radius},${center.lat},${center.lng});`);
        queries.push(`way["leisure"="park"](around:${radius},${center.lat},${center.lng});`);
        break;
      case "attraction":
        queries.push(`node["tourism"="attraction"](around:${radius},${center.lat},${center.lng});`);
        queries.push(`node["tourism"="viewpoint"](around:${radius},${center.lat},${center.lng});`);
        break;
    }
  });

  return `
[out:json][timeout:25];
(
  ${queries.join('\n  ')}
);
out body center 30;
>;
out skel qt;
  `.trim();
}

function mapElementToPOI(el: any): POI | null {
  if (!el.lat && !el.lon) {
    // For ways/areas, get center point
    if (el.center) {
      el.lat = el.center.lat;
      el.lon = el.center.lon;
    } else {
      return null;
    }
  }

  const tags = el.tags || {};

  // Try multiple name fields in order of preference
  const name = tags.name ||
               tags["name:en"] ||
               tags.operator ||
               tags.brand ||
               tags["alt_name"] ||
               tags.description ||
               tags.ref ||
               (tags.tourism && `${tags.tourism.charAt(0).toUpperCase() + tags.tourism.slice(1)}`) ||
               (tags.amenity && `${tags.amenity.charAt(0).toUpperCase() + tags.amenity.slice(1)}`) ||
               (tags.leisure && `${tags.leisure.charAt(0).toUpperCase() + tags.leisure.slice(1)}`) ||
               "Unnamed Place";

  let category: POICategory = "attraction";
  if (tags.amenity === "restaurant") category = "restaurant";
  else if (tags.amenity === "cafe") category = "cafe";
  else if (tags.tourism === "museum") category = "museum";
  else if (tags.leisure === "park") category = "park";
  else if (tags.tourism === "attraction" || tags.tourism === "viewpoint") category = "attraction";

  // Build address from available tags
  const addressParts = [];
  if (tags["addr:housenumber"] && tags["addr:street"]) {
    addressParts.push(`${tags["addr:housenumber"]} ${tags["addr:street"]}`);
  } else if (tags["addr:street"]) {
    addressParts.push(tags["addr:street"]);
  }
  if (tags["addr:city"]) {
    addressParts.push(tags["addr:city"]);
  } else if (tags["addr:suburb"]) {
    addressParts.push(tags["addr:suburb"]);
  } else if (tags["addr:district"]) {
    addressParts.push(tags["addr:district"]);
  }

  const address = addressParts.length > 0 ? addressParts.join(", ") : "Address not available";

  return {
    id: `osm-${el.type}-${el.id}`,
    name,
    category,
    address,
    coordinates: { lat: el.lat, lng: el.lon },
    openingHours: tags.opening_hours,
    tags: tags.cuisine ? [tags.cuisine] : undefined,
  };
}