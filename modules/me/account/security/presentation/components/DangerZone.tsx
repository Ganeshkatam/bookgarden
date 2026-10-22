"use client";

import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { showError } from "@/lib/toast";
import { deleteAccountAction } from "../actions/security";

const DELETION_CONFIRMATION = "DELETE MY ACCOUNT";

export function DangerZone({ userId }: { userId: string }) {
  const [confirmation, setConfirmation] = useState("");
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = () => {
    if (confirmation !== DELETION_CONFIRMATION) {
      showError(`Please type "${DELETION_CONFIRMATION}" to confirm`);
      return;
    }

    startTransition(async () => {
      const res = await deleteAccountAction({
        userId,
        confirmationText: confirmation,
      });
      if (res.success) {
        // Redirect will happen automatically if auth state changes, or we can force it
        window.location.href = "/";
      } else {
        showError(res.error?.message || "Failed to delete account");
      }
    });
  };

  return (
    <div className="p-6 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-2xl shadow-xs space-y-4">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-rose-200 dark:border-rose-900/40">
        <AlertTriangle size={18} className="text-rose-600 dark:text-rose-400" />
        <h3 className="text-xs sm:text-sm font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
          Danger Zone
        </h3>
      </div>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="flex-1">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Delete Account</h4>
          <p className="text-xs text-slate-600 dark:text-rose-300/80 mt-1 max-w-lg leading-relaxed">
            Once you delete your account, there is no going back. Please be
            certain. All your reading progress, notes, highlights, and personal
            library will be permanently removed from our servers.
          </p>

          {showConfirm && (
            <div className="mt-4 p-4 bg-white dark:bg-slate-950 rounded-xl border border-rose-200 dark:border-rose-900/30 shadow-xs">
              <label className="block text-xs font-bold text-rose-700 dark:text-rose-400 mb-2">
                Type{" "}
                <span className="text-slate-900 dark:text-white select-all bg-rose-100 dark:bg-rose-500/20 px-1.5 py-0.5 rounded font-mono font-bold">
                  {DELETION_CONFIRMATION}
                </span>{" "}
                to confirm
              </label>
              <input
                type="text"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-rose-300 dark:border-rose-900/50 rounded-xl px-4 py-2 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all mb-3"
                placeholder={DELETION_CONFIRMATION}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  disabled={isPending || confirmation !== DELETION_CONFIRMATION}
                  className="flex-1 py-2 text-xs font-bold bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition-all disabled:opacity-50 disabled:bg-rose-900/50 flex items-center justify-center gap-2 uppercase tracking-wider cursor-pointer"
                >
                  {isPending ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Trash2 size={15} />
                  )}
                  Permanently Delete
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  disabled={isPending}
                  className="px-4 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-all uppercase tracking-wider cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {!showConfirm && (
          <button
            onClick={() => setShowConfirm(true)}
            className="shrink-0 px-5 py-2.5 text-xs font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-600 hover:text-white hover:border-rose-600 rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 uppercase tracking-wider cursor-pointer"
          >
            <Trash2 size={15} />
            Delete Account
          </button>
        )}
      </div>
    </div>
  );
}
