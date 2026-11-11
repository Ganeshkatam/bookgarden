import { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://bookgarden.tomesphere.in";
  const currentDate = new Date().toISOString();

  // Public canonical routes for search engines
  const staticRoutes = [
    // Home & Discovery
    { path: "", changeFrequency: "daily" as const, priority: 1.0 },
    { path: "/discover", changeFrequency: "daily" as const, priority: 0.9 },
    { path: "/discover/featured", changeFrequency: "daily" as const, priority: 0.9 },
    { path: "/discover/trending", changeFrequency: "daily" as const, priority: 0.9 },
    { path: "/discover/new", changeFrequency: "daily" as const, priority: 0.8 },
    { path: "/discover/authors", changeFrequency: "weekly" as const, priority: 0.8 },
    { path: "/discover/collections", changeFrequency: "weekly" as const, priority: 0.8 },
    { path: "/search", changeFrequency: "daily" as const, priority: 0.8 },

    // Public Information & Company
    { path: "/about", changeFrequency: "monthly" as const, priority: 0.7 },
    { path: "/contact", changeFrequency: "monthly" as const, priority: 0.6 },
    { path: "/support", changeFrequency: "weekly" as const, priority: 0.7 },
    { path: "/security", changeFrequency: "monthly" as const, priority: 0.6 },
    { path: "/report", changeFrequency: "monthly" as const, priority: 0.5 },

    // Legal & Policies
    { path: "/privacy", changeFrequency: "monthly" as const, priority: 0.5 },
    { path: "/terms", changeFrequency: "monthly" as const, priority: 0.5 },
    { path: "/cookies", changeFrequency: "monthly" as const, priority: 0.4 },
    { path: "/sitemap", changeFrequency: "weekly" as const, priority: 0.5 },
  ].map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified: currentDate,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  // Fetch published books dynamically for catalog indexing using public cookie-free client
  let bookRoutes: MetadataRoute.Sitemap = [];
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseAnonKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const { data: books } = await supabase
        .from("books")
        .select("id, updated_at")
        .eq("is_published", true)
        .eq("is_archived", false)
        .limit(5000);

      if (books && books.length > 0) {
        bookRoutes = books.map((book) => ({
          url: `${baseUrl}/book/${book.id}`,
          lastModified: book.updated_at || currentDate,
          changeFrequency: "weekly" as const,
          priority: 0.8,
        }));
      }
    } catch (error) {
      console.error("[Sitemap] Failed to fetch dynamic book routes:", error);
    }
  }

  return [...staticRoutes, ...bookRoutes];
}
