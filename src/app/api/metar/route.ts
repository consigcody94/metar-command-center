import { NextRequest, NextResponse } from "next/server";

// Proxy METAR requests to avoid CORS issues
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const ids = searchParams.get("ids") || "";
  const hours = searchParams.get("hours") || "2";

  if (!ids) {
    return NextResponse.json({ error: "Missing ids parameter" }, { status: 400 });
  }

  try {
    const url = `https://aviationweather.gov/api/data/metar?ids=${ids}&format=raw&hours=${hours}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "METAR-Command-Center/1.0",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Aviation Weather API returned ${response.status}` },
        { status: response.status }
      );
    }

    const text = await response.text();
    return new NextResponse(text, {
      headers: {
        "Content-Type": "text/plain",
      },
    });
  } catch (error) {
    console.error("METAR fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch METAR data" },
      { status: 500 }
    );
  }
}
