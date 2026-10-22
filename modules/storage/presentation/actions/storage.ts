"use server";
import path from "path";
import { SupabaseIdentityProvider } from "@/shared/infrastructure/identity/SupabaseIdentityProvider";
import { createSupabaseServerClient } from "@/shared/core/database/server";
import { Permission } from "@/shared/kernel/security/Permission";
import { PermissionService } from "@/shared/kernel/security/PermissionService";
import { SupabaseAuthorizationRepository } from "@/modules/authorization/infrastructure/SupabaseAuthorizationRepository";

import { ServerActionResult } from "@/lib/actions/action-result";

export async function uploadFileToStorage(
  bucket: string,
  formData: FormData,
): Promise<ServerActionResult<{ url: string }>> {
  try {
    const supabase = await createSupabaseServerClient();
    const identityProvider = new SupabaseIdentityProvider(supabase);
    const user = await identityProvider.currentUser();

    if (!user) {
      return { success: false, error: { message: "Not authenticated" } };
    }

    const file = formData.get("file") as File;
    if (!file || file.size === 0) {
      return { success: false, error: { message: "No file provided" } };
    }

    // Sanitize filename
    const fileExt = file.name.split(".").pop()?.toLowerCase() || "bin";
    const baseName = file.name
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9 _-]/g, "")
      .replace(/\s+/g, "_")
      .toLowerCase()
      .substring(0, 50);

    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const fileName = `${baseName}_${timestamp}_${randomStr}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      return {
        success: false,
        error: { message: `Upload failed: ${uploadError.message}` },
      };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(fileName);

    // Record user permission grant in database
    if (file.type && (file.type.startsWith("image/") || bucket === "avatars" || bucket === "user-images" || bucket === "shelves")) {
      try {
        await supabase.from("user_permissions").insert({
          user_id: user.id,
          permission_type: "photo_upload",
          granted: true,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type || "image/jpeg",
          resource_url: publicUrl,
        });
      } catch (logErr) {
        console.warn("Could not log user permission to database:", logErr);
      }
    }

    return { success: true, data: { url: publicUrl } };
  } catch (error: unknown) {
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : "Upload failed",
      },
    };
  }
}

const ALLOWED_STORAGE_BUCKETS = ["avatars", "user-images", "shelves"];

export async function deleteFileFromStorage(
  bucket: string,
  fileUrlOrPath: string,
): Promise<ServerActionResult<void>> {
  try {
    const supabase = await createSupabaseServerClient();
    const identityProvider = new SupabaseIdentityProvider(supabase);
    const user = await identityProvider.currentUser();

    if (!user) {
      return { success: false, error: { message: "Not authenticated" } };
    }

    if (!fileUrlOrPath) {
      return { success: true, data: undefined };
    }

    // 1. Bucket whitelist validation
    if (!ALLOWED_STORAGE_BUCKETS.includes(bucket)) {
      return { success: false, error: { message: "Invalid or unauthorized storage bucket" } };
    }

    // 2. Reject null bytes and malformed input
    if (fileUrlOrPath.includes("\0")) {
      return { success: false, error: { message: "Invalid path format" } };
    }

    // Extract storage object path from public URL if full URL is passed
    let storagePath = fileUrlOrPath;
    const bucketMarker = `/${bucket}/`;
    const markerIndex = fileUrlOrPath.indexOf(bucketMarker);
    if (markerIndex !== -1) {
      storagePath = fileUrlOrPath.substring(markerIndex + bucketMarker.length);
    } else if (fileUrlOrPath.startsWith("http://") || fileUrlOrPath.startsWith("https://")) {
      try {
        const urlObj = new URL(fileUrlOrPath);
        const parts = urlObj.pathname.split(`/${bucket}/`);
        if (parts.length > 1) {
          storagePath = parts[1];
        }
      } catch {
        // Fallback to substring
      }
    }

    try {
      storagePath = decodeURIComponent(storagePath);
    } catch {
      return { success: false, error: { message: "Invalid URL encoding in file path" } };
    }

    // Strip query parameters and hash
    if (storagePath.includes("?")) {
      storagePath = storagePath.split("?")[0];
    }
    if (storagePath.includes("#")) {
      storagePath = storagePath.split("#")[0];
    }

    // Normalize path POSIX-style and check for directory traversal
    const normalizedPath = path.posix.normalize(storagePath).replace(/^(\/|\\)+/, "");
    if (normalizedPath.startsWith("../") || normalizedPath.includes("/../")) {
      return { success: false, error: { message: "Path traversal detected" } };
    }

    // 3. Ownership validation:
    // Non-admin users are strictly limited to their own paths
    const authRepo = new SupabaseAuthorizationRepository(supabase);
    const permissionService = new PermissionService(authRepo);
    const isAdmin = await permissionService.checkPermission(user.id, Permission.ManageUsers).catch(() => false);

    if (!isAdmin) {
      if (bucket === "user-images") {
        const pathOwnerId = normalizedPath.split("/")[0];
        if (pathOwnerId !== user.id) {
          return { success: false, error: { message: "Forbidden: Cannot delete files owned by another user" } };
        }
      } else if (bucket === "avatars") {
        const pathOwnerId = normalizedPath.split("/")[0];
        if (pathOwnerId !== user.id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("avatar_url")
            .eq("id", user.id)
            .maybeSingle();

          const isCurrentAvatar = profile?.avatar_url && profile.avatar_url.includes(normalizedPath);
          if (!isCurrentAvatar) {
            const { data: permission } = await supabase
              .from("user_permissions")
              .select("id")
              .eq("user_id", user.id)
              .like("resource_url", `%${normalizedPath}%`)
              .maybeSingle();

            if (!permission) {
              return { success: false, error: { message: "Forbidden: Cannot delete files owned by another user" } };
            }
          }
        }
      } else if (bucket === "shelves") {
        const shelfPrefixMatch = normalizedPath.match(/^shelf-([0-9a-fA-F-]+)\//);
        if (shelfPrefixMatch) {
          const shelfId = shelfPrefixMatch[1];
          const { data: shelf } = await supabase
            .from("shelves")
            .select("id")
            .eq("id", shelfId)
            .eq("user_id", user.id)
            .maybeSingle();

          if (!shelf) {
            return { success: false, error: { message: "Forbidden: Cannot delete files for this shelf" } };
          }
        }
      }
    }

    const { error: deleteError } = await supabase.storage
      .from(bucket)
      .remove([normalizedPath]);

    if (deleteError) {
      return {
        success: false,
        error: { message: `Delete failed: ${deleteError.message}` },
      };
    }

    return { success: true, data: undefined };
  } catch (error: unknown) {
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : "Delete failed",
      },
    };
  }
}

export async function checkUserPermissionAction(
  permissionType: string = "photo_upload"
): Promise<ServerActionResult<{ granted: boolean }>> {
  try {
    const supabase = await createSupabaseServerClient();
    const identityProvider = new SupabaseIdentityProvider(supabase);
    const user = await identityProvider.currentUser();

    if (!user) {
      return { success: false, error: { message: "Not authenticated" } };
    }

    const { data, error } = await supabase
      .from("user_permissions")
      .select("id, granted")
      .eq("user_id", user.id)
      .eq("permission_type", permissionType)
      .eq("granted", true)
      .limit(1)
      .maybeSingle();

    if (error) {
      return { success: false, error: { message: error.message } };
    }

    return { success: true, data: { granted: !!data } };
  } catch (error: unknown) {
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : "Failed to check permission",
      },
    };
  }
}

export async function grantUserPermissionAction(
  permissionType: string = "photo_upload",
  targetUserId?: string
): Promise<ServerActionResult<{ granted: boolean }>> {
  try {
    const supabase = await createSupabaseServerClient();
    const identityProvider = new SupabaseIdentityProvider(supabase);
    const user = await identityProvider.currentUser();

    if (!user) {
      return { success: false, error: { message: "Not authenticated" } };
    }

    // Require admin privilege to grant user permissions
    const authRepo = new SupabaseAuthorizationRepository(supabase);
    const permissionService = new PermissionService(authRepo);
    const isAdmin = await permissionService.checkPermission(user.id, Permission.ManageUsers).catch(() => false);

    if (!isAdmin) {
      return { success: false, error: { message: "Forbidden: Admin privilege required" } };
    }

    const recipientId = targetUserId || user.id;

    const { error } = await supabase.from("user_permissions").insert({
      user_id: recipientId,
      permission_type: permissionType,
      granted: true,
    });

    if (error) {
      return { success: false, error: { message: error.message } };
    }

    return { success: true, data: { granted: true } };
  } catch (error: unknown) {
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : "Failed to grant permission",
      },
    };
  }
}
