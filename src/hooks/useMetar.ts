"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export interface MetarData {
  icao: string;
  raw: string;
  station_name: string;
  latitude: number;
  longitude: number;
  elevation_m: number;
  observed_at: string;
  observation_time: string;
  obs_time_unix: number; // Unix timestamp of observation
  wind_direction: number | null;
  wind_speed_kt: number | null;
  wind_gust_kt: number | null;
  visibility_sm: number | string;
  temperature_c: number | null;
  dewpoint_c: number | null;
  altimeter_hg: number | null;
  flight_category: "VFR" | "MVFR" | "IFR" | "LIFR";
  clouds: Array<{ cover: string; base_ft: number }>;
  weather: string[];
  has_maintenance_flag: boolean;
  metar_type: string;
}

export interface TafData {
  icao: string;
  raw: string;
  station_name: string;
  issue_time: string;
  valid_from: string;
  valid_to: string;
  forecasts: Array<{
    from: string;
    to: string;
    wind_direction: number | null;
    wind_speed_kt: number | null;
    wind_gust_kt: number | null;
    visibility_sm: number | string;
    flight_category: "VFR" | "MVFR" | "IFR" | "LIFR";
    clouds: Array<{ cover: string; base_ft: number }>;
    weather: string[];
    change_type?: string;
  }>;
}

// API response type from aviationweather.gov JSON format
interface AwcMetarResponse {
  icaoId: string;
  rawOb: string;
  name: string;
  lat: number;
  lon: number;
  elev: number;
  obsTime: number;
  reportTime: string;
  temp: number | null;
  dewp: number | null;
  wdir: number | string | null;
  wspd: number | null;
  wgst: number | null;
  visib: number | string;
  altim: number | null;
  fltCat: string;
  clouds: Array<{ cover: string; base: number }>;
  wxString?: string;
  metarType: string;
}

interface AwcTafResponse {
  icaoId: string;
  rawTAF: string;
  name: string;
  issueTime: string;
  validTimeFrom: number;
  validTimeTo: number;
  fcsts: Array<{
    timeFrom: number;
    timeTo: number;
    wdir: number | string | null;
    wspd: number | null;
    wgst: number | null;
    visib: number | string;
    clouds: Array<{ cover: string; base: number }>;
    wxString?: string;
    fcstChange?: string;
  }>;
}

const API_BASE = "/api/metar";

// Convert AWC response to our MetarData format
function transformMetar(awc: AwcMetarResponse): MetarData {
  const hasMaintenanceFlag = awc.rawOb?.trim().endsWith("$") || false;

  // Parse observation time from raw METAR
  const timeMatch = awc.rawOb?.match(/\b(\d{6})Z\b/);
  const observationTime = timeMatch ? timeMatch[1] + "Z" : "";

  return {
    icao: awc.icaoId,
    raw: awc.rawOb || "",
    station_name: awc.name || awc.icaoId,
    latitude: awc.lat,
    longitude: awc.lon,
    elevation_m: awc.elev ? awc.elev * 0.3048 : 0, // Convert ft to m
    observed_at: awc.reportTime || new Date().toISOString(),
    observation_time: observationTime,
    obs_time_unix: awc.obsTime ? awc.obsTime * 1000 : Date.now(), // Convert to milliseconds
    wind_direction: typeof awc.wdir === "number" ? awc.wdir : null,
    wind_speed_kt: awc.wspd,
    wind_gust_kt: awc.wgst,
    visibility_sm: awc.visib ?? 10,
    temperature_c: awc.temp,
    dewpoint_c: awc.dewp,
    altimeter_hg: awc.altim ? awc.altim / 33.8639 : null, // Convert hPa to inHg
    flight_category: (awc.fltCat as MetarData["flight_category"]) || "VFR",
    clouds: (awc.clouds || []).map((c) => ({
      cover: c.cover,
      base_ft: c.base || 0,
    })),
    weather: awc.wxString ? awc.wxString.split(" ") : [],
    has_maintenance_flag: hasMaintenanceFlag,
    metar_type: awc.metarType || "METAR",
  };
}

// Convert AWC TAF response to our TafData format
function transformTaf(awc: AwcTafResponse): TafData {
  return {
    icao: awc.icaoId,
    raw: awc.rawTAF || "",
    station_name: awc.name || awc.icaoId,
    issue_time: awc.issueTime,
    valid_from: new Date(awc.validTimeFrom * 1000).toISOString(),
    valid_to: new Date(awc.validTimeTo * 1000).toISOString(),
    forecasts: (awc.fcsts || []).map((f) => ({
      from: new Date(f.timeFrom * 1000).toISOString(),
      to: new Date(f.timeTo * 1000).toISOString(),
      wind_direction: typeof f.wdir === "number" ? f.wdir : null,
      wind_speed_kt: f.wspd,
      wind_gust_kt: f.wgst,
      visibility_sm: f.visib ?? 10,
      flight_category: determineFltCat(f.visib, f.clouds),
      clouds: (f.clouds || []).map((c) => ({
        cover: c.cover,
        base_ft: c.base || 0,
      })),
      weather: f.wxString ? f.wxString.split(" ") : [],
      change_type: f.fcstChange,
    })),
  };
}

// Determine flight category from visibility and clouds
function determineFltCat(
  visib: number | string | undefined,
  clouds: Array<{ cover: string; base: number }> | undefined
): "VFR" | "MVFR" | "IFR" | "LIFR" {
  let ceiling = Infinity;
  if (clouds) {
    for (const c of clouds) {
      if ((c.cover === "BKN" || c.cover === "OVC" || c.cover === "VV") && c.base < ceiling) {
        ceiling = c.base;
      }
    }
  }

  const vis = typeof visib === "number" ? visib : 10;

  if (ceiling < 500 || vis < 1) return "LIFR";
  if (ceiling < 1000 || vis < 3) return "IFR";
  if (ceiling < 3000 || vis <= 5) return "MVFR";
  return "VFR";
}

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

    return transformMetar(data[0]);
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

    return transformTaf(data[0]);
  } catch (error) {
    console.error(`Failed to fetch TAF for ${icao}:`, error);
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
        const response = await axios.get(`${API_BASE}?ids=@${state}&format=json&hours=1`, {
          timeout: 15000,
        });

        const data = response.data;
        if (!data || !Array.isArray(data)) return [];

        return data.map((item: AwcMetarResponse) => transformMetar(item));
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
    staleTime: 30 * 60 * 1000,
    refetchInterval: 60 * 60 * 1000,
  });
}

// Weather phenomenon decoder
export const weatherCodes: Record<string, string> = {
  // Intensity
  "-": "Light",
  "+": "Heavy",
  // Descriptor
  MI: "Shallow",
  PR: "Partial",
  BC: "Patches",
  DR: "Low Drifting",
  BL: "Blowing",
  SH: "Showers",
  TS: "Thunderstorm",
  FZ: "Freezing",
  // Precipitation
  DZ: "Drizzle",
  RA: "Rain",
  SN: "Snow",
  SG: "Snow Grains",
  IC: "Ice Crystals",
  PL: "Ice Pellets",
  GR: "Hail",
  GS: "Small Hail",
  UP: "Unknown Precipitation",
  // Obscuration
  BR: "Mist",
  FG: "Fog",
  FU: "Smoke",
  VA: "Volcanic Ash",
  DU: "Widespread Dust",
  SA: "Sand",
  HZ: "Haze",
  PY: "Spray",
  // Other
  PO: "Dust Whirls",
  SQ: "Squalls",
  FC: "Funnel Cloud",
  SS: "Sandstorm",
  DS: "Duststorm",
  VC: "Vicinity",
};

// Cloud cover decoder
export const cloudCoverCodes: Record<string, string> = {
  SKC: "Sky Clear",
  CLR: "Clear",
  FEW: "Few (1-2 oktas)",
  SCT: "Scattered (3-4 oktas)",
  BKN: "Broken (5-7 oktas)",
  OVC: "Overcast (8 oktas)",
  VV: "Vertical Visibility",
};

// Decode weather string
export function decodeWeather(wx: string): string {
  let result = "";
  let intensity = "";

  if (wx.startsWith("-")) {
    intensity = "Light ";
    wx = wx.slice(1);
  } else if (wx.startsWith("+")) {
    intensity = "Heavy ";
    wx = wx.slice(1);
  }

  // Match 2-character codes
  const codes: string[] = [];
  for (let i = 0; i < wx.length; i += 2) {
    const code = wx.slice(i, i + 2);
    if (weatherCodes[code]) {
      codes.push(weatherCodes[code]);
    }
  }

  result = intensity + codes.join(" ");
  return result || wx;
}
