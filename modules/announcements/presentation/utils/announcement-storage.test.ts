import {
  getAnnouncementPriority,
  isEntryEligible,
  isAnnouncementSeen,
  markAnnouncementSeen,
  isBannerDismissed,
  markBannerDismissed,
  selectEntryAnnouncement,
  ANNOUNCEMENT_SEEN_STORAGE_PREFIX,
  ANNOUNCEMENT_BANNER_DISMISSED_PREFIX,
} from "./announcement-storage";
import { AnnouncementDto } from "../../application/dto/AnnouncementDto";
import { saveCookieConsent } from "@/shared/core/storage/privacy-storage";

describe("announcement-storage policy & persistence tests", () => {
  const mockCritical: AnnouncementDto = {
    id: "a-crit",
    title: "Critical Outage Notice",
    content: "Database migration in progress.",
    type: "error",
    isDismissible: false,
    startsAt: "2026-08-27T00:00:00.000Z",
    endsAt: "2026-09-01T00:00:00.000Z",
  };

  const mockWarning: AnnouncementDto = {
    id: "a-warn",
    title: "Scheduled Maintenance Window",
    content: "Read-only mode for 15 minutes.",
    type: "warning",
    isDismissible: true,
    startsAt: "2026-08-27T00:00:00.000Z",
    endsAt: "2026-09-01T00:00:00.000Z",
  };

  const mockErrorDismissible: AnnouncementDto = {
    id: "a-err-dismiss",
    title: "Degraded Search Latency",
    content: "Search index optimizing.",
    type: "error",
    isDismissible: true,
    startsAt: "2026-08-27T00:00:00.000Z",
    endsAt: "2026-09-01T00:00:00.000Z",
  };

  const mockFeature: AnnouncementDto = {
    id: "a-feat",
    title: "Enhanced Margin Annotations",
    content: "Export annotations as Markdown.",
    type: "feature",
    isDismissible: true,
    startsAt: "2026-08-27T00:00:00.000Z",
    endsAt: "2026-09-01T00:00:00.000Z",
  };

  const mockGreetings: AnnouncementDto = {
    id: "a-greet",
    title: "Welcome Back",
    content: "Good morning reader.",
    type: "greetings",
    isDismissible: true,
    startsAt: "2026-08-27T00:00:00.000Z",
    endsAt: "2026-09-01T00:00:00.000Z",
  };

  const mockInfo: AnnouncementDto = {
    id: "a-info",
    title: "Library Catalog Refresh",
    content: "10,000 new volumes indexed.",
    type: "info",
    isDismissible: true,
    startsAt: "2026-08-27T00:00:00.000Z",
    endsAt: "2026-09-01T00:00:00.000Z",
  };

  const mockSuccess: AnnouncementDto = {
    id: "a-succ",
    title: "Monthly Goal Completed",
    content: "Great progress this month.",
    type: "success",
    isDismissible: true,
    startsAt: "2026-08-27T00:00:00.000Z",
    endsAt: "2026-09-01T00:00:00.000Z",
  };

  beforeEach(() => {
    window.localStorage.clear();
    saveCookieConsent({ essential: true, functional: true, analytics: true });
  });

  it("strictly blocks persisting seen state when user consent has not been granted", () => {
    window.localStorage.clear();
    markAnnouncementSeen("unconsented-1");
    expect(isAnnouncementSeen("unconsented-1")).toBe(false);
    expect(window.localStorage.getItem("bookgarden_announcement_seen_unconsented-1")).toBeNull();
  });

  it("calculates correct priorities according to policy matrix", () => {
    expect(getAnnouncementPriority(mockCritical)).toBe(4);
    expect(getAnnouncementPriority(mockWarning)).toBe(3);
    expect(getAnnouncementPriority(mockErrorDismissible)).toBe(2);
    expect(getAnnouncementPriority(mockFeature)).toBe(1.5);
    expect(getAnnouncementPriority(mockGreetings)).toBe(1.4);
    expect(getAnnouncementPriority(mockInfo)).toBe(1.2);
    expect(getAnnouncementPriority(mockSuccess)).toBe(1.0);
  });

  it("classifies entry eligibility: all active announcement types are eligible", () => {
    expect(isEntryEligible(mockCritical)).toBe(true);
    expect(isEntryEligible(mockWarning)).toBe(true);
    expect(isEntryEligible(mockErrorDismissible)).toBe(true);
    expect(isEntryEligible(mockFeature)).toBe(true);
    expect(isEntryEligible(mockGreetings)).toBe(true);
    expect(isEntryEligible(mockInfo)).toBe(true);
    expect(isEntryEligible(mockSuccess)).toBe(true);
  });

  it("persists seen state to localStorage and detects seen announcements", () => {
    expect(isAnnouncementSeen("test-1")).toBe(false);

    markAnnouncementSeen("test-1");
    expect(isAnnouncementSeen("test-1")).toBe(true);
    expect(
      window.localStorage.getItem(`${ANNOUNCEMENT_SEEN_STORAGE_PREFIX}test-1`)
    ).toBe("true");
  });

  it("separates banner dismissal from entry card seen state", () => {
    expect(isBannerDismissed("item-a")).toBe(false);
    expect(isAnnouncementSeen("item-a")).toBe(false);

    // Closing the banner should hide the banner, but NOT mark the entry card as seen
    markBannerDismissed("item-a");
    expect(isBannerDismissed("item-a")).toBe(true);
    expect(isAnnouncementSeen("item-a")).toBe(false);
    expect(
      window.localStorage.getItem(`${ANNOUNCEMENT_BANNER_DISMISSED_PREFIX}item-a`)
    ).toBe("true");
    expect(
      window.localStorage.getItem(`${ANNOUNCEMENT_SEEN_STORAGE_PREFIX}item-a`)
    ).toBeNull();

    // Acknowledging the entry card marks both seen and banner dismissed
    markAnnouncementSeen("item-b");
    expect(isAnnouncementSeen("item-b")).toBe(true);
    expect(isBannerDismissed("item-b")).toBe(true);
  });

  it("handles storage exceptions gracefully without crashing", () => {
    const originalSetItem = window.localStorage.setItem;
    window.localStorage.setItem = jest.fn(() => {
      throw new Error("QuotaExceededError");
    });

    expect(() => markAnnouncementSeen("test-err")).not.toThrow();
    expect(() => markBannerDismissed("test-err")).not.toThrow();

    window.localStorage.setItem = originalSetItem;
  });

  it("selects the single highest priority announcement and excludes seen or ineligible ones", () => {
    const all = [mockInfo, mockFeature, mockWarning, mockCritical, mockSuccess];
    const seen = new Set<string>();

    // 1. Critical should win over all others
    expect(selectEntryAnnouncement(all, seen)?.id).toBe("a-crit");

    // 2. If critical is seen, warning should win
    seen.add("a-crit");
    expect(selectEntryAnnouncement(all, seen)?.id).toBe("a-warn");

    // 3. If warning is seen, feature should win
    seen.add("a-warn");
    expect(selectEntryAnnouncement(all, seen)?.id).toBe("a-feat");

    // 4. If feature is seen, info should win
    seen.add("a-feat");
    expect(selectEntryAnnouncement(all, seen)?.id).toBe("a-info");

    // 5. If info is seen, success should win
    seen.add("a-info");
    expect(selectEntryAnnouncement(all, seen)?.id).toBe("a-succ");

    // 6. If all are seen, returns null
    seen.add("a-succ");
    expect(selectEntryAnnouncement(all, seen)).toBeNull();
  });
});
