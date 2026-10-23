"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ShieldCheck, Cookie, Lock, Sliders, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import {
  CookiePreferences,
  getStoredCookieConsent,
  saveCookieConsent,
  purgeNonEssentialStorage,
  isPersistenceReliable,
} from "@/shared/core/storage/privacy-storage";

export { getStoredCookieConsent, saveCookieConsent, purgeNonEssentialStorage, isPersistenceReliable };
export type { CookiePreferences };

export default function CookieConsentBanner() {
  const [mounted, setMounted] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Preference state
  const [functional, setFunctional] = useState(true);
  const [analytics, setAnalytics] = useState(true);
  const [persistenceReliable, setPersistenceReliable] = useState(true);

  useEffect(() => {
    setMounted(true);
    setPersistenceReliable(isPersistenceReliable());
    const stored = getStoredCookieConsent();
    if (!stored) {
      setShowBanner(true);
    } else {
      setFunctional(stored.functional ?? true);
      setAnalytics(stored.analytics ?? true);
    }
  }, []);

  // Global trigger listener allowing links anywhere to re-open modal
  useEffect(() => {
    const handleOpen = () => {
      const stored = getStoredCookieConsent();
      if (stored) {
        setFunctional(stored.functional ?? true);
        setAnalytics(stored.analytics ?? true);
      }
      setShowModal(true);
    };

    window.addEventListener("open-cookie-preferences", handleOpen);
    return () => window.removeEventListener("open-cookie-preferences", handleOpen);
  }, []);

  if (!mounted) return null;

  const handleAcceptAll = () => {
    saveCookieConsent({ essential: true, functional: true, analytics: true });
    setShowBanner(false);
    setShowModal(false);
  };

  const handleAcceptEssentialOnly = () => {
    saveCookieConsent({ essential: true, functional: false, analytics: false });
    setShowBanner(false);
    setShowModal(false);
  };

  const handleSaveCustom = () => {
    saveCookieConsent({ essential: true, functional, analytics });
    setShowBanner(false);
    setShowModal(false);
  };

  return (
    <>
      {/* Floating Bottom Cookie Consent Banner */}
      {showBanner && !showModal && (
        <aside
          aria-label="Cookie consent banner"
          className="fixed bottom-4 left-4 right-4 sm:left-6 sm:right-auto sm:max-w-xl z-50 animate-in fade-in slide-in-from-bottom-6 duration-300"
        >
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xl shadow-slate-950/20 text-slate-900 dark:text-slate-100 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  Strict Cookie & Privacy Policy
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
                  We use strictly necessary cookies for secure authentication and optional preferences to remember your reader settings. We never use advertising or third-party tracking cookies.
                </p>
              </div>
            </div>

            {!persistenceReliable && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>
                  Storage persistence is blocked in your browser. Preferences cannot be saved permanently and will only apply to this session.
                </span>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1 border-t border-slate-100 dark:border-slate-800/60">
              <Link
                href="/cookies"
                className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 underline underline-offset-4 transition-colors"
              >
                Read Cookie Policy
              </Link>

              <div className="flex items-center gap-2 ml-auto">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowModal(true)}
                  className="rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer h-9 px-3 transition-colors shadow-xs"
                >
                  <Sliders className="w-3.5 h-3.5 mr-1.5 text-slate-600 dark:text-slate-300" />
                  Preferences
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleAcceptEssentialOnly}
                  className="rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 border border-transparent dark:border-slate-700/60 cursor-pointer h-9 px-3 transition-colors"
                >
                  Essential Only
                </Button>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={handleAcceptAll}
                  className="rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/25 cursor-pointer h-9 px-4 transition-all"
                >
                  Accept All
                </Button>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* Detailed Granular Preference Dialog Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-xl p-0 overflow-hidden rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-2xl">
          <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600" />

          <div className="p-6 sm:p-7 space-y-6">
            <DialogHeader className="text-left space-y-2">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                <Cookie className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-[0.2em] font-mono">
                  Privacy Settings
                </span>
              </div>
              <DialogTitle className="text-2xl font-bold font-serif text-slate-900 dark:text-white">
                Cookie & Storage Preferences
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
                Customize how BookGarden manages cookies and local browser storage. You can adjust these settings at any time.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 max-h-[55vh] overflow-y-auto pr-1">
              {!persistenceReliable && (
                <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs leading-relaxed">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>
                    Storage persistence is restricted in your browser. Any optional choices will only apply for your current session and may need to be selected again on your next visit.
                  </span>
                </div>
              )}

              {/* Category 1: Strictly Necessary (Locked) */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      Strictly Necessary Cookies
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <Lock className="w-3 h-3" />
                      Always Active
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Essential for secure authentication (Supabase auth tokens with HttpOnly, SameSite=Lax attributes), session persistence, and CSRF protection. Required for the service to function.
                  </p>
                </div>
              </div>

              {/* Category 2: Functional & Reader Preferences */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 flex items-start justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <span className="text-sm font-bold text-slate-900 dark:text-white block">
                    Functional & Reader Preferences
                  </span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Preserves your customized reading theme (Light, Dark, Sepia), font sizes, zoom scales, sidebar state, and instant offline page cache.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={functional}
                    onChange={(e) => setFunctional(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* Category 3: Analytics & Reading Telemetry */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 flex items-start justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <span className="text-sm font-bold text-slate-900 dark:text-white block">
                    Analytics & Performance Telemetry
                  </span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Enables anonymized dwell time calculations, reading velocity metrics, and error diagnostics to help optimize reader rendering speed.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={analytics}
                    onChange={(e) => setAnalytics(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleAcceptEssentialOnly}
                className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white w-full sm:w-auto"
              >
                Reject All Non-Essential
              </Button>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleSaveCustom}
                  className="rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer h-10 px-4 w-full sm:w-auto shadow-xs"
                >
                  Save Choices
                </Button>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={handleAcceptAll}
                  className="rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 cursor-pointer h-10 px-5 w-full sm:w-auto"
                >
                  Accept All
                </Button>
              </div>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
