import { SavedPOI, Itinerary } from "@/types";

const KEYS = {
  FAVORITES: "wayvora:favorites",
  ITINERARIES: "wayvora:itineraries",
  AUTH_TOKEN: "wayvora:token",
  AUTH_USER: "wayvora:user",
} as const;

function safeGet<T>(key: string): T | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function safeSet(key: string, value: unknown): void {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    console.error("localStorage write failed for key:", key);
  }
}

function safeRemove(key: string): void {
  try {
    if (typeof window === "undefined") return;
    localStorage.removeItem(key);
  } catch {}
}

export const localFavorites = {
  getAll(): SavedPOI[] {
    return safeGet<SavedPOI[]>(KEYS.FAVORITES) ?? [];
  },
  add(poi: SavedPOI): void {
    const current = this.getAll();
    if (current.some((p) => p.id === poi.id)) return;
    safeSet(KEYS.FAVORITES, [...current, poi]);
  },
  remove(poiId: string): void {
    const current = this.getAll();
    safeSet(KEYS.FAVORITES, current.filter((p) => p.id !== poiId));
  },
  has(poiId: string): boolean {
    return this.getAll().some((p) => p.id === poiId);
  },
  clear(): void {
    safeSet(KEYS.FAVORITES, []);
  },
};

export const localItineraries = {
  getAll(): Itinerary[] {
    return safeGet<Itinerary[]>(KEYS.ITINERARIES) ?? [];
  },
  add(itinerary: Itinerary): void {
    const current = this.getAll();
    safeSet(KEYS.ITINERARIES, [...current, itinerary]);
  },
  update(id: string, updates: Partial<Itinerary>): void {
    const current = this.getAll();
    safeSet(
      KEYS.ITINERARIES,
      current.map((it) => (it.id === id ? { ...it, ...updates, updatedAt: Date.now() } : it))
    );
  },
  remove(id: string): void {
    const current = this.getAll();
    safeSet(KEYS.ITINERARIES, current.filter((it) => it.id !== id));
  },
  clear(): void {
    safeSet(KEYS.ITINERARIES, []);
  },
};

export const localAuth = {
  setToken(token: string): void {
    safeSet(KEYS.AUTH_TOKEN, token);
  },
  getToken(): string | null {
    return safeGet<string>(KEYS.AUTH_TOKEN);
  },
  setUser(user: unknown): void {
    safeSet(KEYS.AUTH_USER, user);
  },
  getUser(): unknown | null {
    return safeGet(KEYS.AUTH_USER);
  },
  clear(): void {
    safeRemove(KEYS.AUTH_TOKEN);
    safeRemove(KEYS.AUTH_USER);
  },
};
