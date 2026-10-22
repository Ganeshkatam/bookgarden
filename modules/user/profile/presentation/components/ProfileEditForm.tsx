"use client";

import { Save, X, Upload, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import {
  uploadFileToStorage,
  deleteFileFromStorage,
} from "@/modules/storage/presentation/actions/storage";
import { showError, showSuccess } from "@/lib/toast";
import Image from "next/image";
import { updateProfileAction } from "../actions/profile";
import { PhotoUploadConsentModal } from "@/shared/ui/PhotoUploadConsentModal";
import { usePhotoUploadPermission } from "@/shared/hooks/usePhotoUploadPermission";

interface ProfileEditFormProps {
  profile: any;
  userEmail: string;
}

export function ProfileEditForm({ profile, userEmail }: ProfileEditFormProps) {
  const [formData, setFormData] = useState({
    displayName: profile.displayName || "",
    biography: profile.biography || "",
    location: profile.location || "",
    avatarUrl: profile.avatarUrl || "",
  });

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const {
    pendingFile: pendingAvatarFile,
    requestPhotoUpload,
    handleAllow: handleConfirmAvatarUpload,
    handleDeny: handleCancelAvatarUpload,
  } = usePhotoUploadPermission();
  const [isPending, startTransition] = useTransition();

  const performAvatarUpload = async (file: File) => {
    setUploadingAvatar(true);
    try {
      const oldAvatarUrl = formData.avatarUrl;
      const formDataUpload = new FormData();
      formDataUpload.append("file", file);

      const res = await uploadFileToStorage("avatars", formDataUpload);
      if (res.success && res.data?.url) {
        setFormData({ ...formData, avatarUrl: res.data.url });
        if (oldAvatarUrl && oldAvatarUrl !== res.data.url) {
          await deleteFileFromStorage("avatars", oldAvatarUrl);
        }
        showSuccess("Avatar uploaded successfully");
      } else if (!res.success) {
        showError(res.error.message || "Failed to upload avatar");
      }
    } catch (err: any) {
      showError(err.message || "Failed to upload avatar");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showError("Image must be smaller than 5MB");
      return;
    }

    requestPhotoUpload(file, performAvatarUpload);
  };

  const handleSave = () => {
    startTransition(async () => {
      const res = await updateProfileAction({
        displayName: formData.displayName,
        bio: formData.biography || null,
        location: formData.location || null,
      });
      if (res.success) {
        showSuccess("Profile updated successfully");
      } else {
        showError(res.error?.message || "Failed to update profile");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Basic Info */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1 uppercase tracking-wider">
              Display Name
            </label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) =>
                setFormData({ ...formData, displayName: e.target.value })
              }
              className="w-full bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl px-4 py-2.5 text-sm font-medium text-slate-50 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1 uppercase tracking-wider">
              Email (Read-only)
            </label>
            <input
              type="email"
              value={userEmail || ""}
              disabled
              className="w-full bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl px-4 py-2.5 text-sm font-medium text-slate-400 opacity-60 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1 uppercase tracking-wider">
              Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) =>
                setFormData({ ...formData, location: e.target.value })
              }
              placeholder="City, Country"
              className="w-full bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl px-4 py-2.5 text-sm font-medium text-slate-50 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>
        </div>

        {/* Bio & Avatar */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1 uppercase tracking-wider">
              Profile Avatar
            </label>
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-[var(--surface-raised)] border border-[var(--border-strong)] shrink-0">
                {formData.avatarUrl ? (
                  <Image
                    src={formData.avatarUrl}
                    alt="Avatar"
                    fill
                    className="object-cover"
                    unoptimized
                    priority
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold text-xl">
                    {formData.displayName?.[0]?.toUpperCase() || "?"}
                  </div>
                )}
              </div>
              <label
                className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer border ${uploadingAvatar ? "bg-[var(--surface-overlay)] text-indigo-400 border-[var(--border-strong)]" : "bg-[var(--surface-raised)] text-slate-200 border-[var(--border-default)] hover:bg-[var(--surface-overlay)] hover:border-slate-500"}`}
              >
                {uploadingAvatar ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Upload size={16} />
                )}
                {uploadingAvatar ? "Uploading..." : "Change Avatar"}
                <input
                  type="file"
                  accept="image/jpeg, image/png, image/webp"
                  className="hidden"
                  onChange={handleAvatarSelect}
                  disabled={uploadingAvatar}
                />
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1 uppercase tracking-wider">
              Biography
            </label>
            <textarea
              value={formData.biography}
              onChange={(e) =>
                setFormData({ ...formData, biography: e.target.value })
              }
              rows={3}
              placeholder="Tell us a little about yourself..."
              className="w-full bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl px-4 py-2.5 text-sm font-medium text-slate-50 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-6 border-t border-[var(--border-default)]">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="px-6 py-2.5 text-sm font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
        >
          {isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Save size={16} />
          )}
          {isPending ? "Saving..." : "Save Changes"}
        </button>
      </div>

      <PhotoUploadConsentModal
        isOpen={!!pendingAvatarFile}
        file={pendingAvatarFile}
        onConfirm={handleConfirmAvatarUpload}
        onCancel={handleCancelAvatarUpload}
        isUploading={uploadingAvatar}
        title="Profile Photo Permission"
      />
    </div>
  );
}
