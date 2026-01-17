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
export interface AwcMetarResponse {
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

export interface AwcTafResponse {
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
