# Wayvora API Documentation

Base URL: `http://localhost:3001/api`

## Authentication

All authenticated endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### Register
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response**: Same as register

### Get Current User
```http
GET /auth/me
Authorization: Bearer <token>
```

**Response**:
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "created_at": "2024-02-04T20:00:00Z"
}
```

## Explorer Passport System

### Get My Passport
```http
GET /passport/me
Authorization: Bearer <token>
```

**Response**:
```json
{
  "id": "uuid",
  "userId": "uuid",
  "level": 15,
  "title": "Seasoned Traveler",
  "xp": 1250,
  "xpToNext": 1500,
  "statistics": {
    "citiesVisited": 8,
    "poisVisited": 142,
    "distanceTraveled": 245000,
    "countriesExplored": 3
  },
  "summary": {
    "totalStamps": 23,
    "totalBadges": 12,
    "totalAchievements": 5,
    "totalCities": 8,
    "totalCountries": 3,
    "level": 15,
    "title": "Seasoned Traveler",
    "xp": 1250
  },
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-02-04T20:00:00Z"
}
```

### Get All Stamps
```http
GET /passport/stamps
Authorization: Bearer <token>
```

**Response**:
```json
[
  {
    "cityName": "Paris",
    "countryCode": "FR",
    "stampCount": 8,
    "neighborhoods": [
      {
        "id": "uuid",
        "neighborhoodName": "Latin Quarter",
        "rarity": "common",
        "uniquePOIsVisited": 5,
        "earnedAt": "2024-02-01T14:30:00Z",
        "aiDescription": "Did you know? The Latin Quarter was home to medieval scholars..."
      },
      {
        "id": "uuid",
        "neighborhoodName": "Montmartre",
        "rarity": "common",
        "uniquePOIsVisited": 3,
        "earnedAt": "2024-02-02T16:00:00Z",
        "aiDescription": "Did you know? Montmartre was once an independent village..."
      }
    ]
  },
  {
    "cityName": "Tokyo",
    "countryCode": "JP",
    "stampCount": 5,
    "neighborhoods": [...]
  }
]
```

### Award a Stamp
```http
POST /passport/stamps
Authorization: Bearer <token>
Content-Type: application/json

{
  "neighborhoodName": "Latin Quarter",
  "cityName": "Paris",
  "countryCode": "FR",
  "coordinates": {
    "lat": 48.8534,
    "lng": 2.3488
  },
  "uniquePOIsVisited": 5
}
```

**Response**:
```json
{
  "stamp": {
    "id": "uuid",
    "userId": "uuid",
    "neighborhoodName": "Latin Quarter",
    "cityName": "Paris",
    "countryCode": "FR",
    "coordinates": {"lat": 48.8534, "lng": 2.3488},
    "rarity": "common",
    "uniquePOIsVisited": 5,
    "aiDescription": "Did you know? The Latin Quarter was home to...",
    "earnedAt": "2024-02-04T20:00:00Z"
  },
  "xpGained": 20,
  "aiDescription": "Did you know? The Latin Quarter was home to..."
}
```

**Notes**:
- Duplicate stamps (same neighborhood + city) update POI count instead of creating new stamp
- System automatically checks for city/country badge eligibility
- XP is awarded based on rarity (10 base + 10 common / 20 rare / 50 legendary)

### Get All Badges
```http
GET /passport/badges
Authorization: Bearer <token>
```

**Response**:
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "badgeId": "city_paris",
    "name": "Paris Explorer",
    "description": "Explored 5+ neighborhoods in Paris",
    "category": "special",
    "iconEmoji": "🏙️",
    "rarity": "gold",
    "earnedAt": "2024-02-03T12:00:00Z"
  },
  {
    "id": "uuid",
    "badgeId": "country_fr",
    "name": "France Explorer",
    "description": "Visited 3+ cities in France",
    "category": "special",
    "iconEmoji": "🌍",
    "rarity": "platinum",
    "earnedAt": "2024-02-04T15:00:00Z"
  }
]
```

### Get All Achievements
```http
GET /passport/achievements
Authorization: Bearer <token>
```

**Response**:
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "achievementId": "first_stamp",
    "name": "First Steps",
    "description": "Earned your first neighborhood stamp",
    "category": "milestone",
    "iconEmoji": "🎉",
    "tier": "bronze",
    "xpReward": 50,
    "earnedAt": "2024-01-15T10:30:00Z"
  }
]
```

### Get Statistics
```http
GET /passport/statistics
Authorization: Bearer <token>
```

**Response**:
```json
{
  "citiesVisited": 8,
  "countriesExplored": 3,
  "totalStamps": 23,
  "totalPoisVisited": 142,
  "legendaryStamps": 2,
  "rareStamps": 8,
  "commonStamps": 13,
  "totalBadges": 12,
  "totalAchievements": 5,
  "level": 15,
  "xp": 1250
}
```

## AI Features

All AI endpoints support caching. Cached responses include `"cached": true`.

### Get AI Recommendations
```http
POST /ai/recommendations
Content-Type: application/json

{
  "selectedPois": [
    {
      "name": "Eiffel Tower",
      "category": "attraction",
      "address": "Paris, France"
    },
    {
      "name": "Louvre Museum",
      "category": "museum",
      "address": "Paris, France"
    }
  ],
  "userPreferences": "I love art and history"
}
```

**Response**:
```json
{
  "recommendations": [
    {
      "name": "Musée d'Orsay",
      "category": "museum",
      "reason": "Complementary art museum with impressionist masterpieces"
    },
    {
      "name": "Notre-Dame Cathedral",
      "category": "attraction",
      "reason": "Historic landmark near the Louvre with stunning architecture"
    }
  ],
  "cached": false
}
```

### Get Travel Tips
```http
POST /ai/travel-tips
Content-Type: application/json

{
  "poi": {
    "name": "Eiffel Tower",
    "category": "attraction",
    "address": "Paris, France"
  }
}
```

**Response**:
```json
{
  "description": "The Eiffel Tower is an iconic iron lattice tower...",
  "tips": [
    "Book tickets online to skip long queues",
    "Visit at sunset for stunning views",
    "Allow 2-3 hours for the full experience"
  ],
  "localInsights": "Locals recommend visiting Trocadéro Gardens for the best photo angles",
  "cached": false
}
```

### Get Neighborhood Fact
```http
POST /ai/neighborhood-fact
Content-Type: application/json

{
  "neighborhood": "Latin Quarter",
  "city": "Paris"
}
```

**Response**:
```json
{
  "fact": "Did you know? The Latin Quarter was home to medieval scholars and is now one of Paris's most vibrant intellectual hubs!",
  "neighborhood": "Latin Quarter",
  "city": "Paris",
  "generatedAt": "2024-02-04T20:00:00Z",
  "cached": true
}
```

**Note**: Cached for 7 days (facts don't change)

### Get City Summary
```http
POST /ai/city-summary
Content-Type: application/json

{
  "cityName": "Paris",
  "neighborhoodsVisited": ["Latin Quarter", "Montmartre", "Le Marais"],
  "poisVisited": 25
}
```

**Response**:
```json
{
  "summary": "You've explored the heart of Paris, wandering through historic neighborhoods like the Latin Quarter and artistic Montmartre. With 25 unique places discovered, you're building an incredible collection of Parisian memories!",
  "cityName": "Paris",
  "neighborhoodsVisited": 3,
  "poisVisited": 25,
  "generatedAt": "2024-02-04T20:00:00Z"
}
```

### Get Historical Context
```http
POST /ai/historical-context
Content-Type: application/json

{
  "name": "Notre-Dame Cathedral",
  "category": "attraction",
  "address": "Paris, France"
}
```

**Response**:
```json
{
  "context": "Notre-Dame Cathedral, begun in 1163, is a masterpiece of French Gothic architecture. It has witnessed centuries of French history, from royal weddings to the French Revolution, and remains a symbol of Parisian resilience.",
  "poi": {
    "name": "Notre-Dame Cathedral",
    "category": "attraction",
    "address": "Paris, France"
  },
  "generatedAt": "2024-02-04T20:00:00Z"
}
```

## Proxy Endpoints (External APIs with Caching)

### Query Overpass API (POIs)
```http
POST /proxy/overpass
Content-Type: application/json

{
  "query": "[out:json][timeout:25];(node[\"tourism\"=\"museum\"](48.8566,2.3522,48.8800,2.4000););out body;>;out skel qt;"
}
```

**Response**: Overpass API JSON response (cached for 1 hour)

### Geocoding Search
```http
GET /proxy/nominatim/search?q=Eiffel+Tower&format=json&limit=1
```

**Response**: Nominatim JSON response (cached for 24 hours)

### Reverse Geocoding
```http
GET /proxy/nominatim/reverse?lat=48.8584&lon=2.2945&format=json
```

**Response**: Nominatim JSON response (cached for 24 hours)

## Favorites

### Get Favorites
```http
GET /favorites
Authorization: Bearer <token>
```

### Add Favorite
```http
POST /favorites
Authorization: Bearer <token>
Content-Type: application/json

{
  "poiId": "unique-poi-id",
  "poiData": {
    "name": "Eiffel Tower",
    "category": "attraction",
    "coordinates": {"lat": 48.8584, "lng": 2.2945}
  }
}
```

### Delete Favorite
```http
DELETE /favorites/:id
Authorization: Bearer <token>
```

## Itineraries

### Get Itineraries
```http
GET /itineraries
Authorization: Bearer <token>
```

### Create Itinerary
```http
POST /itineraries
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Paris Weekend Trip",
  "routeData": {
    "waypoints": [...]
  },
  "notes": "Visit museums first, cafes in afternoon"
}
```

### Update Itinerary
```http
PUT /itineraries/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Trip Name",
  "routeData": {...},
  "notes": "Updated notes"
}
```

### Delete Itinerary
```http
DELETE /itineraries/:id
Authorization: Bearer <token>
```

## Health Check

### Get Service Health
```http
GET /health
```

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2024-02-04T20:00:00Z",
  "environment": "production",
  "services": {
    "database": "connected",
    "redis": "connected",
    "ollama": {
      "baseUrl": "http://ollama:11434",
      "model": "llama3"
    }
  }
}
```

## Cache Management

### Clear Cache
```http
DELETE /cache/clear
Authorization: Bearer <token>
```

Clear all cached data. Use after major changes or if experiencing stale data.

**Response**:
```json
{
  "success": true,
  "deletedCount": 42,
  "pattern": "all",
  "message": "Cleared 42 cached entries"
}
```

**Clear specific pattern**:
```http
DELETE /cache/clear?pattern=overpass
DELETE /cache/clear?pattern=nominatim
DELETE /cache/clear?pattern=ai
```

### Get Cache Statistics
```http
GET /cache/stats
Authorization: Bearer <token>
```

**Response**:
```json
{
  "total": 42,
  "breakdown": {
    "overpass": 15,
    "nominatim": 20,
    "ai": 5,
    "passport": 2,
    "stamps": 0
  }
}
```

## Rate Limits

- **API Endpoints**: 100 requests per 15 minutes
- **Auth Endpoints**: 5 requests per 15 minutes
- **Proxy Endpoints**: 30 requests per minute

Rate limit headers included in responses:
```
RateLimit-Limit: 100
RateLimit-Remaining: 95
RateLimit-Reset: 1612450800
```

## Error Responses

### Standard Error Format
```json
{
  "error": "Error message here"
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error
- `503` - Service Unavailable (external API)
- `504` - Gateway Timeout

## Caching Information

Responses include cache status when applicable:
```json
{
  "data": "...",
  "cached": true
}
```

Cache TTLs:
- Overpass: 1 hour
- Nominatim: 24 hours
- AI Neighborhood Facts: 7 days
- AI Tips: 1 hour
- AI Recommendations: 30 minutes
- User Passport: 5 minutes
- Stamps: 5 minutes