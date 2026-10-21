import Link from "next/link";
import { Compass, BookOpen, ShieldCheck, HelpCircle } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sitemap | BookGarden",
  description: "Browse all pages, discovery catalogs, reader features, and policy resources available on BookGarden.",
};

export default function SitemapPage() {
  const sections = [
    {
      title: "Discover & Books",
      icon: Compass,
      description: "Explore curated collections, authors, trending publications, and global search.",
      links: [
        { href: "/", label: "Home" },
        { href: "/discover", label: "Discover Hub" },
        { href: "/discover/featured", label: "Featured Books" },
        { href: "/discover/trending", label: "Trending Publications" },
        { href: "/discover/new", label: "New Releases" },
        { href: "/discover/authors", label: "Authors Directory" },
        { href: "/discover/collections", label: "Curated Collections" },
        { href: "/search", label: "Global Book Search" },
      ],
    },
    {
      title: "Library & Workspace",
      icon: BookOpen,
      description: "Access your private reader dashboard, library shelves, highlights, notes, and profile.",
      links: [
        { href: "/me/dashboard", label: "Reading Dashboard" },
        { href: "/me/library", label: "Personal Library" },
        { href: "/me/shelves", label: "Custom Shelves" },
        { href: "/me/annotations", label: "Highlights & Annotations" },
        { href: "/me/notes", label: "Reading Notes" },
        { href: "/me/onboarding", label: "Onboarding Experience" },
        { href: "/me/account/profile", label: "Account Profile" },
        { href: "/me/account/preferences", label: "Reader Preferences" },
        { href: "/me/account/security", label: "Security & Credentials" },
        { href: "/me/account/storage", label: "Storage Allocation" },
        { href: "/me/account/notifications", label: "Notification Settings" },
        { href: "/me/account/connections", label: "Connected Devices & Apps" },
      ],
    },
    {
      title: "Company & Support",
      icon: HelpCircle,
      description: "Learn more about our platform mission, contact customer support, or submit feedback.",
      links: [
        { href: "/about", label: "About BookGarden" },
        { href: "/contact", label: "Contact Us" },
        { href: "/support", label: "Help & Support Center" },
        { href: "/security", label: "Security Standards" },
        { href: "/report", label: "Report an Issue or Content" },
      ],
    },
    {
      title: "Legal & Access",
      icon: ShieldCheck,
      description: "Platform policies, service terms, cookie preferences, and authentication gateways.",
      links: [
        { href: "/privacy", label: "Privacy Policy" },
        { href: "/terms", label: "Terms of Service" },
        { href: "/cookies", label: "Cookie Policy" },
        { href: "/sitemap", label: "HTML Sitemap" },
        { href: "/login", label: "Sign In" },
        { href: "/signup", label: "Create Account" },
        { href: "/forgot-password", label: "Password Recovery" },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--surface-canvas)] overflow-x-hidden">
      <main className="pt-8 pb-16 sm:pt-12 sm:pb-24 max-w-5xl mx-auto px-4 sm:px-6">
        <div className="bg-[var(--surface-default)] p-8 sm:p-12 rounded-3xl border border-[var(--border-default)] shadow-sm">
          <div className="mb-10 pb-8 border-b border-[var(--border-default)]">
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-[var(--text-primary)] mb-3">
              BookGarden Sitemap
            </h1>
            <p className="text-sm sm:text-base text-[var(--text-secondary)] font-sans max-w-2xl">
              A comprehensive index of public catalogs, personal workspace destinations, support channels, and legal policies on BookGarden.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 sm:gap-12">
            {sections.map((sec) => {
              const Icon = sec.icon;
              return (
                <div key={sec.title} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                      <Icon size={20} />
                    </div>
                    <div>
                      <h2 className="text-xl font-display font-bold text-[var(--text-primary)]">
                        {sec.title}
                      </h2>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
                    {sec.description}
                  </p>

                  <ul className="space-y-2.5 pt-2">
                    {sec.links.map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline inline-flex items-center gap-1.5 transition-colors"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 dark:bg-indigo-600" />
                          <span>{link.label}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
