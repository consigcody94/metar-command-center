import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export interface OutageEvent {
  icao: string;
  stationName: string;
  startTime: number; // Unix timestamp from METAR observation
  startTimeZulu: string; // Zulu time string like "171553Z"
  endTime: number | null;
  endTimeZulu: string | null;
  duration: number | null; // in minutes
}

interface StationStatus {
  hasFlag: boolean;
  lastSeen: number;
  lastObsTime: number; // METAR observation time
  lastObsTimeZulu: string;
  stationName: string;
}

interface MaintenanceData {
  stationStatus: Record<string, StationStatus>;
  outageLog: OutageEvent[];
}

const MAINTENANCE_KEY = "metar-maintenance-data";
const DATA_FILE_PATH = path.join(process.cwd(), "maintenance-data.json");

// Initialize Redis if environment variables are present
let redis: Redis | null = null;
try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = Redis.fromEnv();
  }
} catch (e) {
  console.warn("Redis configuration missing or invalid. Falling back to local file storage.");
}

// Helper to read data (Redis -> File Fallback)
async function getData(): Promise<MaintenanceData> {
  // Try Redis first
  if (redis) {
    try {
      const data = await redis.get<MaintenanceData>(MAINTENANCE_KEY);
      return data || { stationStatus: {}, outageLog: [] };
    } catch (error) {
      console.error("Redis Read Error:", error);
      // Fall through to file if Redis fails? Or just return empty?
      // For now, if Redis is configured but fails, we might want to return empty or error.
      // But to be safe for mixed environments, let's just log and return empty.
      return { stationStatus: {}, outageLog: [] };
    }
  }

  // Fallback to file
  try {
    const fileContent = await fs.readFile(DATA_FILE_PATH, "utf-8");
    return JSON.parse(fileContent);
  } catch (error: any) {
    // If file doesn't exist, return empty structure
    if (error.code === "ENOENT") {
      return { stationStatus: {}, outageLog: [] };
    }
    console.error("File Read Error:", error);
    return { stationStatus: {}, outageLog: [] };
  }
}

// Helper to write data (Redis -> File Fallback)
async function saveData(data: MaintenanceData): Promise<boolean> {
  // Try Redis first
  if (redis) {
    try {
      await redis.set(MAINTENANCE_KEY, data);
      return true;
    } catch (error) {
      console.error("Redis Write Error:", error);
      return false;
    }
  }

  // Fallback to file
  try {
    await fs.writeFile(DATA_FILE_PATH, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error("File Write Error:", error);
    return false;
  }
}

// GET - Retrieve all maintenance data
export async function GET() {
  const data = await getData();
  return NextResponse.json(data);
}

// POST - Update station status and handle outage events
export async function POST(request: NextRequest) {
  try {
    const updates: Array<{
      icao: string;
      stationName: string;
      hasFlag: boolean;
      obsTime: number;
      observationTime: string;
    }> = await request.json();

    // Get current data
    let data = await getData();

    for (const update of updates) {
      const { icao, stationName, hasFlag, obsTime, observationTime } = update;
      const currentStatus = data.stationStatus[icao];
      const wasDown = currentStatus?.hasFlag ?? false;

      // Station status changed
      if (wasDown !== hasFlag) {
        if (hasFlag && !wasDown) {
          // Station just went down - start new outage using METAR observation time
          const newEvent: OutageEvent = {
            icao,
            stationName,
            startTime: obsTime,
            startTimeZulu: observationTime,
            endTime: null,
            endTimeZulu: null,
            duration: null,
          };
          data.outageLog.push(newEvent);
        } else if (!hasFlag && wasDown) {
          // Station came back up - close the outage using METAR observation time
          data.outageLog = data.outageLog.map((event) => {
            if (event.icao === icao && event.endTime === null) {
              const duration = Math.round((obsTime - event.startTime) / 60000);
              return {
                ...event,
                endTime: obsTime,
                endTimeZulu: observationTime,
                duration: duration > 0 ? duration : 0,
              };
            }
            return event;
          });
        }
      }

      // Update station status with observation time
      data.stationStatus[icao] = {
        hasFlag,
        lastSeen: Date.now(),
        lastObsTime: obsTime,
        lastObsTimeZulu: observationTime,
        stationName,
      };
    }

    // Keep only last 1000 outage events to prevent unbounded growth
    if (data.outageLog.length > 1000) {
      data.outageLog = data.outageLog.slice(-1000);
    }

    // Save updated data
    const success = await saveData(data);

    if (!success) {
      return NextResponse.json({ error: "Failed to persist data" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

// DELETE - Clear all data
export async function DELETE() {
  try {
    if (redis) {
      await redis.del(MAINTENANCE_KEY);
    } else {
      // Delete local file
      try {
        await fs.unlink(DATA_FILE_PATH);
      } catch (e: any) {
        if (e.code !== "ENOENT") throw e;
      }
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete Error:", error);
    return NextResponse.json({ error: "Failed to clear" }, { status: 500 });
  }
}
