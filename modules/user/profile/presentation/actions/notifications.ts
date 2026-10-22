"use server";

import { createSupabaseServerClient } from "@/shared/core/database/server";
import { getCurrentUser } from "@/modules/authentication/presentation/actions/auth";

import { ServerActionResult } from "@/lib/actions/action-result";

export async function markNotificationAsRead(
  id: string,
): Promise<ServerActionResult<void>> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: { message: "Unauthorized. Please log in." } };
    }

    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) return { success: false, error: { message: error.message } };
    return { success: true, data: undefined };
  } catch (err: any) {
    return {
      success: false,
      error: { message: err.message || "Unknown error" },
    };
  }
}

export async function markAllNotificationsAsRead(): Promise<
  ServerActionResult<void>
> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: { message: "Unauthorized. Please log in." } };
    }

    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id);

    if (error) return { success: false, error: { message: error.message } };
    return { success: true, data: undefined };
  } catch (err: any) {
    return {
      success: false,
      error: { message: err.message || "Unknown error" },
    };
  }
}

export async function deleteNotificationAction(
  id: string,
): Promise<ServerActionResult<void>> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: { message: "Unauthorized. Please log in." } };
    }

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) return { success: false, error: { message: error.message } };
    return { success: true, data: undefined };
  } catch (err: any) {
    return {
      success: false,
      error: { message: err.message || "Unknown error" },
    };
  }
}
