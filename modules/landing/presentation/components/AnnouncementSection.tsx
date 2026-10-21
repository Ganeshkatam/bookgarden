import React from "react";
import Link from "next/link";
import {
  Sparkles,
  AlertTriangle,
  AlertCircle,
  ArrowRight,
  Megaphone,
  BookOpen,
  Compass,
  Bookmark,
} from "lucide-react";
import { AnnouncementDto } from "@/modules/announcements/application/dto/AnnouncementDto";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

interface AnnouncementSectionProps {
  announcements: AnnouncementDto[];
}

export default function AnnouncementSection({
  announcements,
}: AnnouncementSectionProps) {
  if (!announcements || announcements.length === 0) return null;

  const getThemeMeta = (type: string) => {
    switch (type) {
      case "greetings":
      case "greeting":
      case "Greetings":
        return {
          icon: <BookOpen className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />,
          label: "Greetings",
          badgeStyle:
            "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30",
          cardBorder:
            "border-indigo-200/80 hover:border-indigo-400 dark:border-indigo-500/25 dark:hover:border-indigo-500/50",
          glowColor: "bg-indigo-400/20 dark:bg-indigo-500/20",
          gradient:
            "from-indigo-50/70 via-white to-slate-50 dark:from-indigo-950/30 dark:via-slate-900/80 dark:to-slate-950",
          topLine: "via-indigo-500",
          btnGradient:
            "from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-500/20",
          iconBg:
            "from-indigo-100 to-purple-100 border-indigo-200 text-indigo-700 dark:from-indigo-500/20 dark:to-purple-500/10 dark:border-indigo-500/30 dark:text-indigo-300",
        };
      case "warning":
        return {
          icon: <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />,
          label: "Maintenance & Notice",
          badgeStyle:
            "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
          cardBorder:
            "border-amber-200/80 hover:border-amber-400 dark:border-amber-500/25 dark:hover:border-amber-500/50",
          glowColor: "bg-amber-400/20 dark:bg-amber-500/20",
          gradient:
            "from-amber-50/70 via-white to-slate-50 dark:from-amber-950/30 dark:via-slate-900/80 dark:to-slate-950",
          topLine: "via-amber-500",
          btnGradient:
            "from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-amber-500/20",
          iconBg:
            "from-amber-100 to-orange-100 border-amber-200 text-amber-800 dark:from-amber-500/20 dark:to-orange-500/10 dark:border-amber-500/30 dark:text-amber-300",
        };
      case "error":
        return {
          icon: <AlertCircle className="w-6 h-6 text-rose-600 dark:text-rose-400" />,
          label: "Important Notice",
          badgeStyle:
            "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30",
          cardBorder:
            "border-rose-200/80 hover:border-rose-400 dark:border-rose-500/25 dark:hover:border-rose-500/50",
          glowColor: "bg-rose-400/20 dark:bg-rose-500/20",
          gradient:
            "from-rose-50/70 via-white to-slate-50 dark:from-rose-950/30 dark:via-slate-900/80 dark:to-slate-950",
          topLine: "via-rose-500",
          btnGradient:
            "from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white shadow-rose-500/20",
          iconBg:
            "from-rose-100 to-pink-100 border-rose-200 text-rose-800 dark:from-rose-500/20 dark:to-pink-500/10 dark:border-rose-500/30 dark:text-rose-300",
        };
      case "feature":
        return {
          icon: <Sparkles className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />,
          label: "New Capability",
          badgeStyle:
            "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
          cardBorder:
            "border-emerald-200/80 hover:border-emerald-400 dark:border-emerald-500/25 dark:hover:border-emerald-500/50",
          glowColor: "bg-emerald-400/20 dark:bg-emerald-500/20",
          gradient:
            "from-emerald-50/70 via-white to-slate-50 dark:from-emerald-950/30 dark:via-slate-900/80 dark:to-slate-950",
          topLine: "via-emerald-500",
          btnGradient:
            "from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-emerald-500/20",
          iconBg:
            "from-emerald-100 to-teal-100 border-emerald-200 text-emerald-800 dark:from-emerald-500/20 dark:to-teal-500/10 dark:border-emerald-500/30 dark:text-emerald-300",
        };
      case "info":
      default:
        return {
          icon: <Bookmark className="w-6 h-6 text-sky-600 dark:text-cyan-400" />,
          label: "Platform Release",
          badgeStyle:
            "bg-sky-50 text-sky-800 border-sky-200 dark:bg-cyan-500/15 dark:text-cyan-300 dark:border-cyan-500/30",
          cardBorder:
            "border-sky-200/80 hover:border-sky-400 dark:border-cyan-500/25 dark:hover:border-cyan-500/50",
          glowColor: "bg-cyan-400/20 dark:bg-cyan-500/20",
          gradient:
            "from-sky-50/70 via-white to-slate-50 dark:from-cyan-950/30 dark:via-slate-900/80 dark:to-slate-950",
          topLine: "via-cyan-500",
          btnGradient:
            "from-sky-600 to-teal-500 hover:from-sky-500 hover:to-teal-400 text-white shadow-sky-500/20",
          iconBg:
            "from-sky-100 to-teal-100 border-sky-200 text-sky-800 dark:from-cyan-500/20 dark:to-teal-500/10 dark:border-cyan-500/30 dark:text-cyan-300",
        };
    }
  };

  return (
    <section className="max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 w-full py-12">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 pb-6 border-b border-slate-200/80 dark:border-slate-800/80">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/25 text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 mb-4 shadow-xs">
            <Megaphone className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Latest Dispatches</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold text-slate-900 dark:text-white tracking-tight">
            Announcements
          </h2>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 mt-2 max-w-2xl leading-relaxed">
            Discover what&apos;s newly launched across BookGarden, enhanced reader capabilities, and platform updates.
          </p>
        </div>

        <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/60 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800">
          <Compass className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Updated Regularly</span>
        </div>
      </div>

      {/* Grand Luxury Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {announcements.slice(0, 2).map((announcement) => {
          const theme = getThemeMeta(announcement.type);

          return (
            <Card
              key={announcement.id}
              className={`relative overflow-hidden rounded-3xl p-8 sm:p-10 lg:p-12 bg-gradient-to-b ${theme.gradient} border ${theme.cardBorder} shadow-xl dark:shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl flex flex-col justify-between group`}
            >
              {/* Top Gradient Highlight Line */}
              <div
                className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent ${theme.topLine} to-transparent`}
              />

              {/* Ambient Glow Orb */}
              <div
                className={`absolute -top-24 -right-24 w-72 h-72 rounded-full ${theme.glowColor} blur-[90px] opacity-15 group-hover:opacity-25 transition-opacity pointer-events-none`}
              />

              <div>
                {/* Header: Icon, Badge, and Timestamp */}
                <CardHeader className="p-0 pb-6">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br ${theme.iconBg} border shadow-inner`}
                      >
                        {theme.icon}
                      </div>

                      <div>
                        <span
                          className={`inline-block text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${theme.badgeStyle}`}
                        >
                          {theme.label}
                        </span>
                      </div>
                    </div>

                    <span
                      className="text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/80 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800/80"
                      suppressHydrationWarning
                    >
                      {formatDate(announcement.startsAt)}
                    </span>
                  </div>

                  {/* Title */}
                  <CardTitle className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug pt-6">
                    {announcement.title}
                  </CardTitle>
                </CardHeader>

                {/* Content */}
                <CardContent className="p-0 pb-8">
                  <CardDescription className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                    {announcement.content}
                  </CardDescription>
                </CardContent>
              </div>

              {/* Action Footer */}
              <CardFooter className="p-0 pt-6 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between gap-4 flex-wrap">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  BookGarden Platform Notice
                </span>

                {announcement.linkUrl && announcement.linkText ? (
                  <Button
                    asChild
                    size="default"
                    className={`h-11 px-6 text-sm font-bold rounded-xl shadow-md bg-gradient-to-r ${theme.btnGradient} transition-all duration-200 group-hover:scale-105`}
                  >
                    <Link
                      href={announcement.linkUrl}
                      className="inline-flex items-center gap-2"
                    >
                      <span>{announcement.linkText}</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </Button>
                ) : (
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    Active
                  </span>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
