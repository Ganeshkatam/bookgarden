"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  User,
  LogOut,
  LayoutDashboard,
  Bookmark,
  Bell,
  Shield,
  Sliders,
  HardDrive,
  Sparkles,
  FileText,
  MessageSquare,
} from "lucide-react";
import { logOut } from "@/modules/authentication/presentation/actions/auth";

export interface UserMenuProps {
  user: {
    name?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
  };
}

export function UserMenu({ user }: UserMenuProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const getInitials = () => {
    if (user.name) {
      const parts = user.name.split(" ");
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return user.name.slice(0, 2).toUpperCase();
    }
    return "TS";
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await logOut();
    router.push("/");
    router.refresh();
  };

  return (
    <div ref={menuRef} className="relative inline-block text-left">
      {/* Avatar Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center w-10 h-10 rounded-full overflow-hidden bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 text-white font-bold text-sm shadow-md border-2 border-indigo-400/40 hover:border-indigo-300 hover:scale-105 active:scale-95 transition-all cursor-pointer group"
        title="Account menu"
        aria-label="Account menu"
        aria-expanded={isOpen}
      >
        {user.avatarUrl && !avatarError ? (
          <Image
            src={user.avatarUrl}
            alt={user.name || "User avatar"}
            className="object-cover rounded-full"
            fill
            sizes="40px"
            priority
            onError={() => setAvatarError(true)}
          />
        ) : (
          <span className="group-hover:scale-110 transition-transform">
            {getInitials()}
          </span>
        )}
      </button>

      {/* Rich Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-64 sm:w-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xl shadow-slate-900/20 py-2 z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md">
          {/* User Profile Header Card */}
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold text-sm flex items-center justify-center shrink-0 border border-indigo-400/30">
                {user.avatarUrl && !avatarError ? (
                  <Image
                    src={user.avatarUrl}
                    alt={user.name || "Avatar"}
                    className="object-cover"
                    fill
                    sizes="40px"
                    loading="eager"
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  getInitials()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {user.name || "BookGarden Reader"}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {user.email || "reader@bookgarden.tomesphere.in"}
                </p>
              </div>
            </div>
          </div>

          {/* Reading Workspace Section */}
          <div className="px-2 py-1.5 border-b border-slate-100 dark:border-slate-800/80">
            <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Workspace
            </p>
            <Link
              href="/me/dashboard"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              <LayoutDashboard size={16} className="text-indigo-500" />
              <span>Reading Dashboard</span>
            </Link>
            <Link
              href="/me/library"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              <Bookmark size={16} className="text-purple-500" />
              <span>My Library</span>
            </Link>
            <Link
              href="/me/shelves"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              <Sparkles size={16} className="text-teal-500" />
              <span>My Shelves</span>
            </Link>
            <Link
              href="/me/notes"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              <FileText size={16} className="text-amber-500" />
              <span>My Notes</span>
            </Link>
            <Link
              href="/me/annotations"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              <MessageSquare size={16} className="text-blue-500" />
              <span>My Annotations</span>
            </Link>
          </div>

          {/* Account & Settings Section */}
          <div className="px-2 py-1.5 border-b border-slate-100 dark:border-slate-800/80">
            <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Account & Preferences
            </p>
            <Link
              href="/me/account/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              <User size={16} className="text-slate-400 dark:text-slate-500" />
              <span>Profile Details</span>
            </Link>
            <Link
              href="/me/account/preferences"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              <Sliders size={16} className="text-slate-400 dark:text-slate-500" />
              <span>Reading Preferences</span>
            </Link>
            <Link
              href="/me/account/notifications"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              <Bell size={16} className="text-slate-400 dark:text-slate-500" />
              <span>Notifications</span>
            </Link>
            <Link
              href="/me/account/security"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              <Shield size={16} className="text-slate-400 dark:text-slate-500" />
              <span>Security & Password</span>
            </Link>
            <Link
              href="/me/account/storage"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              <HardDrive size={16} className="text-slate-400 dark:text-slate-500" />
              <span>Offline Storage & Data</span>
            </Link>
          </div>

          {/* Sign Out Section */}
          <div className="px-2 pt-1.5 pb-1">
            <button
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer disabled:opacity-50"
            >
              <LogOut size={16} />
              <span>{isSigningOut ? "Signing Out..." : "Sign Out"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
