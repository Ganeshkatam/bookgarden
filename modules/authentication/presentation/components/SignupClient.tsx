"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import AuthTopBar from "./AuthTopBar";

import { showError, showSuccess } from "@/lib/toast";
import {
  Lock,
  Mail,
  User,
  ArrowRight,
  BookOpen,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  signUpWithPassword,
  signInWithGoogle,
} from "@/modules/authentication/presentation/actions/auth";

const inputCls =
  "w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl px-4 py-3.5 pl-12 focus:outline-none focus:border-indigo-600 dark:focus:border-indigo-400 focus:ring-1 focus:ring-indigo-600/30 transition-all text-sm";
const btnCls =
  "w-full h-[52px] rounded-xl font-semibold text-sm flex items-center justify-center gap-2 group transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-indigo-600 hover:bg-indigo-700 dark:hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 active:scale-[0.99] cursor-pointer";

const Spinner = () => (
  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
);

export default function SignupClient() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      showError("Please enter your name");
      return;
    }

    if (password.length < 6) {
      showError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const res = await signUpWithPassword(
        email.trim().toLowerCase(),
        password,
        name.trim(),
      );

      if (!res.success) {
        showError(res.error.message);
        setLoading(false);
        return;
      }

      if (res.data?.session) {
        showSuccess("Account created successfully!");
        router.push("/discover");
      } else if (res.data?.user) {
        showSuccess("Check your email to verify your account.");
        router.push("/verify-email");
      }
    } catch (error: any) {
      showError(error.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    if (loadingGoogle || loading) return;
    setLoadingGoogle(true);

    const safetyTimer = setTimeout(() => {
      setLoadingGoogle(false);
    }, 8000);

    try {
      const res = await signInWithGoogle("/discover");
      if (!res.success) {
        clearTimeout(safetyTimer);
        showError(res.error.message);
        setLoadingGoogle(false);
        return;
      }
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        clearTimeout(safetyTimer);
        setLoadingGoogle(false);
      }
    } catch (err: any) {
      clearTimeout(safetyTimer);
      showError(err.message || "Failed to start Google sign-up");
      setLoadingGoogle(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--surface-canvas)] flex items-center justify-center p-4 sm:p-8 pt-20 sm:pt-24 pb-12 relative overflow-hidden">
      {/* ── Floating Top Bar (Theme Toggle & Back Home) ── */}
      <AuthTopBar showLogo={true} />

      {/* ── Route-related Grand Library Atrium Backdrop ── */}
      <div className="absolute inset-0 w-full h-full z-0 pointer-events-none">
        <Image
          src="/auth_signup_bg.jpg"
          alt="Grand Library Atrium"
          fill
          className="object-cover object-center opacity-55 dark:opacity-85 transition-opacity duration-500"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-50/60 via-slate-100/45 to-purple-50/40 dark:from-slate-950/75 dark:via-slate-950/65 dark:to-slate-900/50 backdrop-blur-[1px] transition-colors" />
      </div>

      {/* ══════════════════════════════════════
                Centralized Workspace Card
            ══════════════════════════════════════ */}
      <div className="w-full max-w-md lg:max-w-6xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[24px] overflow-hidden flex flex-col lg:flex-row shadow-xl shadow-slate-200/50 dark:shadow-2xl dark:shadow-black/60 relative z-10">
        {/* ── Left Info Pane (60%) ── */}
        <div className="hidden lg:flex w-full lg:w-[60%] bg-slate-50/80 dark:bg-slate-950/60 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 relative p-6 sm:p-8 lg:p-10 flex-col justify-between gap-8 overflow-hidden">
          {/* Soft ambient glow on brand panel */}
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-3 group w-fit relative z-10"
          >
            <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-md shadow-indigo-500/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Image
                src="/logo.png"
                alt="BookGarden Logo"
                width={44}
                height={44}
                className="object-contain p-0.5"
                priority
              />
            </div>
            <div>
              <span className="text-xl font-display font-bold text-slate-900 dark:text-white">
                BookGarden
              </span>
              <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] mt-0.5">
                READ • LEARN • REMEMBER
              </p>
            </div>
          </Link>

          {/* Features & Copy */}
          <div className="space-y-6 relative z-10">
            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl font-display font-bold leading-tight text-slate-900 dark:text-white">
                Discover Books.
                <br />
                <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                  Start Learning.
                </span>
              </h1>
              <p className="text-slate-600 dark:text-slate-300 text-base leading-relaxed max-w-md">
                Build your personal reading list, annotate books as you read,
                and create study cards to remember what matters.
              </p>
            </div>

            {/* Compact Onboarding Mock Card */}
            <div className="relative p-1 w-fit rounded-3xl">
              <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 w-full max-w-sm sm:w-[360px] space-y-4 shadow-lg shadow-slate-200/50 dark:shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="text-slate-900 dark:text-slate-100 text-sm font-bold tracking-wide truncate max-w-[200px]">
                      New Library
                    </h4>
                  </div>
                  <span className="text-xs text-indigo-600 dark:text-indigo-400 font-mono font-semibold">
                    Setup
                  </span>
                </div>

                {/* Animated Setup Goal Indicator */}
                <div className="space-y-1.5">
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative">
                    <div className="absolute top-0 left-0 h-full w-[25%] bg-purple-600 dark:bg-purple-500 rounded-full" />
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                    <span>Library Ready</span>
                    <span>25%</span>
                  </div>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 pt-3.5 space-y-3">
                  {/* Action checklist */}
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                      <span>Quick Start Steps</span>
                    </div>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        <span>Import PDF, EPUB, or Web Articles</span>
                      </li>
                      <li className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        <span>Highlight and extract key ideas</span>
                      </li>
                      <li className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        <span>Build active-recall flashcard decks</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Workflow indicator */}
            <div className="flex items-center gap-2.5 text-xs font-semibold">
              <span className="text-slate-700 dark:text-slate-300">Import</span>
              <span className="text-indigo-600 dark:text-indigo-400">→</span>
              <span className="text-slate-700 dark:text-slate-300">Highlight</span>
              <span className="text-indigo-600 dark:text-indigo-400">→</span>
              <span className="text-slate-700 dark:text-slate-300">Learn</span>
            </div>
          </div>

          {/* Accent border bottom spacer */}
          <div className="w-16 h-1 bg-gradient-to-r from-indigo-500 to-transparent rounded-full" />
        </div>

        {/* ── Right Form Pane (40%) ── */}
        <div className="w-full lg:w-[40%] p-6 sm:p-8 lg:p-10 bg-white dark:bg-slate-900 flex flex-col justify-between relative z-10">
          <div className="space-y-6 w-full mx-auto my-auto">
            {/* Header */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                Create Account
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                Start your learning journey.
              </p>
            </div>

            {/* Email Form */}
            <form onSubmit={handleSignup} className="space-y-4">
              {/* Name Input */}
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                  <User
                    className="text-slate-400 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors"
                    size={18}
                  />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className={inputCls}
                  required
                  disabled={loading}
                />
              </div>

              {/* Email Input */}
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                  <Mail
                    className="text-slate-400 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors"
                    size={18}
                  />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={inputCls}
                  required
                  disabled={loading}
                />
              </div>

              {/* Password Input */}
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                  <Lock
                    className="text-slate-400 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors"
                    size={18}
                  />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className={inputCls}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Submit Button */}
              <button type="submit" disabled={loading} className={btnCls}>
                {loading ? (
                  <Spinner />
                ) : (
                  <>
                    Create Account <ArrowRight size={16} />
                  </>
                )}
              </button>

              {/* Divider */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-medium">or</span>
                </div>
              </div>

              {/* Google Sign Up */}
              <button
                type="button"
                onClick={handleGoogleSignUp}
                disabled={loading || loadingGoogle}
                className="w-full bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 h-[52px] rounded-xl font-semibold text-sm flex items-center justify-center gap-3 transition-all cursor-pointer shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loadingGoogle ? (
                  <div className="w-5 h-5 border-2 border-slate-300 dark:border-slate-600 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin" />
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    <span>Continue with Google</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer sign up & legal links */}
          <div className="space-y-5 mt-8 border-t border-slate-200 dark:border-slate-800 pt-6 text-center">
            <div className="text-slate-600 dark:text-slate-400 text-sm">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold transition-colors"
              >
                Sign in
              </Link>
            </div>

            <div className="flex items-center justify-center gap-3 sm:gap-4 text-xs text-slate-500 dark:text-slate-400">
              <Link href="/privacy" className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                Privacy
              </Link>
              <span>•</span>
              <Link href="/terms" className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                Terms
              </Link>
              <span>•</span>
              <Link href="/security" className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                Security
              </Link>
              <span>•</span>
              <Link href="/contact" className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                Contact
              </Link>
              <span>•</span>
              <Link href="/report" className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                Report
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
