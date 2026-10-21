import { getDiscoveryConfiguration } from "@/modules/discovery/presentation/factories/getDiscoveryConfiguration";
import { DiscoveryPage } from "../_components/DiscoveryPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Curated Archival Collections & Anthologies",
  description: "Explore thematic anthologies, historical series, and curated reading tracks on BookGarden.",
};

export default async function CollectionsPage() {
  const config = await getDiscoveryConfiguration("collections");
  return <DiscoveryPage config={config} />;
}
