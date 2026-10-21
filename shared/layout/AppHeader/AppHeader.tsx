"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { BookOpen, Search, User, Sun, Moon, Menu, X } from "lucide-react";
import { useTheme } from "@/shared/providers/theme-context";

export type HeaderVariant = "marketing" | "application" | "reader";

export interface AppHeaderProps {
  className?: string;
  variant?: HeaderVariant;
  user?: {
    name?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
  } | null;
}

import Image from "next/image";
import { UserMenu } from "./UserMenu";
import { SearchBar } from "@/modules/discovery/search/presentation/components/SearchBar";
import NotificationBell from "@/modules/notifications/presentation/components/NotificationBell";

const AUTH_ROUTES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
];

export function AppHeader({ className = "", variant = "application", user }: AppHeaderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { resolvedTheme, setTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Close overlays on navigation
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsSearchOpen(false);
  }, [pathname, searchParams]);

  // Omit header entirely on authentication routes
  if (pathname && AUTH_ROUTES.includes(pathname)) {
    return null;
  }

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  const isDark = resolvedTheme === "dark";

  return (
    <>
      <header
        className={`sticky top-0 z-50 w-full transition-colors duration-200 ${isDark
          ? "bg-slate-950/95 backdrop-blur-md text-white border-b border-slate-800/80 shadow-md"
          : "bg-white/95 backdrop-blur-md text-slate-900 border-b border-slate-200/90 shadow-xs"
          } ${className}`}
        id="top-nav"
      >
        <div className="h-20 sm:h-22 lg:h-24 max-w-[1760px] mx-auto px-2 sm:px-4 lg:px-8 xl:px-12 flex items-center justify-between gap-2 sm:gap-4">

          {/* Left Side: Logo + Main Navigation Links */}
          <div className="flex items-center gap-2 md:gap-4 lg:gap-10">
            {/* Logo */}
            <Link
              href={variant === "application" ? "/me" : "/"}
              className="flex items-center gap-2.5 lg:gap-3 hover:opacity-90 transition-opacity flex-shrink-0 group"
            >
              <div className="relative w-10 h-10 lg:w-11 lg:h-11 rounded-xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-md shadow-indigo-500/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Image
                  src="/logo.png"
                  alt="BookGarden Logo"
                  width={44}
                  height={44}
                  className="object-contain p-0.5"
                  priority
                />
              </div>
              <span
                className={`tracking-tight font-display font-extrabold text-lg sm:text-xl lg:text-2xl shrink-0 ${isDark ? "text-white" : "text-slate-900"
                  }`}
              >
                BookGarden
              </span>
            </Link>

            {/* Primary Navigation Links (Inline next to Logo) */}
            {variant === "application" && (
              <nav className="hidden md:flex items-center gap-0.5 md:gap-1 lg:gap-2.5">
                <Link
                  href="/me"
                  className={`text-xs md:text-sm lg:text-base font-semibold px-2 md:px-2.5 lg:px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${pathname === "/me"
                    ? "bg-indigo-600/15 text-indigo-600 dark:text-indigo-400 font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
                    }`}
                >
                  Home
                </Link>
                <Link
                  href="/discover"
                  className={`text-xs md:text-sm lg:text-base font-semibold px-2 md:px-2.5 lg:px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${pathname && pathname.startsWith("/discover")
                    ? "bg-indigo-600/15 text-indigo-600 dark:text-indigo-400 font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
                    }`}
                >
                  Discover
                </Link>
                <Link
                  href="/me/dashboard"
                  className={`text-xs md:text-sm lg:text-base font-semibold px-2 md:px-2.5 lg:px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${pathname && pathname.startsWith("/me/dashboard")
                    ? "bg-indigo-600/15 text-indigo-600 dark:text-indigo-400 font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
                    }`}
                >
                  MyDashboard
                </Link>
                <Link
                  href="/me/library"
                  className={`text-xs md:text-sm lg:text-base font-semibold px-2 md:px-2.5 lg:px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${pathname && pathname.startsWith("/me/library")
                    ? "bg-indigo-600/15 text-indigo-600 dark:text-indigo-400 font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
                    }`}
                >
                  Library
                </Link>
              </nav>
            )}

            {variant === "marketing" && (
              <nav className="hidden md:flex items-center gap-0.5 md:gap-1 lg:gap-2.5">
                <Link
                  href="/discover"
                  className={`text-xs md:text-sm lg:text-base font-medium px-2 md:px-2.5 lg:px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${isDark
                    ? "text-slate-300 hover:text-white hover:bg-white/10"
                    : "text-slate-700 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                >
                  Discover
                </Link>
                <Link
                  href="/discover/collections"
                  className={`text-xs md:text-sm lg:text-base font-medium px-2 md:px-2.5 lg:px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${isDark
                    ? "text-slate-300 hover:text-white hover:bg-white/10"
                    : "text-slate-700 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                >
                  Collections
                </Link>
                <Link
                  href="/about"
                  className={`text-xs md:text-sm lg:text-base font-medium px-2 md:px-2.5 lg:px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${isDark
                    ? "text-slate-300 hover:text-white hover:bg-white/10"
                    : "text-slate-700 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                >
                  About
                </Link>
              </nav>
            )}
          </div>

          {/* Right Side: Search Bar + Utilities + Profile Avatar */}
          <div className="flex items-center gap-1.5 sm:gap-3 lg:gap-4 shrink-0">

            {/* Desktop Search Bar */}
            <div className="hidden md:block w-40 md:w-48 lg:w-80 xl:w-96 mr-1 lg:mr-2 shrink-0">
              <SearchBar size="sm" placeholder="Search..." />
            </div>

            {/* Mobile Search Button (Opens Overlay) */}
            <button
              onClick={() => setIsSearchOpen(true)}
              aria-label="Open search"
              className={`lg:hidden p-2.5 rounded-xl transition-colors cursor-pointer flex items-center justify-center ${isDark
                ? "text-slate-300 hover:text-white hover:bg-slate-800"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
            >
              <Search size={20} />
            </button>

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle navigation menu"
              className={`p-2.5 rounded-xl transition-colors cursor-pointer md:hidden flex items-center justify-center ${isDark
                ? "text-slate-300 hover:text-white hover:bg-slate-900 border border-slate-800"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200"
                }`}
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className={`hidden lg:flex p-2.5 rounded-xl transition-colors cursor-pointer ${isDark
                ? "text-slate-300 hover:text-white hover:bg-slate-900 border border-slate-800"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200"
                }`}
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {variant === "application" ? (
              <>
                <div className={`hidden sm:flex items-center justify-center rounded-xl transition-colors ${isDark
                  ? "hover:bg-slate-900 border border-transparent hover:border-slate-800"
                  : "hover:bg-slate-100 border border-transparent hover:border-slate-200"
                  }`}>
                  <NotificationBell />
                </div>

                <div className={`h-6 w-px hidden sm:block ${isDark ? "bg-slate-800" : "bg-slate-200"}`} />

                {user ? (
                  <UserMenu user={user} />
                ) : (
                  <div
                    className="relative flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 text-white font-bold text-sm shadow-md border-2 border-indigo-400/40"
                  >
                    <User size={18} />
                  </div>
                )}
              </>
            ) : variant === "reader" ? null : user ? (
              <UserMenu user={user} />
            ) : (
              <div className="hidden lg:flex items-center gap-3">
                <Link
                  href="/login"
                  className={`text-sm font-semibold px-4 py-2 rounded-lg border transition-all ${isDark
                    ? "text-slate-200 border-slate-800 hover:bg-white/10 hover:text-white"
                    : "text-slate-700 border-slate-300 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-all"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* Mobile Menu Overlay & Drawer */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Side Drawer */}
          <div
            className={`md:hidden fixed inset-y-0 right-0 z-[70] w-[280px] sm:w-[320px] shadow-2xl flex flex-col animate-in slide-in-from-right fade-in duration-300 border-l rounded-l-[4rem] overflow-hidden ${isDark ? "bg-slate-950 border-slate-800" : "bg-white border-slate-200"
              }`}
          >
            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 dark:border-slate-800">
              <span className="font-bold text-lg text-slate-800 dark:text-slate-200">Menu</span>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className={`p-2 rounded-lg transition-colors cursor-pointer ${isDark ? "hover:bg-slate-800 text-slate-400 hover:text-white" : "hover:bg-slate-100 text-slate-500 hover:text-slate-900"
                  }`}
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-2">

              {variant === "application" && (
                <div className="flex flex-col gap-1.5 mt-2">
                  <Link
                    href="/me"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`group flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 active:scale-[0.98] ${pathname === "/me"
                      ? "bg-indigo-600/10 text-indigo-600 dark:text-indigo-400"
                      : isDark ? "text-slate-300 hover:text-white hover:bg-slate-800/60" : "text-slate-700 hover:text-slate-900 hover:bg-slate-100"
                      }`}
                  >
                    <div className={`p-2 rounded-xl transition-colors ${pathname === "/me" ? "bg-indigo-600/20" : isDark ? "bg-slate-800/80 group-hover:bg-indigo-500/20 group-hover:text-indigo-400" : "bg-slate-200/60 group-hover:bg-indigo-100 group-hover:text-indigo-600"}`}>
                      <BookOpen size={20} />
                    </div>
                    <span className="text-[17px] font-semibold">Home</span>
                  </Link>
                  <Link
                    href="/discover"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`group flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 active:scale-[0.98] ${pathname?.startsWith("/discover")
                      ? "bg-indigo-600/10 text-indigo-600 dark:text-indigo-400"
                      : isDark ? "text-slate-300 hover:text-white hover:bg-slate-800/60" : "text-slate-700 hover:text-slate-900 hover:bg-slate-100"
                      }`}
                  >
                    <div className={`p-2 rounded-xl transition-colors ${pathname?.startsWith("/discover") ? "bg-indigo-600/20" : isDark ? "bg-slate-800/80 group-hover:bg-indigo-500/20 group-hover:text-indigo-400" : "bg-slate-200/60 group-hover:bg-indigo-100 group-hover:text-indigo-600"}`}>
                      <Search size={20} />
                    </div>
                    <span className="text-[17px] font-semibold">Discover</span>
                  </Link>
                  <Link
                    href="/me/dashboard"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`group flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 active:scale-[0.98] ${pathname?.startsWith("/me/dashboard")
                      ? "bg-indigo-600/10 text-indigo-600 dark:text-indigo-400"
                      : isDark ? "text-slate-300 hover:text-white hover:bg-slate-800/60" : "text-slate-700 hover:text-slate-900 hover:bg-slate-100"
                      }`}
                  >
                    <div className={`p-2 rounded-xl transition-colors ${pathname?.startsWith("/me/dashboard") ? "bg-indigo-600/20" : isDark ? "bg-slate-800/80 group-hover:bg-indigo-500/20 group-hover:text-indigo-400" : "bg-slate-200/60 group-hover:bg-indigo-100 group-hover:text-indigo-600"}`}>
                      <User size={20} />
                    </div>
                    <span className="text-[17px] font-semibold">Dashboard</span>
                  </Link>
                </div>
              )}

              {variant === "marketing" && (
                <div className="flex flex-col gap-1.5 mt-2">
                  <Link
                    href="/discover"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`group flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 active:scale-[0.98] ${isDark
                      ? "text-slate-300 hover:text-white hover:bg-slate-800/60"
                      : "text-slate-700 hover:text-slate-900 hover:bg-slate-100"
                      }`}
                  >
                    <div className={`p-2 rounded-xl transition-colors ${isDark ? "bg-slate-800/80 group-hover:bg-indigo-500/20 group-hover:text-indigo-400" : "bg-slate-200/60 group-hover:bg-indigo-100 group-hover:text-indigo-600"}`}>
                      <Search size={20} />
                    </div>
                    <span className="text-[17px] font-semibold">Discover</span>
                  </Link>
                  <Link
                    href="/discover/collections"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`group flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 active:scale-[0.98] ${isDark
                      ? "text-slate-300 hover:text-white hover:bg-slate-800/60"
                      : "text-slate-700 hover:text-slate-900 hover:bg-slate-100"
                      }`}
                  >
                    <div className={`p-2 rounded-xl transition-colors ${isDark ? "bg-slate-800/80 group-hover:bg-indigo-500/20 group-hover:text-indigo-400" : "bg-slate-200/60 group-hover:bg-indigo-100 group-hover:text-indigo-600"}`}>
                      <BookOpen size={20} />
                    </div>
                    <span className="text-[17px] font-semibold">Collections</span>
                  </Link>
                  <Link
                    href="/about"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`group flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 active:scale-[0.98] ${isDark
                      ? "text-slate-300 hover:text-white hover:bg-slate-800/60"
                      : "text-slate-700 hover:text-slate-900 hover:bg-slate-100"
                      }`}
                  >
                    <div className={`p-2 rounded-xl transition-colors ${isDark ? "bg-slate-800/80 group-hover:bg-indigo-500/20 group-hover:text-indigo-400" : "bg-slate-200/60 group-hover:bg-indigo-100 group-hover:text-indigo-600"}`}>
                      <User size={20} />
                    </div>
                    <span className="text-[17px] font-semibold">About</span>
                  </Link>
                </div>
              )}

              {/* Mobile Auth & Utilities */}
              {!user && variant !== "reader" && (
                <div className="mt-4 pt-6 flex flex-col gap-3 relative before:absolute before:top-0 before:left-4 before:right-4 before:h-px before:bg-gradient-to-r before:from-transparent before:via-slate-200 dark:before:via-slate-700 before:to-transparent">
                  <Link
                    href="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`text-center text-base font-bold px-4 py-3.5 rounded-xl transition-all duration-300 active:scale-[0.98] ${isDark
                      ? "text-slate-200 bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/50"
                      : "text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200/80"
                      }`}
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-center text-white text-base font-bold px-4 py-3.5 rounded-xl transition-all duration-300 active:scale-[0.98] bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-500/25"
                  >
                    Get Started
                  </Link>
                </div>
              )}

              <div className="mt-auto pt-6 pb-2 relative before:absolute before:top-0 before:left-4 before:right-4 before:h-px before:bg-gradient-to-r before:from-transparent before:via-slate-200 dark:before:via-slate-700 before:to-transparent">
                <button
                  onClick={toggleTheme}
                  className={`w-full group flex items-center justify-between px-5 py-4 rounded-2xl transition-all duration-300 active:scale-[0.98] ${isDark
                    ? "bg-slate-800/30 hover:bg-slate-800/60 text-slate-300"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-700"
                    }`}
                >
                  <span className="text-[16px] font-semibold">Appearance</span>
                  <div className={`p-2 rounded-full transition-colors ${isDark ? "bg-slate-800 text-amber-400" : "bg-white text-indigo-600 shadow-sm"}`}>
                    {isDark ? <Sun size={18} fill="currentColor" /> : <Moon size={18} fill="currentColor" />}
                  </div>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Search Overlay */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col px-4 animate-in fade-in duration-200">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setIsSearchOpen(false)}
          />
          <div className={`relative w-full max-w-3xl mx-auto mt-4 sm:mt-24 p-4 sm:p-6 shadow-2xl rounded-2xl animate-in slide-in-from-top-4 duration-300 ${isDark ? "bg-slate-950 border border-slate-800" : "bg-white border border-slate-200"}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-lg font-semibold ${isDark ? "text-slate-200" : "text-slate-800"}`}>Search</h2>
              <button
                onClick={() => setIsSearchOpen(false)}
                className={`p-2 rounded-lg transition-colors cursor-pointer ${isDark ? "hover:bg-slate-800 text-slate-400 hover:text-white" : "hover:bg-slate-100 text-slate-500 hover:text-slate-900"
                  }`}
              >
                <X size={20} />
              </button>
            </div>
            <SearchBar size="lg" placeholder="Search digital archives, books, authors..." autoFocus={true} />
          </div>
        </div>
      )}
    </>
  );
}
