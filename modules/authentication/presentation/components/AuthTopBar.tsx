"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Sun, Moon } from "lucide-react";
import { useTheme } from "@/shared/providers/theme-context";

interface AuthTopBarProps {
  showLogo?: boolean;
}

export default function AuthTopBar({ showLogo = false }: AuthTopBarProps) {
  const { resolvedTheme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  const isDark = resolvedTheme === "dark";

  return (
    <div className="absolute top-4 sm:top-6 left-0 right-0 z-30 flex items-center justify-between pointer-events-auto w-full max-w-6xl mx-auto px-4 sm:px-8">
      {/* Return to Home / Discover */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold hover:bg-white dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white shadow-xs transition-all group"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
        <span>Back to Home</span>
      </Link>

      {/* Optional Central Minimal Logo for smaller screens */}
      {showLogo && (
        <Link href="/" className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 sm:hidden group">
          <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-center">
            <Image
              src="/logo.png"
              alt="BookGarden Logo"
              width={32}
              height={32}
              className="object-contain p-0.5"
            />
          </div>
        </Link>
      )}

      {/* Right Action Utilities (Theme Switcher) */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="p-2.5 rounded-xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 shadow-xs transition-all cursor-pointer"
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </div>
  );
}
