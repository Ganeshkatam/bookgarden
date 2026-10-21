import { SubmitReportCommand } from "./SubmitReportCommand";
import { IPlatformReportRepository } from "../../domain/repositories/IPlatformReportRepository";

describe("SubmitReportCommand", () => {
  let mockRepository: jest.Mocked<IPlatformReportRepository>;
  let command: SubmitReportCommand;

  beforeEach(() => {
    mockRepository = {
      save: jest.fn().mockResolvedValue(undefined),
    };
    command = new SubmitReportCommand(mockRepository);
  });

  it("should successfully execute and persist a valid report", async () => {
    const result = await command.execute({
      type: "BUG",
      title: "Broken pagination in discovery",
      description: "Clicking next page results in empty state instead of page 2.",
      email: "reader@bookgarden.tomesphere.in",
      userId: "user-123",
    });

    expect(result.success).toBe(true);
    expect(result.id).toBeDefined();
    expect(mockRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "BUG",
        title: "Broken pagination in discovery",
        description: "Clicking next page results in empty state instead of page 2.",
        email: "reader@bookgarden.tomesphere.in",
        userId: "user-123",
      }),
    );
  });

  it("should reject invalid report types", async () => {
    const result = await command.execute({
      type: "INVALID_TYPE" as any,
      title: "Some title",
      description: "Some description",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid report type.");
    expect(mockRepository.save).not.toHaveBeenCalled();
  });

  it("should reject empty or overly long titles", async () => {
    // Empty title
    const emptyResult = await command.execute({
      type: "BUG",
      title: "   ",
      description: "Some description",
    });
    expect(emptyResult.success).toBe(false);
    expect(emptyResult.error).toContain("Title must be between");

    // Overly long title (> 200 chars)
    const longResult = await command.execute({
      type: "BUG",
      title: "a".repeat(201),
      description: "Some description",
    });
    expect(longResult.success).toBe(false);
    expect(longResult.error).toContain("Title must be between");
  });

  it("should reject empty or overly long descriptions", async () => {
    // Empty description
    const emptyResult = await command.execute({
      type: "ABUSE",
      title: "Spam comment",
      description: "",
    });
    expect(emptyResult.success).toBe(false);
    expect(emptyResult.error).toContain("Description must be between");

    // Overly long description (> 5000 chars)
    const longResult = await command.execute({
      type: "ABUSE",
      title: "Spam comment",
      description: "a".repeat(5001),
    });
    expect(longResult.success).toBe(false);
    expect(longResult.error).toContain("Description must be between");
  });

  it("should validate email format when provided", async () => {
    const invalidEmailResult = await command.execute({
      type: "SECURITY",
      title: "Security concern",
      description: "Description of vulnerability",
      email: "not-an-email",
    });

    expect(invalidEmailResult.success).toBe(false);
    expect(invalidEmailResult.error).toBe("Invalid email format.");
  });

  it("should handle repository persistence failures cleanly", async () => {
    mockRepository.save.mockRejectedValue(new Error("DB Down"));

    const result = await command.execute({
      type: "BUG",
      title: "Valid title",
      description: "Valid description",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("An unexpected error occurred while saving the report.");
  });
});
