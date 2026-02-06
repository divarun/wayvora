import { setCache, getCache, CACHE_TTL } from '../services/cache';
import crypto from 'crypto';
import { CITIES } from '../data/cities';

const NOMINATIM_URL = process.env.NOMINATIM_URL || "https://nominatim.openstreetmap.org";

// Delay between requests to respect Nominatim rate limits
const REQUEST_DELAY = 1000; // 1 second (Nominatim allows 1 req/sec)



interface GeocodedCity {
  query: string;
  displayName: string;
  lat: number;
  lng: number;
  type: string;
  country: string;
}

/**
 * Geocode a city using Nominatim
 */
async function geocodeCity(cityQuery: string): Promise<GeocodedCity | null> {
  try {
    const params = new URLSearchParams({
      q: cityQuery,
      format: 'json',
      limit: '1',
      addressdetails: '1',
    });

    const response = await fetch(`${NOMINATIM_URL}/search?${params}`, {
      headers: {
        'User-Agent': 'Wayvora-GeocodeWarmer/1.0',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim error ${response.status}`);
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      return null;
    }

    const result = data[0];
    return {
      query: cityQuery,
      displayName: result.display_name,
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      type: result.type || 'city',
      country: result.address?.country || '',
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Generate cache key for geocoding
 */
function getGeocodeCacheKey(query: string): string {
  const normalizedQuery = query.trim().toLowerCase();
  const hash = crypto.createHash('md5').update(normalizedQuery).digest('hex');
  return `wayvora:nominatim:search:q=${normalizedQuery}&format=json&limit=1&addressdetails=1&extratags=1`;
}

/**
 * Warm geocoding cache for a single city
 */
async function warmCityGeocode(cityQuery: string): Promise<boolean> {
  try {
    console.log(`🌍 Geocoding: ${cityQuery}...`);

    const result = await geocodeCity(cityQuery);

    if (!result) {
      console.log(`⚠️  ${cityQuery}: Not found in Nominatim`);
      return false;
    }

    // Cache the Nominatim response in the same format the proxy would
    const cacheKey = getGeocodeCacheKey(cityQuery);
    const cacheData = [{
      place_id: result.query,
      display_name: result.displayName,
      lat: result.lat.toString(),
      lon: result.lng.toString(),
      type: result.type,
      category: 'place',
    }];

    await setCache(cacheKey, cacheData, CACHE_TTL.NOMINATIM);

    console.log(`✅ ${cityQuery}: (${result.lat.toFixed(4)}, ${result.lng.toFixed(4)}) - ${result.country}`);
    return true;
  } catch (error) {
    if (error instanceof Error) {
      console.error(`❌ ${cityQuery}: Failed -`, error.message);
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
 * Warm geocoding cache for all cities
 */
export async function warmGeocodingCache(citiesList?: string[]): Promise<void> {
  console.log('🚀 Starting geocoding cache warming...\n');

  const citiesToGeocode = citiesList || CITIES;
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < citiesToGeocode.length; i++) {
    const cityQuery = citiesToGeocode[i];

    const success = await warmCityGeocode(cityQuery);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }

    // Respect Nominatim rate limit (1 request per second)
    if (i < citiesToGeocode.length - 1) {
      await delay(REQUEST_DELAY);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Geocoding cache warming complete!`);
  console.log(`   Success: ${successCount} cities`);
  console.log(`   Failed: ${failCount} cities`);
  console.log(`   Cache TTL: ${CACHE_TTL.NOMINATIM / 3600} hours`);
  console.log('='.repeat(50));
}

/**
 * Get cached coordinates for a city
 */
export async function getCachedCityCoordinates(cityName: string): Promise<{ lat: number; lng: number } | null> {
  const cacheKey = getGeocodeCacheKey(cityName);
  const cached = await getCache<any[]>(cacheKey);

  if (cached && cached.length > 0) {
    return {
      lat: parseFloat(cached[0].lat),
      lng: parseFloat(cached[0].lon),
    };
  }

  return null;
}

// If running as a standalone script
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length > 0) {
    // Geocode specific cities
    warmGeocodingCache(args)
      .then(() => process.exit(0))
      .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
      });
  } else {
    // Geocode all cities
    warmGeocodingCache()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
      });
  }
}