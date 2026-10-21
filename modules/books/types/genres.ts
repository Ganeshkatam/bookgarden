// Canonical list of all normalized book genres for BookGarden
export const ALL_GENRES = [
  "Art",
  "Biography",
  "Computer Science",
  "Cybersecurity",
  "Drawing",
  "Education",
  "Fiction",
  "General",
  "Health",
  "History",
  "Mathematics",
  "Motivation",
  "Novels",
  "Philosophy",
  "Programming",
  "Science",
  "Spirituality",
  "Vedic Mathematics",
  "Yoga",
] as const;

export type GenreName = (typeof ALL_GENRES)[number];

// Get genre config with label
export function getGenreConfig(genre: string): { label: string } {
  return {
    label: genre,
  };
}

// Get all genres
export function getAllGenres(): string[] {
  return [...ALL_GENRES];
}

// Export deduplicated array
export default [...new Set(ALL_GENRES)] as string[];
