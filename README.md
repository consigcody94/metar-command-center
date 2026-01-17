# METAR Command Center

<div align="center">

![METAR Command Center](https://i.imgur.com/QYPC1fs.jpeg)

**Real-time Aviation Weather Intelligence**

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

[Live Demo](https://metar-command-center.vercel.app/) · [Report Bug](https://github.com/consigcody94/metar-command-center/issues) · [Request Feature](https://github.com/consigcody94/metar-command-center/issues)

</div>

---

## Overview

**METAR Command Center** is a modern, real-time aviation weather monitoring application that provides instant access to METAR (Meteorological Aerodrome Report) data from airports across the United States. Built for pilots, flight dispatchers, aviation enthusiasts, and weather professionals who need quick, reliable access to current weather conditions at any airport.

### What is METAR?

METAR is a format for reporting weather information used by pilots and meteorologists. A typical METAR report includes:

- **Wind** - Direction and speed
- **Visibility** - In statute miles
- **Weather Phenomena** - Rain, snow, fog, etc.
- **Cloud Layers** - Coverage and heights
- **Temperature/Dewpoint** - In Celsius
- **Altimeter Setting** - Barometric pressure

---

## Features

### 🔍 Instant Station Search
Search for any airport by its ICAO code (e.g., `KORD` for Chicago O'Hare, `KLAX` for Los Angeles, `KJFK` for New York JFK). Get immediate access to the latest METAR report with full decoded details.

### 🗺️ All US Stations View
Browse all 2,400+ US weather stations at once. See flight category status at a glance with color-coded indicators:

| Category | Color | Ceiling | Visibility |
|----------|-------|---------|------------|
| **VFR** | 🟢 Green | ≥3,000 ft | >5 SM |
| **MVFR** | 🔵 Blue | 1,000-2,999 ft | 3-5 SM |
| **IFR** | 🔴 Red | 500-999 ft | 1-3 SM |
| **LIFR** | 🟣 Purple | <500 ft | <1 SM |

### 📊 Detailed Weather Breakdown
For each station, view:
- **Raw METAR** - Original report text
- **Wind** - Direction arrow, speed, and gusts
- **Visibility** - In statute miles
- **Temperature** - In both Celsius and Fahrenheit
- **Dewpoint** - Current dewpoint temperature
- **Altimeter** - Barometric pressure in inches of mercury
- **Temp/Dew Spread** - Important for fog prediction

### ⚡ Real-Time Updates
- Auto-refreshes every 5 minutes
- Visual loading indicators
- Instant search with recent history

### 🎨 Beautiful UI
- Glassmorphism design with dynamic backgrounds
- Smooth Framer Motion animations
- Fully responsive for mobile and desktop
- Dark theme optimized for readability

---

## Screenshots

### Station Search
![Search View](https://via.placeholder.com/800x400?text=Station+Search+View)

### Detailed METAR Display
![Detail View](https://via.placeholder.com/800x400?text=METAR+Detail+View)

### All Stations Grid
![All Stations](https://via.placeholder.com/800x400?text=All+Stations+Grid)

---

## Getting Started

### Prerequisites

- **Node.js** 18.0 or higher
- **npm** 9.0 or higher (or yarn/pnpm)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/consigcody94/metar-command-center.git
   cd metar-command-center
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
npm run build
npm start
```

---

## Project Structure

```
metar-command-center/
├── src/
│   ├── app/
│   │   ├── globals.css      # Global styles with Tailwind
│   │   ├── layout.tsx       # Root layout with providers
│   │   ├── page.tsx         # Main METAR Command Center page
│   │   └── providers.tsx    # React Query provider
│   └── hooks/
│       └── useMetar.ts      # METAR fetching and parsing hooks
├── public/                  # Static assets
├── package.json
├── tailwind.config.ts       # Tailwind configuration
├── tsconfig.json            # TypeScript configuration
└── README.md
```

---

## Technical Details

### Data Source

All METAR data is fetched directly from the **Aviation Weather Center (AWC)** API:
- Endpoint: `https://aviationweather.gov/api/data/metar`
- Format: Raw METAR text
- Update Frequency: Every 5 minutes

### METAR Parsing

The application parses raw METAR strings to extract:

```typescript
interface MetarData {
  icao: string;              // Airport ICAO code
  raw: string;               // Original METAR string
  wind_direction?: number;   // Wind direction in degrees
  wind_speed_kt?: number;    // Wind speed in knots
  wind_gust_kt?: number;     // Gust speed in knots
  visibility_sm?: number;    // Visibility in statute miles
  temperature_c?: number;    // Temperature in Celsius
  dewpoint_c?: number;       // Dewpoint in Celsius
  altimeter_hg?: number;     // Altimeter in inches Hg
  flight_category: string;   // VFR/MVFR/IFR/LIFR
}
```

### Flight Category Calculation

Flight categories are determined by ceiling height and visibility:

```typescript
function determineFlightCategory(visibility: number, ceiling: number) {
  if (ceiling < 500 || visibility < 1) return "LIFR";
  if (ceiling < 1000 || visibility < 3) return "IFR";
  if (ceiling < 3000 || visibility <= 5) return "MVFR";
  return "VFR";
}
```

---

## API Reference

### Hooks

#### `useMetar(icao: string)`
Fetch METAR for a single station.
```typescript
const { data, isLoading, error } = useMetar("KORD");
```

#### `useAllUSMetars()`
Fetch METARs for all US stations.
```typescript
const { data, isLoading, refetch } = useAllUSMetars();
```

#### `useMultipleMetars(icaos: string[])`
Fetch METARs for multiple specific stations.
```typescript
const { data } = useMultipleMetars(["KORD", "KLAX", "KJFK"]);
```

---

## Common ICAO Codes

| Code | Airport |
|------|---------|
| KATL | Atlanta Hartsfield-Jackson |
| KLAX | Los Angeles International |
| KORD | Chicago O'Hare |
| KDFW | Dallas/Fort Worth |
| KDEN | Denver International |
| KJFK | New York JFK |
| KSFO | San Francisco International |
| KLAS | Las Vegas McCarran |
| KMCO | Orlando International |
| KSEA | Seattle-Tacoma |
| KMIA | Miami International |
| KBOS | Boston Logan |
| KPHX | Phoenix Sky Harbor |
| KIAH | Houston George Bush |
| KEWR | Newark Liberty |

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## Roadmap

- [x] **TAF Support** - Terminal Aerodrome Forecasts
- [ ] **PIREP Integration** - Pilot Reports
- [x] **Interactive Map** - Visual station selection with Leaflet
- [ ] **Weather Radar Overlay** - Real-time radar data
- [ ] **Route Weather** - Check weather along a flight route
- [x] **Favorites** - Save frequently checked stations
- [ ] **Notifications** - Alerts for weather changes
- [ ] **PWA Support** - Installable as a mobile app
- [ ] **Historical Data** - View past METAR reports
- [x] **Decoded METAR** - Human-readable breakdown
- [x] **Dark/Light Theme** - User preference toggle
- [x] **Keyboard Shortcuts** - Quick navigation

---

## Tech Stack

- **[Next.js 14](https://nextjs.org/)** - React framework with App Router
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **[Framer Motion](https://www.framer.com/motion/)** - Animation library
- **[TanStack Query](https://tanstack.com/query)** - Data fetching and caching
- **[Axios](https://axios-http.com/)** - HTTP client
- **[date-fns](https://date-fns.org/)** - Date utilities
- **[Zustand](https://zustand-demo.pmnd.rs/)** - State management

---

## Acknowledgments

- Weather data provided by [Aviation Weather Center (NOAA)](https://aviationweather.gov/)
- Background image from aviation photography community
- Inspired by ForeFlight, SkyVector, and other aviation tools

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Disclaimer

This application is for informational purposes only. Always refer to official aviation weather sources for flight planning and decision-making. Weather data may be delayed and should not be used as the sole source for critical aviation decisions.

---

<div align="center">

**Built with ❤️ for the Aviation Community**

[⬆ Back to Top](#metar-command-center)

</div>
