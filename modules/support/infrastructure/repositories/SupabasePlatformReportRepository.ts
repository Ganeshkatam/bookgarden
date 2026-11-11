import { SupabaseClient } from "@supabase/supabase-js";
import { IPlatformReportRepository } from "../../domain/repositories/IPlatformReportRepository";
import { PlatformReport } from "../../domain/entities/PlatformReport";
import { Database } from "@/shared/core/types/database";

export class SupabasePlatformReportRepository implements IPlatformReportRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  public async save(report: PlatformReport): Promise<void> {
    const { error } = await this.supabase.from("platform_reports").insert({
      id: report.id,
      type: report.type,
      title: report.title,
      description: report.description,
      email: report.email,
      user_id: report.userId,
      status: report.status,
      created_at: report.createdAt.toISOString(),
      updated_at: report.updatedAt.toISOString(),
    });

    if (error) {
      console.error("[SupabasePlatformReportRepository] Error saving report:", error);
      throw new Error(`Failed to save platform report: ${error.message}`);
    }
  }
}
