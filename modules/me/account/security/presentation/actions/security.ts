"use server";

import { z } from "zod";
import { ServerActionResult } from "@/lib/actions/action-result";
import { createSupabaseServerClient } from "@/shared/core/database/server";

export interface DeleteAccountData {
  userId?: string;
  confirmationText: string;
}

export async function deleteAccountAction(
  data: DeleteAccountData
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

    if (data?.confirmationText !== "DELETE") {
      return { success: false, error: { message: 'Please type "DELETE" to confirm' } };
    }

    if (data?.userId && data.userId !== user.id) {
      return { success: false, error: { message: "Forbidden: Cannot delete another user's account." } };
    }

    // Cascade delete profile records
    const { error: deleteError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", user.id);

    if (deleteError) {
      return { success: false, error: { message: `Failed to delete account: ${deleteError.message}` } };
    }

    // Revoke all active sessions and clear cookies
    await supabase.auth.signOut({ scope: "global" }).catch(() => {});

    return { success: true, data: undefined };
  } catch (error: unknown) {
    return {
      success: false,
      error: { message: error instanceof Error ? error.message : "Failed to delete account." },
    };
  }
}

export async function signOutAllDevicesAction(
  _data?: unknown
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

    const { error: signOutError } = await supabase.auth.signOut({ scope: "others" });

    if (signOutError) {
      return { success: false, error: { message: signOutError.message } };
    }

    return { success: true, data: undefined };
  } catch (error: unknown) {
    return {
      success: false,
      error: { message: error instanceof Error ? error.message : "Failed to sign out other devices." },
    };
  }
}

const PasswordUpdateSchema = z.object({
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
});

export type PasswordUpdateData = z.infer<typeof PasswordUpdateSchema>;

export async function updatePasswordAction(
  data: PasswordUpdateData
): Promise<ServerActionResult<void>> {
  try {
    const validatedData = PasswordUpdateSchema.parse(data);

    const supabase = await createSupabaseServerClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { success: false, error: { message: "Unauthorized. Please log in." } };
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: validatedData.password,
    });

    if (updateError) {
      return { success: false, error: { message: updateError.message } };
    }

    return { success: true, data: undefined };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: { message: "Invalid password provided. Please check the requirements." } };
    }
    return { success: false, error: { message: "Failed to update password. Please try again." } };
  }
}
