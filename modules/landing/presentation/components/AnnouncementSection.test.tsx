import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import AnnouncementSection from "./AnnouncementSection";
import { AnnouncementDto } from "@/modules/announcements/application/dto/AnnouncementDto";

describe("AnnouncementSection behavioral tests", () => {
  const mockAnnouncements: AnnouncementDto[] = [
    {
      id: "ann-1",
      title: "Welcome to BookGarden 1.0",
      content: "Explore classic literature with deep reading tools.",
      type: "feature",
      linkUrl: "/me/library",
      linkText: "Explore Now",
      isDismissible: false,
      startsAt: "2026-08-24T00:00:00.000Z",
      endsAt: "2026-09-01T00:00:00.000Z",
    },
    {
      id: "ann-2",
      title: "New Shelf Sharing Features",
      content: "You can now organize and share custom collections.",
      type: "warning",
      isDismissible: true,
      startsAt: "2026-08-25T12:00:00.000Z",
      endsAt: "2026-09-05T00:00:00.000Z",
    },
    {
      id: "ann-3",
      title: "Excess Announcement",
      content: "Should not be displayed because of slice(0, 2).",
      type: "info",
      isDismissible: true,
      startsAt: "2026-08-26T00:00:00.000Z",
      endsAt: "2026-09-10T00:00:00.000Z",
    },
  ];

  it("returns null when announcements list is empty or undefined", () => {
    const { container: c1 } = render(<AnnouncementSection announcements={[]} />);
    expect(c1.firstChild).toBeNull();

    const { container: c2 } = render(
      <AnnouncementSection announcements={undefined as any} />
    );
    expect(c2.firstChild).toBeNull();
  });

  it("renders at most 2 announcements with formatted date and content", () => {
    render(<AnnouncementSection announcements={mockAnnouncements} />);

    expect(screen.getByRole("heading", { name: "Announcements" })).toBeInTheDocument();
    expect(screen.getByText("Welcome to BookGarden 1.0")).toBeInTheDocument();
    expect(screen.getByText("New Shelf Sharing Features")).toBeInTheDocument();
    expect(screen.queryByText("Excess Announcement")).not.toBeInTheDocument();

    // Check type badge
    expect(screen.getByText("New Capability")).toBeInTheDocument();
    expect(screen.getByText("Maintenance & Notice")).toBeInTheDocument();

    // Check CTA link
    expect(screen.getByRole("link", { name: /Explore Now/i })).toHaveAttribute("href", "/me/library");

    // Check deterministic date rendering
    expect(screen.getByText("August 24, 2026")).toBeInTheDocument();
    expect(screen.getByText("August 25, 2026")).toBeInTheDocument();
  });
});
