"use client";

import { motion } from "framer-motion";

export function SearchSection({
    searchQuery,
    setSearchQuery,
    handleSearch,
    recentSearches,
    favorites,
    setSelectedStation,
    theme,
}: {
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    handleSearch: (q: string) => void;
    recentSearches: string[];
    favorites: string[];
    setSelectedStation: (icao: string) => void;
    theme: "light" | "dark";
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="max-w-2xl mx-auto mb-8"
        >
            <div className="relative">
                <input
                    id="search-input"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") handleSearch(searchQuery);
                    }}
                    placeholder="Search by ICAO code or airport name..."
                    className={`w-full px-6 py-4 ${theme === "light"
                            ? "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                            : "bg-white/5 border-white/10 text-white placeholder-white/30"
                        } border rounded-2xl text-lg focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all`}
                />
                <button
                    onClick={() => handleSearch(searchQuery)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-xl text-white font-medium hover:opacity-90 transition-opacity"
                >
                    Search
                </button>
            </div>

            {/* Recent Searches */}
            {recentSearches.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                    <span className={`text-sm ${theme === "light" ? "text-gray-500" : "text-white/40"}`}>Recent:</span>
                    {recentSearches.map((icao) => (
                        <button
                            key={icao}
                            onClick={() => {
                                setSearchQuery(icao);
                                handleSearch(icao);
                            }}
                            className={`px-3 py-1 ${theme === "light"
                                    ? "bg-gray-200 hover:bg-gray-300 text-gray-700"
                                    : "bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white"
                                } rounded-lg text-sm transition-all`}
                        >
                            {icao}
                        </button>
                    ))}
                </div>
            )}

            {/* Favorites quick access */}
            {favorites.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                    <span className={`text-sm ${theme === "light" ? "text-gray-500" : "text-white/40"}`}>
                        <svg className="w-4 h-4 inline mr-1 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                        Favorites:
                    </span>
                    {favorites.slice(0, 8).map((icao) => (
                        <button
                            key={icao}
                            onClick={() => {
                                setSelectedStation(icao);
                            }}
                            className="px-3 py-1 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/50 rounded-lg text-sm text-yellow-400 transition-all"
                        >
                            {icao}
                        </button>
                    ))}
                    {favorites.length > 8 && (
                        <span className="px-3 py-1 text-sm text-white/40">+{favorites.length - 8} more</span>
                    )}
                </div>
            )}
        </motion.div>
    );
}
