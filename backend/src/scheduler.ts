import cron from 'node-cron';
import { warmTopCities } from './scripts/warmCache';

/**
 * Schedule cache warming for top cities using Nominatim geocoding
 * Runs every 12 hours to keep cache fresh
 *
 * V2 uses Nominatim API to geocode cities instead of hardcoded coordinates
 */
export function startCacheWarmer(): void {
  console.log('📅 Cache warming scheduler started');

  // Run every 12 hours at :00 minutes
  // Pattern: "0 */12 * * *" means "At minute 0 past every 12th hour"
  // This is less aggressive than V1 since Nominatim geocoding adds extra requests
  cron.schedule('0 */12 * * *', async () => {
    console.log('\n⏰ Scheduled cache warming triggered (V2 with Nominatim)');
    try {
      await warmTopCitiesV2();
      console.log('✅ Scheduled cache warming completed successfully\n');
    } catch (error) {
      console.error('❌ Scheduled cache warming failed:', error);
    }
  });

  console.log('   Schedule: Every 12 hours (at :00 minutes)');
  console.log('   Method: Nominatim geocoding + Overpass POI fetch');
  console.log('   Cache TTL: 24h (Nominatim), 2h (POI data)');
  console.log('   You can also trigger manually via POST /api/cache/warm\n');
}

/**
 * More aggressive schedule for peak hours (optional)
 * Runs every 6 hours during typical usage times
 */
export function startAggressiveCacheWarmer(): void {
  console.log('📅 Aggressive cache warming scheduler (V2) started');

  // Run every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    console.log('\n⏰ Aggressive cache warming triggered (V2)');
    try {
      await warmTopCities();
      console.log('✅ Aggressive cache warming completed\n');
    } catch (error) {
      console.error('❌ Aggressive cache warming failed:', error);
    }
  });

  console.log('   Schedule: Every 6 hours');
  console.log('   Method: Nominatim geocoding + Overpass POI fetch');
  console.log('   Cities: Top 25 most popular cities\n');
}

