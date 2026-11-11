import type { Metadata } from "next";
import { Atkinson_Hyperlegible, Source_Serif_4, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "@/shared/layout/layout.css";
import { Providers } from "./providers";
import { themeInitScript } from "./theme-init";
import { createSupabaseServerClient } from "@/shared/core/database/server";
import { SupabaseAnnouncementReadModel } from "@/modules/announcements/infrastructure/read-models/SupabaseAnnouncementReadModel";
import { GetActiveAnnouncementsQueryHandler } from "@/modules/announcements/application/queries/GetActiveAnnouncements/handler";
import { AnnouncementBanner } from "@/modules/announcements/presentation/components/AnnouncementBanner";
import { AnnouncementNotice } from "@/modules/announcements/presentation/components/AnnouncementNotice";
import CookieConsentBanner from "@/components/cookies/CookieConsentBanner";
import VercelAnalytics from "@/components/analytics/VercelAnalytics";

const atkinson = Atkinson_Hyperlegible({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "700"],
  variable: "--font-atkinson",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "600", "700"],
  variable: "--font-source-serif",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL!),
  title: {
    default: "BookGarden - Digital Book Discovery, Knowledge Archive & Reader",
    template: "%s | BookGarden",
  },
  description:
    "Explore, read, and annotate digital books in an integrated reader. Discover curated literature, verified author directories, and archival collections with distraction-free reading.",
  keywords: [
    "books",
    "digital books",
    "book discovery",
    "online reader",
    "public domain books",
    "BookGarden",
    "reading annotations",
    "epub reader",
    "pdf reader",
    "curated collections",
    "reading progress",
  ],
  authors: [{ name: "BookGarden Editorial Team" }],
  creator: "BookGarden",
  publisher: "BookGarden",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/logo.svg", type: "image/svg+xml" },
      { url: "/logo.png?v=5", type: "image/png" },
      { url: "/icon.png?v=5", type: "image/png" },
      { url: "/favicon.ico?v=5" },
    ],
    shortcut: "/logo.png?v=5",
    apple: "/logo.png?v=5",
  },
  openGraph: {
    type: "website",
    siteName: "BookGarden",
    locale: "en_US",
    title: "BookGarden - Digital Book Discovery, Knowledge Archive & Reader",
    description:
      "Explore, read, and annotate digital books in an integrated reader. Discover curated literature, verified author directories, and archival collections.",
    url: "https://bookgarden.tomesphere.in",
    images: [
      {
        url: "/logo.png?v=5",
        width: 512,
        height: 512,
        alt: "BookGarden Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BookGarden - Digital Book Discovery, Knowledge Archive & Reader",
    description:
      "Explore, read, and annotate digital books in an integrated reader. Discover curated literature and archival collections.",
    images: ["/logo.png?v=5"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport = {
  themeColor: "#6366f1",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let activeAnnouncements: any[] = [];
  try {
    const supabase = await createSupabaseServerClient();
    const announcementsRepo = new SupabaseAnnouncementReadModel(supabase);
    const announcementsQuery = new GetActiveAnnouncementsQueryHandler(announcementsRepo);
    activeAnnouncements = await announcementsQuery.execute().catch(() => []);
  } catch {
    activeAnnouncements = [];
  }

  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${atkinson.variable} ${sourceSerif.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <link rel="icon" href="/logo.svg" type="image/svg+xml" />
        <link rel="icon" href="/logo.png?v=5" type="image/png" sizes="any" />
        <link rel="shortcut icon" href="/logo.png?v=5" type="image/png" />
        <link rel="apple-touch-icon" href="/logo.png?v=5" />
        <script
          id="theme-init-script"
          dangerouslySetInnerHTML={{
            __html: themeInitScript,
          }}
          suppressHydrationWarning
        />
      </head>
      <body className="antialiased font-sans flex flex-col min-h-screen" suppressHydrationWarning>
        <Providers>
          {/* Universal Maintenance & System Announcement Banner Across All Routes */}
          <AnnouncementBanner announcements={activeAnnouncements} />
          <AnnouncementNotice announcements={activeAnnouncements} />
          <CookieConsentBanner />
          {children}
          <VercelAnalytics />
        </Providers>
      </body>
    </html>
  );
}
