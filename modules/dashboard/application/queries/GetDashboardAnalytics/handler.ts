import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/shared/core/types/database";
import {
  DashboardPageDto,
  ActiveReadingBookDto,
  ReadingGoalDto,
  MilestoneBadgeDto,
  WeeklyActivityDayDto,
  ReadingSessionLogDto,
} from "../../dto/DashboardPageDto";

export class GetDashboardAnalyticsHandler {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async execute(userId: string): Promise<DashboardPageDto> {
    // 1. Fetch User Profile
    const { data: profile } = await this.supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", userId)
      .maybeSingle();

    // 2. Fetch User Statistics
    const { data: stats } = await this.supabase
      .from("user_statistics")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    // 3. Fetch User Reading Sessions
    const { data: sessions } = await this.supabase
      .from("reading_sessions")
      .select(`
        id,
        book_id,
        current_page,
        percentage,
        started_at,
        last_read_at,
        reading_time_minutes,
        pages,
        books (
          id,
          title,
          cover_url,
          pages,
          book_authors (
            authors ( name )
          )
        )
      `)
      .eq("user_id", userId)
      .order("last_read_at", { ascending: false });

    // 4. Fetch User Library Books
    const { data: libraryBooks } = await this.supabase
      .from("library_books")
      .select(`
        id,
        book_id,
        status,
        added_at,
        books (
          id,
          title,
          cover_url,
          pages,
          book_authors (
            authors ( name )
          )
        )
      `)
      .eq("user_id", userId)
      .order("added_at", { ascending: false });

    // 5. Fetch Reading Goals
    const { data: goals } = await this.supabase
      .from("reading_goals")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true);

    const rawSessions = sessions || [];
    const rawLibrary = libraryBooks || [];

    // Calculate real user metrics
    const computedSessionMinutes = rawSessions.reduce(
      (acc, s) => acc + (s.reading_time_minutes || 0),
      0
    );
    const computedSessionPages = rawSessions.reduce(
      (acc, s) => acc + (s.pages || 0),
      0
    );

    const totalMinutes = Math.max(stats?.minutes_read || 0, computedSessionMinutes);
    const totalPages = Math.max(stats?.pages_read || 0, computedSessionPages);

    const actualCompletedBookIds = new Set<string>([
      ...rawSessions.filter((s) => Number(s.percentage || 0) >= 100).map((s) => s.book_id),
      ...rawLibrary
        .filter((lb) => {
          if (lb.status !== "finished") return false;
          const matchingSession = rawSessions.find((s) => s.book_id === lb.book_id);
          // If the user has a session showing uncompleted pages, do not count as completed
          if (matchingSession && Number(matchingSession.percentage || 0) < 100) return false;
          return true;
        })
        .map((lb) => lb.book_id),
    ]);
    const booksCompleted = actualCompletedBookIds.size;

    const actualDistinctStarted = new Set([
      ...rawSessions.map((s) => s.book_id),
      ...rawLibrary.map((l) => l.book_id),
    ]).size;

    const booksStarted = Math.max(actualDistinctStarted, booksCompleted);

    const currentStreak = stats?.current_streak || 0;
    const longestStreak = Math.max(stats?.longest_streak || 0, currentStreak);

    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const formattedTotalTime =
      hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

    const completionRate =
      booksStarted > 0
        ? Math.min(100, Math.round((booksCompleted / booksStarted) * 100))
        : 0;
    const readingSpeedPPH =
      totalMinutes > 0 && totalPages > 0
        ? Math.round(totalPages / (totalMinutes / 60))
        : 0;

    // Active in-progress books (strict user data, deduplicated by bookId)
    const seenActiveBookIds = new Set<string>();
    let activeBooks: ActiveReadingBookDto[] = [];

    for (const s of rawSessions) {
      if (seenActiveBookIds.has(s.book_id)) continue;

      const book: any = s.books || {};
      const authorNames =
        (book.book_authors || [])
          .map((ba: any) => ba.authors?.name)
          .filter(Boolean)
          .join(", ") || "Public Domain";

      const bookPages = book.pages || s.pages || 200;
      const curPage =
        s.current_page ||
        Math.round((Number(s.percentage || 0) / 100) * bookPages);
      const percent =
        bookPages > 0
          ? Math.min(
              100,
              Math.max(
                0,
                Math.round(
                  Number(s.percentage) || (curPage > 0 ? (curPage / bookPages) * 100 : 0),
                ),
              ),
            )
          : 0;

      if (percent >= 100) continue;

      seenActiveBookIds.add(s.book_id);
      const remainingPages = Math.max(0, bookPages - curPage);
      const estMinutesRemaining = Math.max(0, Math.round(remainingPages * 1.5));

      activeBooks.push({
        bookId: s.book_id,
        title: book.title || "Untitled Volume",
        author: authorNames,
        coverUrl: book.cover_url ? book.cover_url.replace(/ /g, "%20") : null,
        currentPage: curPage,
        totalPages: bookPages,
        percentage: percent,
        readingTimeMinutes: s.reading_time_minutes || 0,
        lastReadAt: s.last_read_at || s.started_at || new Date().toISOString(),
        estMinutesRemaining,
      });
    }

    // If no active reading sessions yet, show the user's library entries
    if (activeBooks.length === 0 && rawLibrary.length > 0) {
      activeBooks = rawLibrary
        .filter((lb) => lb.status !== "finished")
        .slice(0, 4)
        .map((lb) => {
          const book: any = lb.books || {};
          const authorNames =
            (book.book_authors || [])
              .map((ba: any) => ba.authors?.name)
              .filter(Boolean)
              .join(", ") || "Public Domain";

          const bookPages = book.pages || 200;
          return {
            bookId: lb.book_id,
            title: book.title || "Untitled Volume",
            author: authorNames,
            coverUrl: book.cover_url ? book.cover_url.replace(/ /g, "%20") : null,
            currentPage: 0,
            totalPages: bookPages,
            percentage: 0,
            readingTimeMinutes: 0,
            lastReadAt: lb.added_at || new Date().toISOString(),
            estMinutesRemaining: Math.round(bookPages * 1.5),
          };
        });
    }

    // Compute real 7-day trailing activity from user's reading sessions
    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const today = new Date();
    const weeklyActivity: WeeklyActivityDayDto[] = [];

    // Map sessions to dates
    const dailyMinutesMap = new Map<string, number>();
    const dailyPagesMap = new Map<string, number>();

    rawSessions.forEach((s) => {
      if (s.last_read_at || s.started_at) {
        const dateKey = new Date(s.last_read_at || s.started_at!).toISOString().split("T")[0];
        dailyMinutesMap.set(
          dateKey,
          (dailyMinutesMap.get(dateKey) || 0) + (s.reading_time_minutes || 0)
        );
        dailyPagesMap.set(
          dateKey,
          (dailyPagesMap.get(dateKey) || 0) + (s.pages || s.current_page || 0)
        );
      }
    });

    // Reconcile with authoritative user_statistics if total sessions do not capture all historical minutes
    const totalRecordedSessionMins = Array.from(dailyMinutesMap.values()).reduce((a, b) => a + b, 0);
    const totalRecordedSessionPages = Array.from(dailyPagesMap.values()).reduce((a, b) => a + b, 0);

    if (stats?.minutes_read && stats.minutes_read > totalRecordedSessionMins && stats.last_read_date) {
      const remainingMins = stats.minutes_read - totalRecordedSessionMins;
      const targetDateKey = stats.last_read_date;
      dailyMinutesMap.set(targetDateKey, (dailyMinutesMap.get(targetDateKey) || 0) + remainingMins);
    }

    if (stats?.pages_read && stats.pages_read > totalRecordedSessionPages && stats.last_read_date) {
      const remainingPages = stats.pages_read - totalRecordedSessionPages;
      const targetDateKey = stats.last_read_date;
      dailyPagesMap.set(targetDateKey, (dailyPagesMap.get(targetDateKey) || 0) + remainingPages);
    }

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dayName = daysOfWeek[d.getDay()];
      const dateStr = d.toISOString().split("T")[0];

      const dayMins = dailyMinutesMap.get(dateStr) || 0;
      const dayPages = dailyPagesMap.get(dateStr) || 0;

      weeklyActivity.push({
        day: dayName,
        date: dateStr,
        minutes: dayMins,
        pages: dayPages,
        targetMinutes: 30,
      });
    }

    // Reading goals derived from user goals or default user targets
    const mappedGoals: ReadingGoalDto[] =
      goals && goals.length > 0
        ? goals.map((g) => {
            let label = "Annual Reading Goal";
            let unit = "books";
            let current = g.current_value || 0;

            if (g.goal_type === "books_per_year") {
              label = `${g.year || today.getFullYear()} Reading Challenge`;
              unit = "books";
              current = Math.max(g.current_value || 0, booksCompleted);
            } else if (g.goal_type === "books_per_month") {
              label = "Monthly Books Target";
              unit = "books";
              current = Math.max(g.current_value || 0, booksCompleted);
            } else if (g.goal_type === "pages_per_day") {
              label = "Daily Pages Target";
              unit = "pages";
              current = weeklyActivity[weeklyActivity.length - 1]?.pages || 0;
            } else if (g.goal_type === "pages_per_week") {
              label = "Weekly Pages Quota";
              unit = "pages";
              current = weeklyActivity.reduce((sum, d) => sum + d.pages, 0);
            } else if (g.goal_type === "daily_minutes") {
              label = "Daily Reading Target";
              unit = "mins";
              current = weeklyActivity[weeklyActivity.length - 1]?.minutes || 0;
            }

            const target = g.target_value || 1;
            const percentage = Math.min(100, Math.round((current / target) * 100));

            return {
              id: g.id,
              type: g.goal_type as any,
              label,
              target: g.target_value,
              current,
              unit,
              percentage,
              status: current >= target ? "ahead" : "on_track",
            };
          })
        : [
            {
              id: "daily-habit",
              type: "daily_minutes",
              label: "Daily Reading Target",
              target: 30,
              current: weeklyActivity[weeklyActivity.length - 1]?.minutes || 0,
              unit: "mins",
              percentage: Math.min(
                100,
                Math.round(
                  (((weeklyActivity[weeklyActivity.length - 1]?.minutes || 0) /
                    30)) *
                    100
                )
              ),
              status: "on_track",
            },
            {
              id: "annual-challenge",
              type: "annual_books",
              label: "Annual Volume Goal",
              target: 12,
              current: booksCompleted,
              unit: "books",
              percentage: Math.min(
                100,
                Math.round((booksCompleted / 12) * 100)
              ),
              status: "on_track",
            },
            {
              id: "monthly-pages",
              type: "pages_monthly",
              label: "Monthly Pages Target",
              target: 250,
              current: totalPages,
              unit: "pages",
              percentage: Math.min(
                100,
                Math.round((totalPages / 250) * 100)
              ),
              status: totalPages >= 250 ? "ahead" : "on_track",
            },
          ];

    // Real Milestones unlocked strictly when user achieves thresholds
    const milestones: MilestoneBadgeDto[] = [
      {
        id: "m-first-page",
        title: "First Edition Explorer",
        description: "Add your first volume or start reading in BookGarden",
        icon: "BookOpen",
        category: "archive",
        unlocked: booksStarted > 0,
        unlockedAt: booksStarted > 0 ? "Unlocked" : null,
        progressPercent: booksStarted > 0 ? 100 : 0,
      },
      {
        id: "m-streak-3",
        title: "Cadence Builder",
        description: "Maintain a 3-day consecutive reading streak",
        icon: "Flame",
        category: "streak",
        unlocked: currentStreak >= 3,
        unlockedAt: currentStreak >= 3 ? `${currentStreak} day streak` : null,
        progressPercent: Math.min(100, Math.round((currentStreak / 3) * 100)),
      },
      {
        id: "m-pages-100",
        title: "Century Scholar",
        description: "Read over 100 pages across digital volumes",
        icon: "Layers",
        category: "pages",
        unlocked: totalPages >= 100,
        unlockedAt: totalPages >= 100 ? `${totalPages} pages` : null,
        progressPercent: Math.min(100, Math.round((totalPages / 100) * 100)),
      },
      {
        id: "m-marathon",
        title: "Deep Immersion",
        description: "Accumulate 10+ hours (600 mins) of reading immersion",
        icon: "Clock",
        category: "time",
        unlocked: totalMinutes >= 600,
        unlockedAt: totalMinutes >= 600 ? `${Math.floor(totalMinutes / 60)}h read` : null,
        progressPercent: Math.min(100, Math.round((totalMinutes / 600) * 100)),
      },
      {
        id: "m-completed-first",
        title: "Archival Graduate",
        description: "Complete your first full volume in BookGarden",
        icon: "Award",
        category: "archive",
        unlocked: booksCompleted >= 1,
        unlockedAt: booksCompleted >= 1 ? `${booksCompleted} completed` : null,
        progressPercent: Math.min(100, booksCompleted >= 1 ? 100 : 0),
      },
    ];

    // Real session audit log from database
    let recentSessions: ReadingSessionLogDto[] = rawSessions.slice(0, 6).map((s) => {
      const b: any = s.books || {};
      return {
        id: s.id,
        bookId: s.book_id,
        bookTitle: b.title || "BookGarden Volume",
        durationMinutes: s.reading_time_minutes || 0,
        pagesRead: s.current_page || 0,
        endPage: s.current_page || 0,
        timestamp: s.last_read_at || s.started_at || new Date().toISOString(),
      };
    });

    if (recentSessions.length === 0 && rawLibrary.length > 0) {
      recentSessions = rawLibrary.slice(0, 5).map((lb) => {
        const b: any = lb.books || {};
        return {
          id: lb.id,
          bookId: lb.book_id,
          bookTitle: b.title || "BookGarden Volume",
          durationMinutes: 0,
          pagesRead: 0,
          endPage: 0,
          timestamp: lb.added_at || new Date().toISOString(),
        };
      });
    }

    // Compute authentic Diurnal Rhythm breakdown from user session timestamps
    let morningMins = 0;
    let afternoonMins = 0;
    let eveningMins = 0;
    let nightMins = 0;

    rawSessions.forEach((s) => {
      const ts = s.last_read_at || s.started_at;
      if (ts) {
        const sessionDate = new Date(ts);
        const hour = sessionDate.getHours();
        const mins = Math.max(1, s.reading_time_minutes || 1);

        if (hour >= 6 && hour < 12) {
          morningMins += mins;
        } else if (hour >= 12 && hour < 17) {
          afternoonMins += mins;
        } else if (hour >= 17 && hour < 21) {
          eveningMins += mins;
        } else {
          nightMins += mins;
        }
      }
    });

    // Fallback: If sessions are sparse but stats exists, attribute remaining stats to the last update timestamp
    if (morningMins + afternoonMins + eveningMins + nightMins === 0 && stats?.updated_at && (stats.minutes_read || 0) > 0) {
      const hour = new Date(stats.updated_at).getHours();
      const mins = stats.minutes_read || 1;
      if (hour >= 6 && hour < 12) morningMins += mins;
      else if (hour >= 12 && hour < 17) afternoonMins += mins;
      else if (hour >= 17 && hour < 21) eveningMins += mins;
      else nightMins += mins;
    }

    const totalDiurnalMins = morningMins + afternoonMins + eveningMins + nightMins;

    let morningPercent = 0;
    let afternoonPercent = 0;
    let eveningPercent = 0;
    let nightPercent = 0;

    if (totalDiurnalMins > 0) {
      morningPercent = Math.round((morningMins / totalDiurnalMins) * 100);
      afternoonPercent = Math.round((afternoonMins / totalDiurnalMins) * 100);
      eveningPercent = Math.round((eveningMins / totalDiurnalMins) * 100);
      nightPercent = Math.max(0, 100 - (morningPercent + afternoonPercent + eveningPercent));
    }

    return {
      user: {
        name: profile?.display_name || "BookGarden Scholar",
        email: "reader@bookgarden.tomesphere.in",
        avatarUrl: profile?.avatar_url || null,
      },
      metrics: {
        totalMinutes,
        formattedTotalTime,
        totalPages,
        booksCompleted,
        booksStarted,
        currentStreak,
        longestStreak,
        completionRate,
        readingSpeedPPH,
      },
      weeklyActivity,
      activeBooks: activeBooks.slice(0, 4),
      goals: mappedGoals,
      milestones,
      recentSessions,
      timeOfDayBreakdown: {
        morningPercent,
        afternoonPercent,
        eveningPercent,
        nightPercent,
      },
    };
  }
}
