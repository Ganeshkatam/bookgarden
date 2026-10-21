"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { ShieldCheck, Upload, X, Check, Lock, Eye, CloudUpload, AlertTriangle } from "lucide-react";

export interface PhotoUploadConsentModalProps {
  isOpen: boolean;
  file: File | null;
  onConfirm: (file: File) => void;
  onCancel: () => void;
  title?: string;
  isUploading?: boolean;
}

export function PhotoUploadConsentModal({
  isOpen,
  file,
  onConfirm,
  onCancel,
  title = "Photo Upload Permission",
  isUploading = false,
}: PhotoUploadConsentModalProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Create & revoke object preview URL cleanly
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  // Lock body scroll and handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isUploading) {
        onCancel();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onCancel, isUploading]);

  if (!isOpen || !file) return null;

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleAllow = () => {
    if (isUploading) return;
    onConfirm(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-sm bg-[var(--surface-raised)] border border-[var(--border-strong)] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-slate-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="photo-permission-title"
      >
        {/* Top Permission Badge & Close */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-semibold tracking-wide">
            <ShieldCheck size={13} />
            <span>Permission Request</span>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isUploading}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors disabled:opacity-50 cursor-pointer"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 pb-5 space-y-4">
          <div>
            <h3 id="photo-permission-title" className="text-base font-bold text-[var(--text-primary)]">
              {title}
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              BookGarden requires your permission to upload and store this photo.
            </p>
          </div>

          {/* Photo Preview Card */}
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-subtle)]">
            <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-slate-700/60 bg-slate-800 flex items-center justify-center">
              {previewUrl ? (
                <Image
                  src={previewUrl}
                  alt="Selected photo"
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <Upload size={18} className="text-slate-500" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-[var(--text-primary)] truncate" title={file.name}>
                {file.name}
              </p>
              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                <span>{formatFileSize(file.size)}</span>
                <span>•</span>
                <span className="truncate">{file.type || "Image"}</span>
              </div>
            </div>
          </div>

          {/* Permissions Granted Breakdown */}
          <div className="p-3 rounded-xl bg-[var(--surface-overlay)] border border-[var(--border-subtle)] space-y-2">
            <p className="text-[11px] font-semibold text-slate-300">
              Granting permission will allow:
            </p>
            <div className="space-y-1.5 text-[11px] text-slate-400">
              <div className="flex items-start gap-2">
                <CloudUpload size={13} className="text-indigo-400 shrink-0 mt-0.5" />
                <span>Upload and securely store the photo in BookGarden Cloud Storage.</span>
              </div>
              <div className="flex items-start gap-2">
                <Eye size={13} className="text-indigo-400 shrink-0 mt-0.5" />
                <span>Display the image on your profile and associated content.</span>
              </div>
              <div className="flex items-start gap-2">
                <Lock size={13} className="text-indigo-400 shrink-0 mt-0.5" />
                <span>You can remove or replace this photo at any time.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons: Allow / Don't Allow */}
        <div className="grid grid-cols-2 gap-2 p-3 border-t border-[var(--border-subtle)] bg-[var(--surface-overlay)]">
          <button
            type="button"
            onClick={onCancel}
            disabled={isUploading}
            className="w-full py-2.5 px-3 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-[var(--surface-raised)] hover:bg-[var(--surface-sunken)] border border-[var(--border-default)] transition-colors cursor-pointer disabled:opacity-50 text-center"
          >
            Don&apos;t Allow
          </button>
          <button
            type="button"
            onClick={handleAllow}
            disabled={isUploading}
            className="w-full py-2.5 px-3 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-1.5"
          >
            {isUploading ? (
              <span>Uploading...</span>
            ) : (
              <>
                <Check size={14} className="stroke-[2.5]" />
                <span>Allow</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
