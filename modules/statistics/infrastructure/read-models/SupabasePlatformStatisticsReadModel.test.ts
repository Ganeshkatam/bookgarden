import { SupabasePlatformStatisticsReadModel } from "./SupabasePlatformStatisticsReadModel";

describe("SupabasePlatformStatisticsReadModel", () => {
  it("fetches exact counts for published books, authors, and genres without loading full rows", async () => {
    const mockFrom = jest.fn((table: string) => {
      if (table === "books") {
        const queryBuilder: any = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
        };
        // The chain terminates after two .eq calls
        queryBuilder.eq
          .mockReturnValueOnce(queryBuilder)
          .mockResolvedValueOnce({ count: 42, error: null });
        return queryBuilder;
      }
      if (table === "authors") {
        return {
          select: jest.fn().mockResolvedValue({ count: 15, error: null }),
        };
      }
      if (table === "genres") {
        return {
          select: jest.fn().mockResolvedValue({ count: 8, error: null }),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    });

    const mockSupabase = {
      from: mockFrom,
    } as any;

    const readModel = new SupabasePlatformStatisticsReadModel(mockSupabase);
    const stats = await readModel.getStatistics();

    expect(stats).toEqual({
      booksCount: 42,
      authorsCount: 15,
      genresCount: 8,
    });

    expect(mockFrom).toHaveBeenCalledWith("books");
    expect(mockFrom).toHaveBeenCalledWith("authors");
    expect(mockFrom).toHaveBeenCalledWith("genres");
  });

  it("handles null count responses gracefully by returning 0", async () => {
    const mockFrom = jest.fn((table: string) => {
      if (table === "books") {
        const queryBuilder: any = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
        };
        queryBuilder.eq
          .mockReturnValueOnce(queryBuilder)
          .mockResolvedValueOnce({ count: null, error: null });
        return queryBuilder;
      }
      return {
        select: jest.fn().mockResolvedValue({ count: null, error: null }),
      };
    });

    const mockSupabase = {
      from: mockFrom,
    } as any;

    const readModel = new SupabasePlatformStatisticsReadModel(mockSupabase);
    const stats = await readModel.getStatistics();

    expect(stats).toEqual({
      booksCount: 0,
      authorsCount: 0,
      genresCount: 0,
    });
  });
});
