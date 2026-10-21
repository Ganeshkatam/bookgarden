import { getDiscoveryConfiguration } from "@/modules/discovery/presentation/factories/getDiscoveryConfiguration";
import { DiscoveryPage } from "../_components/DiscoveryPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recently Cataloged Editions & New Ingestions",
  description: "Browse freshly preserved and cataloged books newly added to the BookGarden digital archive.",
};

export default async function NewArrivalsPage() {
  const config = await getDiscoveryConfiguration("new");
  return <DiscoveryPage config={config} />;
}
