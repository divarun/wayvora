"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { AuthState, User } from "@/types";
import { authApi, favoritesApi, itineraryApi } from "@/services/api";
import { localAuth, localFavorites, localItineraries } from "@/services/localStorage";

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
  });

  useEffect(() => {
    const token = localAuth.getToken();
    const user = localAuth.getUser() as User | null;
    if (token && user) {
      setState({ user, token, isLoading: false });
    } else {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  const syncGuestData = useCallback(async () => {
    try {
      const guestFavs = localFavorites.getAll();
      if (guestFavs.length > 0) {
        await favoritesApi.syncFromGuest(guestFavs);
        localFavorites.clear();
      }
    } catch (err) {
      console.warn("Favorites sync failed:", err);
    }
    try {
      const guestIts = localItineraries.getAll();
      if (guestIts.length > 0) {
        await itineraryApi.syncFromGuest(guestIts);
        localItineraries.clear();
      }
    } catch (err) {
      console.warn("Itineraries sync failed:", err);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { token, user } = await authApi.login(email, password);
    localAuth.setToken(token);
    localAuth.setUser(user);
    setState({ user, token, isLoading: false });
    await syncGuestData();
  }, [syncGuestData]);

  const register = useCallback(async (email: string, password: string) => {
    const { token, user } = await authApi.register(email, password);
    localAuth.setToken(token);
    localAuth.setUser(user);
    setState({ user, token, isLoading: false });
    await syncGuestData();
  }, [syncGuestData]);

  const logout = useCallback(() => {
    localAuth.clear();
    setState({ user: null, token: null, isLoading: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
