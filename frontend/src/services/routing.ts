import { LatLng, TransportMode, RouteSegment, POI, OSRMRouteResponse } from "@/types";

const OSRM_URL = process.env.NEXT_PUBLIC_OSRM_URL || "http://router.project-osrm.org";

const MODE_TO_PROFILE: Record<TransportMode, string> = {
  walk: "foot",
  bike: "bike",
  car: "car",
  transit: "car", // OSRM public doesn't have transit; fallback to car
};

function coordsToOSRM(coords: LatLng[]): string {
  return coords.map((c) => `${c.lng},${c.lat}`).join(";");
}

function parseGeometry(encoded: string): LatLng[] {
  // OSRM returns GeoJSON geometry when geometry=geojson
  try {
    const geojson = JSON.parse(encoded);
    if (geojson.type === "LineString" && Array.isArray(geojson.coordinates)) {
      return geojson.coordinates.map(([lng, lat]: [number, number]) => ({ lat, lng }));
    }
  } catch {}
  return [];
}

export async function computeRoute(
  pois: POI[],
  mode: TransportMode
): Promise<{ segments: RouteSegment[]; totalDistance: number; totalDuration: number }> {
  if (pois.length < 2) {
    throw new Error("At least two POIs are required to compute a route.");
  }

  const profile = MODE_TO_PROFILE[mode];
  const segments: RouteSegment[] = [];
  let totalDistance = 0;
  let totalDuration = 0;

  for (let i = 0; i < pois.length - 1; i++) {
    const from = pois[i];
    const to = pois[i + 1];
    const coordString = coordsToOSRM([from.coordinates, to.coordinates]);

    const url =
      `${OSRM_URL}/route/v1/${profile}/${coordString}` +
      `?overview=full&geometries=geojson&steps=false&annotations=false`;

    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`OSRM routing error: ${response.status} ${response.statusText}`);
    }

    const data: OSRMRouteResponse = await response.json();

    if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
      throw new Error(`No route found between ${from.name} and ${to.name}`);
    }

    const route = data.routes[0];
    const geometry =
      route.geometry && typeof route.geometry === "object"
        ? (route.geometry as { coordinates: [number, number][]; type: string }).coordinates.map(
            ([lng, lat]: [number, number]) => ({ lat, lng })
          )
        : [];

    segments.push({
      from,
      to,
      distance: route.distance,
      duration: route.duration,
      geometry,
    });

    totalDistance += route.distance;
    totalDuration += route.duration;
  }

  return { segments, totalDistance, totalDuration };
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  const km = meters / 1000;
  return km < 10 ? `${km.toFixed(1)}km` : `${Math.round(km)}km`;
}

export function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remainder = mins % 60;
  return remainder > 0 ? `${hours}h ${remainder}min` : `${hours}h`;
}
