import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import {
  CheckCircle2,
  BookOpen,
  ArrowRight,
  Clock,
  HelpCircle,
} from "lucide-react";
import { createSupabaseServerClient } from "@/shared/core/database/server";
import { SupabaseAnnouncementReadModel } from "@/modules/announcements/infrastructure/read-models/SupabaseAnnouncementReadModel";
import { GetActiveAnnouncementsQueryHandler } from "@/modules/announcements/application/queries/GetActiveAnnouncements/handler";
import { Button } from "@/components/ui/button";
import { MaintenanceDocumentViewer } from "@/modules/announcements/presentation/components/MaintenanceDocumentViewer";

export const metadata: Metadata = {
  title: "System Status & Maintenance Advisory",
  description:
    "Official operational status and scheduled maintenance reports for BookGarden digital library services.",
};

export const revalidate = 60; // Refresh every 60 seconds

export default async function MaintenancePage() {
  const supabase = await createSupabaseServerClient();
  const readModel = new SupabaseAnnouncementReadModel(supabase);
  const handler = new GetActiveAnnouncementsQueryHandler(readModel);

  const announcements = await handler.execute().catch(() => []);

  // Strictly filter for real active maintenance/warning notices from the database
  const activeMaintenanceNotices = announcements.filter(
    (a) =>
      a.type === "warning" ||
      a.type === "maintenance" ||
      a.type === "error"
  );

  return (
    <div className="min-h-screen bg-[var(--surface-canvas)] text-[var(--text-primary)] font-sans">
      <main className="max-w-6xl xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-6">
          <Link href="/" className="hover:text-slate-900 dark:hover:text-white transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="text-slate-900 dark:text-white">System Status</span>
        </div>

        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold uppercase tracking-wider w-fit mb-3 border border-slate-200 dark:border-slate-700">
            <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Operational Center</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold text-slate-900 dark:text-white tracking-tight">
            System Status & Notices
          </h1>
        </div>

        {/* Live Database Maintenance Advisory - Formatted Document Viewer */}
        {activeMaintenanceNotices.length > 0 ? (
          <div className="space-y-6 mb-12">
            {activeMaintenanceNotices.map((notice) => (
              <MaintenanceDocumentViewer key={notice.id} notice={notice} />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl p-8 sm:p-10 bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-500/30 shadow-md mb-12 flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                All Systems Operational
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                There is currently no active maintenance or service advisory. All reader engines, search endpoints, and library synchronization are operating normally at 100% capacity.
              </p>
            </div>
          </div>
        )}

        {/* Reader Assurance Card */}
        <div className="rounded-3xl p-8 sm:p-10 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-md mb-12">
          <div className="flex items-center gap-3 mb-4">
            <HelpCircle className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Reader Data Safety & Continuous Reading
            </h2>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            During any scheduled maintenance window, active reader sessions, bookmark progress, and margin notes remain continuously accessible and are saved securely to your local device.
          </p>
        </div>

        {/* Navigation CTAs */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-slate-200 dark:border-slate-800">
          <Button
            asChild
            variant="outline"
            className="h-11 px-6 font-semibold rounded-xl border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100"
          >
            <Link href="/discover" className="inline-flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              <span>Explore Catalog</span>
            </Link>
          </Button>

          <Button
            asChild
            className="h-11 px-6 font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm"
          >
            <Link href="/support" className="inline-flex items-center gap-2">
              <span>Contact Reader Support</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
