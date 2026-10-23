"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { safeStorage } from "@/shared/core/storage/privacy-storage";

export type Theme = "system" | "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("dark");

  const applyTheme = (t: Theme) => {
    const root = document.documentElement;
    const isDark =
      t === "dark" ||
      (t === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);

    // Disable transitions during theme change to prevent flash/layout-jank
    root.classList.add("theme-changing");

    if (isDark) {
      root.classList.add("dark");
      root.classList.remove("light");
      setResolvedTheme("dark");
    } else {
      root.classList.remove("dark");
      root.classList.add("light");
      setResolvedTheme("light");
    }

    // Re-enable transitions in the next paint cycle
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        root.classList.remove("theme-changing");
      });
    });
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    safeStorage.setItem("theme", newTheme, "functional", { preferredStore: "cookie" });
    applyTheme(newTheme);
  };

  // Load initial theme from cookie-first storage on mount
  useEffect(() => {
    const savedTheme = (safeStorage.getItem("theme", "functional") as Theme | null) || "system";
    setThemeState(savedTheme);
    applyTheme(savedTheme);
  }, []);

  // Listen to OS prefers-color-scheme changes dynamically
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const listener = () => {
      let currentTheme: Theme = "system";
      try {
        currentTheme =
          (safeStorage.getItem("theme", "functional") as Theme | null) || "system";
      } catch (e) {
        currentTheme = "system";
      }
      if (currentTheme === "system") {
        applyTheme("system");
      }
    };

    // Modern EventListener API
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  // Sync theme preferences across browser tabs and consent updates
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "theme") {
        const newTheme = (e.newValue as Theme | null) || "system";
        setThemeState(newTheme);
        applyTheme(newTheme);
      }
    };

    const handleConsentChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ functional?: boolean }>;
      if (customEvent.detail && !customEvent.detail.functional) {
        // Functional consent withdrawn: revert to system theme
        setThemeState("system");
        applyTheme("system");
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("cookie-consent-updated", handleConsentChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("cookie-consent-updated", handleConsentChange);
    };
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
