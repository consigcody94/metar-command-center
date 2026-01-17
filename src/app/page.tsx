"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMetar, useAllUSMetars, MetarData } from "@/hooks/useMetar";
import { format } from "date-fns";

// Flight category styling
const flightCategoryStyles = {
  VFR: {
    bg: "bg-green-500/20",
    border: "border-green-500/50",
    text: "text-green-400",
    glow: "shadow-green-500/30",
    label: "VFR - Visual Flight Rules",
  },
  MVFR: {
    bg: "bg-blue-500/20",
    border: "border-blue-500/50",
    text: "text-blue-400",
    glow: "shadow-blue-500/30",
    label: "MVFR - Marginal VFR",
  },
  IFR: {
    bg: "bg-red-500/20",
    border: "border-red-500/50",
    text: "text-red-400",
    glow: "shadow-red-500/30",
    label: "IFR - Instrument Flight Rules",
  },
  LIFR: {
    bg: "bg-purple-500/20",
    border: "border-purple-500/50",
    text: "text-purple-400",
    glow: "shadow-purple-500/30",
    label: "LIFR - Low IFR",
  },
};

// Wind direction arrow component
function WindArrow({ direction, speed }: { direction?: number; speed?: number }) {
  if (direction === undefined || direction === -1) {
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

// METAR Detail Card
function MetarDetailCard({ metar, onClose }: { metar: MetarData; onClose: () => void }) {
  const styles = flightCategoryStyles[metar.flight_category];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`glass rounded-2xl p-6 ${styles.border} border-2 shadow-lg ${styles.glow}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-4xl font-black text-white">{metar.icao}</h2>
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
          </div>
          <p className="text-white/50 text-sm">
            {styles.label}
            {metar.has_maintenance_flag && " • Station needs maintenance"}
          </p>
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

      {/* Raw METAR */}
      <div className="bg-black/40 rounded-xl p-4 mb-6 font-mono text-sm text-cyan-300 overflow-x-auto">
        {metar.raw}
      </div>

      {/* Parsed Data Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Wind */}
        <div className="bg-white/5 rounded-xl p-4">
          <p className="text-xs text-white/50 mb-2">WIND</p>
          <WindArrow direction={metar.wind_direction} speed={metar.wind_speed_kt} />
          {metar.wind_gust_kt && (
            <p className="text-xs text-orange-400 mt-1">Gusts: {metar.wind_gust_kt}kt</p>
          )}
        </div>

        {/* Visibility */}
        <div className="bg-white/5 rounded-xl p-4">
          <p className="text-xs text-white/50 mb-2">VISIBILITY</p>
          <p className="text-2xl font-bold text-white">
            {metar.visibility_sm ?? "10+"}
            <span className="text-sm text-white/50 ml-1">SM</span>
          </p>
        </div>

        {/* Temperature */}
        <div className="bg-white/5 rounded-xl p-4">
          <p className="text-xs text-white/50 mb-2">TEMPERATURE</p>
          <p className="text-2xl font-bold text-white">
            {metar.temperature_c ?? "--"}
            <span className="text-sm text-white/50 ml-1">°C</span>
          </p>
          {metar.temperature_c !== undefined && (
            <p className="text-xs text-white/40">
              {Math.round(metar.temperature_c * 9/5 + 32)}°F
            </p>
          )}
        </div>

        {/* Dewpoint */}
        <div className="bg-white/5 rounded-xl p-4">
          <p className="text-xs text-white/50 mb-2">DEWPOINT</p>
          <p className="text-2xl font-bold text-white">
            {metar.dewpoint_c ?? "--"}
            <span className="text-sm text-white/50 ml-1">°C</span>
          </p>
        </div>

        {/* Altimeter */}
        <div className="bg-white/5 rounded-xl p-4">
          <p className="text-xs text-white/50 mb-2">ALTIMETER</p>
          <p className="text-2xl font-bold text-white">
            {metar.altimeter_hg?.toFixed(2) ?? "--"}
            <span className="text-sm text-white/50 ml-1">inHg</span>
          </p>
        </div>

        {/* Spread */}
        <div className="bg-white/5 rounded-xl p-4">
          <p className="text-xs text-white/50 mb-2">TEMP/DEW SPREAD</p>
          <p className="text-2xl font-bold text-white">
            {metar.temperature_c !== undefined && metar.dewpoint_c !== undefined
              ? metar.temperature_c - metar.dewpoint_c
              : "--"}
            <span className="text-sm text-white/50 ml-1">°C</span>
          </p>
        </div>

        {/* Observed */}
        <div className="bg-white/5 rounded-xl p-4 col-span-2">
          <p className="text-xs text-white/50 mb-2">OBSERVATION TIME</p>
          <p className="text-lg font-medium text-white">
            {format(new Date(metar.observed_at), "MMM d, yyyy HH:mm")} UTC
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// Station card for grid view
function StationCard({ metar, onClick, tempUnit }: { metar: MetarData; onClick: () => void; tempUnit: "C" | "F" }) {
  const styles = flightCategoryStyles[metar.flight_category];

  // Convert temperature
  const displayTemp = metar.temperature_c !== undefined
    ? tempUnit === "F"
      ? Math.round(metar.temperature_c * 9/5 + 32)
      : metar.temperature_c
    : null;

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`glass p-4 rounded-xl text-left w-full ${metar.has_maintenance_flag ? 'border-orange-500/50 border-2' : styles.border + ' border'} hover:${styles.bg} transition-all duration-300 relative`}
    >
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
      {/* Zulu observation time */}
      <div className="text-xs text-cyan-400/70 mb-2 font-mono">
        {metar.observation_time || "--Z"}
      </div>
      <div className="text-sm text-white/50 space-y-1">
        <div className="flex justify-between">
          <span>Wind</span>
          <span className="text-white/80">
            {metar.wind_direction === -1 ? "VRB" : `${metar.wind_direction ?? "--"}°`} {metar.wind_speed_kt ?? "--"}kt
          </span>
        </div>
        <div className="flex justify-between">
          <span>Vis</span>
          <span className="text-white/80">{metar.visibility_sm ?? "10+"}SM</span>
        </div>
        <div className="flex justify-between">
          <span>Temp</span>
          <span className="text-white/80">{displayTemp ?? "--"}°{tempUnit}</span>
        </div>
      </div>
    </motion.button>
  );
}

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStation, setSelectedStation] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"search" | "all">("search");
  const [statusFilter, setStatusFilter] = useState<"all" | "ok" | "flagged">("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "VFR" | "MVFR" | "IFR" | "LIFR">("all");
  const [tempUnit, setTempUnit] = useState<"C" | "F">("C");

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("recentMetarSearches");
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Query for selected station
  const { data: selectedMetar, isLoading: isLoadingSelected } = useMetar(selectedStation);

  // Query for all US stations
  const { data: allMetars, isLoading: isLoadingAll, refetch: refetchAll, dataUpdatedAt } = useAllUSMetars();

  // Handle search
  const handleSearch = (query: string) => {
    const icao = query.toUpperCase().trim();
    console.log("Searching for:", icao);
    if (icao.length >= 4) {
      setSelectedStation(icao);
      setViewMode("search"); // Ensure we're in search mode to show results
      // Add to recent searches
      const updated = [icao, ...recentSearches.filter((s) => s !== icao)].slice(0, 10);
      setRecentSearches(updated);
      localStorage.setItem("recentMetarSearches", JSON.stringify(updated));
    }
  };

  // Filter stations for grid view
  const filteredStations = allMetars?.filter((m) => {
    // Text filter
    const matchesSearch = searchQuery.length > 0
      ? m.icao.includes(searchQuery.toUpperCase())
      : true;
    // Status filter
    const matchesStatus = statusFilter === "all"
      ? true
      : statusFilter === "flagged"
        ? m.has_maintenance_flag
        : !m.has_maintenance_flag;
    // Category filter
    const matchesCategory = categoryFilter === "all"
      ? true
      : m.flight_category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  }) ?? [];

  // Group by flight category for stats
  const categoryStats = allMetars?.reduce(
    (acc, m) => {
      acc[m.flight_category] = (acc[m.flight_category] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  ) ?? {};

  // Count maintenance flagged stations
  const maintenanceCount = allMetars?.filter(m => m.has_maintenance_flag).length ?? 0;
  const healthyCount = (allMetars?.length ?? 0) - maintenanceCount;

  return (
    <main className="min-h-screen relative">
      {/* Background image - shows full image */}
      <div className="fixed inset-0 bg-black">
        <img
          src="https://i.imgur.com/QYPC1fs.jpeg"
          alt="Background"
          className="w-full h-full object-cover object-right-top"
        />
      </div>
      {/* Dark overlay for readability */}
      <div className="fixed inset-0 bg-black/50" />
      {/* Animated gradient overlay */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-radial from-purple-500/10 via-transparent to-transparent animate-pulse-slow" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-radial from-cyan-500/10 via-transparent to-transparent animate-pulse-slow" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8 pt-32">

        {/* Search Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="max-w-2xl mx-auto mb-8"
        >
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch(searchQuery);
              }}
              placeholder="Search by ICAO code (e.g., KORD, KLAX, KJFK)..."
              className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-white/30 text-lg focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
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
              <span className="text-white/40 text-sm">Recent:</span>
              {recentSearches.map((icao) => (
                <button
                  key={icao}
                  onClick={() => {
                    setSearchQuery(icao);
                    handleSearch(icao);
                  }}
                  className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-white/70 hover:text-white transition-all"
                >
                  {icao}
                </button>
              ))}
            </div>
          )}
        </motion.div>

        {/* View Mode Toggle */}
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => setViewMode("search")}
            className={`px-6 py-2 rounded-xl font-medium transition-all ${
              viewMode === "search"
                ? "bg-gradient-to-r from-purple-500 to-cyan-500 text-white"
                : "bg-white/5 text-white/50 hover:text-white"
            }`}
          >
            Station Search
          </button>
          <button
            onClick={() => {
              setViewMode("all");
              if (!allMetars) refetchAll();
            }}
            className={`px-6 py-2 rounded-xl font-medium transition-all ${
              viewMode === "all"
                ? "bg-gradient-to-r from-purple-500 to-cyan-500 text-white"
                : "bg-white/5 text-white/50 hover:text-white"
            }`}
          >
            All US Stations
          </button>
        </div>

        {/* Selected Station Detail */}
        <AnimatePresence mode="wait">
          {selectedStation && viewMode === "search" && (
            <motion.div
              key={selectedStation}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-3xl mx-auto mb-8"
            >
              {isLoadingSelected ? (
                <div className="glass rounded-2xl p-8 text-center">
                  <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
                  <p className="text-white/50">Loading METAR for {selectedStation}...</p>
                </div>
              ) : selectedMetar ? (
                <MetarDetailCard metar={selectedMetar} onClose={() => setSelectedStation(null)} />
              ) : (
                <div className="glass rounded-2xl p-8 text-center border border-red-500/30">
                  <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-white/70 text-lg">No METAR found for {selectedStation}</p>
                  <p className="text-white/40 text-sm mt-2">Check the ICAO code and try again</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* All Stations View */}
        {viewMode === "all" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {/* Stats Bar */}
            <div className="glass rounded-2xl p-6 mb-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">
                    {isLoadingAll ? "Loading..." : `${allMetars?.length ?? 0} US Stations`}
                  </h3>
                  <p className="text-white/50 text-sm">
                    {dataUpdatedAt ? `Last updated: ${format(new Date(dataUpdatedAt), "HH:mm:ss")}Z` : "Real-time aviation weather data"}
                    <span className="text-white/30 ml-2">• Auto-refresh hourly</span>
                  </p>
                </div>
                <button
                  onClick={() => refetchAll()}
                  disabled={isLoadingAll}
                  className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 rounded-xl text-cyan-400 font-medium transition-all disabled:opacity-50"
                >
                  <svg className={`w-4 h-4 ${isLoadingAll ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {isLoadingAll ? "Refreshing..." : "Refresh"}
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-4 mt-4">
                <div className="flex flex-wrap gap-3">
                  {(["VFR", "MVFR", "IFR", "LIFR"] as const).map((cat) => {
                    const styles = flightCategoryStyles[cat];
                    return (
                      <div key={cat} className={`px-3 py-2 rounded-xl ${styles.bg} ${styles.border} border`}>
                        <span className={`font-bold ${styles.text}`}>{categoryStats[cat] ?? 0}</span>
                        <span className="text-white/50 text-sm ml-2">{cat}</span>
                      </div>
                    );
                  })}
                  {/* Maintenance stats */}
                  <div className="px-3 py-2 rounded-xl bg-green-500/20 border border-green-500/50">
                    <span className="font-bold text-green-400">{healthyCount}</span>
                    <span className="text-white/50 text-sm ml-2">OK</span>
                  </div>
                  <div className="px-3 py-2 rounded-xl bg-orange-500/20 border border-orange-500/50">
                    <span className="font-bold text-orange-400">{maintenanceCount}</span>
                    <span className="text-white/50 text-sm ml-2">$ Flag</span>
                  </div>
                </div>
              </div>

              {/* Filter controls */}
              <div className="mt-4 flex flex-wrap gap-3 items-center">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter by ICAO code..."
                  className="flex-1 min-w-[200px] px-4 py-2 bg-black/30 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50"
                />

                {/* Temperature Unit Toggle */}
                <div className="flex bg-white/10 rounded-xl p-1">
                  <button
                    onClick={() => setTempUnit("C")}
                    className={`px-3 py-1 rounded-lg text-sm font-bold transition-all ${
                      tempUnit === "C"
                        ? "bg-cyan-500 text-white"
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
                        : "text-white/50 hover:text-white"
                    }`}
                  >
                    °F
                  </button>
                </div>
              </div>

              {/* Category Filters */}
              <div className="mt-3 flex flex-wrap gap-2 items-center">
                <span className="text-white/40 text-sm">Flight Category:</span>
                <button
                  onClick={() => setCategoryFilter("all")}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    categoryFilter === "all"
                      ? "bg-purple-500 text-white"
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
                <span className="text-white/40 text-sm">Status:</span>
                <button
                  onClick={() => setStatusFilter("all")}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    statusFilter === "all"
                      ? "bg-purple-500 text-white"
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
                      : "bg-white/10 text-white/60 hover:bg-white/20"
                  }`}
                >
                  $ Flagged
                </button>
              </div>

              {/* Info Tip Box */}
              <div className="mt-4 p-4 bg-white/5 border border-white/10 rounded-xl">
                <p className="text-white/50 text-xs leading-relaxed">
                  <span className="text-green-400 font-bold">VFR</span> = Clear skies (≥3000ft ceiling, &gt;5mi vis) •
                  <span className="text-blue-400 font-bold ml-2">MVFR</span> = Marginal (1000-3000ft, 3-5mi) •
                  <span className="text-red-400 font-bold ml-2">IFR</span> = Instrument required (500-1000ft, 1-3mi) •
                  <span className="text-purple-400 font-bold ml-2">LIFR</span> = Low visibility (&lt;500ft, &lt;1mi) •
                  <span className="text-orange-400 font-bold ml-2">$</span> = ASOS needs maintenance
                </p>
              </div>
            </div>

            {/* Stations Grid */}
            {isLoadingAll ? (
              <div className="text-center py-12">
                <div className="animate-spin w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-white/50 text-lg">Loading all US stations...</p>
                <p className="text-white/30 text-sm">This may take a moment</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {filteredStations.map((metar, idx) => (
                  <motion.div
                    key={metar.icao}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.01 }}
                  >
                    <StationCard
                      metar={metar}
                      tempUnit={tempUnit}
                      onClick={() => {
                        setSelectedStation(metar.icao);
                        setViewMode("search");
                      }}
                    />
                  </motion.div>
                ))}
              </div>
            )}

          </motion.div>
        )}

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-white/10 text-center">
          <p className="text-white/30 text-sm">
            Data from Aviation Weather Center (aviationweather.gov)
          </p>
        </footer>
      </div>
    </main>
  );
}
