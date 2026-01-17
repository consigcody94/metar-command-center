"use client";

import { motion } from "framer-motion";
import { MetarData } from "@/types";

// Flight category styling (duplicated here or should be shared? Shared is better but keeping local for now if not used elsewhere)
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

export function StationCard({
    metar,
    onClick,
    tempUnit,
    isFavorite,
}: {
    metar: MetarData;
    onClick: () => void;
    tempUnit: "C" | "F";
    isFavorite: boolean;
}) {
    const styles = flightCategoryStyles[metar.flight_category];

    const displayTemp =
        metar.temperature_c !== null
            ? tempUnit === "F"
                ? Math.round(metar.temperature_c * 9 / 5 + 32)
                : metar.temperature_c
            : null;

    return (
        <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className={`glass p-4 rounded-xl text-left w-full ${metar.has_maintenance_flag ? "border-orange-500/50 border-2" : styles.border + " border"
                } hover:${styles.bg} transition-all duration-300 relative`}
        >
            {/* Favorite indicator */}
            {isFavorite && (
                <div className="absolute -top-1 -left-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                </div>
            )}
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
            {/* Station name */}
            <div className="text-xs text-white/40 mb-1 truncate" title={metar.station_name}>
                {metar.station_name?.split(",")[0] || "--"}
            </div>
            {/* Zulu observation time */}
            <div className="text-xs text-cyan-400/70 mb-2 font-mono">{metar.observation_time || "--Z"}</div>
            <div className="text-sm text-white/50 space-y-1">
                <div className="flex justify-between">
                    <span>Wind</span>
                    <span className="text-white/80">
                        {metar.wind_direction === null ? "VRB" : `${metar.wind_direction}°`}{" "}
                        {metar.wind_speed_kt ?? "--"}kt
                    </span>
                </div>
                <div className="flex justify-between">
                    <span>Vis</span>
                    <span className="text-white/80">{metar.visibility_sm}SM</span>
                </div>
                <div className="flex justify-between">
                    <span>Temp</span>
                    <span className="text-white/80">
                        {displayTemp ?? "--"}°{tempUnit}
                    </span>
                </div>
            </div>
        </motion.button>
    );
}
