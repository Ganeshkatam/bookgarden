"use client";

import Link from "next/link";
import {
  ShieldCheck,
  BookOpen,
  Highlighter,
  FolderHeart,
  ArrowRight,
} from "lucide-react";

const FEATURES = [
  {
    title: "Universal Open Access",
    description: "Every preserved manuscript and textbook is freely accessible with zero paywalls or download restrictions.",
    icon: ShieldCheck,
    badge: "100% Free",
  },
  {
    title: "Distraction-Free Reader",
    description: "Read smoothly in browser with custom typography, day/night themes, page zoom, and adaptive fluid layouts.",
    icon: BookOpen,
    badge: "Interactive UI",
  },
  {
    title: "Annotations & Highlights",
    description: "Highlight key passages with custom color palettes, attach personal margins notes, and store reading bookmarks.",
    icon: Highlighter,
    badge: "Synced Data",
  },
  {
    title: "Custom Shelves & Streaks",
    description: "Organize books into personalized collections, track your reading progress, and maintain persistent streaks.",
    icon: FolderHeart,
    badge: "Personal Space",
  },
];

export function DiscoverPlatformFeatures() {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-8 sm:p-10 lg:p-12 shadow-xl">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/15 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

      <div className="relative z-10 flex flex-col gap-8 sm:gap-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <span className="px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-700 text-indigo-300 text-xs font-black uppercase tracking-wider">
              The BookGarden Advantage
            </span>
            <h3 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight">
              A Modern Digital Archive Built for Deep Reading
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed">
              BookGarden pairs universal public-domain preservation with powerful modern reading tooling, smart progress tracking, and distraction-free typography.
            </p>
          </div>

          <Link
            href="/me/library"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-slate-950 hover:bg-indigo-50 font-extrabold text-xs sm:text-sm shadow-lg transition-all self-start sm:self-auto cursor-pointer group"
          >
            <span>My Personal Library</span>
            <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;

            return (
              <div
                key={feature.title}
                className="rounded-2xl bg-white/5 border border-white/10 p-5 sm:p-6 backdrop-blur-xs flex flex-col justify-between transition-all duration-200 hover:bg-white/10 hover:border-white/20"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                      <Icon size={18} />
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-800/60">
                      {feature.badge}
                    </span>
                  </div>

                  <h4 className="font-display font-bold text-sm sm:text-base text-white mb-1.5">
                    {feature.title}
                  </h4>

                  <p className="text-xs text-slate-300 font-medium leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
