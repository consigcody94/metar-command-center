import { NextRequest, NextResponse } from "next/server";

// Proxy METAR/TAF requests to avoid CORS issues
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const ids = searchParams.get("ids") || "";
  const hours = searchParams.get("hours") || "2";
  const format = searchParams.get("format") || "json";
  const type = searchParams.get("type") || "metar"; // metar or taf

  if (!ids) {
    return NextResponse.json({ error: "Missing ids parameter" }, { status: 400 });
  }

  try {
    const endpoint = type === "taf" ? "taf" : "metar";
    const url = `https://aviationweather.gov/api/data/${endpoint}?ids=${ids}&format=${format}&hours=${hours}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "METAR-Command-Center/1.0",
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Aviation Weather API returned ${response.status}` },
        { status: response.status }
      );
    }

    if (format === "json") {
      const data = await response.json();
      return NextResponse.json(data, {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
        },
      });
    } else {
      const text = await response.text();
      return new NextResponse(text, {
        headers: {
          "Content-Type": "text/plain",
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
        },
      });
    }
  } catch (error) {
    console.error("Aviation weather fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch aviation weather data" },
      { status: 500 }
    );
  }
}
