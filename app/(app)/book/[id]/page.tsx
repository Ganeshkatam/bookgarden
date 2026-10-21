import { getBookPageFacade } from "@/modules/books/application/facades";
import { getBookDetail } from "@/modules/books/application/queries/GetBookDetail/handler";
import { BookDetailHero } from "@/modules/books/components/BookDetailHero";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

interface BookDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: BookDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const book = await getBookDetail(id);

  if (!book) {
    return {
      title: "Book Not Found",
      description: "The requested book could not be found in the BookGarden archive.",
    };
  }

  const authors = (book.authors || []).map((author) => author.name).join(", ");
  const description =
    book.description?.trim() ||
    `Read ${book.title}${authors ? ` by ${authors}` : ""} on BookGarden. Explore digital editions, annotations, and curated collections.`;
  const canonical = `/book/${book.id}`;

  return {
    title: authors ? `${book.title} - ${authors}` : book.title,
    description,
    authors: (book.authors || []).map((a) => ({ name: a.name })),
    alternates: {
      canonical,
    },
    openGraph: {
      type: "website",
      title: book.title,
      description,
      url: canonical,
      images: book.coverUrl
        ? [
            {
              url: book.coverUrl,
              alt: `${book.title} cover`,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: book.title,
      description,
      images: book.coverUrl ? [book.coverUrl] : undefined,
    },
  };
}

export default async function BookDetailPage({ params }: BookDetailPageProps) {
  const { id } = await params;
  const bookFacade = await getBookPageFacade();
  const data = await bookFacade.getPageData(id);

  if (!data.book) {
    notFound();
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Book",
    name: data.book.title,
    description: data.book.description || undefined,
    image: data.book.coverUrl || undefined,
    author: (data.book.authors || []).map((a) => ({
      "@type": "Person",
      name: a.name,
    })),
    inLanguage: data.book.language || "en",
    numberOfPages: data.book.pageCount || undefined,
    isbn: data.book.isbn || undefined,
    datePublished: data.book.publishedDate || undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="w-full max-w-[1760px] mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8 xl:px-12">
        <BookDetailHero
          book={data.book}
          viewer={data.viewer}
          relatedBooks={data.relatedBooks}
          authorWorks={data.authorWorks}
        />
      </div>
    </>
  );
}
