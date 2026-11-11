import React from "react";
import Link from "next/link";
import {
  Sparkles,
  TrendingUp,
  Clock,
  BookOpen,
  Users,
  Compass,
  ChevronRight,
  Layers,
  LucideIcon,
} from "lucide-react";
import { DiscoveryConfiguration, DiscoveryMode } from "@/modules/discovery/presentation/types/DiscoveryConfiguration";

interface CategoryTab {
  id: DiscoveryMode;
  label: string;
  href: string;
  icon: LucideIcon;
}

const CATEGORY_TABS: CategoryTab[] = [
  { id: "overview", label: "All Archives", href: "/discover", icon: Compass },
  { id: "featured", label: "Editor's Picks", href: "/discover/featured", icon: Sparkles },
  { id: "trending", label: "Popular Now", href: "/discover/trending", icon: TrendingUp },
  { id: "new", label: "Recently Added", href: "/discover/new", icon: Clock },
  { id: "collections", label: "Collections", href: "/discover/collections", icon: BookOpen },
  { id: "authors", label: "Authors", href: "/discover/authors", icon: Users },
];

export function DiscoveryPage({ config }: { config: DiscoveryConfiguration }) {
  const activeTab = CATEGORY_TABS.find((t) => t.id === config.mode) || CATEGORY_TABS[1];
  const IconComponent = activeTab.icon;

  return (
    <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-6 sm:py-8 lg:py-10 space-y-8 animate-in fade-in duration-300">
      {/* 1. Breadcrumb */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 font-medium">
          <Link
            href="/"
            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            Home
          </Link>
          <ChevronRight size={12} className="text-slate-400" />
          <Link
            href="/discover"
            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            Discover
          </Link>
          <ChevronRight size={12} className="text-slate-400" />
          <span className="text-slate-800 dark:text-slate-200 font-bold">
            {config.title}
          </span>
        </nav>
      </div>

      {/* 2. Interactive Discovery Category Nav Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar border-b border-slate-200/80 dark:border-slate-800/80">
        {CATEGORY_TABS.map((tab) => {
          const TabIcon = tab.icon;
          const isActive = tab.id === config.mode;

          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-200 ${
                isActive
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              }`}
            >
              <TabIcon size={14} className={isActive ? "text-white" : "text-slate-400"} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>

      {/* 3. Hero Header Card */}
      <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 sm:p-8 transition-colors">
        {/* Subtle Ambient Background Gradient */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-extrabold uppercase tracking-wider">
              <IconComponent size={12} className="text-indigo-500" />
              <span>{config.subtitle || "Curated Discovery Collection"}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
              {config.title}
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-sans leading-relaxed pt-0.5">
              {config.description}
            </p>
          </div>

          {/* Right Metadata Tag */}
          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 text-slate-700 dark:text-slate-200 text-xs font-bold shadow-2xs">
              <Layers size={13} className="text-indigo-500" />
              <span>
                {config.totalCount !== undefined
                  ? `${config.totalCount} ${config.totalCount === 1 ? "Item" : "Digital Items"}`
                  : "Preserved Editions"}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
              Free Open Access
            </span>
          </div>
        </div>
      </div>

      {/* 4. Main Grid Container */}
      <div className="pt-2">
        {config.gridContent}
      </div>
    </div>
  );
}

