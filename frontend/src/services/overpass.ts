import { LatLng, POI, POICategory } from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/api";

// Mock POI data as fallback when Overpass is down/slow
function generateMockPOIs(center: LatLng, category: POICategory, count: number = 5): POI[] {
  const mockData: Record<POICategory, string[]> = {
    restaurant: ['Le Bistro', 'Pasta House', 'Sushi Bar', 'Steakhouse', 'Pizzeria'],
    cafe: ['Coffee Corner', 'Tea Time', 'Espresso Bar', 'Brew Cafe', 'Morning Cup'],
    museum: ['City Museum', 'Art Gallery', 'History Museum', 'Science Center', 'Cultural Center'],
    park: ['Central Park', 'Green Gardens', 'River Walk', 'Memorial Park', 'City Plaza'],
    attraction: ['Monument', 'Theater', 'Concert Hall', 'Zoo', 'Aquarium']
  };

  const names = mockData[category] || ['Place 1', 'Place 2', 'Place 3'];

  return names.slice(0, count).map((name, i) => ({
    id: `mock-${category}-${i}`,
    name,
    category,
    address: `${i + 1} Main Street`,
    coordinates: {
      lat: center.lat + (Math.random() - 0.5) * 0.01,
      lng: center.lng + (Math.random() - 0.5) * 0.01
    },
    tags: category === 'restaurant' ? ['international'] : undefined
  }));
}

export async function fetchPOIs(
  center: LatLng,
  radiusMeters: number = 500, // Very small radius
  categories: POICategory[] = ["restaurant", "cafe"]
): Promise<POI[]> {
  // Limit to 2 categories max to reduce load
  const limitedCategories = categories.slice(0, 2);

  try {
    // Try Overpass with very small radius and short timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(`${BASE_URL}/proxy/overpass`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: buildSimpleQuery(center, radiusMeters, limitedCategories)
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data.elements && data.elements.length > 0) {
        const pois = data.elements
          .map(mapElementToPOI)
          .filter((p): p is POI => p !== null)
          .slice(0, 20); // Limit results

        if (pois.length > 0) {
          console.log(`✅ Loaded ${pois.length} POIs from Overpass`);
          return pois;
        }
      }
    }
  } catch (error) {
    console.warn('Overpass API unavailable, using mock data');
  }

  // Fallback to mock data
  console.log('📍 Using mock POI data (Overpass unavailable)');
  const mockPOIs: POI[] = [];
  limitedCategories.forEach(cat => {
    mockPOIs.push(...generateMockPOIs(center, cat, 3));
  });

  return mockPOIs;
}

// Simplified query - only nodes, no ways/relations
function buildSimpleQuery(center: LatLng, radiusMeters: number, categories: POICategory[]): string {
  const categoryMap: Record<POICategory, string> = {
    restaurant: 'node["amenity"="restaurant"]',
    cafe: 'node["amenity"="cafe"]',
    museum: 'node["tourism"="museum"]',
    park: 'node["leisure"="park"]',
    attraction: 'node["tourism"="attraction"]'
  };

  const parts = categories.map(cat =>
    `${categoryMap[cat]}(around:${radiusMeters},${center.lat},${center.lng});`
  ).join('');

  return `[out:json][timeout:10];(${parts});out body 20;`;
}

function mapElementToPOI(el: any): POI | null {
  const lat = el.lat;
  const lng = el.lon;
  if (!lat || !lng) return null;

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
    coordinates: { lat, lng },
    openingHours: tags.opening_hours,
    tags: tags.cuisine ? [tags.cuisine] : undefined,
  };
}