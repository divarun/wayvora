import { LatLng } from "@/types";

const NOMINATIM_URL = process.env.NEXT_PUBLIC_NOMINATIM_URL || "https://nominatim.openstreetmap.org";

export interface GeocodingResult {
  id: string;
  displayName: string;
  coordinates: LatLng;
  type: string;
  category: string;
}

export async function geocodeSearch(query: string, limit: number = 5): Promise<GeocodingResult[]> {
  if (!query.trim()) return [];

  const params = new URLSearchParams({
    q: query,
    format: "json",
    limit: String(limit),
    addressdetails: "1",
    extratags: "1",
  });

  const response = await fetch(`${NOMINATIM_URL}/search?${params}`, {
    headers: {
      "User-Agent": "Wayvora-Explorer/1.0",
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Nominatim error: ${response.status}`);
  }

  const data = await response.json();

  return data.map((item: Record<string, string>) => ({
    id: item.place_id,
    displayName: item.display_name,
    coordinates: {
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    },
    type: item.type || "",
    category: item.category || "",
  }));
}

export async function reverseGeocode(coords: LatLng): Promise<string> {
  const params = new URLSearchParams({
    lat: String(coords.lat),
    lon: String(coords.lng),
    format: "json",
    zoom: "16",
  });

  const response = await fetch(`${NOMINATIM_URL}/reverse?${params}`, {
    headers: {
      "User-Agent": "Wayvora-Explorer/1.0",
      Accept: "application/json",
    },
  });

  if (!response.ok) return `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;

  const data = await response.json();
  return data.display_name || `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;
}
