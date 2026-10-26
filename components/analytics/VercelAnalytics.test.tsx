import React from "react";
import "@testing-library/jest-dom";
import { render, act } from "@testing-library/react";
import { VercelAnalytics } from "./VercelAnalytics";
import { isStorageAllowed } from "@/shared/core/storage/privacy-storage";
import { Analytics } from "@vercel/analytics/next";

jest.mock("@/shared/core/storage/privacy-storage", () => ({
  isStorageAllowed: jest.fn(),
}));

jest.mock("@vercel/analytics/next", () => ({
  Analytics: jest.fn((props: any) => {
    (Analytics as any).lastProps = props;
    return <div data-testid="mock-vercel-analytics" />;
  }),
}));

describe("VercelAnalytics Component — Dynamic Consent Lifecycle", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Analytics as any).lastProps = undefined;
    document.head.innerHTML = "";
  });

  describe("Pre-Consent Blocking & Zero Script Injection", () => {
    it("does not mount or render Analytics when consent is absent or denied", () => {
      (isStorageAllowed as jest.Mock).mockReturnValue(false);

      const { queryByTestId } = render(<VercelAnalytics />);

      // Crucial: Component must return null so @vercel/analytics cannot inject script tags
      expect(queryByTestId("mock-vercel-analytics")).toBeNull();
      expect(Analytics).not.toHaveBeenCalled();
    });

    it("mounts and renders Analytics when consent is initially granted", () => {
      (isStorageAllowed as jest.Mock).mockReturnValue(true);

      const { getByTestId } = render(<VercelAnalytics />);

      expect(getByTestId("mock-vercel-analytics")).toBeInTheDocument();
      expect(Analytics).toHaveBeenCalled();
    });
  });

  describe("Dynamic Consent Transitions (Without Page Reload)", () => {
    it("dynamically mounts Analytics when consent is granted via cookie-consent-updated event", () => {
      (isStorageAllowed as jest.Mock).mockReturnValue(false);

      const { queryByTestId, getByTestId } = render(<VercelAnalytics />);
      expect(queryByTestId("mock-vercel-analytics")).toBeNull();

      // Simulate user clicking "Accept All" in CookieConsentBanner
      act(() => {
        window.dispatchEvent(
          new CustomEvent("cookie-consent-updated", {
            detail: { essential: true, functional: true, analytics: true },
          }),
        );
      });

      expect(getByTestId("mock-vercel-analytics")).toBeInTheDocument();
      expect(Analytics).toHaveBeenCalled();
    });

    it("dynamically unmounts Analytics and purges script tags when consent is withdrawn", () => {
      (isStorageAllowed as jest.Mock).mockReturnValue(true);

      // Simulate an existing injected script in head
      const mockScript = document.createElement("script");
      mockScript.src = "/_vercel/insights/script.js";
      document.head.appendChild(mockScript);
      expect(document.head.querySelector('script[src*="insights/script"]')).not.toBeNull();

      const { queryByTestId } = render(<VercelAnalytics />);
      expect(queryByTestId("mock-vercel-analytics")).toBeInTheDocument();

      // Simulate user withdrawing analytics consent
      act(() => {
        window.dispatchEvent(
          new CustomEvent("cookie-consent-updated", {
            detail: { essential: true, functional: true, analytics: false },
          }),
        );
      });

      // Assert component unmounted
      expect(queryByTestId("mock-vercel-analytics")).toBeNull();
      // Assert script tag was purged from document.head
      expect(document.head.querySelector('script[src*="insights/script"]')).toBeNull();
    });

    it("unmounts and purges scripts when consent is reset to null", () => {
      (isStorageAllowed as jest.Mock).mockReturnValue(true);

      const mockScript = document.createElement("script");
      mockScript.src = "https://va.vercel-scripts.com/v1/script.debug.js";
      document.head.appendChild(mockScript);

      const { queryByTestId } = render(<VercelAnalytics />);
      expect(queryByTestId("mock-vercel-analytics")).toBeInTheDocument();

      act(() => {
        window.dispatchEvent(
          new CustomEvent("cookie-consent-updated", { detail: null }),
        );
      });

      expect(queryByTestId("mock-vercel-analytics")).toBeNull();
      expect(document.head.querySelector('script[src*="script.debug.js"]')).toBeNull();
    });
  });

  describe("Defense-in-Depth: beforeSend Hook", () => {
    it("allows events when analytics consent is verified", () => {
      (isStorageAllowed as jest.Mock).mockReturnValue(true);

      render(<VercelAnalytics />);
      const lastProps = (Analytics as any).lastProps;
      expect(lastProps).toBeDefined();

      const mockEvent = { type: "pageview", url: "https://bookgarden.tomesphere.in/discover" };
      const result = lastProps.beforeSend(mockEvent);

      expect(result).toEqual(mockEvent);
    });

    it("drops events if isStorageAllowed returns false during in-flight send", () => {
      (isStorageAllowed as jest.Mock).mockReturnValue(true);
      render(<VercelAnalytics />);

      // Between mount and send, consent revoked
      (isStorageAllowed as jest.Mock).mockReturnValue(false);
      const lastProps = (Analytics as any).lastProps;
      const mockEvent = { type: "pageview", url: "https://bookgarden.tomesphere.in/search" };
      const result = lastProps.beforeSend(mockEvent);

      expect(result).toBeNull();
    });

    it("fails safe and drops events if privacy check throws an exception", () => {
      (isStorageAllowed as jest.Mock).mockReturnValue(true);
      render(<VercelAnalytics />);

      (isStorageAllowed as jest.Mock).mockImplementation(() => {
        throw new Error("Storage lock error");
      });

      const lastProps = (Analytics as any).lastProps;
      const mockEvent = { type: "pageview", url: "https://bookgarden.tomesphere.in/read/456" };
      const result = lastProps.beforeSend(mockEvent);

      expect(result).toBeNull();
    });
  });
});
