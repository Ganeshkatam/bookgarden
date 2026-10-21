import { getDiscoveryConfiguration } from "@/modules/discovery/presentation/factories/getDiscoveryConfiguration";
import { DiscoveryPage } from "../_components/DiscoveryPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Featured Masterpieces & Editor's Picks",
  description: "Explore hand-picked, curated literary treasures and foundational books on BookGarden.",
};

export default async function FeaturedPage() {
  const config = await getDiscoveryConfiguration("featured");
  return <DiscoveryPage config={config} />;
}
