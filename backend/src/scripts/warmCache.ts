import { setCache, CACHE_TTL } from '../services/cache';
import { getCachedCityCoordinates, warmGeocodingCache } from './warmGeocoding';
import crypto from 'crypto';
import { CITIES } from '../data/cities';

const OVERPASS_URL = process.env.OVERPASS_URL || "https://overpass-api.de/api";

// Categories to pre-fetch for each city
const CATEGORIES = ['restaurant', 'cafe', 'museum', 'park', 'attraction'] as const;
type POICategory = typeof CATEGORIES[number];

// Search radius in meters
const RADIUS = 1500;

// Delay between requests to avoid rate limiting (in ms)
const REQUEST_DELAY = 5000;


/**
 * Build optimized Overpass query for a city
 */
function buildQuery(lat: number, lng: number, radius: number, categories: POICategory[]): string {
  const queries: string[] = [];

  categories.forEach((category) => {
    switch (category) {
      case "restaurant":
        queries.push(`node["amenity"="restaurant"](around:${radius},${lat},${lng});`);
        break;
      case "cafe":
        queries.push(`node["amenity"="cafe"](around:${radius},${lat},${lng});`);
        break;
      case "museum":
        queries.push(`node["tourism"="museum"](around:${radius},${lat},${lng});`);
        queries.push(`way["tourism"="museum"](around:${radius},${lat},${lng});`);
        break;
      case "park":
        queries.push(`node["leisure"="park"](around:${radius},${lat},${lng});`);
        queries.push(`way["leisure"="park"](around:${radius},${lat},${lng});`);
        break;
      case "attraction":
        queries.push(`node["tourism"="attraction"](around:${radius},${lat},${lng});`);
        queries.push(`node["tourism"="viewpoint"](around:${radius},${lat},${lng});`);
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

/**
 * Fetch POI data from Overpass API
 */
async function fetchFromOverpass(query: string): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(`${OVERPASS_URL}/interpreter`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Wayvora-CacheWarmer/2.0"
      },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Overpass API error ${response.status}: ${errorText.substring(0, 100)}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Warm cache for a single city
 */
async function warmCityCache(cityName: string): Promise<boolean> {
  try {
    console.log(`🔥 Warming POI cache for ${cityName}...`);

    // Get coordinates from Nominatim cache
    const coords = await getCachedCityCoordinates(cityName);

    if (!coords) {
      console.log(`⚠️  ${cityName}: No coordinates found in cache. Run geocoding warmer first.`);
      return false;
    }

    const query = buildQuery(coords.lat, coords.lng, RADIUS, CATEGORIES);

    const queryHash = crypto.createHash('md5').update(query).digest('hex');

    const cacheKey = `wayvora:overpass:${queryHash}`;

    // Fetch data from Overpass
    const data = await fetchFromOverpass(query);

    if (!data.elements || data.elements.length === 0) {
      console.log(`⚠️  ${cityName}: No POIs found`);
      return false;
    }

    // Store in Redis with extended TTL for popular cities
    await setCache(cacheKey, data, CACHE_TTL.OVERPASS * 2); // 2 hours for pre-cached cities

    console.log(`✅ ${cityName}: Cached ${data.elements.length} POIs (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`);
    return true;
  } catch (error) {
    if (error instanceof Error) {
      console.error(`❌ ${cityName}: Failed -`, error.message);
    } else {
      console.error(`❌ ${cityName}: Failed -`, error);
    }
    return false;
  }
}

/**
 * Delay helper
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main cache warming function with geocoding
 */
export async function warmMajorCities(citiesList?: string[]): Promise<void> {
  console.log('🚀 Starting cache warming with Nominatim...\n');

  const citiesToWarm = citiesList || CITIES;

  // Step 1: Warm geocoding cache first
  console.log('📍 Step 1/2: Warming geocoding cache...\n');
  await warmGeocodingCache(citiesToWarm);

  console.log('\n⏳ Waiting 5 seconds before starting POI cache warming...\n');
  await delay(5000);

  // Step 2: Warm POI cache using geocoded coordinates
  console.log('🗺️  Step 2/2: Warming POI cache...\n');
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < citiesToWarm.length; i++) {
    const cityName = citiesToWarm[i];

    const success = await warmCityCache(cityName);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }

    // Add delay between requests to avoid rate limiting
    if (i < citiesToWarm.length - 1) {
      console.log(`⏳ Waiting ${REQUEST_DELAY / 1000}s before next request...\n`);
      await delay(REQUEST_DELAY);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Complete cache warming finished!`);
  console.log(`   Geocoding: All cities cached in Nominatim`);
  console.log(`   POI Cache: ${successCount} cities successful, ${failCount} failed`);
  console.log('='.repeat(60));
}

/**
 * Warm cache for top priority cities
 */
export async function warmTopCities(): Promise<void> {
  await warmMajorCities(CITIES);
}

// If running as a standalone script
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length > 0) {
    // Warm specific cities
    warmMajorCities(args)
      .then(() => process.exit(0))
      .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
      });
  } else {
    // Warm top cities
    warmTopCities()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
      });
  }
}
