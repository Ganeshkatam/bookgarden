import React from "react";
import "@testing-library/jest-dom";
import { render } from "@testing-library/react";
import { VercelAnalytics } from "./VercelAnalytics";
import { isStorageAllowed } from "@/shared/core/storage/privacy-storage";
import { Analytics } from "@vercel/analytics/next";

jest.mock("@/shared/core/storage/privacy-storage", () => ({
  isStorageAllowed: jest.fn(),
}));

jest.mock("@vercel/analytics/next", () => ({
  Analytics: jest.fn((props: any) => {
    // Capture props for test assertions
    (Analytics as any).lastProps = props;
    return <div data-testid="mock-vercel-analytics" />;
  }),
}));

describe("VercelAnalytics Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders without crashing", () => {
    const { getByTestId } = render(<VercelAnalytics />);
    expect(getByTestId("mock-vercel-analytics")).toBeInTheDocument();
  });

  it("drops events when analytics consent is denied or absent", () => {
    (isStorageAllowed as jest.Mock).mockReturnValue(false);

    render(<VercelAnalytics />);
    const lastProps = (Analytics as any).lastProps;
    expect(lastProps).toBeDefined();
    expect(typeof lastProps.beforeSend).toBe("function");

    const mockEvent = { type: "pageview", url: "https://bookgarden.tomesphere.in/search" };
    const result = lastProps.beforeSend(mockEvent);

    expect(isStorageAllowed).toHaveBeenCalledWith("analytics");
    expect(result).toBeNull();
  });

  it("allows events when analytics consent is granted", () => {
    (isStorageAllowed as jest.Mock).mockReturnValue(true);

    render(<VercelAnalytics />);
    const lastProps = (Analytics as any).lastProps;
    expect(lastProps).toBeDefined();

    const mockEvent = { type: "pageview", url: "https://bookgarden.tomesphere.in/discover" };
    const result = lastProps.beforeSend(mockEvent);

    expect(isStorageAllowed).toHaveBeenCalledWith("analytics");
    expect(result).toEqual(mockEvent);
  });

  it("fails safe and drops events if privacy check throws an exception", () => {
    (isStorageAllowed as jest.Mock).mockImplementation(() => {
      throw new Error("Storage subsystem failure");
    });

    render(<VercelAnalytics />);
    const lastProps = (Analytics as any).lastProps;
    const mockEvent = { type: "pageview", url: "https://bookgarden.tomesphere.in/read/123" };
    const result = lastProps.beforeSend(mockEvent);

    expect(result).toBeNull();
  });
});
