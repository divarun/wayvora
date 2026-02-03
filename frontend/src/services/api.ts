import { localAuth } from "@/services/localStorage";
import { SavedPOI, Itinerary, User } from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/api";

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localAuth.getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers as Record<string, string>) },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(errorBody || `API error: ${response.status}`);
  }

  if (response.status === 204 || !response.headers.get("content-length")) {
    return {} as T;
  }

  return response.json();
}

// Auth
export const authApi = {
  async register(email: string, password: string): Promise<{ token: string; user: User }> {
    return request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    return request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  async me(): Promise<User> {
    return request("/auth/me");
  },
};

// Favorites (server-persisted when authenticated)
export const favoritesApi = {
  async getAll(): Promise<SavedPOI[]> {
    return request("/favorites");
  },

  async add(poi: SavedPOI): Promise<SavedPOI> {
    return request("/favorites", {
      method: "POST",
      body: JSON.stringify(poi),
    });
  },

  async remove(poiId: string): Promise<void> {
    return request(`/favorites/${poiId}`, { method: "DELETE" });
  },

  async syncFromGuest(pois: SavedPOI[]): Promise<SavedPOI[]> {
    return request("/favorites/sync", {
      method: "POST",
      body: JSON.stringify({ pois }),
    });
  },
};

// Itineraries
export const itineraryApi = {
  async getAll(): Promise<Itinerary[]> {
    return request("/itineraries");
  },

  async create(itinerary: Omit<Itinerary, "id" | "createdAt" | "updatedAt">): Promise<Itinerary> {
    return request("/itineraries", {
      method: "POST",
      body: JSON.stringify(itinerary),
    });
  },

  async update(id: string, updates: Partial<Itinerary>): Promise<Itinerary> {
    return request(`/itineraries/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  },

  async remove(id: string): Promise<void> {
    return request(`/itineraries/${id}`, { method: "DELETE" });
  },

  async syncFromGuest(itineraries: Itinerary[]): Promise<Itinerary[]> {
    return request("/itineraries/sync", {
      method: "POST",
      body: JSON.stringify({ itineraries }),
    });
  },
};

// AI endpoints (proxied through backend to Ollama)
export const aiApi = {
  async getRecommendations(
    selectedPois: { name: string; category: string; address: string }[],
    userPreferences?: string
  ): Promise<{ recommendations: { name: string; category: string; reason: string }[] }> {
    return request("/ai/recommendations", {
      method: "POST",
      body: JSON.stringify({ selectedPois, userPreferences }),
    });
  },

  async getTravelTips(poi: { name: string; category: string; address: string }): Promise<{
    description: string;
    tips: string[];
    localInsights: string;
  }> {
    return request("/ai/travel-tips", {
      method: "POST",
      body: JSON.stringify({ poi }),
    });
  },
};
