import BookShelfRow from "./BookShelfRow";

interface TrendingBooksSectionProps {
  items?: any[];
}

export default function TrendingBooksSection({
  items = [],
}: TrendingBooksSectionProps) {
  return (
    <BookShelfRow
      title="Popular"
      description="Trending across BookGarden."
      viewAllHref="/discover/trending"
      viewAllTitle="All Popular Books"
      countLabel="Trending Now"
      items={items}
      onDemand={false}
    />
  );
}
