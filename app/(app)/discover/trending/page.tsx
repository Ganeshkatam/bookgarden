import { getDiscoveryConfiguration } from "@/modules/discovery/presentation/factories/getDiscoveryConfiguration";
import { DiscoveryPage } from "../_components/DiscoveryPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Trending Volumes & Popular Now",
  description: "Discover high-velocity reads, trending titles, and most-engaged books on BookGarden.",
};

export default async function TrendingPage() {
  const config = await getDiscoveryConfiguration("trending");
  return <DiscoveryPage config={config} />;
}
