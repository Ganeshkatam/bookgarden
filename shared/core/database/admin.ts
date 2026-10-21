import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/shared/core/types/database";

let adminClient: SupabaseClient<Database> | null = null;

/**
 * Server-only factory for privileged Supabase client.
 * Never exposed to the browser.
 */
export function createSupabaseAdminClient(): SupabaseClient<Database> {
  if (typeof window !== "undefined") {
    throw new Error(
      "[createSupabaseAdminClient] Client-side execution forbidden. Admin client is server-only."
    );
  }

  if (adminClient) return adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serverKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ROLE_KEY;

  if (!url || !serverKey) {
    throw new Error(
      "[createSupabaseAdminClient] Server environment is missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL."
    );
  }

  adminClient = createClient<Database>(url, serverKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return adminClient;
}
