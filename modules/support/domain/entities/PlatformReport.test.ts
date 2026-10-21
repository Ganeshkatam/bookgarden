import { PlatformReport } from "./PlatformReport";

describe("PlatformReport Entity", () => {
  it("should create a PlatformReport with initial PENDING status", () => {
    const report = PlatformReport.create({
      id: "report-123",
      type: "BUG",
      title: "Broken audio player",
      description: "Audio player stutters after chapter 3",
      email: "user@bookgarden.tomesphere.in",
      userId: "user-456",
    });

    expect(report.id).toBe("report-123");
    expect(report.type).toBe("BUG");
    expect(report.title).toBe("Broken audio player");
    expect(report.description).toBe("Audio player stutters after chapter 3");
    expect(report.status).toBe("PENDING");
    expect(report.email).toBe("user@bookgarden.tomesphere.in");
    expect(report.userId).toBe("user-456");
    expect(report.createdAt).toBeInstanceOf(Date);
    expect(report.updatedAt).toBeInstanceOf(Date);
  });

  it("should handle anonymous reports with null email and userId", () => {
    const report = PlatformReport.create({
      id: "report-anon",
      type: "SECURITY",
      title: "Vulnerability report",
      description: "Found potential header disclosure issue",
    });

    expect(report.email).toBeNull();
    expect(report.userId).toBeNull();
    expect(report.type).toBe("SECURITY");
  });
});
