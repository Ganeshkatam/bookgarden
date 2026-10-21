"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertCircle, X, ArrowRight, Megaphone, ShieldAlert } from "lucide-react";
import { AnnouncementDto } from "../../application/dto/AnnouncementDto";
import { Button } from "@/components/ui/button";
import AnnouncementCenter from "./AnnouncementCenter";
import { safeStorage } from "@/shared/core/storage/privacy-storage";

function isTopBannerDismissed(id: string): boolean {
  return safeStorage.getItem(`bookgarden_top_banner_dismissed_${id}`) === "true";
}

function markTopBannerDismissed(id: string): void {
  safeStorage.setItem(`bookgarden_top_banner_dismissed_${id}`, "true", "functional");
}

function isMaintenanceAnnouncement(type: string): boolean {
  const normalized = type?.toLowerCase();
  return normalized === "warning" || normalized === "maintenance" || normalized === "error";
}

function getThemeStyles(type: string) {
  const normalized = type?.toLowerCase();
  if (normalized === "error") {
    return {
      wrapper:
        "bg-gradient-to-r from-rose-50/90 via-rose-50/50 to-pink-50/80 dark:from-rose-950/50 dark:via-slate-950/90 dark:to-rose-950/40 border-b border-rose-200/80 dark:border-rose-500/25",
      topHighlight: "via-rose-500/50",
      badge:
        "bg-rose-500/10 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-300/60 dark:border-rose-500/40",
      pulseColor: "bg-rose-500",
      icon: (
        <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
      ),
      cta: "bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white shadow-sm hover:shadow-rose-500/20",
    };
  }

  return {
    wrapper:
      "bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-orange-500/10 dark:from-amber-950/45 dark:via-slate-950/90 dark:to-amber-950/35 border-b border-amber-300/50 dark:border-amber-500/20",
    topHighlight: "via-amber-400/60 dark:via-amber-500/40",
    badge:
      "bg-amber-500/15 dark:bg-amber-500/20 text-amber-900 dark:text-amber-200 border-amber-400/50 dark:border-amber-500/40",
    pulseColor: "bg-amber-500",
    icon: (
      <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
    ),
    cta: "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-sm hover:shadow-amber-500/25",
  };
}

export interface AnnouncementBannerProps {
  announcements?: AnnouncementDto[];
}

export function AnnouncementBanner({ announcements = [] }: AnnouncementBannerProps) {
  const pathname = usePathname();
  const [items, setItems] = useState<AnnouncementDto[]>(announcements);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set());
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);

    if (announcements && announcements.length > 0) {
      setItems(announcements);
    } else {
      // Client-side fallback query
      fetch("/api/announcements")
        .then((res) => res.json())
        .then((data) => {
          if (data.announcements && Array.isArray(data.announcements)) {
            setItems(data.announcements);
          }
        })
        .catch(() => {});
    }
  }, [announcements]);

  // Load top-banner dismissed state
  useEffect(() => {
    if (!isClient) return;
    const dismissed = new Set<string>();
    for (const item of items) {
      if (isTopBannerDismissed(item.id)) {
        dismissed.add(item.id);
      }
    }
    setDismissedIds(dismissed);
  }, [isClient, items]);

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

    markTopBannerDismissed(id);
  };

  // Strictly filter for maintenance / critical warning announcements from the database
  const maintenanceAnnouncements = items.filter(
    (a) => isMaintenanceAnnouncement(a.type) && !dismissedIds.has(a.id)
  );

  // If and only if there exists a maintenance announcement from the database
  if (!isClient || maintenanceAnnouncements.length === 0) {
    return null;
  }

  // Display top priority active maintenance notice banner
  const primaryAnnouncement = maintenanceAnnouncements[0];
  const theme = getThemeStyles(primaryAnnouncement.type);

  // Check if user is already on the target link route (e.g. /maintenance)
  const isAlreadyOnDestination =
    Boolean(primaryAnnouncement.linkUrl) &&
    (pathname === primaryAnnouncement.linkUrl ||
      (pathname?.startsWith("/maintenance") &&
        primaryAnnouncement.linkUrl?.startsWith("/maintenance")));

  return (
    <div
      className="w-full relative z-50 shrink-0"
      role="region"
      aria-label="System Maintenance Notice"
    >
      <aside
        className={`w-full relative backdrop-blur-xl transition-all duration-300 ${theme.wrapper}`}
      >
        {/* Top Hairline Gradient Highlight */}
        <div
          className={`absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent ${theme.topHighlight} to-transparent pointer-events-none`}
        />

        <div className="max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {theme.icon}

            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs sm:text-sm">
              {/* Premium Pulsing Status Pill */}
              <span
                className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border shadow-2xs ${theme.badge}`}
              >
                <span className="relative flex h-1.5 w-1.5">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${theme.pulseColor}`}
                  />
                  <span
                    className={`relative inline-flex rounded-full h-1.5 w-1.5 ${theme.pulseColor}`}
                  />
                </span>
                <span>
                  {primaryAnnouncement.type === "warning"
                    ? "Maintenance"
                    : primaryAnnouncement.type}
                </span>
              </span>

              {/* Title */}
              <span className="font-bold text-slate-900 dark:text-amber-100 tracking-tight">
                {primaryAnnouncement.title}
              </span>

              <span className="text-amber-500/50 dark:text-amber-400/40 hidden sm:inline">
                &bull;
              </span>

              {/* Message Content */}
              <span className="text-slate-700 dark:text-slate-300 font-normal leading-tight line-clamp-1 sm:line-clamp-none">
                {primaryAnnouncement.content}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {!isAlreadyOnDestination &&
              primaryAnnouncement.linkUrl &&
              primaryAnnouncement.linkText && (
                <Button
                  asChild
                  size="sm"
                  className={`h-7 px-3.5 text-xs font-bold rounded-full transition-all duration-200 hover:scale-105 ${theme.cta}`}
                >
                  <Link
                    href={primaryAnnouncement.linkUrl}
                    className="inline-flex items-center gap-1.5"
                  >
                    <span>{primaryAnnouncement.linkText}</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </Button>
              )}

            <AnnouncementCenter
              announcements={items}
              trigger={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="View all announcements"
                  className="h-7 w-7 rounded-full text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10"
                >
                  <Megaphone className="w-3.5 h-3.5" />
                </Button>
              }
            />

            {primaryAnnouncement.isDismissible && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleDismiss(primaryAnnouncement.id)}
                aria-label={`Dismiss announcement: ${primaryAnnouncement.title}`}
                className="h-7 w-7 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

export default AnnouncementBanner;
