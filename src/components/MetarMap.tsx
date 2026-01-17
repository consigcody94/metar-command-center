"use client";

import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MetarData } from "@/hooks/useMetar";

// Flight category colors
const categoryColors = {
  VFR: "#22c55e",
  MVFR: "#3b82f6",
  IFR: "#ef4444",
  LIFR: "#a855f7",
};

// Component to fit bounds when stations change
function FitBounds({ stations }: { stations: MetarData[] }) {
  const map = useMap();

  useEffect(() => {
    if (stations.length > 0) {
      const bounds = L.latLngBounds(
        stations.map((s) => [s.latitude, s.longitude] as [number, number])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [stations, map]);

  return null;
}

interface MetarMapProps {
  stations: MetarData[];
  onStationClick: (icao: string) => void;
  selectedStation?: string | null;
  categoryFilter: "all" | "VFR" | "MVFR" | "IFR" | "LIFR";
}

export default function MetarMap({
  stations,
  onStationClick,
  selectedStation,
  categoryFilter,
}: MetarMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Filter stations with valid coordinates
  const validStations = stations.filter(
    (s) =>
      s.latitude &&
      s.longitude &&
      !isNaN(s.latitude) &&
      !isNaN(s.longitude) &&
      (categoryFilter === "all" || s.flight_category === categoryFilter)
  );

  if (!isClient) {
    return (
      <div className="w-full h-[500px] bg-black/30 rounded-2xl flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="w-full h-[500px] rounded-2xl overflow-hidden border border-white/10">
      <MapContainer
        center={[39.8283, -98.5795]} // Center of US
        zoom={4}
        style={{ height: "100%", width: "100%" }}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <FitBounds stations={validStations} />
        {validStations.map((station) => (
          <CircleMarker
            key={station.icao}
            center={[station.latitude, station.longitude]}
            radius={selectedStation === station.icao ? 12 : 6}
            pathOptions={{
              fillColor: categoryColors[station.flight_category],
              fillOpacity: station.has_maintenance_flag ? 0.5 : 0.9,
              color: station.has_maintenance_flag ? "#f97316" : categoryColors[station.flight_category],
              weight: selectedStation === station.icao ? 3 : 1,
            }}
            eventHandlers={{
              click: () => onStationClick(station.icao),
            }}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-bold text-lg">{station.icao}</p>
                <p className="text-gray-600 text-xs mb-2">{station.station_name}</p>
                <p>
                  <span
                    className="inline-block px-2 py-0.5 rounded text-white text-xs font-bold"
                    style={{ backgroundColor: categoryColors[station.flight_category] }}
                  >
                    {station.flight_category}
                  </span>
                  {station.has_maintenance_flag && (
                    <span className="inline-block ml-1 px-2 py-0.5 rounded bg-orange-500 text-white text-xs font-bold">
                      $
                    </span>
                  )}
                </p>
                <p className="mt-2 text-xs">
                  <span className="text-gray-500">Temp:</span>{" "}
                  {station.temperature_c !== null ? `${station.temperature_c}°C` : "--"}
                </p>
                <p className="text-xs">
                  <span className="text-gray-500">Wind:</span>{" "}
                  {station.wind_direction !== null ? `${station.wind_direction}°` : "--"} @{" "}
                  {station.wind_speed_kt ?? "--"}kt
                  {station.wind_gust_kt && ` G${station.wind_gust_kt}kt`}
                </p>
                <p className="text-xs">
                  <span className="text-gray-500">Vis:</span> {station.visibility_sm}SM
                </p>
                <button
                  onClick={() => onStationClick(station.icao)}
                  className="mt-2 w-full px-3 py-1 bg-purple-500 text-white rounded text-xs hover:bg-purple-600"
                >
                  View Details
                </button>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
