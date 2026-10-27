"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import AuthTopBar from "./AuthTopBar";
import { getSafeRedirectUrl } from "@/shared/core/utils/redirect";
import {
  loginWithPassword,
  signInWithGoogle,
  sendMagicLinkServer,
  verifyMagicLinkServer,
} from "@/modules/authentication/presentation/actions/auth";
import { showError, showSuccess } from "@/lib/toast";
import {
  Lock,
  Mail,
  Smartphone,
  ArrowRight,
  ChevronDown,
  Sparkles,
  BookOpen,
  Eye,
  EyeOff,
} from "lucide-react";

const COUNTRY_CODES = [
  { code: "+91", country: "India" },
  { code: "+1", country: "USA" },
  { code: "+44", country: "UK" },
  { code: "+86", country: "China" },
  { code: "+81", country: "Japan" },
  { code: "+49", country: "Germany" },
  { code: "+33", country: "France" },
  { code: "+61", country: "Australia" },
  { code: "+971", country: "UAE" },
  { code: "+65", country: "Singapore" },
];

/* ──────────────────────────────────────────
   Shared input class
────────────────────────────────────────── */
const inputCls =
  "w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl px-4 py-3.5 pl-12 focus:outline-none focus:border-indigo-600 dark:focus:border-indigo-400 focus:ring-1 focus:ring-indigo-600/30 transition-all text-sm";
const btnCls =
  "w-full h-[52px] rounded-xl font-semibold text-sm flex items-center justify-center gap-2 group transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-indigo-600 hover:bg-indigo-700 dark:hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 active:scale-[0.99] cursor-pointer";

/* ──────────────────────────────────────────
   Spinner
────────────────────────────────────────── */
const Spinner = () => (
  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
);

/* ══════════════════════════════════════════
   Main Component
══════════════════════════════════════════ */
export default function EnhancedLoginPage() {
  const [input, setInput] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [step, setStep] = useState<"input" | "password" | "otp" | "magic-link-sent">(
    "input",
  );
  const [authMode, setAuthMode] = useState<"password" | "magic">("password");
  const [otp, setOtp] = useState("");
  const [isPhone, setIsPhone] = useState(false);
  const [countryCode, setCountryCode] = useState("+91");
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = getSafeRedirectUrl(searchParams.get("redirectTo"));
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  /* ── helpers ── */
  const detectInputType = (value: string): "email" | "phone" | "unknown" => {
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "email";
    if (/^\d{10,15}$/.test(value) || /^\+\d{10,15}$/.test(value))
      return "phone";
    return "unknown";
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    setIsPhone(detectInputType(value) === "phone");
  };

  /* ── auth handlers ── */
  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (detectInputType(input) === "unknown") {
      showError("Please enter a valid email or phone number");
      return;
    }
    if (authMode === "magic") {
      await handleMagicLinkLogin(e);
    } else {
      setStep("password");
    }
  };

  const handleMagicLinkLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let id = input;
      if (isPhone) {
        const c = input.replace(/[\s-]/g, "");
        id = c.startsWith("+") ? c : `${countryCode}${c}`;
      }
      const res = await sendMagicLinkServer(id, isPhone);

      if (!res.success) {
        showError(res.error.message);
        return;
      }

      showSuccess(
        isPhone ? "SMS code sent!" : "Magic link sent to your email!",
      );
      
      if (isPhone) {
        setResendTimer(90);
        setStep("otp");
      } else {
        sessionStorage.setItem("bookgarden_pending_email", id);
        router.push("/verify-email");
      }
    } catch (err: any) {
      showError(err.message || "Failed to send verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setLoading(true);
    try {
      let id = input;
      if (isPhone) {
        const c = input.replace(/[\s-]/g, "");
        id = c.startsWith("+") ? c : `${countryCode}${c}`;
      }
      const res = await sendMagicLinkServer(id, isPhone);
      if (!res.success) {
        showError(res.error.message);
        return;
      }
      showSuccess(isPhone ? "SMS code resent!" : "Magic link resent!");
      setResendTimer(90);
    } catch (err: any) {
      showError(err.message || "Failed to resend");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let id = input;
      if (isPhone) {
        const c = input.replace(/[\s-]/g, "");
        id = c.startsWith("+") ? c : `${countryCode}${c}`;
      }
      const res = await loginWithPassword(id, password, isPhone);

      if (!res.success) {
        showError(res.error.message);
        setLoading(false);
        return;
      }

      showSuccess("Logged in successfully!");
      router.push(redirectTo);
    } catch (err: any) {
      showError(err.message || "Invalid password");
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const id = isPhone ? `${countryCode}${input}` : input;
      const res = await verifyMagicLinkServer(id, otp, isPhone);

      if (!res.success) {
        showError(res.error.message);
        setLoading(false);
        return;
      }

      showSuccess("Verified! Logging in...");
      router.push(redirectTo);
    } catch (err: any) {
      showError(err.message || "Invalid code");
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (loadingGoogle || loading) return;
    setLoadingGoogle(true);

    const safetyTimer = setTimeout(() => {
      setLoadingGoogle(false);
    }, 8000);

    try {
      const res = await signInWithGoogle(redirectTo);
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
      showError(err.message || "Failed to start Google sign-in");
      setLoadingGoogle(false);
    }
  };

  /* ══════════════════════════════════════════
       Centralized Workspace Card
    ══════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-[var(--surface-canvas)] flex items-center justify-center p-4 sm:p-8 pt-20 sm:pt-24 pb-12 relative overflow-hidden">
      {/* ── Floating Top Bar (Theme Toggle & Back Home) ── */}
      <AuthTopBar showLogo={true} />

      {/* ── Route-related Background Sanctuary Backdrop ── */}
      <div className="absolute inset-0 w-full h-full z-0 pointer-events-none">
        <Image
          src="/auth_login_bg.jpg"
          alt="Library Sanctuary"
          fill
          className="object-cover object-center opacity-55 dark:opacity-85 transition-opacity duration-500"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-50/60 via-slate-100/45 to-indigo-50/40 dark:from-slate-950/75 dark:via-slate-950/65 dark:to-slate-900/50 backdrop-blur-[1px] transition-colors" />
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
                Read Smarter.
                <br />
                <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                  Remember More.
                </span>
              </h1>
              <p className="text-slate-600 dark:text-slate-300 text-base leading-relaxed max-w-md">
                Access your library, notes, highlights, and study plans in one
                unified space.
              </p>
            </div>

            {/* Mock Reader Workspace Card */}
            <div className="relative p-1 w-fit rounded-3xl">
              <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 w-full max-w-sm sm:w-[360px] space-y-4 shadow-lg shadow-slate-200/50 dark:shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="text-slate-900 dark:text-slate-100 text-sm font-bold tracking-wide truncate max-w-[200px]">
                      Algorithms
                    </h4>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono font-medium">
                    Page 143
                  </span>
                </div>

                {/* Animated Progress Bar */}
                <div className="space-y-1.5">
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative">
                    <div className="absolute top-0 left-0 h-full w-[72%] bg-indigo-600 dark:bg-indigo-500 rounded-full" />
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                    <span>Progress</span>
                    <span>72%</span>
                  </div>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 pt-3.5 space-y-3">
                  {/* Highlight snippet */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                      <span>Highlight</span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 italic pl-3 border-l-2 border-amber-500/60 leading-relaxed">
                      &quot;Graph traversal algorithms like DFS and BFS form the
                      foundation...&quot;
                    </p>
                  </div>

                  {/* Note snippet */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                      <span>Note</span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 pl-3 border-l-2 border-indigo-500/60 leading-relaxed">
                      Remember: DFS uses a stack, BFS uses a queue.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Workflow indicator */}
            <div className="flex items-center gap-2.5 text-xs font-semibold">
              <span className="text-slate-700 dark:text-slate-300">Read</span>
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
                Welcome Back
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                Continue where you left off.
              </p>
            </div>

            {/* Auth mode segmented control */}
            {step === "input" && (
              <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl relative border border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setAuthMode("password")}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${authMode === "password"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-slate-700"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  type="button"
                >
                  Password
                </button>
                <button
                  onClick={() => setAuthMode("magic")}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${authMode === "magic"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-slate-700"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  type="button"
                >
                  <Sparkles size={13} className="text-amber-500" /> Magic Link
                </button>
              </div>
            )}

            {/* ── STEP: input ── */}
            {step === "input" && (
              <form onSubmit={handleContinue} className="space-y-4">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                    {isPhone ? (
                      <Smartphone
                        className="text-slate-400 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors"
                        size={18}
                      />
                    ) : (
                      <Mail
                        className="text-slate-400 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors"
                        size={18}
                      />
                    )}
                  </div>
                  <div className="flex">
                    {isPhone && (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() =>
                            setShowCountryDropdown(!showCountryDropdown)
                          }
                          className="h-full px-3 bg-slate-100 dark:bg-slate-800 border-y border-l border-slate-300 dark:border-slate-700 rounded-l-xl text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-1 text-sm transition-colors cursor-pointer"
                        >
                          <span>{countryCode}</span>
                          <ChevronDown size={12} />
                        </button>
                        {showCountryDropdown && (
                          <div className="absolute top-full left-0 mt-1 w-60 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 max-h-56 overflow-y-auto">
                            {COUNTRY_CODES.map((c) => (
                              <button
                                key={c.code}
                                type="button"
                                onClick={() => {
                                  setCountryCode(c.code);
                                  setShowCountryDropdown(false);
                                }}
                                className="w-full px-4 py-2.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-3 transition-colors text-sm cursor-pointer"
                              >
                                <span className="font-semibold text-slate-900 dark:text-white">
                                  {c.code}
                                </span>
                                <span className="text-slate-600 dark:text-slate-300">
                                  {c.country}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    <input
                      type={isPhone ? "tel" : "text"}
                      value={input}
                      onChange={(e) => handleInputChange(e.target.value)}
                      className={`${inputCls} ${isPhone ? "rounded-r-xl border-l-0 pl-4" : ""}`}
                      placeholder={isPhone ? "Phone number" : "Email or phone"}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !input}
                  className={btnCls}
                >
                  {loading ? (
                    <Spinner />
                  ) : (
                    <>
                      {authMode === "password" ? "Continue" : "Send Magic Link"}{" "}
                      <ArrowRight
                        size={16}
                        className="group-hover:translate-x-0.5 transition-transform"
                      />
                    </>
                  )}
                </button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-3 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-medium">
                      or
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
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
            )}

            {/* ── STEP: password ── */}
            {step === "password" && (
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                      {input.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide font-medium">
                        Signing in as
                      </p>
                      <p className="text-slate-900 dark:text-white text-sm font-semibold">
                        {input}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setStep("input");
                      setPassword("");
                    }}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
                  >
                    Change
                  </button>
                </div>

                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock
                      className="text-slate-400 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors"
                      size={18}
                    />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputCls}
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <div className="flex justify-end">
                  <Link
                    href="/forgot-password"
                    className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 transition-colors font-medium"
                  >
                    Forgot password?
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={loading || !password}
                  className={btnCls}
                >
                  {loading ? (
                    <Spinner />
                  ) : (
                    <>
                      Resume Reading <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* ── STEP: OTP ── */}
            {step === "otp" && (
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div className="text-center">
                  <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Mail className="text-indigo-600 dark:text-indigo-400" size={26} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                    Check your inbox
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">
                    Magic code sent to{" "}
                    <span className="text-slate-900 dark:text-white font-semibold">{input}</span>
                  </p>
                </div>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-center text-2xl tracking-widest px-4 py-3.5 rounded-xl focus:outline-none focus:border-indigo-600 dark:focus:border-indigo-400 focus:ring-1 focus:ring-indigo-600/30 transition-all font-mono"
                  placeholder="000000"
                  maxLength={6}
                  required
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className={btnCls}
                >
                  {loading ? <Spinner /> : "Verify & Sign In"}
                </button>
                <div className="flex items-center justify-between mt-4">
                  <button
                    type="button"
                    onClick={() => setStep("input")}
                    className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer font-medium"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendTimer > 0 || loading}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:no-underline"
                  >
                    {resendTimer > 0 ? `Resend code in ${resendTimer}s` : "Resend code"}
                  </button>
                </div>
              </form>
            )}

            {/* ── STEP: MAGIC LINK SENT ── */}
            {step === "magic-link-sent" && (
              <div className="space-y-5 text-center py-6">
                <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Mail className="text-indigo-600 dark:text-indigo-400" size={32} />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                  Check your email
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm max-w-[280px] mx-auto leading-relaxed">
                  We&apos;ve sent a magic link to <span className="text-slate-900 dark:text-white font-semibold">{input}</span>. Click the link to instantly log in.
                </p>
                <div className="pt-4 space-y-4">
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendTimer > 0 || loading}
                    className="text-sm w-full h-[52px] rounded-xl font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resendTimer > 0 ? `Resend link in ${resendTimer}s` : "Resend magic link"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep("input")}
                    className={btnCls}
                  >
                    Back to login
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer sign up & legal links */}
          <div className="space-y-5 mt-8 border-t border-slate-200 dark:border-slate-800 pt-6 text-center">
            <div className="text-slate-600 dark:text-slate-400 text-sm">
              New to BookGarden?{" "}
              <Link
                href="/signup"
                className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold transition-colors"
              >
                Create a free account
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
