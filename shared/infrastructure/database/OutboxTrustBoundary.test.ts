import fs from "fs";
import path from "path";
import { emitOutboxEvent } from "@/shared/core/infrastructure/outbox/outbox";

describe("Outbox Trust Boundary & Privilege Containment", () => {
  describe("Architecture & Presentation Layer Isolation", () => {
    it("ensures no presentation component or client utility accesses outbox_events table", () => {
      const presentationDirs = [
        path.join(process.cwd(), "modules"),
        path.join(process.cwd(), "components"),
        path.join(process.cwd(), "app"),
      ];

      function scanFiles(dir: string, fileList: string[] = []): string[] {
        if (!fs.existsSync(dir)) return fileList;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            if (entry.name !== "node_modules" && entry.name !== ".next") {
              scanFiles(fullPath, fileList);
            }
          } else if (
            entry.name.endsWith(".ts") ||
            entry.name.endsWith(".tsx") ||
            entry.name.endsWith(".js")
          ) {
            fileList.push(fullPath);
          }
        }
        return fileList;
      }

      const allSourceFiles: string[] = [];
      for (const pDir of presentationDirs) {
        scanFiles(pDir, allSourceFiles);
      }

      const violatingFiles: string[] = [];
      const outboxRegex = /\.from\(\s*["']outbox_events["']\s*\)/i;

      for (const file of allSourceFiles) {
        // Skip server-only jobs or infrastructure
        if (
          file.includes("outbox-relay") ||
          file.includes("WorkerDatabaseClient") ||
          file.includes("outbox.ts") ||
          file.includes(".test.")
        ) {
          continue;
        }

        const content = fs.readFileSync(file, "utf-8");
        if (outboxRegex.test(content)) {
          violatingFiles.push(path.relative(process.cwd(), file));
        }
      }

      expect(violatingFiles).toEqual([]);
    });
  });

  describe("Server Admin Delegation for Outbox Emission", () => {
    it("delegates outbox emission to server-side admin client when available", async () => {
      const mockInsert = jest.fn().mockResolvedValue({ data: null, error: null });
      const mockAdminClient: any = {
        from: jest.fn().mockReturnValue({
          insert: mockInsert,
        }),
      };

      // Mock admin client creation
      jest.isolateModules(async () => {
        const adminModule = require("@/shared/core/database/admin");
        const outboxModule = require("@/shared/core/infrastructure/outbox/outbox");

        const originalCreate = adminModule.createSupabaseAdminClient;
        adminModule.createSupabaseAdminClient = jest.fn().mockReturnValue(mockAdminClient);

        try {
          await outboxModule.emitOutboxEvent(
            null, // No client provided, must use server admin client
            "reader.book.completed",
            { userId: "11111111-1111-4111-8111-111111111111", bookId: "22222222-2222-4222-8222-222222222222" },
          );

          expect(adminModule.createSupabaseAdminClient).toHaveBeenCalled();
          expect(mockAdminClient.from).toHaveBeenCalledWith("outbox_events");
          expect(mockInsert).toHaveBeenCalledWith(
            expect.objectContaining({
              event_type: "reader.book.completed",
              status: "pending",
              retry_count: 0,
            }),
          );
        } finally {
          adminModule.createSupabaseAdminClient = originalCreate;
        }
      });
    });

    it("fails closed when client-side insertion attempt encounters revoked privileges", async () => {
      const mockDeniedInsert = jest.fn().mockResolvedValue({
        data: null,
        error: {
          message: "permission denied for table outbox_events",
          code: "42501",
        },
      });

      const mockClient: any = {
        from: jest.fn().mockReturnValue({
          insert: mockDeniedInsert,
        }),
      };

      // Force outbox to use the provided (authenticated client) without admin client fallback
      const adminModule = require("@/shared/core/database/admin");
      jest.spyOn(adminModule, "createSupabaseAdminClient").mockImplementation(() => {
        throw new Error("Admin client unavailable");
      });

      await expect(
        emitOutboxEvent(mockClient, "reader.book.completed", {
          userId: "11111111-1111-4111-8111-111111111111",
          bookId: "22222222-2222-4222-8222-222222222222",
        }),
      ).rejects.toThrow("Failed to emit outbox event");

      expect(mockDeniedInsert).toHaveBeenCalled();
    });
  });
});
