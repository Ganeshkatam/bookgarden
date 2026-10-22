"use client";

import { ShieldAlert, LogOut, Loader2 } from "lucide-react";
import { useTransition } from "react";
import { showError, showSuccess } from "@/lib/toast";
import { signOutAllDevicesAction } from "../actions/security";

export function SignOutSection() {
  const [isPending, startTransition] = useTransition();

  const handleSignOutAll = () => {
    startTransition(async () => {
      const res = await signOutAllDevicesAction({});
      if (res.success) {
        showSuccess("Signed out of all other sessions");
      } else {
        showError(res.error?.message || "Failed to sign out of other sessions");
      }
    });
  };

  return (
    <div className="p-6 bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-4">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <ShieldAlert size={18} className="text-amber-500 dark:text-amber-400" />
        <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          Session Security
        </h3>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            Sign Out Everywhere
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md leading-relaxed">
            Lost a device or noticed suspicious activity? Sign out of all other
            active sessions across all devices. Your current session will remain
            active.
          </p>
        </div>

        <button
          onClick={handleSignOutAll}
          disabled={isPending}
          className="shrink-0 px-5 py-2.5 text-xs font-bold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 hover:bg-amber-100 dark:hover:bg-amber-500/20 rounded-xl transition-all shadow-xs disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-wider cursor-pointer"
        >
          {isPending ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <LogOut size={15} />
          )}
          Sign Out All Devices
        </button>
      </div>
    </div>
  );
}
