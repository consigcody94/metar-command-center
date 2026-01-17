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
  // Zulu observation time from METAR (e.g., "171856Z")
  observation_time?: string;
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
  // ASOS maintenance flag - $ at end of METAR indicates maintenance needed
  has_maintenance_flag: boolean;
}

// Parse raw METAR string
function parseMetar(raw: string): Partial<MetarData> {
  const result: Partial<MetarData> = {};

  // Find observation time (format: ddhhmmZ - day, hour, minute, Zulu)
  const timeMatch = raw.match(/\b(\d{6})Z\b/);
  if (timeMatch) {
    result.observation_time = timeMatch[1] + "Z";
  }

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
  let ceiling = Infinity;
  const cloudMatches = raw?.matchAll(/(BKN|OVC|VV)(\d{3})/g);
  if (cloudMatches) {
    for (const match of cloudMatches) {
      const height = parseInt(match[2]) * 100;
      if (height < ceiling) ceiling = height;
    }
  }

  const vis = visibility ?? 10;

  if (ceiling < 500 || vis < 1) return "LIFR";
  if (ceiling < 1000 || vis < 3) return "IFR";
  if (ceiling < 3000 || vis <= 5) return "MVFR";
  return "VFR";
}

// Use local API proxy to avoid CORS
const API_BASE = "/api/metar";

// Fetch single METAR by ICAO code
async function fetchMetar(icao: string): Promise<MetarData | null> {
  try {
    const cleanIcao = icao.toUpperCase().trim();
    const response = await axios.get(`${API_BASE}?ids=${cleanIcao}&hours=2`);
    const raw = response.data.trim();

    console.log(`METAR response for ${cleanIcao}:`, raw);

    if (!raw || raw.includes("No METAR") || raw.includes("error") || raw.length < 10) {
      console.log(`No valid METAR for ${cleanIcao}`);
      return null;
    }

    // Get the most recent METAR line
    const latestRaw = raw.split("\n")[0].trim();
    const parsed = parseMetar(latestRaw);

    // Check for $ flag at end (ASOS maintenance indicator)
    const hasMaintenanceFlag = latestRaw.endsWith("$");

    // Extract actual ICAO from the METAR line (skip METAR/SPECI prefix)
    const icaoMatch = latestRaw.match(/(?:METAR|SPECI)?\s*([KP][A-Z0-9]{3})\s/);
    const actualIcao = icaoMatch ? icaoMatch[1] : cleanIcao;

    return {
      icao: actualIcao,
      raw: latestRaw,
      observed_at: new Date().toISOString(),
      flight_category: parsed.flight_category || "VFR",
      has_maintenance_flag: hasMaintenanceFlag,
      ...parsed,
    };
  } catch (error) {
    console.error(`Failed to fetch METAR for ${icao}:`, error);
    return null;
  }
}

// Fetch all US METARs using state codes
async function fetchAllUSMetars(): Promise<MetarData[]> {
  const states = [
    "al", "ak", "az", "ar", "ca", "co", "ct", "de", "fl", "ga",
    "hi", "id", "il", "in", "ia", "ks", "ky", "la", "me", "md",
    "ma", "mi", "mn", "ms", "mo", "mt", "ne", "nv", "nh", "nj",
    "nm", "ny", "nc", "nd", "oh", "ok", "or", "pa", "ri", "sc",
    "sd", "tn", "tx", "ut", "vt", "va", "wa", "wv", "wi", "wy", "dc"
  ];

  const allMetars: MetarData[] = [];

  // Fetch in parallel batches of 10
  const batchSize = 10;
  for (let i = 0; i < states.length; i += batchSize) {
    const batch = states.slice(i, i + batchSize);
    const promises = batch.map(async (state) => {
      try {
        const response = await axios.get(`${API_BASE}?ids=@${state}&hours=1`, {
          timeout: 15000,
        });

        const lines = response.data
          .trim()
          .split("\n")
          .filter((l: string) => l.trim() && !l.includes("error"));

        return lines.map((line: string) => {
          // METAR format: "METAR KORD 171856Z..." or "SPECI KORD 171856Z..." or just "KORD 171856Z..."
          // The ICAO is the 4-letter code AFTER METAR/SPECI, or the first 4-letter code starting with K or P
          const parts = line.trim().split(/\s+/);
          let icaoCode = null;
          for (const part of parts) {
            // Skip METAR, SPECI, and find first K*** or P*** code
            if (part.match(/^[KP][A-Z0-9]{3}$/)) {
              icaoCode = part;
              break;
            }
          }
          if (icaoCode) {
            const parsed = parseMetar(line);
            const hasMaintenanceFlag = line.trim().endsWith("$");
            return {
              icao: icaoCode,
              raw: line.trim(),
              observed_at: new Date().toISOString(),
              observation_time: parsed.observation_time,
              flight_category: parsed.flight_category || "VFR",
              has_maintenance_flag: hasMaintenanceFlag,
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

  // Deduplicate by ICAO - keep only the most recent observation for each station
  const stationMap = new Map<string, MetarData>();
  for (const metar of allMetars) {
    const existing = stationMap.get(metar.icao);
    if (!existing) {
      stationMap.set(metar.icao, metar);
    } else {
      // Compare observation times - keep the newer one
      // Format is DDHHMMZ (day, hour, minute)
      const existingTime = existing.observation_time || "000000Z";
      const newTime = metar.observation_time || "000000Z";
      if (newTime > existingTime) {
        stationMap.set(metar.icao, metar);
      }
    }
  }

  return Array.from(stationMap.values());
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

// Hook for all US METARs
export function useAllUSMetars() {
  return useQuery({
    queryKey: ["all-us-metars"],
    queryFn: fetchAllUSMetars,
    staleTime: 30 * 60 * 1000, // 30 minutes
    refetchInterval: 60 * 60 * 1000, // Auto-refresh every hour
  });
}
