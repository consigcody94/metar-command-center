import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";

export interface OutageEvent {
  icao: string;
  stationName: string;
  startTime: number;
  endTime: number | null;
  duration: number | null;
}

interface StationStatus {
  hasFlag: boolean;
  lastSeen: number;
  stationName: string;
}

interface MaintenanceData {
  stationStatus: Record<string, StationStatus>;
  outageLog: OutageEvent[];
}

const MAINTENANCE_KEY = "metar-maintenance-data";

// Initialize Redis from environment variables
const redis = Redis.fromEnv();

// GET - Retrieve all maintenance data
export async function GET() {
  try {
    const data = await redis.get<MaintenanceData>(MAINTENANCE_KEY);
    return NextResponse.json(data || { stationStatus: {}, outageLog: [] });
  } catch (error) {
    console.error("Redis Error:", error);
    return NextResponse.json({ stationStatus: {}, outageLog: [] });
  }
}

// POST - Update station status and handle outage events
export async function POST(request: NextRequest) {
  try {
    const updates: Array<{ icao: string; stationName: string; hasFlag: boolean }> = await request.json();

    // Get current data
    let data = await redis.get<MaintenanceData>(MAINTENANCE_KEY);
    if (!data) {
      data = { stationStatus: {}, outageLog: [] };
    }

    const now = Date.now();

    for (const update of updates) {
      const { icao, stationName, hasFlag } = update;
      const currentStatus = data.stationStatus[icao];
      const wasDown = currentStatus?.hasFlag ?? false;

      // Station status changed
      if (wasDown !== hasFlag) {
        if (hasFlag && !wasDown) {
          // Station just went down - start new outage
          const newEvent: OutageEvent = {
            icao,
            stationName,
            startTime: now,
            endTime: null,
            duration: null,
          };
          data.outageLog.push(newEvent);
        } else if (!hasFlag && wasDown) {
          // Station came back up - close the outage
          data.outageLog = data.outageLog.map((event) => {
            if (event.icao === icao && event.endTime === null) {
              const duration = Math.round((now - event.startTime) / 60000);
              return { ...event, endTime: now, duration };
            }
            return event;
          });
        }
      }

      // Update station status
      data.stationStatus[icao] = { hasFlag, lastSeen: now, stationName };
    }

    // Keep only last 1000 outage events to prevent unbounded growth
    if (data.outageLog.length > 1000) {
      data.outageLog = data.outageLog.slice(-1000);
    }

    // Save updated data
    await redis.set(MAINTENANCE_KEY, data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Redis Error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

// DELETE - Clear all data
export async function DELETE() {
  try {
    await redis.del(MAINTENANCE_KEY);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Redis Error:", error);
    return NextResponse.json({ error: "Failed to clear" }, { status: 500 });
  }
}
