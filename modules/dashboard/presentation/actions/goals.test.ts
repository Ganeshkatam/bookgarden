jest.mock("server-only", () => ({}), { virtual: true });

import {
  saveReadingGoalAction,
  deleteReadingGoalAction,
  getReadingGoalsAction,
} from "./goals";
import * as requireAuthModule from "@/modules/security/application/requireAuth";
import * as serverDbModule from "@/shared/core/database/server";

jest.mock("@/modules/security/application/requireAuth");
jest.mock("@/shared/core/database/server");
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

describe("Reading Goals Server Actions", () => {
  const mockUser = { id: "user-goal-1", email: "reader@bookgarden.tomesphere.in" };
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    (requireAuthModule.requireAuth as jest.Mock).mockResolvedValue(mockUser);

    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockResolvedValue({ error: null }),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    };

    (serverDbModule.createSupabaseServerClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  describe("Authentication Guard", () => {
    it("should fail when user is not authenticated", async () => {
      (requireAuthModule.requireAuth as jest.Mock).mockRejectedValue(
        new Error("Not authenticated"),
      );

      const res = await saveReadingGoalAction({
        goalType: "books_per_year",
        targetValue: 24,
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.message).toBe("Not authenticated");
      }
    });
  });

  describe("saveReadingGoalAction", () => {
    it("should create a new goal when no existing matching goal", async () => {
      mockSupabase.maybeSingle.mockResolvedValue({ data: null, error: null });

      const res = await saveReadingGoalAction({
        goalType: "books_per_year",
        targetValue: 24,
        year: 2026,
      });

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.goalId).toBeDefined();
      }
      expect(mockSupabase.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockUser.id,
          goal_type: "books_per_year",
          target_value: 24,
          year: 2026,
          is_active: true,
        }),
      );
    });

    it("should update target on existing goal by goalId", async () => {
      mockSupabase.maybeSingle.mockResolvedValue({
        data: {
          id: "goal-existing-1",
          user_id: mockUser.id,
          goal_type: "books_per_year",
          target_value: 12,
          current_value: 4,
          year: 2026,
          is_active: true,
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
        error: null,
      });

      const res = await saveReadingGoalAction({
        goalId: "goal-existing-1",
        goalType: "books_per_year",
        targetValue: 30,
      });

      expect(res.success).toBe(true);
      expect(mockSupabase.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "goal-existing-1",
          target_value: 30,
        }),
      );
    });

    it("should reject invalid target values <= 0", async () => {
      const res = await saveReadingGoalAction({
        goalType: "books_per_year",
        targetValue: 0,
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.message).toContain("positive integer");
      }
    });
  });

  describe("deleteReadingGoalAction", () => {
    it("should delete goal scoped by user id", async () => {
      mockSupabase.eq
        .mockReturnValueOnce(mockSupabase)
        .mockResolvedValueOnce({ error: null });

      const res = await deleteReadingGoalAction("goal-1");
      expect(res.success).toBe(true);
    });
  });

  describe("getReadingGoalsAction", () => {
    it("should list active goals with computed progress percentage", async () => {
      mockSupabase.order.mockResolvedValue({
        data: [
          {
            id: "goal-1",
            user_id: mockUser.id,
            goal_type: "books_per_year",
            target_value: 20,
            current_value: 10,
            year: 2026,
            is_active: true,
            created_at: "2026-01-01T00:00:00Z",
            updated_at: "2026-01-01T00:00:00Z",
          },
        ],
        error: null,
      });

      const res = await getReadingGoalsAction();
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data).toHaveLength(1);
        expect(res.data[0].progressPercentage).toBe(50);
        expect(res.data[0].isAchieved).toBe(false);
      }
    });
  });
});
