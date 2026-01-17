"use client";

import { MetarData } from "@/types";
import { StationCard } from "@/components/StationCard";

export default function StationGrid({
    metars,
    onStationClick,
    tempUnit,
    favorites,
}: {
    metars: MetarData[];
    onStationClick: (icao: string) => void;
    tempUnit: "C" | "F";
    favorites: string[];
}) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
            {metars.map((metar) => (
                <StationCard
                    key={metar.icao}
                    metar={metar}
                    onClick={() => onStationClick(metar.icao)}
                    tempUnit={tempUnit}
                    isFavorite={favorites.includes(metar.icao)}
                />
            ))}
        </div>
    );
}
