import { createSupabaseServerClient } from "@/shared/core/database/server";
import { SupabaseIdentityProvider } from "@/shared/infrastructure/identity/SupabaseIdentityProvider";
import { GetDashboardAnalyticsHandler } from "../queries/GetDashboardAnalytics/handler";
import { DashboardPageDto } from "../dto/DashboardPageDto";

export class DashboardPageFacade {
  static async execute(): Promise<DashboardPageDto> {
    const supabase = await createSupabaseServerClient();
    const identity = new SupabaseIdentityProvider(supabase);
    const user = await identity.currentUser();

    if (!user) {
      throw new Error("Unauthorized");
    }

    const handler = new GetDashboardAnalyticsHandler(supabase);
    const data = await handler.execute(user.id);

    // Enrich with auth identity details if missing
    if (!data.user.name || data.user.name === "BookGarden Scholar") {
      data.user.name = user.name || user.email?.split("@")[0] || "BookGarden Scholar";
    }
    data.user.email = user.email || data.user.email;
    data.user.avatarUrl = data.user.avatarUrl || null;

    return data;
  }
}
