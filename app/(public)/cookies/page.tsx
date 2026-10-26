import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Cookie, Lock, Sliders, ArrowRight, Database } from "lucide-react";
import ManageCookiesButton from "@/components/cookies/ManageCookiesButton";

export const metadata: Metadata = {
  title: "Strict Cookie & Storage Policy | BookGarden",
  description: "Comprehensive transparency on how BookGarden implements a cookie-first, consent-aware storage architecture with zero advertising trackers.",
};

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-12 sm:py-16 px-4 sm:px-6">
      <main className="max-w-4xl mx-auto space-y-10">
        {/* Header Hero Banner */}
        <div className="p-8 sm:p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-slate-950/5 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-mono font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              Privacy by Design
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">
              Version 3.0 • Cookie-First Architecture
            </p>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-slate-900 dark:text-white tracking-tight">
              Strict Cookie & Storage Policy
            </h1>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
              BookGarden operates on a cookie-first, consent-aware storage model. We distinguish between your explicit privacy decisions and technical browser limitations, employ zero third-party advertising trackers, and never store authentication secrets in client-readable storage.
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-4">
            <ManageCookiesButton />
            <Link
              href="/privacy"
              className="text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1.5"
            >
              <span>View Privacy Policy</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Key Principles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Zero Ad Trackers
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              We never use Google Ads, Meta Pixels, or third-party tracking beacons. Your reading history is private and never commercialized.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-200/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Cookie-First Security
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Authentication cookies enforce <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">HttpOnly</code>, <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">SameSite=Lax</code>, and <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">Secure</code> flags. Session secrets are never copied to JavaScript-accessible storage.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Consent Sovereignty
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              A browser blocking cookies is never interpreted as user rejection, and user rejection prevents optional storage across both cookies and local storage.
            </p>
          </div>
        </div>

        {/* Architecture & Decision Logic Section */}
        <div className="p-8 sm:p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-2xl font-bold font-serif text-slate-900 dark:text-white">
                Storage Architecture & Consent Logic
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                How BookGarden handles data persistence based on consent and browser capability.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs sm:text-sm">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
              <h3 className="font-bold text-slate-900 dark:text-white">
                Case A: Consent Granted & Cookies Active
              </h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Permitted preferences (e.g., interface theme) are stored in first-party cookies. Larger functional caches (e.g., offline reader position, recent searches) use localStorage.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
              <h3 className="font-bold text-slate-900 dark:text-white">
                Case B: Optional Cookies Rejected
              </h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Rejection remains strictly intact. Optional preference, analytics, or search data is NEVER migrated to localStorage to circumvent your choice. Only essential storage is used.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
              <h3 className="font-bold text-slate-900 dark:text-white">
                Case C: Browser Blocks Cookies
              </h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                We detect cookie write limitations rather than assuming consent was rejected. If consent was granted, localStorage is used as a fallback. If consent cannot be saved, optional data is kept in session memory only.
              </p>
            </div>
          </div>
        </div>

        {/* Detailed Inventory Section */}
        <div className="p-8 sm:p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold font-serif text-slate-900 dark:text-white">
              Complete Cookie & Storage Inventory
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              The following table details every storage item and cookie utilized within BookGarden.
            </p>
          </div>

          {/* Table: Essential */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-slate-900 dark:text-white">
                1. Strictly Necessary Storage (Essential)
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono">
                LOCKED
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Required for technical operation, user authentication, CSRF mitigation, and session validation.
            </p>

            <div className="overflow-x-auto border border-slate-200/80 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 border-b border-slate-200/80 dark:border-slate-800 font-mono text-[11px] uppercase tracking-wider">
                    <th className="p-3 font-bold">Identifier</th>
                    <th className="p-3 font-bold">Provider</th>
                    <th className="p-3 font-bold">Storage Type</th>
                    <th className="p-3 font-bold">Lifespan</th>
                    <th className="p-3 font-bold">Purpose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-600 dark:text-slate-300">
                  <tr>
                    <td className="p-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">sb-*-auth-token</td>
                    <td className="p-3">Supabase Auth (SSR)</td>
                    <td className="p-3 font-mono text-[11px]">HttpOnly Cookie, SameSite=Lax, Secure</td>
                    <td className="p-3">1 Year (Rotated on access)</td>
                    <td className="p-3">Authenticates user identity and secures backend session requests. Never accessible to browser JavaScript.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">bookgarden_cookie_consent</td>
                    <td className="p-3">BookGarden</td>
                    <td className="p-3 font-mono text-[11px]">First-Party Cookie (LocalStorage fallback)</td>
                    <td className="p-3">1 Year</td>
                    <td className="p-3">Records your explicit cookie and storage consent preferences.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Table: Functional */}
          <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-slate-900 dark:text-white">
                2. Functional & Reader Preferences
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-mono">
                OPTIONAL
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enables personalized reading preferences, theme persistence, and offline position cache. Requires functional consent.
            </p>

            <div className="overflow-x-auto border border-slate-200/80 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 border-b border-slate-200/80 dark:border-slate-800 font-mono text-[11px] uppercase tracking-wider">
                    <th className="p-3 font-bold">Identifier</th>
                    <th className="p-3 font-bold">Provider</th>
                    <th className="p-3 font-bold">Storage Type</th>
                    <th className="p-3 font-bold">Lifespan</th>
                    <th className="p-3 font-bold">Purpose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-600 dark:text-slate-300">
                  <tr>
                    <td className="p-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">theme / bookgarden-theme</td>
                    <td className="p-3">BookGarden</td>
                    <td className="p-3 font-mono text-[11px]">First-Party Cookie (LocalStorage fallback)</td>
                    <td className="p-3">1 Year</td>
                    <td className="p-3">Preserves your visual theme (Light, Dark, System) preventing flash of unstyled content during pre-hydration.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">bookgarden_reader_pos_*</td>
                    <td className="p-3">BookGarden</td>
                    <td className="p-3 font-mono text-[11px]">LocalStorage (Functional Consent)</td>
                    <td className="p-3">Persistent</td>
                    <td className="p-3">Provides instant local reading position recovery when offline or reconnecting.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">bookgarden_recent_searches</td>
                    <td className="p-3">BookGarden</td>
                    <td className="p-3 font-mono text-[11px]">LocalStorage (Functional Consent)</td>
                    <td className="p-3">Persistent</td>
                    <td className="p-3">Stores recent search terms in discovery for quick repeat queries.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">bookgarden_announcement_seen_*</td>
                    <td className="p-3">BookGarden</td>
                    <td className="p-3 font-mono text-[11px]">LocalStorage (Functional Consent)</td>
                    <td className="p-3">Persistent</td>
                    <td className="p-3">Remembers acknowledged system notices so they do not repeatedly interrupt reading.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Table: Analytics & Performance */}
          <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-slate-900 dark:text-white">
                3. Analytics & Performance Telemetry
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-mono">
                OPTIONAL
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Anonymized reading dwell time analytics used solely to calculate personal reading speeds and optimize canvas rendering budgets. Requires analytics consent.
            </p>

            <div className="overflow-x-auto border border-slate-200/80 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 border-b border-slate-200/80 dark:border-slate-800 font-mono text-[11px] uppercase tracking-wider">
                    <th className="p-3 font-bold">Identifier</th>
                    <th className="p-3 font-bold">Provider</th>
                    <th className="p-3 font-bold">Storage Type</th>
                    <th className="p-3 font-bold">Lifespan</th>
                    <th className="p-3 font-bold">Purpose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-600 dark:text-slate-300">
                  <tr>
                    <td className="p-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">bookgarden_view_history</td>
                    <td className="p-3">BookGarden</td>
                    <td className="p-3 font-mono text-[11px]">LocalStorage (Analytics Consent)</td>
                    <td className="p-3">Persistent</td>
                    <td className="p-3">Stores recently viewed book details to offer personalized reading insights.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">bookgarden_reader_dwell</td>
                    <td className="p-3">BookGarden</td>
                    <td className="p-3 font-mono text-[11px]">Session Memory (Analytics Consent)</td>
                    <td className="p-3">Session Only</td>
                    <td className="p-3">Measures active page dwell time for reading statistics without third-party tracking.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">Vercel Web Analytics</td>
                    <td className="p-3">Vercel Inc.</td>
                    <td className="p-3 font-mono text-[11px]">Cookieless Ephemeral Telemetry (Analytics Consent)</td>
                    <td className="p-3">Session Only</td>
                    <td className="p-3">Anonymized performance and traffic metrics (page views, route transitions, device type). Disabled by default and never loaded without explicit analytics consent.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* How to Manage Cookies Section */}
        <div className="p-8 sm:p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
          <h2 className="text-2xl font-bold font-serif text-slate-900 dark:text-white">
            Managing & Revoking Consent
          </h2>
          <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
            <p>
              You can modify or withdraw your cookie consent at any time by clicking the button below or using the <strong>Cookie Settings</strong> link in our footer. When you withdraw consent for a category, all corresponding optional cookies and local storage items are immediately purged.
            </p>
            <div className="pt-2">
              <ManageCookiesButton />
            </div>
            <p className="pt-2 text-xs text-slate-500 dark:text-slate-400">
              Additionally, you can configure your browser to block all cookies. Please note that blocking Strictly Necessary cookies will prevent logging in and reading books securely on BookGarden.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
