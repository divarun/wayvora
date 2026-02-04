import { LatLng } from "@/types";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/api";

export interface GeocodingResult {
  id: string;
  displayName: string;
  coordinates: LatLng;
  type: string;
  category: string;
}

/* ------------------------------------------------------------------ */
/* Rate limiting + cache                                               */
/* ------------------------------------------------------------------ */

let last429Time = 0;
const COOLDOWN_AFTER_429 = 2000; // 2 seconds
const CACHE_TTL = 5 * 60_000; // 5 minutes

const searchCache = new Map<string, { timestamp: number; results: GeocodingResult[] }>();
const reverseCache = new Map<string, { timestamp: number; result: string }>();

/* ------------------------------------------------------------------ */
/* Geocoding search                                                    */
/* ------------------------------------------------------------------ */

export async function geocodeSearch(
  query: string,
  limit: number = 5
): Promise<GeocodingResult[]> {
  const now = Date.now();
  if (!query.trim() || now - last429Time < COOLDOWN_AFTER_429) return [];

  const key = query.trim().toLowerCase();
  const cached = searchCache.get(key);
  if (cached && now - cached.timestamp < CACHE_TTL) return cached.results;

  try {
    const params = new URLSearchParams({
      q: query,
      format: "json",
      limit: String(limit),
      addressdetails: "1",
      extratags: "1",
    });

    const response = await fetch(`${BASE_URL}/proxy/nominatim/search?${params}`, {
      headers: { "Content-Type": "application/json" },
    });

    if (response.status === 429) {
      last429Time = now;
      return [];
    }

    if (!response.ok) throw new Error(`Nominatim error: ${response.status}`);

    const data = await response.json();

    const results: GeocodingResult[] = data.map((item: any) => ({
      id: item.place_id,
      displayName: item.display_name,
      coordinates: { lat: parseFloat(item.lat), lng: parseFloat(item.lon) },
      type: item.type || "",
      category: item.category || "",
    }));

    searchCache.set(key, { timestamp: now, results });
    return results;
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ */
/* Reverse geocoding                                                   */
/* ------------------------------------------------------------------ */

export async function reverseGeocode(coords: LatLng): Promise<string> {
  const now = Date.now();
  const key = `${coords.lat.toFixed(5)},${coords.lng.toFixed(5)}`; // rounded to prevent spam
  const cached = reverseCache.get(key);
  if (cached && now - cached.timestamp < CACHE_TTL) return cached.result;

  if (now - last429Time < COOLDOWN_AFTER_429) {
    return `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;
  }

  try {
    const params = new URLSearchParams({
      lat: String(coords.lat),
      lon: String(coords.lng),
      format: "json",
      zoom: "16",
    });

    const response = await fetch(`${BASE_URL}/proxy/nominatim/reverse?${params}`, {
      headers: { "Content-Type": "application/json" },
    });

    if (response.status === 429) {
      last429Time = now;
      return `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;
    }

    if (!response.ok) {
      return `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;
    }

    const data = await response.json();
    const displayName = data.display_name || `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;

    reverseCache.set(key, { timestamp: now, result: displayName });
    return displayName;
  } catch {
    return `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;
  }
}
