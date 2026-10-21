import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Cookie, Lock, Sliders, CheckCircle2, Sparkles, ArrowRight } from "lucide-react";
import ManageCookiesButton from "@/components/cookies/ManageCookiesButton";

export const metadata: Metadata = {
  title: "Strict Cookie Policy | BookGarden",
  description: "Comprehensive transparency on how BookGarden implements strict, privacy-first cookie and storage policies with zero advertising trackers.",
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
              Version 2.0 • Strict Security Standard
            </p>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-slate-900 dark:text-white tracking-tight">
              Strict Cookie & Local Storage Policy
            </h1>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
              BookGarden operates on an absolute transparency model. We implement strict, encrypted cookie controls, zero third-party tracking scripts, and give you complete sovereignty over your functional and telemetry preferences.
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
              We never use Google Ads, Meta Pixels, or data broker beacons. Your reading habits are private and never monetized.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Strict Cookie Security
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              All authentication cookies enforce <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">HttpOnly</code>, <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">SameSite=Lax</code>, and <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">Secure</code> SSL flags.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Granular Sovereignty
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              You retain total control over functional preferences and performance telemetry, with one-click revocation at any time.
            </p>
          </div>
        </div>

        {/* Detailed Inventory Section */}
        <div className="p-8 sm:p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold font-serif text-slate-900 dark:text-white">
              Complete Cookie & Storage Inventory
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              The following table details every cookie and local storage item utilized within BookGarden.
            </p>
          </div>

          {/* Table: Essential */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-slate-900 dark:text-white">
                1. Strictly Necessary Cookies (Essential)
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
                    <th className="p-3 font-bold">Attributes</th>
                    <th className="p-3 font-bold">Lifespan</th>
                    <th className="p-3 font-bold">Purpose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-600 dark:text-slate-300">
                  <tr>
                    <td className="p-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">sb-*-auth-token</td>
                    <td className="p-3">Supabase Auth</td>
                    <td className="p-3 font-mono text-[11px]">HttpOnly, SameSite=Lax, Secure</td>
                    <td className="p-3">1 Year (Rotated on access)</td>
                    <td className="p-3">Authenticates user identity and secures backend session requests.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">bookgarden_cookie_consent</td>
                    <td className="p-3">BookGarden</td>
                    <td className="p-3 font-mono text-[11px]">LocalStorage</td>
                    <td className="p-3">Persistent</td>
                    <td className="p-3">Records your cookie and privacy consent preferences.</td>
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
              Enables personalized reading experiences, theme persistence, and offline position cache.
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
                    <td className="p-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">bookgarden-theme</td>
                    <td className="p-3">BookGarden</td>
                    <td className="p-3 font-mono text-[11px]">LocalStorage</td>
                    <td className="p-3">Persistent</td>
                    <td className="p-3">Preserves your interface theme (Light, Dark, System) preventing flash of unstyled content.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">bookgarden_reading_pos_*</td>
                    <td className="p-3">BookGarden</td>
                    <td className="p-3 font-mono text-[11px]">LocalStorage</td>
                    <td className="p-3">Persistent</td>
                    <td className="p-3">Provides instant local reading position recovery when offline or reconnecting.</td>
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
              Anonymized reading dwell time analytics used solely to calculate personal reading speeds and optimize canvas rendering budgets.
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
                    <td className="p-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">bookgarden_reader_dwell</td>
                    <td className="p-3">BookGarden</td>
                    <td className="p-3 font-mono text-[11px]">SessionMemory</td>
                    <td className="p-3">Session Only</td>
                    <td className="p-3">Measures active page dwell time for reading statistics without third-party tracking.</td>
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
              You can modify or withdraw your cookie consent at any time by clicking the button below or using the <strong>Cookie Settings</strong> link in our footer.
            </p>
            <div className="pt-2">
              <ManageCookiesButton />
            </div>
            <p className="pt-2 text-xs text-slate-500 dark:text-slate-400">
              Additionally, you can configure your browser to block all cookies or notify you when a cookie is set. Please note that blocking Strictly Necessary cookies will prevent logging in and reading books securely on BookGarden.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
