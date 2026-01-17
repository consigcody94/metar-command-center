"use client";

import { create } from "zustand";

export interface OutageEvent {
  icao: string;
  stationName: string;
  startTime: number;
  endTime: number | null;
  duration: number | null;
}

export interface StationStats {
  icao: string;
  stationName: string;
  totalOutages: number;
  totalDowntimeMinutes: number;
  averageDowntimeMinutes: number;
  longestOutageMinutes: number;
  firstOutage: number | null; // First time station ever had $ flag
  lastOutage: number | null;
  currentlyDown: boolean;
  currentOutageStart: number | null;
}

interface StationStatus {
  hasFlag: boolean;
  lastSeen: number;
  stationName: string;
}

interface MaintenanceState {
  stationStatus: Record<string, StationStatus>;
  outageLog: OutageEvent[];
  isLoading: boolean;
  lastFetch: number | null;

  // Fetch data from server
  fetchData: () => Promise<void>;
  // Update station statuses (batched)
  updateStationStatuses: (updates: Array<{ icao: string; stationName: string; hasFlag: boolean }>) => Promise<void>;
  // Get stats for leaderboard (computed from local state)
  getStationStats: () => StationStats[];
  // Get recent outage events
  getRecentOutages: (limit?: number) => OutageEvent[];
  // Clear all data
  clearData: () => Promise<void>;
}

export const useMaintenanceStore = create<MaintenanceState>()((set, get) => ({
  stationStatus: {},
  outageLog: [],
  isLoading: false,
  lastFetch: null,

  fetchData: async () => {
    // Don't fetch if we fetched in the last 30 seconds
    const now = Date.now();
    const lastFetch = get().lastFetch;
    if (lastFetch && now - lastFetch < 30000) {
      return;
    }

    set({ isLoading: true });
    try {
      const res = await fetch("/api/maintenance");
      if (res.ok) {
        const data = await res.json();
        set({
          stationStatus: data.stationStatus || {},
          outageLog: data.outageLog || [],
          lastFetch: now,
        });
      }
    } catch (error) {
      console.error("Failed to fetch maintenance data:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  updateStationStatuses: async (updates) => {
    try {
      const res = await fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        // Refresh data from server
        await get().fetchData();
      }
    } catch (error) {
      console.error("Failed to update station statuses:", error);
    }
  },

  getStationStats: () => {
    const { outageLog } = get();
    const statsMap = new Map<string, StationStats>();

    for (const event of outageLog) {
      let stats = statsMap.get(event.icao);
      if (!stats) {
        stats = {
          icao: event.icao,
          stationName: event.stationName,
          totalOutages: 0,
          totalDowntimeMinutes: 0,
          averageDowntimeMinutes: 0,
          longestOutageMinutes: 0,
          firstOutage: event.startTime, // First outage for this station
          lastOutage: null,
          currentlyDown: false,
          currentOutageStart: null,
        };
        statsMap.set(event.icao, stats);
      }

      stats.totalOutages++;
      if (event.duration !== null) {
        stats.totalDowntimeMinutes += event.duration;
        stats.longestOutageMinutes = Math.max(stats.longestOutageMinutes, event.duration);
      }
      // Track earliest outage
      if (stats.firstOutage === null || event.startTime < stats.firstOutage) {
        stats.firstOutage = event.startTime;
      }
      stats.lastOutage = event.startTime;

      if (event.endTime === null) {
        stats.currentlyDown = true;
        stats.currentOutageStart = event.startTime;
      }
    }

    // Calculate averages
    const allStats = Array.from(statsMap.values());
    for (const stats of allStats) {
      const completedOutages = outageLog.filter(
        (e) => e.icao === stats.icao && e.duration !== null
      ).length;
      if (completedOutages > 0) {
        stats.averageDowntimeMinutes = Math.round(
          stats.totalDowntimeMinutes / completedOutages
        );
      }
    }

    return allStats;
  },

  getRecentOutages: (limit = 50) => {
    return get()
      .outageLog.slice()
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, limit);
  },

  clearData: async () => {
    try {
      const res = await fetch("/api/maintenance", { method: "DELETE" });
      if (res.ok) {
        set({ stationStatus: {}, outageLog: [], lastFetch: null });
      }
    } catch (error) {
      console.error("Failed to clear data:", error);
    }
  },
}));
