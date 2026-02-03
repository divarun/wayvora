"use client";
import { useState, useEffect, useCallback } from "react";
import { SavedPOI, POI } from "@/types";
import { localFavorites } from "@/services/localStorage";
import { favoritesApi } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";

export function useFavorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<SavedPOI[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (user) {
        const serverFavs = await favoritesApi.getAll();
        setFavorites(serverFavs);
      } else {
        setFavorites(localFavorites.getAll());
      }
    } catch {
      // fallback to local
      setFavorites(localFavorites.getAll());
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const addFavorite = useCallback(
    async (poi: POI) => {
      const saved: SavedPOI = { ...poi, savedAt: Date.now() };
      if (user) {
        try {
          await favoritesApi.add(saved);
        } catch {}
      } else {
        localFavorites.add(saved);
      }
      setFavorites((prev) => (prev.some((p) => p.id === poi.id) ? prev : [...prev, saved]));
    },
    [user]
  );

  const removeFavorite = useCallback(
    async (poiId: string) => {
      if (user) {
        try {
          await favoritesApi.remove(poiId);
        } catch {}
      } else {
        localFavorites.remove(poiId);
      }
      setFavorites((prev) => prev.filter((p) => p.id !== poiId));
    },
    [user]
  );

  const isFavorite = useCallback((poiId: string) => favorites.some((p) => p.id === poiId), [favorites]);

  return { favorites, loading, addFavorite, removeFavorite, isFavorite, reload: load };
}
