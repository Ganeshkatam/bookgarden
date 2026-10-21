import Link from "next/link";
import Image from "next/image";
import {
  SlideUp,
  StaggerContainer,
  StaggerItem,
} from "@/shared/ui/animations";
import { Sparkles, BookOpen, Cpu, Compass } from "lucide-react";
import { createSupabaseServerClient } from "@/shared/core/database/server";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Our Digital Archive",
  description:
    "Learn more about BookGarden, our mission to preserve public domain literature, and our reading platform.",
};

export const revalidate = 3600; // Cache for 1 hour

export default async function AboutPage() {
  let booksCount = 17;
  let authorsCount = 21;
  let subjectsCount = 62;
  let genresCount = 19;

  try {
    const supabase = await createSupabaseServerClient();
    const [booksRes, authorsRes, subjectsRes, genresRes] = await Promise.all([
      supabase.from("books").select("*", { count: "exact", head: true }),
      supabase.from("authors").select("*", { count: "exact", head: true }),
      supabase.from("subjects").select("*", { count: "exact", head: true }),
      supabase.from("genres").select("*", { count: "exact", head: true }),
    ]);

    if (typeof booksRes.count === "number") booksCount = booksRes.count;
    if (typeof authorsRes.count === "number") authorsCount = authorsRes.count;
    if (typeof subjectsRes.count === "number") subjectsCount = subjectsRes.count;
    if (typeof genresRes.count === "number") genresCount = genresRes.count;
  } catch {
    // Graceful fallback to cached known counts
  }

  return (
    <div className="min-h-screen bg-[var(--surface-canvas)] overflow-x-hidden">
      <main className="pt-8 pb-16 sm:pt-10 sm:pb-20 relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero Section */}
          <div className="text-center mb-14 relative">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 text-xs font-semibold mb-5 animate-fade-in">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              Our Mission
            </div>
            <h1 className="text-5xl sm:text-7xl font-display font-bold mb-8 tracking-tight text-[var(--text-primary)]">
              Redefining the <br />
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent drop-shadow-xs dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400">
                Reading Experience
              </span>
            </h1>
            <p className="text-xl sm:text-2xl text-[var(--text-secondary)] max-w-3xl mx-auto leading-relaxed">
              BookGarden is a next-generation platform built for book lovers. We
              blend artificial intelligence, rich taxonomies, and thoughtful
              design to help you discover, track, and enjoy literature like
              never before.
            </p>
          </div>

          {/* Real Stats Grid */}
          <StaggerContainer className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-32 max-w-4xl mx-auto">
            <StaggerItem>
              <div className="flex flex-col items-center justify-center p-8 rounded-3xl bg-[var(--surface-default)] border border-[var(--border-default)] hover:border-indigo-500/40 transition-colors shadow-sm group">
                <div className="text-4xl sm:text-5xl font-bold text-indigo-600 dark:text-indigo-400 mb-2 group-hover:scale-110 transition-transform">
                  {booksCount}
                </div>
                <div className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider text-center">
                  Curated Books
                </div>
              </div>
            </StaggerItem>
            <StaggerItem>
              <div className="flex flex-col items-center justify-center p-8 rounded-3xl bg-[var(--surface-default)] border border-[var(--border-default)] hover:border-purple-500/40 transition-colors shadow-sm group">
                <div className="text-4xl sm:text-5xl font-bold text-purple-600 dark:text-purple-400 mb-2 group-hover:scale-110 transition-transform">
                  {authorsCount}
                </div>
                <div className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider text-center">
                  Verified Authors
                </div>
              </div>
            </StaggerItem>
            <StaggerItem>
              <div className="flex flex-col items-center justify-center p-8 rounded-3xl bg-[var(--surface-default)] border border-[var(--border-default)] hover:border-pink-500/40 transition-colors shadow-sm group">
                <div className="text-4xl sm:text-5xl font-bold text-pink-600 dark:text-pink-400 mb-2 group-hover:scale-110 transition-transform">
                  {subjectsCount}
                </div>
                <div className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider text-center">
                  Subject Topics
                </div>
              </div>
            </StaggerItem>
            <StaggerItem>
              <div className="flex flex-col items-center justify-center p-8 rounded-3xl bg-[var(--surface-default)] border border-[var(--border-default)] hover:border-sky-500/40 transition-colors shadow-sm group">
                <div className="text-4xl sm:text-5xl font-bold text-sky-600 dark:text-sky-400 mb-2 group-hover:scale-110 transition-transform">
                  100%
                </div>
                <div className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider text-center">
                  Free & Open Access
                </div>
              </div>
            </StaggerItem>
          </StaggerContainer>

          {/* Story Section */}
          <div className="grid md:grid-cols-2 gap-16 items-center mb-32">
            <SlideUp>
              <div className="relative aspect-square rounded-3xl overflow-hidden bg-[var(--surface-default)] border border-[var(--border-default)] shadow-xl group">
                <Image
                  src="/about_showcase.jpg"
                  alt="A Universe of Books - BookGarden Reading Workspace"
                  fill
                  className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  priority
                />
                {/* Subtle gradient vignette to blend card seamlessly */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-8 text-white">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold w-fit mb-3 border border-white/30">
                    <BookOpen size={14} />
                    <span>A Universe of Books</span>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">
                    Digital Knowledge Sanctuary
                  </h3>
                  <p className="text-slate-200 text-sm leading-relaxed">
                    Everything you need to discover, track, and enjoy your reading life in one beautifully designed workspace.
                  </p>
                </div>
              </div>
            </SlideUp>

            <SlideUp delay={0.2}>
              <div>
                <h2 className="text-3xl sm:text-4xl font-display font-bold mb-6 text-[var(--text-primary)]">
                  Why We Built BookGarden
                </h2>
                <div className="space-y-6 text-[var(--text-secondary)] text-lg leading-relaxed">
                  <p>
                    We believe that reading is one of the most powerful tools
                    for human growth, empathy, and learning. However,
                    finding the right book and keeping track of your reading
                    journey has often felt fragmented across disjointed platforms.
                  </p>
                  <p>
                    BookGarden was created to solve this. We wanted a single,
                    unified sanctuary where readers could discover new literature,
                    track their reading progress, take notes, and explore structured
                    subjects and genres.
                  </p>
                  <p>
                    By combining a distraction-free interface with
                    modern search and recommendation engines, we aim to make every reading
                    session more productive.
                  </p>
                </div>
              </div>
            </SlideUp>
          </div>

          {/* Features Grid */}
          <div className="mb-32">
            <h2 className="text-3xl sm:text-4xl font-display font-bold mb-12 text-center text-[var(--text-primary)]">
              What Makes Us Different
            </h2>
            <div className="grid sm:grid-cols-3 gap-8">
              <div className="bg-[var(--surface-default)] p-8 rounded-3xl border border-[var(--border-default)] hover:border-indigo-500/40 transition-all hover:-translate-y-1 shadow-sm">
                <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-6 text-indigo-600 dark:text-indigo-400">
                  <Cpu size={24} />
                </div>
                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3">
                  Smart Discovery
                </h3>
                <p className="text-[var(--text-secondary)]">
                  Full-text search, typo tolerance, and rich subject taxonomies help you locate the exact knowledge you need.
                </p>
              </div>
              <div className="bg-[var(--surface-default)] p-8 rounded-3xl border border-[var(--border-default)] hover:border-purple-500/40 transition-all hover:-translate-y-1 shadow-sm">
                <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-6 text-purple-600 dark:text-purple-400">
                  <Compass size={24} />
                </div>
                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3">
                  Curated Catalog
                </h3>
                <p className="text-[var(--text-secondary)]">
                  Explore organized collections, normalized genre structures, and verified authors across diverse domains.
                </p>
              </div>
              <div className="bg-[var(--surface-default)] p-8 rounded-3xl border border-[var(--border-default)] hover:border-pink-500/40 transition-all hover:-translate-y-1 shadow-sm">
                <div className="w-12 h-12 bg-pink-500/10 rounded-2xl flex items-center justify-center mb-6 text-pink-600 dark:text-pink-400">
                  <Sparkles size={24} />
                </div>
                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3">
                  Premium Experience
                </h3>
                <p className="text-[var(--text-secondary)]">
                  Enjoy a clutter-free, responsive interface with dark and light theme support built for reading flow.
                </p>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="relative rounded-3xl overflow-hidden border border-[var(--border-default)] p-12 sm:p-20 text-center shadow-xl group">
            {/* Background Illustration */}
            <Image
              src="/about_cta_banner.jpg"
              alt="BookGarden Grand Library Experience"
              fill
              className="object-cover object-center group-hover:scale-105 transition-transform duration-700 pointer-events-none"
              sizes="100vw"
            />
            {/* Glassmorphic dark gradient overlay for crystal clear contrast */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/60 to-black/85 backdrop-blur-[2px] pointer-events-none" />

            <div className="relative z-10 max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 border border-white/25 text-white text-xs font-semibold mb-6 backdrop-blur-md">
                <Sparkles size={14} className="text-indigo-300" />
                <span>Begin Your Journey</span>
              </div>
              <h2 className="text-3xl sm:text-5xl font-display font-bold mb-5 text-white tracking-tight drop-shadow-md">
                Ready to start your journey?
              </h2>
              <p className="text-lg sm:text-xl text-slate-200 mb-8 max-w-xl mx-auto leading-relaxed drop-shadow-sm">
                Join readers who have made BookGarden their home for focused, distraction-free literature.
              </p>
              <Link
                href="/signup"
                className="inline-flex items-center justify-center px-8 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-base sm:text-lg font-bold transition-all shadow-xl shadow-indigo-950/40 hover:scale-105 active:scale-95 cursor-pointer"
              >
                Create Account
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
