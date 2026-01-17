"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export interface MetarData {
  icao: string;
  raw: string;
  station_name?: string;
  latitude?: number;
  longitude?: number;
  elevation_m?: number;
  observed_at: string;
  // Parsed data
  wind_direction?: number;
  wind_speed_kt?: number;
  wind_gust_kt?: number;
  visibility_sm?: number;
  temperature_c?: number;
  dewpoint_c?: number;
  altimeter_hg?: number;
  flight_category: "VFR" | "MVFR" | "IFR" | "LIFR";
  clouds?: Array<{ cover: string; base_ft: number }>;
  weather?: string[];
}

interface MetarApiResponse {
  icao: string;
  raw: string;
  observed: string;
  wind?: {
    degrees?: number;
    speed_kts?: number;
    gust_kts?: number;
  };
  visibility?: {
    meters?: number;
  };
  temperature?: {
    celsius?: number;
  };
  dewpoint?: {
    celsius?: number;
  };
  altimeter?: {
    value?: number;
  };
  clouds?: Array<{
    code: string;
    base_feet_agl?: number;
  }>;
  flight_category?: string;
  conditions?: Array<{ code: string }>;
}

// Parse raw METAR string
function parseMetar(raw: string): Partial<MetarData> {
  const parts = raw.split(" ");
  const result: Partial<MetarData> = {};

  // Find wind (format: dddssKT or dddssGggKT)
  const windMatch = raw.match(/(\d{3}|VRB)(\d{2,3})(G(\d{2,3}))?KT/);
  if (windMatch) {
    result.wind_direction = windMatch[1] === "VRB" ? -1 : parseInt(windMatch[1]);
    result.wind_speed_kt = parseInt(windMatch[2]);
    if (windMatch[4]) result.wind_gust_kt = parseInt(windMatch[4]);
  }

  // Find visibility (SM format)
  const visMatch = raw.match(/(\d+)\s*SM/);
  if (visMatch) {
    result.visibility_sm = parseInt(visMatch[1]);
  }

  // Find temperature/dewpoint (format: TT/DD or MTT/MDD)
  const tempMatch = raw.match(/(M?\d{2})\/(M?\d{2})/);
  if (tempMatch) {
    result.temperature_c = tempMatch[1].startsWith("M")
      ? -parseInt(tempMatch[1].slice(1))
      : parseInt(tempMatch[1]);
    result.dewpoint_c = tempMatch[2].startsWith("M")
      ? -parseInt(tempMatch[2].slice(1))
      : parseInt(tempMatch[2]);
  }

  // Find altimeter (format: Axxxx)
  const altMatch = raw.match(/A(\d{4})/);
  if (altMatch) {
    result.altimeter_hg = parseInt(altMatch[1]) / 100;
  }

  // Determine flight category
  result.flight_category = determineFlightCategory(result.visibility_sm, raw);

  return result;
}

function determineFlightCategory(
  visibility?: number,
  raw?: string
): "VFR" | "MVFR" | "IFR" | "LIFR" {
  // Extract ceiling from clouds
  let ceiling = Infinity;
  const cloudMatches = raw?.matchAll(/(BKN|OVC|VV)(\d{3})/g);
  if (cloudMatches) {
    for (const match of cloudMatches) {
      const height = parseInt(match[2]) * 100;
      if (height < ceiling) ceiling = height;
    }
  }

  const vis = visibility ?? 10;

  // LIFR: Ceiling < 500ft or Visibility < 1 SM
  if (ceiling < 500 || vis < 1) return "LIFR";
  // IFR: Ceiling 500-999ft or Visibility 1-3 SM
  if (ceiling < 1000 || vis < 3) return "IFR";
  // MVFR: Ceiling 1000-2999ft or Visibility 3-5 SM
  if (ceiling < 3000 || vis <= 5) return "MVFR";
  // VFR: Ceiling >= 3000ft and Visibility > 5 SM
  return "VFR";
}

// Fetch single METAR by ICAO code
async function fetchMetar(icao: string): Promise<MetarData | null> {
  try {
    // Use Aviation Weather API
    const response = await axios.get(
      `https://aviationweather.gov/api/data/metar?ids=${icao}&format=raw&hours=2`
    );

    const raw = response.data.trim();
    if (!raw || raw.includes("No METAR")) return null;

    // Get the most recent METAR (first line)
    const latestRaw = raw.split("\n")[0].trim();
    const parsed = parseMetar(latestRaw);

    return {
      icao: icao.toUpperCase(),
      raw: latestRaw,
      observed_at: new Date().toISOString(),
      flight_category: parsed.flight_category || "VFR",
      ...parsed,
    };
  } catch (error) {
    console.error(`Failed to fetch METAR for ${icao}:`, error);
    return null;
  }
}

// Fetch multiple METARs
async function fetchMultipleMetars(icaos: string[]): Promise<MetarData[]> {
  try {
    const ids = icaos.join(",");
    const response = await axios.get(
      `https://aviationweather.gov/api/data/metar?ids=${ids}&format=raw&hours=2`
    );

    const lines = response.data.trim().split("\n").filter((l: string) => l.trim());
    const results: MetarData[] = [];

    for (const line of lines) {
      const icaoMatch = line.match(/^([A-Z]{4})/);
      if (icaoMatch) {
        const parsed = parseMetar(line);
        results.push({
          icao: icaoMatch[1],
          raw: line.trim(),
          observed_at: new Date().toISOString(),
          flight_category: parsed.flight_category || "VFR",
          ...parsed,
        });
      }
    }

    return results;
  } catch (error) {
    console.error("Failed to fetch multiple METARs:", error);
    return [];
  }
}

// Fetch all US METARs
async function fetchAllUSMetars(): Promise<MetarData[]> {
  const states = [
    "al", "ak", "az", "ar", "ca", "co", "ct", "de", "fl", "ga",
    "hi", "id", "il", "in", "ia", "ks", "ky", "la", "me", "md",
    "ma", "mi", "mn", "ms", "mo", "mt", "ne", "nv", "nh", "nj",
    "nm", "ny", "nc", "nd", "oh", "ok", "or", "pa", "ri", "sc",
    "sd", "tn", "tx", "ut", "vt", "va", "wa", "wv", "wi", "wy", "dc"
  ];

  const allMetars: MetarData[] = [];

  // Fetch in parallel batches
  const batchSize = 10;
  for (let i = 0; i < states.length; i += batchSize) {
    const batch = states.slice(i, i + batchSize);
    const promises = batch.map(async (state) => {
      try {
        const response = await axios.get(
          `https://aviationweather.gov/api/data/metar?ids=@${state}&format=raw&hours=1`,
          { timeout: 15000 }
        );
        const lines = response.data.trim().split("\n").filter((l: string) => l.trim());
        return lines.map((line: string) => {
          const icaoMatch = line.match(/^([A-Z]{4})/);
          if (icaoMatch) {
            const parsed = parseMetar(line);
            return {
              icao: icaoMatch[1],
              raw: line.trim(),
              observed_at: new Date().toISOString(),
              flight_category: parsed.flight_category || "VFR",
              ...parsed,
            } as MetarData;
          }
          return null;
        }).filter(Boolean);
      } catch {
        return [];
      }
    });
    const results = await Promise.all(promises);
    allMetars.push(...results.flat());
  }

  return allMetars;
}

// Hook for single METAR
export function useMetar(icao: string | null) {
  return useQuery({
    queryKey: ["metar", icao],
    queryFn: () => (icao ? fetchMetar(icao) : null),
    enabled: !!icao && icao.length >= 4,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  });
}

// Hook for multiple METARs
export function useMultipleMetars(icaos: string[]) {
  return useQuery({
    queryKey: ["metars", icaos.join(",")],
    queryFn: () => fetchMultipleMetars(icaos),
    enabled: icaos.length > 0,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}

// Hook for all US METARs
export function useAllUSMetars() {
  return useQuery({
    queryKey: ["all-us-metars"],
    queryFn: fetchAllUSMetars,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}
