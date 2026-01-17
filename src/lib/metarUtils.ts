import { MetarData, TafData, AwcMetarResponse, AwcTafResponse } from "@/types";

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

export const cloudCoverCodes: Record<string, string> = {
    SKC: "Sky Clear",
    CLR: "Clear",
    FEW: "Few (1-2 oktas)",
    SCT: "Scattered (3-4 oktas)",
    BKN: "Broken (5-7 oktas)",
    OVC: "Overcast (8 oktas)",
    VV: "Vertical Visibility",
};

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

export function determineFltCat(
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

export function transformMetar(awc: AwcMetarResponse): MetarData {
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
        obs_time_unix: awc.obsTime ? awc.obsTime * 1000 : Date.now(),
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

export function transformTaf(awc: AwcTafResponse): TafData {
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
