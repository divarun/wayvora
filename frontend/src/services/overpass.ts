import { LatLng, POI, POICategory, OverpassResponse, OverpassElement } from "@/types";

const OVERPASS_URL = process.env.NEXT_PUBLIC_OVERPASS_URL || "https://overpass-api.de/api";

const CATEGORY_QUERIES: Record<POICategory, string> = {
  restaurant: `["amenity"="restaurant"]`,
  cafe: `["amenity"="cafe"]`,
  attraction: `["tourism"~"^(attraction|hotel|museum|theme_park|viewpoint|zoo|aquarium)$"]`,
  park: `["leisure"~"^(park|garden|common|recreation_ground)$"]`,
  museum: `["tourism"="museum"]`,
};

function buildQuery(center: LatLng, radiusMeters: number, categories: POICategory[]): string {
  const filters = categories.map((cat) => CATEGORY_QUERIES[cat]);
  const unionParts = filters
    .map(
      (filter) =>
        `node${filter}(around:${radiusMeters},${center.lat},${center.lng});` +
        `way${filter}(around:${radiusMeters},${center.lat},${center.lng});` +
        `relation${filter}(around:${radiusMeters},${center.lat},${center.lng});`
    )
    .join("");
  return `[out:json][timeout:25];(${unionParts});(._;>;.bt;);out center;`;
}

function mapElementToPOI(el: OverpassElement): POI | null {
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (lat === undefined || lng === undefined) return null;

  const tags = el.tags || {};
  const name = tags.name || "Unnamed Place";

  let category: POICategory = "attraction";
  if (tags.amenity === "restaurant") category = "restaurant";
  else if (tags.amenity === "cafe") category = "cafe";
  else if (tags.tourism === "museum") category = "museum";
  else if (tags.leisure === "park" || tags.leisure === "garden") category = "park";

  const address = [
    tags["addr:street"],
    tags["addr:housenumber"],
    tags["addr:city"],
    tags["addr:country"],
  ]
    .filter(Boolean)
    .join(", ") || "Address not available";

  return {
    id: `osm-${el.type}-${el.id}`,
    name,
    category,
    address,
    coordinates: { lat, lng },
    openingHours: tags.opening_hours,
    tags: tags.cuisine ? [tags.cuisine] : undefined,
    overpassId: `${el.type}/${el.id}`,
  };
}

export async function fetchPOIs(
  center: LatLng,
  radiusMeters: number = 2000,
  categories: POICategory[] = ["restaurant", "cafe", "attraction", "park", "museum"]
): Promise<POI[]> {
  const query = buildQuery(center, radiusMeters, categories);
  const url = `${OVERPASS_URL}/api/interpreter`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status}`);
  }

  const data: OverpassResponse = await response.json();
  const pois = data.elements.map(mapElementToPOI).filter((p): p is POI => p !== null);

  // Deduplicate by name + coordinates
  const seen = new Set<string>();
  return pois.filter((poi) => {
    const key = `${poi.name}|${poi.coordinates.lat.toFixed(4)}|${poi.coordinates.lng.toFixed(4)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
