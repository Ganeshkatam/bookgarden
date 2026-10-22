"use server";

import { createHash } from "crypto";
import { createSupabaseServerClient } from "@/shared/core/database/server";
import { SupabaseRateLimiter } from "@/modules/security/infrastructure/SupabaseRateLimiter";
import { PostgresAuditLogger } from "@/modules/security/infrastructure/PostgresAuditLogger";
import { SecurityAction } from "@/shared/kernel/security/SecurityAction";
import { headers } from "next/headers";
import type { User } from "@supabase/supabase-js";

// ─── Security Constants ─────────────────────────────────────

const MAX_LOGIN_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS || "5", 10);
const RATE_LIMIT_WINDOW_MS = parseInt(
  process.env.RATE_LIMIT_WINDOW_MS || "900000",
  10,
); // 15 minutes
const LOCKOUT_DURATION_MS = parseInt(
  process.env.LOCKOUT_DURATION_MS || "3600000",
  10,
); // 1 hour

/**
 * Extract audit context from the incoming request headers.
 */
async function getAuditContext(userId?: string) {
  const hdrs = await headers();
  const rawIp =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    hdrs.get("x-real-ip") ||
    null;

  return {
    actorId: userId || null,
    ipAddress: rawIp,
    userAgent: hdrs.get("user-agent") || null,
  };
}

// ─── Session Helpers ─────────────────────────────────────────

export async function getAuthStatus(): Promise<{ isLoggedIn: boolean }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return { isLoggedIn: !!session };
}

export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function logOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();

  // Get user before signing out for audit logging
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);

  // Audit log
  if (user) {
    const auditLogger = new PostgresAuditLogger(supabase);
    const context = await getAuditContext(user.id);
    await auditLogger.logAction(SecurityAction.Logout, context);
  }
}

import { ServerActionResult } from "@/lib/actions/action-result";

// ─── Rate Limiting Helpers ─────────────────────────────────────

/**
 * Constructs an account-specific rate-limit key.
 * Trims whitespace and normalizes case/formatting to prevent trivial bypass.
 * Hashes the identifier with SHA-256 to avoid persisting raw PII in database state tables.
 */
export function buildRateLimitKey(identifier: string, isPhone: boolean): string {
  const normalized = isPhone
    ? identifier.trim().replace(/[^\d+]/g, "")
    : identifier.trim().toLowerCase();
  const hash = createHash("sha256").update(normalized).digest("hex");
  return `login:account:${hash}`;
}

// ─── Authentication ────────────────────────────────────────────

export async function loginWithPassword(
  emailOrPhone: string,
  password: string,
  isPhone: boolean,
): Promise<ServerActionResult<void>> {
  try {
    if (
      !emailOrPhone ||
      typeof emailOrPhone !== "string" ||
      !password ||
      typeof password !== "string"
    ) {
      return {
        success: false,
        error: { message: "Invalid credentials. Please check your email and password." },
      };
    }

    const supabase = await createSupabaseServerClient();
    const rateLimiter = new SupabaseRateLimiter(supabase);
    const auditLogger = new PostgresAuditLogger(supabase);
    const context = await getAuditContext();

    const rateLimitKey = buildRateLimitKey(emailOrPhone, isPhone);

    // Atomically consume attempt BEFORE invoking Supabase Auth.
    // Under concurrency, this guarantees that requests exceeding max attempts are
    // serialized and rejected at the database row-lock gate before hitting Supabase Auth.
    const rateCheck = await rateLimiter.consume(
      rateLimitKey,
      MAX_LOGIN_ATTEMPTS,
      RATE_LIMIT_WINDOW_MS,
      LOCKOUT_DURATION_MS,
    );

    if (!rateCheck.allowed) {
      const retryMinutes = Math.ceil(
        (rateCheck.retryAfterMs || LOCKOUT_DURATION_MS) / 60000,
      );
      await auditLogger.logAction(SecurityAction.AccountLocked, context, {
        email: emailOrPhone,
        reason: "rate_limit_exceeded",
      });
      return {
        success: false,
        error: {
          message: `Too many login attempts. Please try again in ${retryMinutes} minutes.`,
        },
      };
    }

    const signInResult = isPhone
      ? await supabase.auth.signInWithPassword({
          phone: emailOrPhone.trim(),
          password,
        })
      : await supabase.auth.signInWithPassword({
          email: emailOrPhone.trim().toLowerCase(),
          password,
        });

    if (signInResult.error) {
      if (rateCheck.remaining === 0) {
        await auditLogger.logAction(SecurityAction.AccountLocked, context, {
          email: emailOrPhone,
          reason: "max_attempts_reached",
        });
      }
      await auditLogger.logAction(SecurityAction.LoginFailed, context, {
        email: emailOrPhone,
        remaining: rateCheck.remaining,
      });
      return {
        success: false,
        error: {
          message: "Invalid credentials. Please check your email and password.",
        },
      };
    }

    const userId = signInResult.data.user?.id;
    // On authentication success, reset the rate-limit failure counter so legitimate
    // logins do not consume failure budget.
    await rateLimiter.reset(rateLimitKey);
    await auditLogger.logAction(
      SecurityAction.LoginSuccess,
      { ...context, actorId: userId || context.actorId },
      { email: emailOrPhone },
    );

    return { success: true, data: undefined };
  } catch (error: any) {
    return {
      success: false,
      error: { message: error.message || "An unexpected error occurred" },
    };
  }
}

export async function signUpWithPassword(
  email: string,
  password: string,
  displayName: string,
): Promise<ServerActionResult<{ user: any; session?: any }>> {
  try {
    const supabase = await createSupabaseServerClient();
    const hdrs = await headers();
    const host =
      hdrs.get("x-forwarded-host") || hdrs.get("host") || "localhost:3000";
    const protocol =
      hdrs.get("x-forwarded-proto") ||
      (host.includes("localhost") ? "http" : "https");
    const origin = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
        },
        emailRedirectTo: `${origin}/auth/callback`,
      },
    });

    if (error) {
      if (
        error.message.toLowerCase().includes("already registered") ||
        error.message.toLowerCase().includes("user already exists")
      ) {
        return {
          success: false,
          error: {
            message: "This email is already registered. Try signing in.",
          },
        };
      }
      return { success: false, error: { message: error.message } };
    }

    if (
      data.user &&
      Array.isArray(data.user.identities) &&
      data.user.identities.length === 0
    ) {
      return {
        success: false,
        error: {
          message:
            "An account with this email already exists. Please sign in instead.",
        },
      };
    }

    return {
      success: true,
      data: { user: data.user, session: data.session },
    };
  } catch (error: any) {
    return {
      success: false,
      error: { message: error.message || "An unexpected error occurred. Please try Again!" },
    };
  }
}

export async function signInWithGoogle(
  redirectTo?: string,
): Promise<ServerActionResult<{ url: string }>> {
  try {
    const supabase = await createSupabaseServerClient();
    const hdrs = await headers();
    const host =
      hdrs.get("x-forwarded-host") || hdrs.get("host") || "localhost:3000";
    const protocol =
      hdrs.get("x-forwarded-proto") ||
      (host.includes("localhost") ? "http" : "https");
    const origin = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;
    const callbackUrl = `${origin}/auth/callback${
      redirectTo ? `?next=${encodeURIComponent(redirectTo)}` : ""
    }`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error) {
      return { success: false, error: { message: error.message } };
    }

    if (data?.url) {
      return { success: true, data: { url: data.url } };
    }

    return {
      success: false,
      error: { message: "Failed to generate Google Sign-In URL" },
    };
  } catch (error: any) {
    return {
      success: false,
      error: { message: error.message || "An unexpected error occurred. Please try Again!!" },
    };
  }
}

export async function sendMagicLinkServer(
  emailOrPhone: string,
  isPhone: boolean,
): Promise<ServerActionResult<void>> {
  try {
    const supabase = await createSupabaseServerClient();
    const result = isPhone
      ? await supabase.auth.signInWithOtp({ phone: emailOrPhone })
      : await supabase.auth.signInWithOtp({
          email: emailOrPhone,
          options: {
            shouldCreateUser: false,
            emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
          },
        });

    if (result.error) {
      console.error("[sendMagicLinkServer] OTP Error:", result.error);
      return {
        success: false,
        error: {
          message: result.error.message || "Failed to send verification code. Please try again!!",
        },
      };
    }

    return { success: true, data: undefined };
  } catch (error: any) {
    return {
      success: false,
      error: { message: error.message || "An unexpected error occurred.Please try again." },
    };
  }
}

export async function verifyTokenHashServer(
  tokenHash: string,
  type?: any, // "magiclink" | "signup" | "invite" | "recovery" | "email_change" | "email"
): Promise<ServerActionResult<void>> {
  try {
    const supabase = await createSupabaseServerClient();
    const cleanToken = tokenHash?.trim();
    if (!cleanToken) {
      return { success: false, error: { message: "Invalid or missing verification token." } };
    }

    // 1. If it's a PKCE authorization code (starts with pkce_ or code-like structure)
    if (cleanToken.startsWith("pkce_") || cleanToken.length < 50) {
      const { error: codeErr } = await supabase.auth.exchangeCodeForSession(cleanToken);
      if (!codeErr) {
        return { success: true, data: undefined };
      }
    }

    // 2. Try verifyOtp with the provided type or clean default
    const primaryType = type && typeof type === "string" && type.trim() !== "" ? type.trim() : null;
    const typesToTry: string[] = primaryType
      ? [primaryType, "magiclink", "email", "signup", "recovery", "invite"]
      : ["magiclink", "email", "signup", "recovery", "invite"];

    let lastError: any = null;
    for (const t of typesToTry) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: cleanToken,
        type: t as any,
      });
      if (!error) {
        return { success: true, data: undefined };
      }
      lastError = error;
    }

    // 3. Fallback: try exchangeCodeForSession in case token was an authorization code
    const { error: fallbackCodeErr } = await supabase.auth.exchangeCodeForSession(cleanToken);
    if (!fallbackCodeErr) {
      return { success: true, data: undefined };
    }

    console.error("[verifyTokenHashServer] Verify Error:", lastError || fallbackCodeErr);
    return {
      success: false,
      error: { message: lastError?.message || "Invalid or expired link. Please request a new one." },
    };
  } catch (error: any) {
    return {
      success: false,
      error: { message: error.message || "An unexpected error occurred. Please try again." },
    };
  }
}


export async function verifyMagicLinkServer(
  emailOrPhone: string,
  token: string,
  isPhone: boolean,
): Promise<ServerActionResult<void>> {
  try {
    const supabase = await createSupabaseServerClient();

    const result = isPhone
      ? await supabase.auth.verifyOtp({
          phone: emailOrPhone,
          token,
          type: "sms",
        })
      : await supabase.auth.verifyOtp({
          email: emailOrPhone,
          token,
          type: "magiclink",
        });

    if (result.error) {
      console.error("[verifyMagicLinkServer] Verify Error:", result.error);
      return {
        success: false,
        error: { message: result.error.message || "Invalid or expired verification code." },
      };
    }

    return { success: true, data: undefined };
  } catch (error: any) {
    return {
      success: false,
      error: { message: error.message || "An unexpected error occurred" },
    };
  }
}

export async function sendPasswordResetServer(email: string): Promise<ServerActionResult<void>> {
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?type=recovery`,
    });

    // Anti-enumeration: We always return success even if the email doesn't exist.
    // Supabase might return an error if it's disabled, but otherwise it obfuscates existence depending on settings.
    // We swallow errors to ensure consistent response.
    if (error) {
      console.error("[Auth] Password reset email failed:", error.message);
    }
    
    return { success: true, data: undefined };
  } catch (error: any) {
    // Still return success to prevent enumeration on unexpected errors
    console.error("[Auth] Password reset unexpected error:", error.message);
    return { success: true, data: undefined };
  }
}

export async function updatePasswordServer(password: string): Promise<ServerActionResult<void>> {
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      return { success: false, error: { message: error.message } };
    }

    return { success: true, data: undefined };
  } catch (error: any) {
    return {
      success: false,
      error: { message: error.message || "An unexpected error occurred" },
    };
  }
}

// ─── MFA & OTP ────────────────────────────────────────────

export async function getUserVerificationStatus(): Promise<{
  emailVerified: boolean;
  phoneVerified: boolean;
}> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  return {
    emailVerified: !!user.email_confirmed_at,
    phoneVerified: !!user.phone_confirmed_at,
  };
}

export async function resendVerificationEmail(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    throw new Error("User email not found");
  }

  const { error } = await supabase.auth.resend({
    type: "signup",
    email: user.email,
  });

  if (error) {
    throw new Error("Failed to send email");
  }

  // Audit log
  const auditLogger = new PostgresAuditLogger(supabase);
  const context = await getAuditContext(user.id);
  await auditLogger.logAction(SecurityAction.EmailVerificationSent, context);
}

export async function getMFAStatus(): Promise<{ isEnabled: boolean }> {
  // MFA is deferred from V1 scope. Always return disabled to prevent lockout states.
  return { isEnabled: false };
}

export async function enrollMFA(): Promise<{
  factorId: string;
  secret: string;
  uri: string;
}> {
  throw new Error("Multi-factor authentication is disabled in V1.");
}

export async function verifyMFA(_factorId: string, _code: string): Promise<void> {
  throw new Error("Multi-factor authentication is disabled in V1.");
}

export async function disableMFA(): Promise<void> {
  throw new Error("Multi-factor authentication is disabled in V1.");
}

export async function sendPhoneOTP(phone: string): Promise<void> {
  const supabase = await createSupabaseServerClient();

  try {
    const { error } = await supabase.auth.signInWithOtp({
      phone,
    });

    if (error) throw new Error(error.message);
  } catch (err: unknown) {
    throw new Error(err instanceof Error ? err.message : "Failed to send OTP");
  }
}

export async function verifyPhoneOTP(
  phone: string,
  token: string,
): Promise<void> {
  const supabase = await createSupabaseServerClient();

  try {
    const { error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: "sms",
    });

    if (error) throw new Error(error.message);
  } catch (err: unknown) {
    throw new Error(err instanceof Error ? err.message : "Invalid OTP");
  }
}
