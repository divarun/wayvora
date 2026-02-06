import { setCache, CACHE_TTL, getGridCacheKey, deleteCachePattern, getCache } from '../services/cache';
import { getCachedCityCoordinates, warmGeocodingCache } from './warmGeocoding';
import crypto from 'crypto';
import { CITIES } from '../data/cities';
import redis from '../services/cache';

const OVERPASS_URL = process.env.OVERPASS_URL || 'https://overpass-api.de/api';

// Categories to pre-fetch for each city
const CATEGORIES = ['restaurant', 'cafe', 'museum', 'park', 'attraction'] as const;
type POICategory = typeof CATEGORIES[number];

// Search radius in meters
const RADIUS = 1500;

// Delay between requests to avoid rate limiting (in ms)
const REQUEST_DELAY = 5000;

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAYS = [10000, 30000, 60000]; // 10s, 30s, 60s

// Minimum TTL threshold - if cache has less than this, re-warm it
const MIN_TTL_THRESHOLD = 1800; // 30 minutes

// Track failures for retry
interface FailedCity {
  name: string;
  error: string;
  attempts: number;
}

const failedCities: FailedCity[] = [];

/**
 * Build optimized Overpass query for a city
 */
function buildQuery(
  lat: number,
  lng: number,
  radius: number,
  categories: readonly POICategory[]
): string {
  const queries: string[] = [];

  categories.forEach((category) => {
    switch (category) {
      case 'restaurant':
        queries.push(`node["amenity"="restaurant"](around:${radius},${lat},${lng});`);
        break;
      case 'cafe':
        queries.push(`node["amenity"="cafe"](around:${radius},${lat},${lng});`);
        break;
      case 'museum':
        queries.push(`node["tourism"="museum"](around:${radius},${lat},${lng});`);
        queries.push(`way["tourism"="museum"](around:${radius},${lat},${lng});`);
        break;
      case 'park':
        queries.push(`node["leisure"="park"](around:${radius},${lat},${lng});`);
        queries.push(`way["leisure"="park"](around:${radius},${lat},${lng});`);
        break;
      case 'attraction':
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
 * Fetch POI data from Overpass API with retry logic
 */
async function fetchFromOverpass(query: string, retryCount = 0): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(`${OVERPASS_URL}/interpreter`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Wayvora-CacheWarmer/2.0',
      },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();

      // If 504 (timeout) or 429 (rate limit), retry
      if ((response.status === 504 || response.status === 429) && retryCount < MAX_RETRIES) {
        const delay = RETRY_DELAYS[retryCount] || 60000;
        console.log(`⏳ Retry ${retryCount + 1}/${MAX_RETRIES} after ${delay / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchFromOverpass(query, retryCount + 1);
      }

      throw new Error(
        `Overpass API error ${response.status}: ${errorText.substring(0, 100)}`
      );
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);

    // Retry on network errors
    if (retryCount < MAX_RETRIES && error instanceof Error) {
      if (error.name === 'AbortError' || error.message.includes('fetch')) {
        const delay = RETRY_DELAYS[retryCount] || 60000;
        console.log(`⏳ Network error - Retry ${retryCount + 1}/${MAX_RETRIES} after ${delay / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchFromOverpass(query, retryCount + 1);
      }
    }

    throw error;
  }
}

/**
 * Check if city is already cached with sufficient TTL
 */
async function isCityCached(cityName: string): Promise<{ cached: boolean; ttl?: number }> {
  try {
    const coords = await getCachedCityCoordinates(cityName);
    if (!coords) {
      return { cached: false };
    }

    const cacheKey = getGridCacheKey(coords.lat, coords.lng, RADIUS, [...CATEGORIES]);

    // Check if key exists
    const cached = await getCache(cacheKey);
    if (!cached) {
      return { cached: false };
    }

    // Check TTL
    const ttl = await redis.ttl(cacheKey);

    // TTL -1 means no expiration (shouldn't happen with our setup)
    // TTL -2 means key doesn't exist
    // TTL > 0 means time remaining
    if (ttl === -2) {
      return { cached: false };
    }

    return { cached: true, ttl };
  } catch (error) {
    console.error(`Error checking cache for ${cityName}:`, error);
    return { cached: false };
  }
}

/**
 * Warm cache for a single city
 */
async function warmCityCache(cityName: string, skipIfExists = false): Promise<boolean> {
  try {
    // Skip if already cached with sufficient TTL (for resume functionality)
    if (skipIfExists) {
      const { cached, ttl } = await isCityCached(cityName);

      if (cached) {
        if (ttl && ttl > MIN_TTL_THRESHOLD) {
          const hours = Math.floor(ttl / 3600);
          const minutes = Math.floor((ttl % 3600) / 60);
          console.log(`⏭️  ${cityName}: Already cached (TTL: ${hours}h ${minutes}m remaining), skipping...`);
          return true;
        } else if (ttl) {
          const minutes = Math.floor(ttl / 60);
          console.log(`🔄 ${cityName}: Cache exists but TTL low (${minutes}m), re-warming...`);
        }
      }
    }

    console.log(`🔥 Warming POI cache for ${cityName}...`);

    // Get coordinates from Nominatim cache
    const coords = await getCachedCityCoordinates(cityName);

    if (!coords) {
      console.log(`⚠️  ${cityName}: No coordinates found in cache. Run geocoding warmer first.`);
      failedCities.push({ name: cityName, error: 'No coordinates', attempts: 1 });
      return false;
    }

    const query = buildQuery(coords.lat, coords.lng, RADIUS, CATEGORIES);

    // Use grid-based cache key instead of query hash
    const cacheKey = getGridCacheKey(coords.lat, coords.lng, RADIUS, [...CATEGORIES]);

    console.log(`📍 ${cityName}: Cache key = ${cacheKey}`);

    // Fetch data from Overpass with retries
    const data = await fetchFromOverpass(query);

    if (!data.elements || data.elements.length === 0) {
      console.log(`⚠️  ${cityName}: No POIs found`);
      return false;
    }

    // Store in Redis with extended TTL for popular cities
    await setCache(cacheKey, data, CACHE_TTL.OVERPASS * 2); // 2 hours for pre-cached cities

    console.log(`✅ ${cityName}: Cached ${data.elements.length} POIs at grid (${coords.lat.toFixed(2)}, ${coords.lng.toFixed(2)})`);
    console.log(`   Key: ${cacheKey}`);
    return true;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`❌ ${cityName}: Failed -`, errorMsg);

    // Track failure
    const existing = failedCities.find(f => f.name === cityName);
    if (existing) {
      existing.attempts++;
      existing.error = errorMsg;
    } else {
      failedCities.push({ name: cityName, error: errorMsg, attempts: 1 });
    }

    return false;
  }
}

/**
 * Delay helper
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Save failed cities to a file for later retry
 */
async function saveFailedCities(): Promise<void> {
  if (failedCities.length === 0) return;

  const fs = require('fs');
  const path = require('path');

  const failedFile = path.join(__dirname, '../../data/failed_cities.json');
  const data = {
    timestamp: new Date().toISOString(),
    failures: failedCities
  };

  fs.writeFileSync(failedFile, JSON.stringify(data, null, 2));
  console.log(`\n💾 Saved ${failedCities.length} failed cities to ${failedFile}`);
}

/**
 * Load and retry failed cities
 */
async function retryFailedCities(): Promise<void> {
  const fs = require('fs');
  const path = require('path');

  const failedFile = path.join(__dirname, '../../data/failed_cities.json');

  if (!fs.existsSync(failedFile)) {
    console.log('❌ No failed cities file found');
    return;
  }

  const data = JSON.parse(fs.readFileSync(failedFile, 'utf-8'));
  const citiesToRetry = data.failures.map((f: FailedCity) => f.name);

  console.log(`\n🔄 Retrying ${citiesToRetry.length} failed cities...\n`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < citiesToRetry.length; i++) {
    const cityName = citiesToRetry[i];
    const success = await warmCityCache(cityName);
    success ? successCount++ : failCount++;

    if (i < citiesToRetry.length - 1) {
      console.log(`⏳ Waiting ${REQUEST_DELAY / 1000}s before next request...\n`);
      await delay(REQUEST_DELAY);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Retry complete: ${successCount} success, ${failCount} failed`);
  console.log('='.repeat(60));

  // If all succeeded, delete the failed cities file
  if (failCount === 0) {
    fs.unlinkSync(failedFile);
    console.log('🗑️  Deleted failed cities file (all successful)');
  } else {
    await saveFailedCities();
  }
}

/**
 * Main cache warming function with geocoding
 */
export async function warmMajorCities(citiesList?: string[], options?: {
  skipExisting?: boolean;
  saveFailures?: boolean;
}): Promise<void> {
  const skipExisting = options?.skipExisting ?? false;
  const saveFailures = options?.saveFailures ?? true;

  console.log('🚀 Starting cache warming with Nominatim...\n');
  if (skipExisting) {
    console.log(`⏭️  Skip mode: Will skip cached cities with TTL > ${MIN_TTL_THRESHOLD / 60} minutes\n`);
  }

  const citiesToWarm = citiesList || CITIES;

  console.log('📍 Step 1/2: Warming geocoding cache...\n');
  await warmGeocodingCache(citiesToWarm, skipExisting);

  console.log('\n⏳ Waiting 5 seconds before starting POI cache warming...\n');
  await delay(5000);

  console.log('🗺️  Step 2/2: Warming POI cache...\n');

  let successCount = 0;
  let failCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < citiesToWarm.length; i++) {
    const success = await warmCityCache(citiesToWarm[i], skipExisting);

    if (success) {
      successCount++;
    } else {
      failCount++;
    }

    if (i < citiesToWarm.length - 1) {
      console.log(`⏳ Waiting ${REQUEST_DELAY / 1000}s before next request...\n`);
      await delay(REQUEST_DELAY);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Cache warming finished`);
  console.log(`   Geocoding: done`);
  console.log(`   POI Cache: ${successCount} success, ${failCount} failed`);
  if (skipExisting) {
    console.log(`   Skipped: ${skippedCount} (already cached)`);
  }
  console.log('='.repeat(60));

  // Save failed cities for retry
  if (saveFailures && failedCities.length > 0) {
    await saveFailedCities();
    console.log('\n💡 To retry failed cities, run: npm run warm-cache -- --retry-failed');
  }
}

/**
 * Warm cache for top priority cities
 */
export async function warmTopCities(): Promise<void> {
  await warmMajorCities(CITIES);
}

/**
 * Clear cache ONLY
 */
export async function clearCache(): Promise<void> {
  const deletedCount = await deleteCachePattern('wayvora:*');
  console.log(`[CACHE] Cleared all cache (${deletedCount} keys)`);
}

/**
 * CLI entrypoint
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--clear-cache')) {
    console.log('🧹 Clearing cache only...');
    await clearCache();
    process.exit(0);
  }

  if (args.includes('--retry-failed')) {
    await retryFailedCities();
    process.exit(0);
  }

  const skipExisting = args.includes('--skip-existing');
  const citiesToWarm = args.filter(arg => !arg.startsWith('--'));

  if (citiesToWarm.length > 0) {
    await warmMajorCities(citiesToWarm, { skipExisting });
  } else {
    await warmTopCities();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}