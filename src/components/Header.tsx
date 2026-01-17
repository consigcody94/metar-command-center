"use client";

import Link from "next/link";

export function Header({
    theme,
    setTheme,
}: {
    theme: "light" | "dark";
    setTheme: (theme: "light" | "dark") => void;
}) {
    return (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
            {/* Leaderboard link */}
            <Link
                href="/leaderboard"
                className="px-3 py-2 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/50 rounded-lg text-orange-400 text-sm font-medium transition-colors flex items-center gap-2"
                title="ASOS Maintenance Leaderboard"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="hidden sm:inline">Leaderboard</span>
            </Link>
            {/* Theme toggle */}
            <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                title="Toggle theme"
            >
                {theme === "dark" ? (
                    <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                ) : (
                    <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                )}
            </button>
            {/* Keyboard shortcuts hint */}
            <div className="hidden sm:flex items-center gap-1 text-xs text-white/40">
                <kbd className="px-1.5 py-0.5 bg-white/10 rounded">/</kbd> search
                <kbd className="px-1.5 py-0.5 bg-white/10 rounded ml-2">m</kbd> map
                <kbd className="px-1.5 py-0.5 bg-white/10 rounded ml-2">f</kbd> favs
                <kbd className="px-1.5 py-0.5 bg-white/10 rounded ml-2">esc</kbd> close
            </div>
        </div>
    );
}
