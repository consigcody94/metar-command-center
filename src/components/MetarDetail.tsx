"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { MetarData, TafData } from "@/types";
import { cloudCoverCodes, decodeWeather } from "@/lib/metarUtils";

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
export function MetarDetailCard({
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
                            className={`p-2 rounded-lg transition-colors ${isFavorite ? "bg-yellow-500/20 text-yellow-400" : "bg-white/5 text-white/30 hover:text-yellow-400"
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
