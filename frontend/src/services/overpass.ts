import { LatLng, POI, POICategory } from "@/types";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/api";

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
  // Use smaller, safer radius (cap at 1500m)
  const safeRadius = Math.min(radiusMeters, 1500);

  try {
    const response = await fetch(`${BASE_URL}/proxy/overpass`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: buildOptimizedQuery(center, safeRadius, categories),
      }),
    });

    if (!response.ok) {
      console.error(`❌ Overpass proxy error ${response.status}`);
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
      .slice(0, 30);

    return pois.length ? pois : fallback(center, categories);
  } catch (err) {
    console.error("❌ Fetch error:", err);
    return fallback(center, categories);
  }
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
    if (el.center) {
      el.lat = el.center.lat;
      el.lon = el.center.lon;
    } else {
      return null;
    }
  }

  const tags = el.tags || {};
  const name = tags.name || tags["name:en"] || tags.operator || tags.brand || tags["alt_name"] || tags.description || tags.ref || "Unnamed Place";

  let category: POICategory = "attraction";
  if (tags.amenity === "restaurant") category = "restaurant";
  else if (tags.amenity === "cafe") category = "cafe";
  else if (tags.tourism === "museum") category = "museum";
  else if (tags.leisure === "park") category = "park";
  else if (tags.tourism === "attraction" || tags.tourism === "viewpoint") category = "attraction";

  const addressParts = [];
  if (tags["addr:housenumber"] && tags["addr:street"]) {
    addressParts.push(`${tags["addr:housenumber"]} ${tags["addr:street"]}`);
  } else if (tags["addr:street"]) {
    addressParts.push(tags["addr:street"]);
  }
  if (tags["addr:city"]) addressParts.push(tags["addr:city"]);
  else if (tags["addr:suburb"]) addressParts.push(tags["addr:suburb"]);
  else if (tags["addr:district"]) addressParts.push(tags["addr:district"]);

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
