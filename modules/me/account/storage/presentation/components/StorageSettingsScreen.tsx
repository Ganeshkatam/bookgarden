"use client";

import React, { useEffect, useState } from "react";
import { showError, showSuccess } from "@/lib/toast";
import {
  HardDrive,
  BookOpen,
  FileText,
  Trash2,
  RefreshCw,
  Database,
  Layers,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export interface ServerLibraryStatsDto {
  totalBooksInLibrary: number;
  readingBooksCount: number;
  completedBooksCount: number;
  totalNotesCount: number;
}

interface StorageSettingsScreenProps {
  serverStats: ServerLibraryStatsDto;
}

interface BrowserStorageStats {
  usageMB: number;
  quotaMB: number;
  percentage: number;
  cachesCount: number;
}

// Explicit list of cache name prefixes owned exclusively by BookGarden
const BOOKGARDEN_CACHE_PREFIXES = [
  "bookgarden-reader",
  "bookgarden-book",
  "bookgarden-assets",
  "bookgarden-offline",
  "bookgarden-pwa",
  "workbox-runtime",
  "workbox-precache",
];

export function StorageSettingsScreen({ serverStats }: StorageSettingsScreenProps) {
  const [browserStats, setBrowserStats] = useState<BrowserStorageStats | null>(null);
  const [isMeasuring, setIsMeasuring] = useState(true);
  const [isClearing, setIsClearing] = useState(false);

  // Measure browser storage using the standard StorageManager API
  const measureStorage = async () => {
    setIsMeasuring(true);
    try {
      let usageMB = 0;
      let quotaMB = 0;
      let percentage = 0;
      let cachesCount = 0;

      if (typeof window !== "undefined" && navigator.storage?.estimate) {
        const estimate = await navigator.storage.estimate();
        const usageBytes = estimate.usage || 0;
        const quotaBytes = estimate.quota || 1;

        usageMB = Math.round((usageBytes / (1024 * 1024)) * 10) / 10;
        quotaMB = Math.round(quotaBytes / (1024 * 1024));
        percentage = Math.min(100, Math.round((usageBytes / quotaBytes) * 100));
      }

      if (typeof window !== "undefined" && "caches" in window) {
        const keys = await window.caches.keys();
        const bookgardenCaches = keys.filter((key) =>
          BOOKGARDEN_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix))
        );
        cachesCount = bookgardenCaches.length;
      }

      setBrowserStats({
        usageMB,
        quotaMB,
        percentage,
        cachesCount,
      });
    } catch (err: any) {
      console.warn("Storage estimation unavailable:", err);
    } finally {
      setIsMeasuring(false);
    }
  };

  useEffect(() => {
    measureStorage();
  }, []);

  // Clear ONLY BookGarden-owned cache namespaces
  const handleClearCache = async () => {
    setIsClearing(true);
    try {
      if (typeof window === "undefined" || !("caches" in window)) {
        showError("Cache storage is not supported in this browser.");
        setIsClearing(false);
        return;
      }

      const keys = await window.caches.keys();
      const targetKeys = keys.filter((key) =>
        BOOKGARDEN_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix))
      );

      if (targetKeys.length === 0) {
        showSuccess("Offline cache is already clear.");
        await measureStorage();
        setIsClearing(false);
        return;
      }

      await Promise.all(targetKeys.map((key) => window.caches.delete(key)));

      showSuccess(`Cleared ${targetKeys.length} offline cache namespace(s).`);
      await measureStorage();
    } catch (err: any) {
      showError(err.message || "Failed to clear offline cache.");
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
          Reading & Storage
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Inspect device browser storage usage and view your account library data breakdown.
        </p>
      </div>

      {/* 1. Browser Storage Section */}
      <div className="p-6 bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <HardDrive size={18} className="text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Local Device Storage
            </h3>
          </div>
          <button
            type="button"
            onClick={measureStorage}
            disabled={isMeasuring}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 uppercase tracking-wider cursor-pointer"
            title="Refresh storage estimate"
          >
            <RefreshCw size={13} className={isMeasuring ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Meter / Quota Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Browser storage used by BookGarden
            </span>
            <span className="font-mono font-medium text-slate-500 dark:text-slate-400">
              {browserStats ? `${browserStats.usageMB} MB / ${browserStats.quotaMB} MB` : "Calculating..."}
            </span>
          </div>

          <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-300/50 dark:border-slate-700/50">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.max(1, browserStats?.percentage || 1)}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Reported via <code className="text-slate-600 dark:text-slate-400 font-mono font-bold">navigator.storage</code>. Includes indexed client database records and cached book assets.
          </p>
        </div>

        {/* Clear Cache Action Card */}
        <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wider">
              Clear Reader Offline Cache
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
              Purges BookGarden-owned reader caches on this device without affecting your saved cloud library or notes.
            </p>
          </div>

          <button
            type="button"
            onClick={handleClearCache}
            disabled={isClearing || isMeasuring}
            className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 hover:bg-rose-100 dark:hover:bg-rose-500/20 hover:border-rose-300 dark:hover:border-rose-500/40 rounded-xl transition-all disabled:opacity-50 uppercase tracking-wider flex-shrink-0 cursor-pointer shadow-xs"
          >
            {isClearing ? (
              <RefreshCw size={13} className="animate-spin" />
            ) : (
              <Trash2 size={13} />
            )}
            <span>Clear Local Cache</span>
          </button>
        </div>
      </div>

      {/* 2. Server Cloud Library Statistics */}
      <div className="p-6 bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
          <Database size={18} className="text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Cloud Library Statistics
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Stat 1: Total Books */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center gap-3.5 shadow-xs">
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
              <BookOpen size={18} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white font-display">
                {serverStats.totalBooksInLibrary}
              </p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Library Books</p>
            </div>
          </div>

          {/* Stat 2: Reading */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center gap-3.5 shadow-xs">
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-400">
              <Layers size={18} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white font-display">
                {serverStats.readingBooksCount}
              </p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">In Progress</p>
            </div>
          </div>

          {/* Stat 3: Completed */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center gap-3.5 shadow-xs">
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white font-display">
                {serverStats.completedBooksCount}
              </p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Completed</p>
            </div>
          </div>

          {/* Stat 4: Total Notes */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center gap-3.5 shadow-xs">
            <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/20 text-sky-600 dark:text-sky-400">
              <FileText size={18} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white font-display">
                {serverStats.totalNotesCount}
              </p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Notes & Highlights</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
