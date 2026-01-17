"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useMetar, useAllUSMetars, useTaf } from "@/hooks/useMetar";
import { useFavoritesStore, useSettingsStore } from "@/stores/favoritesStore";
import { MetarData } from "@/types";
import { Header } from "@/components/Header";
import { SearchSection } from "@/components/SearchSection";
import { MetarDetailCard } from "@/components/MetarDetail";
import StationGrid from "@/components/StationGrid";

// Dynamic import for map (SSR issues with Leaflet)
const MetarMap = dynamic(() => import("@/components/MetarMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[500px] bg-black/30 rounded-2xl flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full" />
    </div>
  ),
});

type SortOption = "icao" | "category" | "temp" | "wind" | "time";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStation, setSelectedStation] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const [statusFilter, setStatusFilter] = useState<"all" | "ok" | "flagged">("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "VFR" | "MVFR" | "IFR" | "LIFR">("all");
  const [sortBy, setSortBy] = useState<SortOption>("icao");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Stores
  const { favorites, toggleFavorite, isFavorite } = useFavoritesStore();
  const { tempUnit, setTempUnit, theme, setTheme } = useSettingsStore();

  // Load recent searches from localStorage
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  useEffect(() => {
    const saved = localStorage.getItem("recentMetarSearches");
    if (saved) setRecentSearches(JSON.parse(saved));
  }, []);

  // Query for selected station
  const { data: selectedMetar, isLoading: isLoadingSelected } = useMetar(selectedStation);
  const { data: selectedTaf } = useTaf(selectedStation);

  // Query for all US stations
  const { data: allMetars, isLoading: isLoadingAll, refetch: refetchAll } = useAllUSMetars();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // "/" to focus search
      if (e.key === "/" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        document.getElementById("search-input")?.focus();
      }
      // Escape to close detail view
      if (e.key === "Escape" && selectedStation) {
        setSelectedStation(null);
      }
      // "m" to toggle map/grid view
      if (e.key === "m" && !e.ctrlKey && !e.metaKey && document.activeElement?.tagName !== "INPUT") {
        setViewMode((v) => (v === "grid" ? "map" : "grid"));
      }
      // "f" to toggle favorites filter
      if (e.key === "f" && !e.ctrlKey && !e.metaKey && document.activeElement?.tagName !== "INPUT") {
        setShowFavoritesOnly((v) => !v);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedStation]);

  // Handle search
  const handleSearch = useCallback(
    (query: string) => {
      const icao = query.toUpperCase().trim();
      if (icao.length >= 4) {
        setSelectedStation(icao);
        const updated = [icao, ...recentSearches.filter((s) => s !== icao)].slice(0, 10);
        setRecentSearches(updated);
        localStorage.setItem("recentMetarSearches", JSON.stringify(updated));
      }
    },
    [recentSearches]
  );

  // Filter and sort stations
  const filteredStations = useMemo(() => {
    let filtered = allMetars ?? [];

    // Text filter
    if (searchQuery.length > 0) {
      const q = searchQuery.toUpperCase();
      filtered = filtered.filter(
        (m) => m.icao.includes(q) || m.station_name?.toUpperCase().includes(q)
      );
    }

    // Favorites filter
    if (showFavoritesOnly) {
      filtered = filtered.filter((m) => favorites.includes(m.icao));
    }

    // Status filter
    if (statusFilter === "flagged") {
      filtered = filtered.filter((m) => m.has_maintenance_flag);
    } else if (statusFilter === "ok") {
      filtered = filtered.filter((m) => !m.has_maintenance_flag);
    }

    // Category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter((m) => m.flight_category === categoryFilter);
    }

    // Sort
    const sortFns: Record<SortOption, (a: MetarData, b: MetarData) => number> = {
      icao: (a, b) => a.icao.localeCompare(b.icao),
      category: (a, b) => {
        const order = { LIFR: 0, IFR: 1, MVFR: 2, VFR: 3 };
        return order[a.flight_category] - order[b.flight_category];
      },
      temp: (a, b) => (a.temperature_c ?? 999) - (b.temperature_c ?? 999),
      wind: (a, b) => (b.wind_speed_kt ?? 0) - (a.wind_speed_kt ?? 0),
      time: (a, b) => (b.observation_time ?? "").localeCompare(a.observation_time ?? ""),
    };

    // Always show favorites first
    const favs = filtered.filter((m) => favorites.includes(m.icao)).sort(sortFns[sortBy]);
    const nonFavs = filtered.filter((m) => !favorites.includes(m.icao)).sort(sortFns[sortBy]);

    return [...favs, ...nonFavs];
  }, [allMetars, searchQuery, showFavoritesOnly, statusFilter, categoryFilter, sortBy, favorites]);

  return (
    <main className={`min-h-screen relative ${theme === "light" ? "bg-gray-100" : ""}`}>
      {/* Background image */}
      <div className="fixed inset-0 bg-black">
        <img
          src="https://i.imgur.com/QYPC1fs.jpeg"
          alt="Background"
          className={`w-full h-full object-cover object-right-top ${theme === "light" ? "opacity-30" : ""}`}
        />
      </div>
      {/* Dark overlay */}
      <div className={`fixed inset-0 ${theme === "light" ? "bg-white/70" : "bg-black/50"}`} />
      {/* Animated gradient overlay */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-radial from-purple-500/10 via-transparent to-transparent animate-pulse-slow" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-radial from-cyan-500/10 via-transparent to-transparent animate-pulse-slow" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8 pt-24">
        <Header theme={theme} setTheme={setTheme} />

        <SearchSection
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          handleSearch={handleSearch}
          recentSearches={recentSearches}
          favorites={favorites}
          setSelectedStation={setSelectedStation}
          theme={theme}
        />

        {/* View Mode Toggle */}
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => setViewMode("grid")}
            className={`px-6 py-2 rounded-xl font-medium transition-all flex items-center gap-2 ${viewMode === "grid"
              ? "bg-gradient-to-r from-purple-500 to-cyan-500 text-white"
              : theme === "light"
                ? "bg-gray-200 text-gray-600 hover:text-gray-900"
                : "bg-white/5 text-white/50 hover:text-white"
              }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Grid View
          </button>
          <button
            onClick={() => {
              setViewMode("map");
              if (!allMetars) refetchAll();
            }}
            className={`px-6 py-2 rounded-xl font-medium transition-all flex items-center gap-2 ${viewMode === "map"
              ? "bg-gradient-to-r from-purple-500 to-cyan-500 text-white"
              : theme === "light"
                ? "bg-gray-200 text-gray-600 hover:text-gray-900"
                : "bg-white/5 text-white/50 hover:text-white"
              }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            Map View
          </button>
        </div>

        {/* Selected Station Detail */}
        <AnimatePresence mode="wait">
          {selectedStation && (
            <motion.div
              key={selectedStation}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto mb-8"
            >
              {isLoadingSelected ? (
                <div className="glass rounded-2xl p-8 text-center">
                  <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
                  <p className={theme === "light" ? "text-gray-500" : "text-white/50"}>
                    Loading METAR for {selectedStation}...
                  </p>
                </div>
              ) : selectedMetar ? (
                <MetarDetailCard
                  metar={selectedMetar}
                  taf={selectedTaf ?? null}
                  onClose={() => setSelectedStation(null)}
                  tempUnit={tempUnit}
                  isFavorite={isFavorite(selectedMetar.icao)}
                  onToggleFavorite={() => toggleFavorite(selectedMetar.icao)}
                />
              ) : (
                <div className="glass rounded-2xl p-8 text-center border border-red-500/30">
                  <svg
                    className="w-12 h-12 text-red-400 mx-auto mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <p className={theme === "light" ? "text-gray-700" : "text-white/70"}>
                    No METAR found for {selectedStation}
                  </p>
                  <p className={theme === "light" ? "text-gray-500" : "text-white/40"}>
                    Check the ICAO code and try again
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Map View */}
        {viewMode === "map" && (
          <div className="mb-20">
            <MetarMap stations={filteredStations} onStationClick={setSelectedStation} categoryFilter={categoryFilter} />
          </div>
        )}

        {/* Grid View */}
        {viewMode === "grid" && (
          <StationGrid
            metars={filteredStations}
            onStationClick={setSelectedStation}
            tempUnit={tempUnit}
            favorites={favorites}
          />
        )}
      </div>
    </main>
  );
}
