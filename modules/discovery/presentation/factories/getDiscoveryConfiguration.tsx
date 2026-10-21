import React from "react";
import { DiscoveryCategory, DiscoveryConfiguration } from "../types/DiscoveryConfiguration";
import { getDiscoveryFacade } from "../../application/facades";
import { AuthorGrid } from "../components/AuthorGrid";
import { CollectionGrid } from "../components/CollectionGrid";
import { BookGrid } from "../components/BookGrid";

export async function getDiscoveryConfiguration(
  category: DiscoveryCategory
): Promise<DiscoveryConfiguration> {
  const facade = await getDiscoveryFacade();

  switch (category) {
    case "authors": {
      const data = await facade.getAuthors({ limit: 24, page: 1 });
      return {
        mode: "authors",
        title: "Popular Authors",
        subtitle: "Prolific Minds & Canonical Voices",
        description: "Explore prolific authors, historical scholars, and influential thinkers across the BookGarden archive.",
        totalCount: data.total,
        gridContent: <AuthorGrid items={data.items} />,
      };
    }
    case "collections": {
      const data = await facade.getCollections({ limit: 24, page: 1 });
      return {
        mode: "collections",
        title: "Curated Collections",
        subtitle: "Anthologies, Series & Reading Tracks",
        description: "Expertly curated reading collections categorized by theme, historical era, and academic discipline.",
        totalCount: data.total,
        gridContent: <CollectionGrid items={data.items} />,
      };
    }
    case "featured": {
      const data = await facade.getFeatured({ limit: 24, page: 1 });
      return {
        mode: "featured",
        title: "Editor's Picks",
        subtitle: "Curated Masterpieces & Essential Reading",
        description: "Hand-picked standout classics, foundational textbooks, and definitive digital editions curated by the BookGarden editorial team.",
        totalCount: data.total,
        gridContent: <BookGrid items={data.items} />,
      };
    }
    case "new": {
      const data = await facade.getNewArrivals({ limit: 24, page: 1 });
      return {
        mode: "new",
        title: "Recently Added",
        subtitle: "Latest Library Ingestions & Catalog Editions",
        description: "Explore newly ingested and cataloged digital editions, preserved manuscripts, and academic additions.",
        totalCount: data.total,
        gridContent: <BookGrid items={data.items} />,
      };
    }
    case "trending": {
      const data = await facade.getTrending({ period: "daily", limit: 24, page: 1 });
      return {
        mode: "trending",
        title: "Popular Now",
        subtitle: "High Velocity & Active Reader Trends",
        description: "Top trending titles experiencing high reader engagement, session volume, and reading velocity across the archive.",
        totalCount: data.totalCount,
        gridContent: <BookGrid items={data.books} />,
      };
    }
  }
}
