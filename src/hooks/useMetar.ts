"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { MetarData, TafData, AwcMetarResponse, AwcTafResponse } from "@/types";
import { transformMetar, transformTaf, weatherCodes, cloudCoverCodes, decodeWeather } from "@/lib/metarUtils";

const API_BASE = "/api/metar";

// Re-export specific utils that might be used by components
export { weatherCodes, cloudCoverCodes, decodeWeather };
export type { MetarData, TafData };

// Fetch single METAR by ICAO code
async function fetchMetar(icao: string): Promise<MetarData | null> {
  try {
    const cleanIcao = icao.toUpperCase().trim();
    const response = await axios.get(`${API_BASE}?ids=${cleanIcao}&format=json&hours=2`);
    const data = response.data;

    if (!data || !Array.isArray(data) || data.length === 0) {
      console.log(`No valid METAR for ${cleanIcao}`);
      return null;
    }

    // data[0] is AwcMetarResponse, but we need to ensure it matches the interface
    return transformMetar(data[0] as AwcMetarResponse);
  } catch (error) {
    console.error(`Failed to fetch METAR for ${icao}:`, error);
    return null;
  }
}

// Fetch TAF by ICAO code
async function fetchTaf(icao: string): Promise<TafData | null> {
  try {
    const cleanIcao = icao.toUpperCase().trim();
    const response = await axios.get(`${API_BASE}?ids=${cleanIcao}&format=json&type=taf`);
    const data = response.data;

    if (!data || !Array.isArray(data) || data.length === 0) {
      console.log(`No valid TAF for ${cleanIcao}`);
      return null;
    }

    return transformTaf(data[0] as AwcTafResponse);
  } catch (error) {
    console.error(`Failed to fetch TAF for ${icao}:`, error);
    return null;
  }
}

// Fetch all US METARs via our new optimized API route
async function fetchAllUSMetars(): Promise<MetarData[]> {
  try {
    const response = await axios.get(`${API_BASE}/all`);
    return response.data;
  } catch (error) {
    console.error("Failed to fetch all US METARs:", error);
    return [];
  }
}

// Hook for single METAR
export function useMetar(icao: string | null) {
  return useQuery({
    queryKey: ["metar", icao],
    queryFn: () => (icao ? fetchMetar(icao) : null),
    enabled: !!icao && icao.length >= 4,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}

// Hook for TAF
export function useTaf(icao: string | null) {
  return useQuery({
    queryKey: ["taf", icao],
    queryFn: () => (icao ? fetchTaf(icao) : null),
    enabled: !!icao && icao.length >= 4,
    staleTime: 15 * 60 * 1000,
    refetchInterval: 15 * 60 * 1000,
  });
}

// Hook for all US METARs
export function useAllUSMetars() {
  return useQuery({
    queryKey: ["all-us-metars"],
    queryFn: fetchAllUSMetars,
    staleTime: 5 * 60 * 1000, // Match the API cache time
    refetchInterval: 5 * 60 * 1000,
  });
}
