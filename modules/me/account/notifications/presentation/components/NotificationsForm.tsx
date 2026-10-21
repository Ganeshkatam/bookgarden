"use client";

import React, { useState, useTransition } from "react";
import { updateNotificationToggleAction } from "../actions/notifications";
import { showError, showSuccess } from "@/lib/toast";
import {
  Bell,
  Flame,
  Sparkles,
  Mail,
  Megaphone,
  Smartphone,
  CheckCircle2,
  Loader2,
  CloudOff,
  Send,
} from "lucide-react";

export interface NotificationPreferencesDto {
  readingRemindersEnabled: boolean;
  recommendationsEnabled: boolean;
  weeklyDigestEnabled: boolean;
  systemAnnouncementsEnabled: boolean;
  emailAlertsEnabled: boolean;
  pushNotificationsEnabled: boolean;
}

interface NotificationsFormProps {
  initialValues: NotificationPreferencesDto;
}

type ToggleKey = keyof NotificationPreferencesDto;

interface ToggleMeta {
  key: ToggleKey;
  label: string;
  description: string;
  icon: typeof Bell;
  iconColor: string;
  iconBg: string;
}

const TOGGLE_ITEMS: ToggleMeta[] = [
  {
    key: "readingRemindersEnabled",
    label: "Reading Streaks & Reminders",
    description:
      "Receive daily reminders to maintain your reading streak and hit your goals.",
    icon: Flame,
    iconColor: "text-amber-400",
    iconBg: "bg-amber-500/10 border-amber-500/20",
  },
  {
    key: "recommendationsEnabled",
    label: "New Releases & Recommendations",
    description:
      "Get recommendations based on your library and updates when new books drop.",
    icon: Sparkles,
    iconColor: "text-indigo-400",
    iconBg: "bg-indigo-500/10 border-indigo-500/20",
  },
  {
    key: "weeklyDigestEnabled",
    label: "Weekly Reading Digest",
    description:
      "Receive a weekly recap of your reading stats, notes taken, and books completed.",
    icon: Mail,
    iconColor: "text-emerald-400",
    iconBg: "bg-emerald-500/10 border-emerald-500/20",
  },
  {
    key: "systemAnnouncementsEnabled",
    label: "System & Product Updates",
    description:
      "Stay informed about new BookGarden features, reader upgrades, and service notices.",
    icon: Megaphone,
    iconColor: "text-sky-400",
    iconBg: "bg-sky-500/10 border-sky-500/20",
  },
];

const DELIVERY_CHANNEL_ITEMS: ToggleMeta[] = [
  {
    key: "emailAlertsEnabled",
    label: "Email Alerts",
    description:
      "Receive important updates and account activity delivered via email.",
    icon: Mail,
    iconColor: "text-rose-400",
    iconBg: "bg-rose-500/10 border-rose-500/20",
  },
  {
    key: "pushNotificationsEnabled",
    label: "Push Notifications",
    description:
      "Real-time browser and mobile app notifications for immediate alerts.",
    icon: Smartphone,
    iconColor: "text-violet-400",
    iconBg: "bg-violet-500/10 border-violet-500/20",
  },
];

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function NotificationsForm({ initialValues }: NotificationsFormProps) {
  const [preferences, setPreferences] = useState<NotificationPreferencesDto>(initialValues);
  const [savingKey, setSavingKey] = useState<ToggleKey | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [, startTransition] = useTransition();

  const handleToggle = (key: ToggleKey) => {
    const nextValue = !preferences[key];
    const previousPreferences = { ...preferences };

    // Optimistic update
    setPreferences((prev) => ({ ...prev, [key]: nextValue }));
    setSavingKey(key);
    setSaveStatus("saving");

    startTransition(async () => {
      const result = await updateNotificationToggleAction({
        field: key,
        value: nextValue,
      });

      setSavingKey(null);

      if (result.success) {
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus((s) => (s === "saved" ? "idle" : s)), 2500);
      } else {
        // Rollback optimistic update
        setPreferences(previousPreferences);
        setSaveStatus("error");
        showError(result.error?.message || "Failed to update notification setting.");
      }
    });
  };

  const renderStatus = () => {
    switch (saveStatus) {
      case "saving":
        return (
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <Loader2 size={12} className="animate-spin" />
            Saving
          </span>
        );
      case "saved":
        return (
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
            <CheckCircle2 size={12} />
            Preferences saved
          </span>
        );
      case "error":
        return (
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-red-400 uppercase tracking-wider">
            <CloudOff size={12} />
            Save failed
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
          Notification Preferences
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Control how and when you receive updates, digests, and reading streak alerts.
        </p>
      </div>

      {/* Main Settings Card */}
      <div className="p-6 bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
        {/* Card Header with live autosave indicator */}
        <div className="flex items-center justify-between pb-4 mb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Notification Channels
            </h3>
          </div>
          {renderStatus()}
        </div>

        {/* Toggles List */}
        <div className="divide-y divide-slate-200/80 dark:divide-slate-800/80">
          {TOGGLE_ITEMS.map((item) => {
            const Icon = item.icon;
            const isEnabled = preferences[item.key];
            const isItemSaving = savingKey === item.key;

            return (
              <div
                key={item.key}
                className="py-5 first:pt-4 last:pb-0 flex items-center justify-between gap-4 group"
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`p-2 rounded-xl border flex-shrink-0 mt-0.5 ${item.iconBg}`}
                  >
                    <Icon size={16} className={item.iconColor} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {item.label}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed max-w-xl">
                      {item.description}
                    </p>
                  </div>
                </div>

                {/* Switch Toggle */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={isEnabled}
                  disabled={isItemSaving}
                  onClick={() => handleToggle(item.key)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 disabled:opacity-50 ${
                    isEnabled ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-700/60"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      isEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Delivery Channels Card */}
      <div className="p-6 bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
        <div className="flex items-center justify-between pb-4 mb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Send size={18} className="text-violet-600 dark:text-violet-400" />
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Delivery Channels
            </h3>
          </div>
          {renderStatus()}
        </div>

        <div className="divide-y divide-slate-200/80 dark:divide-slate-800/80">
          {DELIVERY_CHANNEL_ITEMS.map((item) => {
            const Icon = item.icon;
            const isEnabled = preferences[item.key];
            const isItemSaving = savingKey === item.key;

            return (
              <div
                key={item.key}
                className="py-5 first:pt-4 last:pb-0 flex items-center justify-between gap-4 group"
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`p-2 rounded-xl border flex-shrink-0 mt-0.5 ${item.iconBg}`}
                  >
                    <Icon size={16} className={item.iconColor} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {item.label}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed max-w-xl">
                      {item.description}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={isEnabled}
                  disabled={isItemSaving}
                  onClick={() => handleToggle(item.key)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 disabled:opacity-50 ${
                    isEnabled ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-700/60"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      isEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
