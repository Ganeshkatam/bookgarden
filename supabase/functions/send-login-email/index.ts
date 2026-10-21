// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  validateWebhookRequest,
  escapeHtml,
  type SessionRecord,
} from "./validator.ts";

serve(async (req: Request) => {
  const env = {
    WEBHOOK_SECRET: Deno.env.get("WEBHOOK_SECRET"),
    SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
    SUPABASE_ANON_KEY: Deno.env.get("SUPABASE_ANON_KEY"),
  };

  const validation = await validateWebhookRequest(req, env);
  if (!validation.ok) {
    return validation.response;
  }

  const { requestId, idempotencyKey, session } = validation;

  try {
    // 4. Initialize Privileged Internal Supabase Client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[send-login-email] Missing Supabase internal credentials");
      return new Response(
        JSON.stringify({ error: "Server misconfiguration", requestId }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 5. Database-Enforced Atomic Claim Transition
    const nowIso = new Date().toISOString();
    const { error: claimError } = await supabase
      .from("login_notifications_log")
      .insert({
        session_id: session.id,
        user_id: session.user_id,
        status: "PROCESSING",
        attempts: 1,
        claimed_at: nowIso,
        request_id: requestId,
        idempotency_key: idempotencyKey,
      });

    if (claimError) {
      // 23505: Unique violation (session_id or idempotency_key already recorded)
      if (claimError.code === "23505") {
        const { data: existing } = await supabase
          .from("login_notifications_log")
          .select("status, attempts, claimed_at")
          .eq("session_id", session.id)
          .maybeSingle();

        if (existing?.status === "SENT") {
          return new Response(
            JSON.stringify({ success: true, status: "already_sent", requestId }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }

        const claimedAtMs = existing?.claimed_at ? Date.parse(existing.claimed_at) : 0;
        const isLeaseActive = existing?.status === "PROCESSING" && (Date.now() - claimedAtMs < 60_000);

        if (isLeaseActive) {
          return new Response(
            JSON.stringify({ success: true, status: "already_processing", requestId }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }

        const currentAttempts = typeof existing?.attempts === "number" ? existing.attempts : 1;
        if (currentAttempts >= 3) {
          console.warn(`[send-login-email] Session ${session.id} exceeded maximum retry attempts (3).`);
          return new Response(
            JSON.stringify({ success: true, status: "max_attempts_exceeded", requestId }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }

        // Atomic recovery transition using optimistic locking on previous claimed_at and status
        const { data: updatedRows, error: recoveryError } = await supabase
          .from("login_notifications_log")
          .update({
            status: "PROCESSING",
            claimed_at: nowIso,
            request_id: requestId,
            idempotency_key: idempotencyKey,
            attempts: currentAttempts + 1,
          })
          .eq("session_id", session.id)
          .eq("status", existing?.status ?? "FAILED")
          .eq("claimed_at", existing?.claimed_at ?? null)
          .select("status");

        if (recoveryError || !updatedRows || updatedRows.length === 0) {
          console.log(`[send-login-email] Session ${session.id} claim recovery claimed by concurrent worker. Skipping.`);
          return new Response(
            JSON.stringify({ success: true, status: "already_processed", requestId }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
      } else {
        console.error("[send-login-email] Database claim failed:", claimError);
        return new Response(
          JSON.stringify({ error: "Failed to acquire event claim", requestId }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        );
      }
    }

    // 6. Server-Side User Email Resolution
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(session.user_id);
    if (userError || !userData?.user?.email) {
      console.error(`[send-login-email] Failed to resolve email for user ${session.user_id}`);
      await supabase
        .from("login_notifications_log")
        .update({ status: "FAILED", last_error: "User email not found" })
        .eq("session_id", session.id);

      return new Response(
        JSON.stringify({ success: true, status: "user_unresolvable", requestId }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    const userEmail = userData.user.email;
    const sessionDate = new Date(session.created_at);
    const signInTime = isNaN(sessionDate.getTime())
      ? new Date().toUTCString()
      : sessionDate.toUTCString();

    // 7. Record In-App Security Notification (Non-blocking)
    try {
      await supabase.from("notifications").insert({
        user_id: session.user_id,
        event_name: "auth.session.created",
        aggregate_id: session.id,
        aggregate_type: "auth.session",
        type: "INFO",
        title: "New Sign-in Detected",
        body: `A new session was initiated at ${signInTime}.${session.user_agent ? ` (${escapeHtml(session.user_agent.slice(0, 80))})` : ""}`,
        metadata: {
          session_id: session.id,
          created_at: session.created_at,
          ip: session.ip || null,
        },
      });
    } catch (notifErr) {
      console.warn("[send-login-email] Failed to write in-app notification:", notifErr);
    }

    // 8. Dispatch Email via Brevo API
    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    const senderEmail = Deno.env.get("SENDER_EMAIL") || "noreply@tomesphere.in";

    if (!brevoApiKey) {
      console.error("[send-login-email] Missing BREVO_API_KEY secret");
      await supabase
        .from("login_notifications_log")
        .update({ status: "FAILED", last_error: "Missing BREVO_API_KEY secret" })
        .eq("session_id", session.id);

      return new Response(
        JSON.stringify({ error: "Email provider not configured", requestId }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    const safeUserAgent = session.user_agent ? escapeHtml(session.user_agent) : null;
    const safeIp = session.ip ? escapeHtml(session.ip) : null;

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #fafafa;">
        <div style="background-color: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 24px rgba(0,0,0,0.04); border: 1px solid #eaeaea;">
          
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="margin: 0; font-size: 24px; color: #111827; font-weight: 700; letter-spacing: -0.5px;">
              TomeSphere
            </h1>
          </div>
          
          <div style="text-align: center; margin-bottom: 32px;">
            <div style="background-color: #eef2ff; color: #4f46e5; display: inline-block; padding: 12px 24px; border-radius: 999px; font-weight: 600; font-size: 14px; letter-spacing: 0.5px; text-transform: uppercase;">
              New Sign-in Detected
            </div>
          </div>
          
          <h2 style="color: #111827; font-size: 20px; font-weight: 600; margin-bottom: 16px; text-align: center;">
            Was this you?
          </h2>
          
          <p style="color: #4b5563; font-size: 16px; line-height: 24px; margin-bottom: 32px; text-align: center;">
            We noticed a new sign-in to your TomeSphere account. Here are the details of the session:
          </p>
          
          <div style="background-color: #f9fafb; border: 1px solid #f3f4f6; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
            <div style="margin-bottom: 16px;">
              <p style="margin: 0; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Time</p>
              <p style="margin: 4px 0 0 0; font-size: 15px; color: #111827; font-weight: 500;">${signInTime}</p>
            </div>
            ${safeUserAgent ? `
            <div style="margin-bottom: 16px;">
              <p style="margin: 0; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Device & Browser</p>
              <p style="margin: 4px 0 0 0; font-size: 15px; color: #111827; font-weight: 500; line-height: 1.4;">${safeUserAgent}</p>
            </div>
            ` : ""}
            ${safeIp ? `
            <div>
              <p style="margin: 0; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">IP Address</p>
              <p style="margin: 4px 0 0 0; font-size: 15px; color: #111827; font-weight: 500; line-height: 1.4;">${safeIp}</p>
            </div>
            ` : ""}
          </div>
          
          <p style="color: #6b7280; font-size: 14px; line-height: 22px; text-align: center; margin-bottom: 0;">
            If this was you, you can safely ignore this email.<br/><br/>
            If you don't recognize this activity, please <a href="https://tomesphere.in/security" style="color: #4f46e5; text-decoration: none; font-weight: 600;">secure your account</a> immediately.
          </p>
          
        </div>
        
        <div style="text-align: center; margin-top: 32px;">
          <p style="color: #9ca3af; font-size: 12px; line-height: 18px;">
            &copy; ${new Date().getFullYear()} TomeSphere. All rights reserved.<br/>
            This is an automated security notification.
          </p>
        </div>
      </div>
    `;

    const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": brevoApiKey,
      },
      body: JSON.stringify({
        sender: { email: senderEmail, name: "TomeSphere Security" },
        to: [{ email: userEmail }],
        subject: "New sign-in to your TomeSphere account",
        htmlContent: htmlContent,
      }),
    });

    if (!brevoRes.ok) {
      const errText = await brevoRes.text();
      console.error(`[send-login-email] Brevo API failed (${brevoRes.status}): ${errText}`);
      await supabase
        .from("login_notifications_log")
        .update({
          status: "FAILED",
          last_error: `Brevo error ${brevoRes.status}: ${errText.slice(0, 200)}`,
        })
        .eq("session_id", session.id);

      return new Response(
        JSON.stringify({ error: "Failed to dispatch email", requestId }),
        { status: 502, headers: { "Content-Type": "application/json" } },
      );
    }

    // 9. Mark Processed Successfully
    await supabase
      .from("login_notifications_log")
      .update({
        status: "SENT",
        processed_at: new Date().toISOString(),
        last_error: null,
      })
      .eq("session_id", session.id);

    return new Response(
      JSON.stringify({ success: true, requestId }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    console.error("[send-login-email] Fatal error:", error);
    return new Response(
      JSON.stringify({ error: "Request could not be processed", requestId }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }
});
