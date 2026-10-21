"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { BookOpen, Check, ArrowUp } from "lucide-react";
import { useState, useEffect } from "react";

const DISCOVER_LINKS = [
  { label: "Browse Catalog", href: "/discover" },
  { label: "Featured Books", href: "/discover/featured" },
  { label: "Trending Titles", href: "/discover/trending" },
  { label: "New Arrivals", href: "/discover/new" },
];

const COMPANY_LINKS = [
  { label: "About Us", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Sitemap", href: "/sitemap" },
];

const SUPPORT_LINKS = [
  { label: "Help & Support", href: "/support" },
  { label: "System Status", href: "/maintenance" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
  { label: "Cookie Policy", href: "/cookies" },
];

const HIDE_FOOTER_ROUTES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/read",
  "/account",
  "/me",
  "/me/onboarding",
];

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const pathname = usePathname();
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const shouldHideFooter = HIDE_FOOTER_ROUTES.some(
    (route) => pathname === route || pathname?.startsWith(route + "/"),
  );

  if (shouldHideFooter) return null;

  return (
    <footer className="relative overflow-hidden bg-[var(--surface-default)] border-t border-[var(--border-default)] transition-colors duration-200">
      <div className="relative w-full max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
        {/* ── Main Columns ── */}
        <div className="pt-16 pb-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand Column (2 cols on lg) */}
          <div className="flex flex-col gap-5 lg:col-span-2">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group w-fit">
              <div className="relative w-9 h-9 rounded-xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-md shadow-indigo-500/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Image
                  src="/logo.png"
                  alt="BookGarden Logo"
                  width={36}
                  height={36}
                  className="object-contain p-0.5"
                />
              </div>
              <span className="text-xl font-display font-extrabold text-[var(--text-primary)] tracking-tight">
                BookGarden
              </span>
            </Link>

            {/* Mission statement */}
            <p className="text-[var(--text-secondary)] text-sm leading-relaxed max-w-sm">
              Discover, read, and organize knowledge with a clean, focused digital library experience designed for readers everywhere.
            </p>

            {/* Brand benefits */}
            <ul className="space-y-2.5">
              {[
                "Distraction-free reading environment",
                "Curated taxonomy & verified authors",
                "Synchronized across your devices",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2.5 text-[var(--text-secondary)] text-xs"
                >
                  <span className="w-4 h-4 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center flex-shrink-0 text-indigo-600 dark:text-indigo-400">
                    <Check size={10} strokeWidth={3} />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Discover Column */}
          <div>
            <p className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider mb-4">
              Discover
            </p>
            <ul className="space-y-3">
              {DISCOVER_LINKS.map(({ label, href }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-[var(--text-secondary)] hover:text-indigo-600 dark:hover:text-indigo-400 text-sm font-medium transition-colors duration-150 inline-block"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Column */}
          <div>
            <p className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider mb-4">
              Company
            </p>
            <ul className="space-y-3">
              {COMPANY_LINKS.map(({ label, href }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-[var(--text-secondary)] hover:text-indigo-600 dark:hover:text-indigo-400 text-sm font-medium transition-colors duration-150 inline-block"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Column */}
          <div>
            <p className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider mb-4">
              Support & Legal
            </p>
            <ul className="space-y-3">
              {SUPPORT_LINKS.map(({ label, href }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-[var(--text-secondary)] hover:text-indigo-600 dark:hover:text-indigo-400 text-sm font-medium transition-colors duration-150 inline-block"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Bottom Bar ── */}
        <div className="py-6 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--text-tertiary)]">
          <span>&copy; {currentYear} BookGarden. All rights reserved.</span>
          <div className="flex items-center gap-6">
            <Link
              href="/privacy"
              className="hover:text-[var(--text-primary)] transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="hover:text-[var(--text-primary)] transition-colors"
            >
              Terms
            </Link>
            <Link
              href="/cookies"
              className="hover:text-[var(--text-primary)] transition-colors"
            >
              Cookies
            </Link>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new Event("open-cookie-preferences"));
                }
              }}
              className="hover:text-[var(--text-primary)] transition-colors cursor-pointer text-left"
            >
              Cookie Settings
            </button>
            <Link
              href="/sitemap"
              className="hover:text-[var(--text-primary)] transition-colors"
            >
              Sitemap
            </Link>
          </div>
          <span className="text-[var(--text-tertiary)] font-medium">Read • Learn • Remember</span>
        </div>
      </div>

      {/* Scroll to top button */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-50 w-11 h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer"
          aria-label="Scroll to top"
        >
          <ArrowUp size={18} />
        </button>
      )}
    </footer>
  );
}
