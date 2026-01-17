"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useAllUSMetars } from "@/hooks/useMetar";
import { useMaintenanceStore, StationStats } from "@/stores/maintenanceStore";
import { format, formatDistanceToNow } from "date-fns";

type SortField = "totalOutages" | "totalDowntime" | "averageDowntime" | "longestOutage" | "downtimePercentage" | "firstOutage" | "lastOutage";
type SortDirection = "asc" | "desc";

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  return `${days}d ${hours}h`;
}

export default function LeaderboardPage() {
  const [mounted, setMounted] = useState(false);
  const [sortField, setSortField] = useState<SortField>("totalOutages");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [showCurrentOnly, setShowCurrentOnly] = useState(false);

  const { data: allMetars, isLoading, dataUpdatedAt } = useAllUSMetars();
  const {
    fetchData,
    updateStationStatuses,
    getStationStats,
    getRecentOutages,
    outageLog,
    isLoading: storeLoading
  } = useMaintenanceStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch maintenance data on mount
  useEffect(() => {
    if (mounted) {
      fetchData();
    }
  }, [mounted, fetchData]);

  // Update maintenance store with current station statuses when METAR data updates
  useEffect(() => {
    if (allMetars && mounted && allMetars.length > 0) {
      // Batch all updates together - include observation time
      const updates = allMetars.map((metar) => ({
        icao: metar.icao,
        stationName: metar.station_name,
        hasFlag: metar.has_maintenance_flag,
        obsTime: metar.obs_time_unix,
        observationTime: metar.observation_time, // Zulu time string like "171553Z"
      }));
      updateStationStatuses(updates);
    }
  }, [allMetars, mounted, updateStationStatuses]);

  // Get stats - only stations with outage history will appear
  const stats = useMemo(() => {
    if (!mounted) return [];
    return getStationStats();
  }, [mounted, getStationStats, outageLog]);

  // Get ALL recent outages (no limit for display)
  const recentOutages = useMemo(() => {
    if (!mounted) return [];
    return getRecentOutages(500); // Show up to 500 recent events
  }, [mounted, getRecentOutages, outageLog]);

  const sortedStats = useMemo(() => {
    let filtered = showCurrentOnly ? stats.filter((s) => s.currentlyDown) : stats;

    return filtered.sort((a, b) => {
      let aVal: number, bVal: number;
      switch (sortField) {
        case "totalOutages":
          aVal = a.totalOutages;
          bVal = b.totalOutages;
          break;
        case "totalDowntime":
          aVal = a.totalDowntimeMinutes;
          bVal = b.totalDowntimeMinutes;
          break;
        case "averageDowntime":
          aVal = a.averageDowntimeMinutes;
          bVal = b.averageDowntimeMinutes;
          break;
        case "longestOutage":
          aVal = a.longestOutageMinutes;
          bVal = b.longestOutageMinutes;
          break;
        case "downtimePercentage":
          aVal = a.downtimePercentage;
          bVal = b.downtimePercentage;
          break;
        case "firstOutage":
          aVal = a.firstOutage || 0;
          bVal = b.firstOutage || 0;
          break;
        case "lastOutage":
          aVal = a.lastOutage || 0;
          bVal = b.lastOutage || 0;
          break;
        default:
          return 0;
      }
      return sortDirection === "desc" ? bVal - aVal : aVal - bVal;
    });
  }, [stats, sortField, sortDirection, showCurrentOnly]);

  const currentlyDownCount = stats.filter((s) => s.currentlyDown).length;
  const totalOutagesLogged = outageLog.length;
  const totalStationsTracked = stats.length;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  if (!mounted) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full" />
      </main>
    );
  }

  return (
    <main className="min-h-screen relative">
      {/* Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link
              href="/"
              className="text-white/50 hover:text-white text-sm mb-2 inline-flex items-center gap-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Command Center
            </Link>
            <h1 className="text-4xl font-black text-white">ASOS Maintenance Leaderboard</h1>
            <p className="text-white/50 mt-2">
              Tracking station outages marked with $ maintenance flag
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="glass rounded-2xl p-6">
            <p className="text-white/50 text-sm mb-1">Currently Down</p>
            <p className="text-4xl font-black text-orange-400">{currentlyDownCount}</p>
            <p className="text-white/30 text-xs mt-1">stations with $ flag</p>
          </div>
          <div className="glass rounded-2xl p-6">
            <p className="text-white/50 text-sm mb-1">Total Outages Logged</p>
            <p className="text-4xl font-black text-purple-400">{totalOutagesLogged}</p>
            <p className="text-white/30 text-xs mt-1">since tracking started</p>
          </div>
          <div className="glass rounded-2xl p-6">
            <p className="text-white/50 text-sm mb-1">Stations Tracked</p>
            <p className="text-4xl font-black text-cyan-400">{totalStationsTracked}</p>
            <p className="text-white/30 text-xs mt-1">with outage history</p>
          </div>
          <div className="glass rounded-2xl p-6">
            <p className="text-white/50 text-sm mb-1">Last Updated</p>
            <p className="text-2xl font-bold text-white">
              {dataUpdatedAt ? format(new Date(dataUpdatedAt), "HH:mm:ss") : "--"}
            </p>
            <p className="text-white/30 text-xs mt-1">
              {isLoading || storeLoading ? "Refreshing..." : "Auto-refresh hourly"}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <button
            onClick={() => setShowCurrentOnly(!showCurrentOnly)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              showCurrentOnly
                ? "bg-orange-500 text-white"
                : "bg-white/10 text-white/60 hover:bg-white/20"
            }`}
          >
            {showCurrentOnly ? "Showing Currently Down Only" : "Show All Stations"}
          </button>
        </div>

        {/* Leaderboard Table */}
        <div className="glass rounded-2xl overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-4 text-white/50 font-medium">Rank</th>
                  <th className="text-left p-4 text-white/50 font-medium">Station</th>
                  <th className="text-left p-4 text-white/50 font-medium">Status</th>
                  <th
                    className="text-left p-4 text-white/50 font-medium cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort("totalOutages")}
                  >
                    Outages {sortField === "totalOutages" && (sortDirection === "desc" ? "↓" : "↑")}
                  </th>
                  <th
                    className="text-left p-4 text-white/50 font-medium cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort("totalDowntime")}
                  >
                    Total Downtime {sortField === "totalDowntime" && (sortDirection === "desc" ? "↓" : "↑")}
                  </th>
                  <th
                    className="text-left p-4 text-white/50 font-medium cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort("averageDowntime")}
                  >
                    Avg Downtime {sortField === "averageDowntime" && (sortDirection === "desc" ? "↓" : "↑")}
                  </th>
                  <th
                    className="text-left p-4 text-white/50 font-medium cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort("longestOutage")}
                  >
                    Longest {sortField === "longestOutage" && (sortDirection === "desc" ? "↓" : "↑")}
                  </th>
                  <th
                    className="text-left p-4 text-white/50 font-medium cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort("downtimePercentage")}
                  >
                    Down % {sortField === "downtimePercentage" && (sortDirection === "desc" ? "↓" : "↑")}
                  </th>
                  <th
                    className="text-left p-4 text-white/50 font-medium cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort("firstOutage")}
                  >
                    First Outage {sortField === "firstOutage" && (sortDirection === "desc" ? "↓" : "↑")}
                  </th>
                  <th
                    className="text-left p-4 text-white/50 font-medium cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort("lastOutage")}
                  >
                    Last Outage {sortField === "lastOutage" && (sortDirection === "desc" ? "↓" : "↑")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedStats.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-white/50">
                      {isLoading || storeLoading
                        ? "Loading station data..."
                        : "No outage data yet. Stations will appear here when they have the $ maintenance flag."}
                    </td>
                  </tr>
                ) : (
                  sortedStats.map((station, idx) => (
                    <motion.tr
                      key={station.icao}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="p-4">
                        <span className={`font-bold ${idx < 3 ? "text-orange-400" : "text-white/50"}`}>
                          #{idx + 1}
                        </span>
                      </td>
                      <td className="p-4">
                        <Link href={`/?station=${station.icao}`} className="hover:underline">
                          <p className="font-bold text-white">{station.icao}</p>
                          <p className="text-xs text-white/40 truncate max-w-[200px]">
                            {station.stationName}
                          </p>
                        </Link>
                      </td>
                      <td className="p-4">
                        {station.currentlyDown ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-500/20 text-orange-400 rounded-lg text-xs font-bold">
                            <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                            DOWN
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded-lg text-xs font-bold">
                            <span className="w-2 h-2 bg-green-500 rounded-full" />
                            OK
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-white font-bold">{station.totalOutages}</td>
                      <td className="p-4 text-white">
                        {station.totalDowntimeMinutes > 0 ? formatDuration(station.totalDowntimeMinutes) : "--"}
                      </td>
                      <td className="p-4 text-white">
                        {station.averageDowntimeMinutes > 0 ? formatDuration(station.averageDowntimeMinutes) : "--"}
                      </td>
                      <td className="p-4 text-white">
                        {station.longestOutageMinutes > 0 ? formatDuration(station.longestOutageMinutes) : "--"}
                      </td>
                      <td className="p-4">
                        <span className={`font-bold ${
                          station.downtimePercentage >= 50 ? "text-red-400" :
                          station.downtimePercentage >= 25 ? "text-orange-400" :
                          station.downtimePercentage >= 10 ? "text-yellow-400" :
                          "text-green-400"
                        }`}>
                          {station.downtimePercentage > 0 ? `${station.downtimePercentage}%` : "--"}
                        </span>
                      </td>
                      <td className="p-4 text-white/60 text-sm">
                        {station.firstOutage
                          ? format(station.firstOutage, "MMM d HH:mm'Z'")
                          : "--"}
                      </td>
                      <td className="p-4 text-white/60 text-sm">
                        {station.lastOutage
                          ? formatDistanceToNow(station.lastOutage, { addSuffix: true })
                          : "--"}
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Outage Log */}
        <div className="glass rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">Recent Outage Events</h2>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {recentOutages.length === 0 ? (
              <p className="text-white/50 text-center py-8">
                No outage events logged yet. Stations with $ flag will be tracked automatically.
              </p>
            ) : (
              recentOutages.map((event, idx) => (
                <div
                  key={`${event.icao}-${event.startTime}`}
                  className={`p-3 rounded-xl ${
                    event.endTime === null ? "bg-orange-500/10 border border-orange-500/30" : "bg-white/5"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-white">{event.icao}</span>
                      <span className="text-white/40 text-sm">{event.stationName?.split(",")[0]}</span>
                    </div>
                    <div className="text-right">
                      {event.endTime === null ? (
                        <span className="text-orange-400 text-sm font-medium">
                          Ongoing - {formatDistanceToNow(event.startTime)}
                        </span>
                      ) : (
                        <span className="text-green-400 text-sm">
                          Resolved after {formatDuration(event.duration!)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-white/30 mt-1">
                    Started: {event.startTimeZulu || format(event.startTime, "HHmmss'Z'")}
                    {event.endTime && ` • Ended: ${event.endTimeZulu || format(event.endTime, "HHmmss'Z'")}`}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-8 p-4 bg-white/5 border border-white/10 rounded-xl">
          <p className="text-white/50 text-sm">
            <strong className="text-white">How it works:</strong> This leaderboard tracks stations that have the
            $ (dollar sign) flag in their METAR, indicating ASOS maintenance is needed. When the flag appears,
            an outage starts. When it disappears, the outage ends and duration is calculated. Data is stored
            on the server using Vercel KV and persists across all users and sessions.
          </p>
        </div>

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
