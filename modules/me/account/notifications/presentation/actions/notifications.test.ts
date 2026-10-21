jest.mock("server-only", () => ({}), { virtual: true });

import {
  updateNotificationToggleAction,
  getNotificationPreferencesAction,
} from "./notifications";
import * as requireAuthModule from "@/modules/security/application/requireAuth";
import * as serverDbModule from "@/shared/core/database/server";

jest.mock("@/modules/security/application/requireAuth");
jest.mock("@/shared/core/database/server");
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

describe("Notification Preferences Server Actions", () => {
  const mockUser = { id: "user-prefs-1", email: "reader@bookgarden.tomesphere.in" };
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    (requireAuthModule.requireAuth as jest.Mock).mockResolvedValue(mockUser);

    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockResolvedValue({ error: null }),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    };

    (serverDbModule.createSupabaseServerClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  it("should fail when user is not authenticated", async () => {
    (requireAuthModule.requireAuth as jest.Mock).mockRejectedValue(
      new Error("Not authenticated"),
    );

    const res = await updateNotificationToggleAction({
      field: "readingRemindersEnabled",
      value: false,
    });

    expect(res.success).toBe(false);
  });

  it("should update a notification toggle successfully", async () => {
    const res = await updateNotificationToggleAction({
      field: "readingRemindersEnabled",
      value: false,
    });

    expect(res.success).toBe(true);
    expect(mockSupabase.from).toHaveBeenCalledWith("user_notification_preferences");
    expect(mockSupabase.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: mockUser.id,
        reading_reminders_enabled: false,
      }),
      { onConflict: "user_id" },
    );
  });

  it("should retrieve default notification preferences when none exist in DB", async () => {
    mockSupabase.maybeSingle.mockResolvedValue({ data: null, error: null });

    const res = await getNotificationPreferencesAction();

    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.userId).toBe(mockUser.id);
      expect(res.data.readingRemindersEnabled).toBe(true);
      expect(res.data.recommendationsEnabled).toBe(true);
      expect(res.data.systemAnnouncementsEnabled).toBe(true);
    }
  });

  it("should retrieve persisted notification preferences accurately", async () => {
    mockSupabase.maybeSingle.mockResolvedValue({
      data: {
        user_id: mockUser.id,
        reading_reminders_enabled: false,
        recommendations_enabled: true,
        weekly_digest_enabled: false,
        system_announcements_enabled: true,
        email_alerts_enabled: false,
        push_notifications_enabled: false,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-02T00:00:00Z",
      },
      error: null,
    });

    const res = await getNotificationPreferencesAction();

    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.readingRemindersEnabled).toBe(false);
      expect(res.data.recommendationsEnabled).toBe(true);
      expect(res.data.weeklyDigestEnabled).toBe(false);
      expect(res.data.emailAlertsEnabled).toBe(false);
    }
  });
});
