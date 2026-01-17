import { NextResponse } from "next/server";
import { MetarData, AwcMetarResponse } from "@/types";
import { transformMetar } from "@/lib/metarUtils";

export const dynamic = "force-dynamic";

export async function GET() {
    const states = [
        "al", "ak", "az", "ar", "ca", "co", "ct", "de", "fl", "ga",
        "hi", "id", "il", "in", "ia", "ks", "ky", "la", "me", "md",
        "ma", "mi", "mn", "ms", "mo", "mt", "ne", "nv", "nh", "nj",
        "nm", "ny", "nc", "nd", "oh", "ok", "or", "pa", "ri", "sc",
        "sd", "tn", "tx", "ut", "vt", "va", "wa", "wv", "wi", "wy", "dc"
    ];

    const API_BASE = "https://aviationweather.gov/api/data/metar";
    const allMetars: MetarData[] = [];

    try {
        // Fetch in parallel batches of 10
        const batchSize = 10;
        for (let i = 0; i < states.length; i += batchSize) {
            const batch = states.slice(i, i + batchSize);
            const promises = batch.map(async (state) => {
                try {
                    const response = await fetch(
                        `${API_BASE}?ids=@${state}&format=json&hours=1`,
                        {
                            next: { revalidate: 300 }, // Cache individual state requests
                            headers: {
                                "User-Agent": "METAR-Command-Center/1.0",
                            }
                        }
                    );

                    if (!response.ok) return [];

                    const data = await response.json();
                    if (!data || !Array.isArray(data)) return [];

                    return data.map((item: AwcMetarResponse) => transformMetar(item));
                } catch (err) {
                    console.error(`Error fetching state ${state}:`, err);
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

        const uniqueMetars = Array.from(stationMap.values());

        return NextResponse.json(uniqueMetars, {
            headers: {
                "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
            },
        });
    } catch (error) {
        console.error("Failed to fetch all US METARs:", error);
        return NextResponse.json(
            { error: "Failed to fetch METAR data" },
            { status: 500 }
        );
    }
}
