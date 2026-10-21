import BookShelfRow from "./BookShelfRow";

interface FeaturedBooksSectionProps {
  items?: any[];
  isDarkSurface?: boolean;
}

export default function FeaturedBooksSection({
  items = [],
  isDarkSurface = false,
}: FeaturedBooksSectionProps) {
  return (
    <BookShelfRow
      title="Featured Books"
      description="Handpicked discoveries from the BookGarden collection."
      viewAllHref="/discover"
      viewAllTitle="All Featured Selections"
      countLabel="Featured Catalog"
      items={items}
      onDemand={false}
      isDarkSurface={isDarkSurface}
    />
  );
}
