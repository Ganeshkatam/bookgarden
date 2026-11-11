import { getDiscoveryConfiguration } from "@/modules/discovery/presentation/factories/getDiscoveryConfiguration";
import { DiscoveryPage } from "@/modules/discovery/presentation/components/DiscoveryPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Prominent Authors & Visionaries",
  description: "Discover classic and visionary authors whose works and philosophy shaped world literature.",
};

export default async function AuthorsPage() {
  const config = await getDiscoveryConfiguration("authors");
  return <DiscoveryPage config={config} />;
}
