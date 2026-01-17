"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface FavoritesState {
  favorites: string[];
  addFavorite: (icao: string) => void;
  removeFavorite: (icao: string) => void;
  toggleFavorite: (icao: string) => void;
  isFavorite: (icao: string) => boolean;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: [],
      addFavorite: (icao: string) => {
        const cleanIcao = icao.toUpperCase().trim();
        set((state) => ({
          favorites: state.favorites.includes(cleanIcao)
            ? state.favorites
            : [...state.favorites, cleanIcao],
        }));
      },
      removeFavorite: (icao: string) => {
        const cleanIcao = icao.toUpperCase().trim();
        set((state) => ({
          favorites: state.favorites.filter((f) => f !== cleanIcao),
        }));
      },
      toggleFavorite: (icao: string) => {
        const cleanIcao = icao.toUpperCase().trim();
        const isFav = get().favorites.includes(cleanIcao);
        if (isFav) {
          get().removeFavorite(cleanIcao);
        } else {
          get().addFavorite(cleanIcao);
        }
      },
      isFavorite: (icao: string) => {
        return get().favorites.includes(icao.toUpperCase().trim());
      },
    }),
    {
      name: "metar-favorites",
    }
  )
);

// Settings store for preferences
interface SettingsState {
  tempUnit: "C" | "F";
  theme: "dark" | "light";
  alertsEnabled: boolean;
  alertCategories: ("IFR" | "LIFR")[];
  setTempUnit: (unit: "C" | "F") => void;
  setTheme: (theme: "dark" | "light") => void;
  setAlertsEnabled: (enabled: boolean) => void;
  setAlertCategories: (categories: ("IFR" | "LIFR")[]) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      tempUnit: "C",
      theme: "dark",
      alertsEnabled: false,
      alertCategories: ["IFR", "LIFR"],
      setTempUnit: (unit) => set({ tempUnit: unit }),
      setTheme: (theme) => set({ theme }),
      setAlertsEnabled: (enabled) => set({ alertsEnabled: enabled }),
      setAlertCategories: (categories) => set({ alertCategories: categories }),
    }),
    {
      name: "metar-settings",
    }
  )
);
