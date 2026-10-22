"use server";

import { createSupabaseServerClient } from "@/shared/core/database/server";
import { ServerActionResult } from "@/lib/actions/action-result";
import { revalidatePath } from "next/cache";

export async function getProfile(userId?: string): Promise<ServerActionResult<{ displayName: string }>> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: { message: "Unauthorized. Please log in." } };
    }

    const targetId = userId || user.id;
    if (targetId !== user.id) {
      return { success: false, error: { message: "Forbidden: Cannot access another user's profile." } };
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single();

    if (error) throw error;
    
    return { success: true, data: { displayName: profile?.display_name || "" } };
  } catch (error: any) {
    return { success: false, error: { message: error.message || "Failed to get profile" } };
  }
}

export async function setupProfile(
  userId: string,
  data: { name: string; favoriteGenres: string[]; readingGoal: number }
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

    if (userId && userId !== user.id) {
      return { success: false, error: { message: "Forbidden: Cannot setup another user's profile." } };
    }

    // 1. Update the profile strictly bound to session user.id
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        display_name: data.name,
      })
      .eq("id", user.id);

    if (profileError) throw profileError;

    // Revalidate paths so the middleware and navbar pick up the new name
    revalidatePath("/", "layout");
    
    return { success: true, data: undefined };
  } catch (error: any) {
    return { success: false, error: { message: error.message || "Failed to setup profile" } };
  }
}
