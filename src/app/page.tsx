"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  useMetar,
  useAllUSMetars,
  useTaf,
  MetarData,
  TafData,
  cloudCoverCodes,
  decodeWeather,
} from "@/hooks/useMetar";
import { useFavoritesStore, useSettingsStore } from "@/stores/favoritesStore";
import { format } from "date-fns";

// Dynamic import for map (SSR issues with Leaflet)
const MetarMap = dynamic(() => import("@/components/MetarMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[500px] bg-black/30 rounded-2xl flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full" />
    </div>
  ),
});

// Flight category styling
const flightCategoryStyles = {
  VFR: {
    bg: "bg-green-500/20",
    border: "border-green-500/50",
    text: "text-green-400",
    glow: "shadow-green-500/30",
    label: "VFR - Visual Flight Rules",
    color: "#22c55e",
  },
  MVFR: {
    bg: "bg-blue-500/20",
    border: "border-blue-500/50",
    text: "text-blue-400",
    glow: "shadow-blue-500/30",
    label: "MVFR - Marginal VFR",
    color: "#3b82f6",
  },
  IFR: {
    bg: "bg-red-500/20",
    border: "border-red-500/50",
    text: "text-red-400",
    glow: "shadow-red-500/30",
    label: "IFR - Instrument Flight Rules",
    color: "#ef4444",
  },
  LIFR: {
    bg: "bg-purple-500/20",
    border: "border-purple-500/50",
    text: "text-purple-400",
    glow: "shadow-purple-500/30",
    label: "LIFR - Low IFR",
    color: "#a855f7",
  },
};

type SortOption = "icao" | "category" | "temp" | "wind" | "time";

// Wind direction arrow component
function WindArrow({ direction, speed }: { direction?: number | null; speed?: number | null }) {
  if (direction === undefined || direction === null) {
    return <span className="text-white/50">VRB</span>;
  }
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-6 h-6 flex items-center justify-center"
        style={{ transform: `rotate(${direction + 180}deg)` }}
      >
        <svg className="w-5 h-5 text-cyan-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2L8 10h8L12 2zm0 20V10" />
        </svg>
      </div>
      <span className="text-white/80">{direction}°</span>
      {speed && <span className="text-cyan-400">{speed}kt</span>}
    </div>
  );
}

// Decoded METAR section
function DecodedMetar({ metar, tempUnit }: { metar: MetarData; tempUnit: "C" | "F" }) {
  const displayTemp = (temp: number | null) => {
    if (temp === null) return "--";
    return tempUnit === "F" ? Math.round(temp * 9 / 5 + 32) : temp;
  };

  return (
    <div className="bg-white/5 rounded-xl p-4 space-y-3">
      <h4 className="text-sm font-bold text-white/70 uppercase tracking-wide">Decoded METAR</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div className="flex justify-between">
          <span className="text-white/50">Station:</span>
          <span className="text-white font-medium">{metar.station_name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/50">Observation:</span>
          <span className="text-cyan-400 font-mono">{metar.observation_time || "--"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/50">Wind:</span>
          <span className="text-white">
            {metar.wind_direction !== null ? `${metar.wind_direction}° at ` : "Variable "}
            {metar.wind_speed_kt ?? "--"}kt
            {metar.wind_gust_kt && ` gusting ${metar.wind_gust_kt}kt`}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/50">Visibility:</span>
          <span className="text-white">{metar.visibility_sm} statute miles</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/50">Temperature:</span>
          <span className="text-white">{displayTemp(metar.temperature_c)}°{tempUnit}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/50">Dewpoint:</span>
          <span className="text-white">{displayTemp(metar.dewpoint_c)}°{tempUnit}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/50">Altimeter:</span>
          <span className="text-white">{metar.altimeter_hg?.toFixed(2) ?? "--"} inHg</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/50">Elevation:</span>
          <span className="text-white">{Math.round(metar.elevation_m)} m / {Math.round(metar.elevation_m * 3.281)} ft</span>
        </div>
        {metar.clouds.length > 0 && (
          <div className="col-span-2">
            <span className="text-white/50">Clouds: </span>
            <span className="text-white">
              {metar.clouds.map((c, i) => (
                <span key={i}>
                  {cloudCoverCodes[c.cover] || c.cover} at {c.base_ft.toLocaleString()} ft
                  {i < metar.clouds.length - 1 && ", "}
                </span>
              ))}
            </span>
          </div>
        )}
        {metar.weather.length > 0 && (
          <div className="col-span-2">
            <span className="text-white/50">Weather: </span>
            <span className="text-yellow-400">
              {metar.weather.map((w) => decodeWeather(w)).join(", ")}
            </span>
          </div>
        )}
        <div className="col-span-2 flex justify-between">
          <span className="text-white/50">Coordinates:</span>
          <span className="text-white/70 font-mono text-xs">
            {metar.latitude?.toFixed(4)}°N, {metar.longitude?.toFixed(4)}°W
          </span>
        </div>
      </div>
    </div>
  );
}

// TAF display component
function TafDisplay({ taf }: { taf: TafData }) {
  return (
    <div className="bg-white/5 rounded-xl p-4 space-y-3">
      <h4 className="text-sm font-bold text-white/70 uppercase tracking-wide flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Terminal Aerodrome Forecast
      </h4>
      <div className="bg-black/40 rounded-lg p-3 font-mono text-xs text-cyan-300 overflow-x-auto whitespace-pre-wrap">
        {taf.raw}
      </div>
      <div className="text-xs text-white/50">
        Valid: {format(new Date(taf.valid_from), "MMM d HH:mm")}Z - {format(new Date(taf.valid_to), "MMM d HH:mm")}Z
      </div>
    </div>
  );
}

// METAR Detail Card
function MetarDetailCard({
  metar,
  taf,
  onClose,
  tempUnit,
  isFavorite,
  onToggleFavorite,
}: {
  metar: MetarData;
  taf: TafData | null;
  onClose: () => void;
  tempUnit: "C" | "F";
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  const styles = flightCategoryStyles[metar.flight_category];
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(metar.raw);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayTemp = (temp: number | null) => {
    if (temp === null) return "--";
    return tempUnit === "F" ? Math.round(temp * 9 / 5 + 32) : temp;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`glass rounded-2xl p-6 ${styles.border} border-2 shadow-lg ${styles.glow}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-4xl font-black text-white">{metar.icao}</h2>
            <button
              onClick={onToggleFavorite}
              className={`p-2 rounded-lg transition-colors ${
                isFavorite ? "bg-yellow-500/20 text-yellow-400" : "bg-white/5 text-white/30 hover:text-yellow-400"
              }`}
              title={isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              <svg className="w-5 h-5" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </button>
            <span
              className={`px-3 py-1 rounded-full text-sm font-bold ${styles.bg} ${styles.text} ${styles.border} border`}
            >
              {metar.flight_category}
            </span>
            {metar.has_maintenance_flag && (
              <span className="px-3 py-1 rounded-full text-sm font-bold bg-orange-500/20 text-orange-400 border border-orange-500/50">
                $ ASOS Maintenance
              </span>
            )}
            {metar.metar_type === "SPECI" && (
              <span className="px-3 py-1 rounded-full text-sm font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/50">
                SPECI
              </span>
            )}
          </div>
          <p className="text-white/70 text-sm">{metar.station_name}</p>
          <p className="text-white/40 text-xs mt-1">{styles.label}</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-xl transition-colors"
        >
          <svg className="w-6 h-6 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Raw METAR with copy button */}
      <div className="relative bg-black/40 rounded-xl p-4 mb-6 font-mono text-sm text-cyan-300 overflow-x-auto">
        {metar.raw}
        <button
          onClick={copyToClipboard}
          className="absolute top-2 right-2 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
          title="Copy to clipboard"
        >
          {copied ? (
            <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </button>
      </div>

      {/* Parsed Data Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white/5 rounded-xl p-4">
          <p className="text-xs text-white/50 mb-2">WIND</p>
          <WindArrow direction={metar.wind_direction} speed={metar.wind_speed_kt} />
          {metar.wind_gust_kt && (
            <p className="text-xs text-orange-400 mt-1">Gusts: {metar.wind_gust_kt}kt</p>
          )}
        </div>

        <div className="bg-white/5 rounded-xl p-4">
          <p className="text-xs text-white/50 mb-2">VISIBILITY</p>
          <p className="text-2xl font-bold text-white">
            {metar.visibility_sm}
            <span className="text-sm text-white/50 ml-1">SM</span>
          </p>
        </div>

        <div className="bg-white/5 rounded-xl p-4">
          <p className="text-xs text-white/50 mb-2">TEMPERATURE</p>
          <p className="text-2xl font-bold text-white">
            {displayTemp(metar.temperature_c)}
            <span className="text-sm text-white/50 ml-1">°{tempUnit}</span>
          </p>
        </div>

        <div className="bg-white/5 rounded-xl p-4">
          <p className="text-xs text-white/50 mb-2">DEWPOINT</p>
          <p className="text-2xl font-bold text-white">
            {displayTemp(metar.dewpoint_c)}
            <span className="text-sm text-white/50 ml-1">°{tempUnit}</span>
          </p>
        </div>

        <div className="bg-white/5 rounded-xl p-4">
          <p className="text-xs text-white/50 mb-2">ALTIMETER</p>
          <p className="text-2xl font-bold text-white">
            {metar.altimeter_hg?.toFixed(2) ?? "--"}
            <span className="text-sm text-white/50 ml-1">inHg</span>
          </p>
        </div>

        <div className="bg-white/5 rounded-xl p-4">
          <p className="text-xs text-white/50 mb-2">TEMP/DEW SPREAD</p>
          <p className="text-2xl font-bold text-white">
            {metar.temperature_c !== null && metar.dewpoint_c !== null
              ? metar.temperature_c - metar.dewpoint_c
              : "--"}
            <span className="text-sm text-white/50 ml-1">°C</span>
          </p>
        </div>

        <div className="bg-white/5 rounded-xl p-4 col-span-2">
          <p className="text-xs text-white/50 mb-2">OBSERVATION TIME</p>
          <p className="text-lg font-medium text-white">
            {metar.observed_at ? format(new Date(metar.observed_at), "MMM d, yyyy HH:mm") : "--"} UTC
          </p>
        </div>
      </div>

      {/* Decoded METAR */}
      <DecodedMetar metar={metar} tempUnit={tempUnit} />

      {/* TAF Section */}
      {taf && (
        <div className="mt-6">
          <TafDisplay taf={taf} />
        </div>
      )}
    </motion.div>
  );
}

// Station card for grid view
function StationCard({
  metar,
  onClick,
  tempUnit,
  isFavorite,
}: {
  metar: MetarData;
  onClick: () => void;
  tempUnit: "C" | "F";
  isFavorite: boolean;
}) {
  const styles = flightCategoryStyles[metar.flight_category];

  const displayTemp =
    metar.temperature_c !== null
      ? tempUnit === "F"
        ? Math.round(metar.temperature_c * 9 / 5 + 32)
        : metar.temperature_c
      : null;

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`glass p-4 rounded-xl text-left w-full ${
        metar.has_maintenance_flag ? "border-orange-500/50 border-2" : styles.border + " border"
      } hover:${styles.bg} transition-all duration-300 relative`}
    >
      {/* Favorite indicator */}
      {isFavorite && (
        <div className="absolute -top-1 -left-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
          <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 24 24">
            <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </div>
      )}
      {/* Maintenance flag indicator */}
      {metar.has_maintenance_flag && (
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center text-xs font-bold text-black">
          $
        </div>
      )}
      <div className="flex items-center justify-between mb-1">
        <span className="text-xl font-bold text-white">{metar.icao}</span>
        <span className={`w-3 h-3 rounded-full ${styles.bg} ${styles.border} border-2`} />
      </div>
      {/* Station name */}
      <div className="text-xs text-white/40 mb-1 truncate" title={metar.station_name}>
        {metar.station_name?.split(",")[0] || "--"}
      </div>
      {/* Zulu observation time */}
      <div className="text-xs text-cyan-400/70 mb-2 font-mono">{metar.observation_time || "--Z"}</div>
      <div className="text-sm text-white/50 space-y-1">
        <div className="flex justify-between">
          <span>Wind</span>
          <span className="text-white/80">
            {metar.wind_direction === null ? "VRB" : `${metar.wind_direction}°`}{" "}
            {metar.wind_speed_kt ?? "--"}kt
          </span>
        </div>
        <div className="flex justify-between">
          <span>Vis</span>
          <span className="text-white/80">{metar.visibility_sm}SM</span>
        </div>
        <div className="flex justify-between">
          <span>Temp</span>
          <span className="text-white/80">
            {displayTemp ?? "--"}°{tempUnit}
          </span>
        </div>
      </div>
    </motion.button>
  );
}

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
  const { data: allMetars, isLoading: isLoadingAll, refetch: refetchAll, dataUpdatedAt } = useAllUSMetars();

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

  // Group by flight category for stats
  const categoryStats = useMemo(
    () =>
      allMetars?.reduce(
        (acc, m) => {
          acc[m.flight_category] = (acc[m.flight_category] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ) ?? {},
    [allMetars]
  );

  const maintenanceCount = allMetars?.filter((m) => m.has_maintenance_flag).length ?? 0;
  const healthyCount = (allMetars?.length ?? 0) - maintenanceCount;

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
        {/* Top bar with settings */}
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
          {/* Leaderboard link */}
          <Link
            href="/leaderboard"
            className="px-3 py-2 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/50 rounded-lg text-orange-400 text-sm font-medium transition-colors flex items-center gap-2"
            title="ASOS Maintenance Leaderboard"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="hidden sm:inline">Leaderboard</span>
          </Link>
          {/* Theme toggle */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            title="Toggle theme"
          >
            {theme === "dark" ? (
              <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
          {/* Keyboard shortcuts hint */}
          <div className="hidden sm:flex items-center gap-1 text-xs text-white/40">
            <kbd className="px-1.5 py-0.5 bg-white/10 rounded">/</kbd> search
            <kbd className="px-1.5 py-0.5 bg-white/10 rounded ml-2">m</kbd> map
            <kbd className="px-1.5 py-0.5 bg-white/10 rounded ml-2">f</kbd> favs
            <kbd className="px-1.5 py-0.5 bg-white/10 rounded ml-2">esc</kbd> close
          </div>
        </div>

        {/* Search Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="max-w-2xl mx-auto mb-8"
        >
          <div className="relative">
            <input
              id="search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch(searchQuery);
              }}
              placeholder="Search by ICAO code or airport name..."
              className={`w-full px-6 py-4 ${
                theme === "light"
                  ? "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                  : "bg-white/5 border-white/10 text-white placeholder-white/30"
              } border rounded-2xl text-lg focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all`}
            />
            <button
              onClick={() => handleSearch(searchQuery)}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-xl text-white font-medium hover:opacity-90 transition-opacity"
            >
              Search
            </button>
          </div>

          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className={`text-sm ${theme === "light" ? "text-gray-500" : "text-white/40"}`}>Recent:</span>
              {recentSearches.map((icao) => (
                <button
                  key={icao}
                  onClick={() => {
                    setSearchQuery(icao);
                    handleSearch(icao);
                  }}
                  className={`px-3 py-1 ${
                    theme === "light"
                      ? "bg-gray-200 hover:bg-gray-300 text-gray-700"
                      : "bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white"
                  } rounded-lg text-sm transition-all`}
                >
                  {icao}
                </button>
              ))}
            </div>
          )}

          {/* Favorites quick access */}
          {favorites.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className={`text-sm ${theme === "light" ? "text-gray-500" : "text-white/40"}`}>
                <svg className="w-4 h-4 inline mr-1 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                Favorites:
              </span>
              {favorites.slice(0, 8).map((icao) => (
                <button
                  key={icao}
                  onClick={() => {
                    setSelectedStation(icao);
                  }}
                  className="px-3 py-1 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/50 rounded-lg text-sm text-yellow-400 transition-all"
                >
                  {icao}
                </button>
              ))}
              {favorites.length > 8 && (
                <span className="px-3 py-1 text-sm text-white/40">+{favorites.length - 8} more</span>
              )}
            </div>
          )}
        </motion.div>

        {/* View Mode Toggle */}
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => setViewMode("grid")}
            className={`px-6 py-2 rounded-xl font-medium transition-all flex items-center gap-2 ${
              viewMode === "grid"
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
            className={`px-6 py-2 rounded-xl font-medium transition-all flex items-center gap-2 ${
              viewMode === "map"
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8">
            <MetarMap
              stations={filteredStations}
              onStationClick={(icao) => setSelectedStation(icao)}
              selectedStation={selectedStation}
              categoryFilter={categoryFilter}
            />
          </motion.div>
        )}

        {/* Grid View Stats & Filters */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {/* Stats Bar */}
          <div className="glass rounded-2xl p-6 mb-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className={`text-xl font-bold ${theme === "light" ? "text-gray-900" : "text-white"} mb-1`}>
                  {isLoadingAll ? "Loading..." : `${filteredStations.length} Stations`}
                  {showFavoritesOnly && " (Favorites)"}
                </h3>
                <p className={theme === "light" ? "text-gray-500" : "text-white/50"}>
                  {dataUpdatedAt
                    ? `Last updated: ${format(new Date(dataUpdatedAt), "HH:mm:ss")}Z`
                    : "Real-time aviation weather data"}
                  <span className={theme === "light" ? "text-gray-400 ml-2" : "text-white/30 ml-2"}>
                    • Auto-refresh hourly
                  </span>
                </p>
              </div>
              <button
                onClick={() => refetchAll()}
                disabled={isLoadingAll}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 rounded-xl text-cyan-400 font-medium transition-all disabled:opacity-50"
              >
                <svg
                  className={`w-4 h-4 ${isLoadingAll ? "animate-spin" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                {isLoadingAll ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            {/* Category stats */}
            <div className="flex flex-wrap items-center gap-4 mt-4">
              <div className="flex flex-wrap gap-3">
                {(["VFR", "MVFR", "IFR", "LIFR"] as const).map((cat) => {
                  const styles = flightCategoryStyles[cat];
                  return (
                    <div key={cat} className={`px-3 py-2 rounded-xl ${styles.bg} ${styles.border} border`}>
                      <span className={`font-bold ${styles.text}`}>{categoryStats[cat] ?? 0}</span>
                      <span className={theme === "light" ? "text-gray-500" : "text-white/50"}> {cat}</span>
                    </div>
                  );
                })}
                <div className="px-3 py-2 rounded-xl bg-green-500/20 border border-green-500/50">
                  <span className="font-bold text-green-400">{healthyCount}</span>
                  <span className={theme === "light" ? "text-gray-500" : "text-white/50"}> OK</span>
                </div>
                <div className="px-3 py-2 rounded-xl bg-orange-500/20 border border-orange-500/50">
                  <span className="font-bold text-orange-400">{maintenanceCount}</span>
                  <span className={theme === "light" ? "text-gray-500" : "text-white/50"}> $ Flag</span>
                </div>
              </div>
            </div>

            {/* Filter controls */}
            <div className="mt-4 flex flex-wrap gap-3 items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by ICAO or name..."
                className={`flex-1 min-w-[200px] px-4 py-2 ${
                  theme === "light"
                    ? "bg-gray-100 border-gray-300 text-gray-900 placeholder-gray-400"
                    : "bg-black/30 border-white/10 text-white placeholder-white/30"
                } border rounded-xl focus:outline-none focus:border-purple-500/50`}
              />

              {/* Temperature Unit Toggle */}
              <div className={`flex ${theme === "light" ? "bg-gray-200" : "bg-white/10"} rounded-xl p-1`}>
                <button
                  onClick={() => setTempUnit("C")}
                  className={`px-3 py-1 rounded-lg text-sm font-bold transition-all ${
                    tempUnit === "C"
                      ? "bg-cyan-500 text-white"
                      : theme === "light"
                      ? "text-gray-500 hover:text-gray-900"
                      : "text-white/50 hover:text-white"
                  }`}
                >
                  °C
                </button>
                <button
                  onClick={() => setTempUnit("F")}
                  className={`px-3 py-1 rounded-lg text-sm font-bold transition-all ${
                    tempUnit === "F"
                      ? "bg-cyan-500 text-white"
                      : theme === "light"
                      ? "text-gray-500 hover:text-gray-900"
                      : "text-white/50 hover:text-white"
                  }`}
                >
                  °F
                </button>
              </div>

              {/* Sort dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className={`px-3 py-2 ${
                  theme === "light"
                    ? "bg-gray-100 border-gray-300 text-gray-900"
                    : "bg-black/30 border-white/10 text-white"
                } border rounded-xl focus:outline-none focus:border-purple-500/50`}
              >
                <option value="icao">Sort: ICAO</option>
                <option value="category">Sort: Category</option>
                <option value="temp">Sort: Temperature</option>
                <option value="wind">Sort: Wind Speed</option>
                <option value="time">Sort: Observation Time</option>
              </select>
            </div>

            {/* Category Filters */}
            <div className="mt-3 flex flex-wrap gap-2 items-center">
              <span className={theme === "light" ? "text-gray-500" : "text-white/40"}>Category:</span>
              <button
                onClick={() => setCategoryFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  categoryFilter === "all"
                    ? "bg-purple-500 text-white"
                    : theme === "light"
                    ? "bg-gray-200 text-gray-600 hover:bg-gray-300"
                    : "bg-white/10 text-white/60 hover:bg-white/20"
                }`}
              >
                All
              </button>
              {(["VFR", "MVFR", "IFR", "LIFR"] as const).map((cat) => {
                const styles = flightCategoryStyles[cat];
                return (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      categoryFilter === cat
                        ? `${styles.bg} ${styles.text} ${styles.border} border`
                        : theme === "light"
                        ? "bg-gray-200 text-gray-600 hover:bg-gray-300"
                        : "bg-white/10 text-white/60 hover:bg-white/20"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Status Filters */}
            <div className="mt-3 flex flex-wrap gap-2 items-center">
              <span className={theme === "light" ? "text-gray-500" : "text-white/40"}>Status:</span>
              <button
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  statusFilter === "all"
                    ? "bg-purple-500 text-white"
                    : theme === "light"
                    ? "bg-gray-200 text-gray-600 hover:bg-gray-300"
                    : "bg-white/10 text-white/60 hover:bg-white/20"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter("ok")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  statusFilter === "ok"
                    ? "bg-green-500 text-white"
                    : theme === "light"
                    ? "bg-gray-200 text-gray-600 hover:bg-gray-300"
                    : "bg-white/10 text-white/60 hover:bg-white/20"
                }`}
              >
                OK
              </button>
              <button
                onClick={() => setStatusFilter("flagged")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  statusFilter === "flagged"
                    ? "bg-orange-500 text-white"
                    : theme === "light"
                    ? "bg-gray-200 text-gray-600 hover:bg-gray-300"
                    : "bg-white/10 text-white/60 hover:bg-white/20"
                }`}
              >
                $ Flagged
              </button>
              <button
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1 ${
                  showFavoritesOnly
                    ? "bg-yellow-500 text-black"
                    : theme === "light"
                    ? "bg-gray-200 text-gray-600 hover:bg-gray-300"
                    : "bg-white/10 text-white/60 hover:bg-white/20"
                }`}
              >
                <svg className="w-4 h-4" fill={showFavoritesOnly ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                Favorites
              </button>
            </div>

            {/* Info Tip Box */}
            <div className={`mt-4 p-4 ${theme === "light" ? "bg-gray-100 border-gray-200" : "bg-white/5 border-white/10"} border rounded-xl`}>
              <p className={`text-xs leading-relaxed ${theme === "light" ? "text-gray-600" : "text-white/50"}`}>
                <span className="text-green-400 font-bold">VFR</span> = Clear skies (≥3000ft ceiling, &gt;5mi vis) •
                <span className="text-blue-400 font-bold ml-2">MVFR</span> = Marginal (1000-3000ft, 3-5mi) •
                <span className="text-red-400 font-bold ml-2">IFR</span> = Instrument required (500-1000ft, 1-3mi) •
                <span className="text-purple-400 font-bold ml-2">LIFR</span> = Low visibility (&lt;500ft, &lt;1mi) •
                <span className="text-orange-400 font-bold ml-2">$</span> = ASOS needs maintenance •
                <span className="text-yellow-400 font-bold ml-2">★</span> = Favorite station
              </p>
            </div>
          </div>

          {/* Stations Grid */}
          {viewMode === "grid" && (
            <>
              {isLoadingAll ? (
                <div className="text-center py-12">
                  <div className="animate-spin w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
                  <p className={theme === "light" ? "text-gray-500" : "text-white/50"}>Loading all US stations...</p>
                  <p className={theme === "light" ? "text-gray-400" : "text-white/30"}>This may take a moment</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {filteredStations.map((metar, idx) => (
                    <motion.div
                      key={metar.icao}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(idx * 0.01, 0.5) }}
                    >
                      <StationCard
                        metar={metar}
                        tempUnit={tempUnit}
                        isFavorite={isFavorite(metar.icao)}
                        onClick={() => setSelectedStation(metar.icao)}
                      />
                    </motion.div>
                  ))}
                </div>
              )}
            </>
          )}
        </motion.div>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-white/10 text-center">
          <p className={theme === "light" ? "text-gray-400" : "text-white/30"}>
            Data from Aviation Weather Center (aviationweather.gov)
          </p>
        </footer>
      </div>
    </main>
  );
}
