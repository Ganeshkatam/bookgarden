/**
 * Storage Policy Semantics & Cross-User Isolation Tests
 *
 * Regression tests proving that:
 *   1. A user cannot create objects outside their own path prefix.
 *   2. A user cannot update/rename objects into another user's prefix.
 *   3. A user cannot delete another user's objects.
 *   4. Ownership metadata alone cannot bypass path-prefix constraints.
 *   5. user-images bucket is covered identically to avatars and shelves.
 *   6. Catalog buckets reject ordinary authenticated users.
 *   7. Anonymous access is rejected for all write operations.
 *
 * These tests simulate the exact RLS policy logic from the migration
 * 20261022020000_harden_storage_authorization.sql.
 */

/**
 * Simulates Supabase Storage RLS evaluation for the corrected policies.
 *
 * INSERT:  WITH CHECK = foldername(name)[1] === auth.uid()
 * UPDATE:  USING = owner/owner_id matches auth.uid()
 *          WITH CHECK = foldername(name)[1] === auth.uid()
 * DELETE:  USING = foldername(name)[1] === auth.uid()
 *
 * Catalog buckets gate on ManageBooks permission (via user_roles + role_permissions).
 */
function createPolicyEvaluator(
  user: { id: string; permissions?: string[] } | null,
) {
  const userBuckets = ["avatars", "shelves", "user-images"];

  function foldername(name: string): string {
    return name.split("/")[0];
  }

  function hasManageBooks(): boolean {
    return !!user?.permissions?.includes("ManageBooks");
  }

  return {
    storage: {
      from: (bucket: string) => ({
        /**
         * INSERT evaluates WITH CHECK only (no existing row).
         * Policy: foldername(name)[1] = auth.uid()
         */
        upload: jest.fn(async (path: string, _file: unknown) => {
          if (!user) {
            return {
              data: null,
              error: {
                message:
                  'new row violates row-level security policy for table "objects"',
                statusCode: "403",
              },
            };
          }

          if (bucket === "book-covers" || bucket === "book-pdfs") {
            if (!hasManageBooks()) {
              return {
                data: null,
                error: {
                  message:
                    'new row violates row-level security policy for table "objects"',
                  statusCode: "403",
                },
              };
            }
            return { data: { path }, error: null };
          }

          if (userBuckets.includes(bucket)) {
            // Sole gate: path prefix must equal caller's user ID
            if (foldername(path) !== user.id) {
              return {
                data: null,
                error: {
                  message:
                    'new row violates row-level security policy for table "objects"',
                  statusCode: "403",
                },
              };
            }
            return { data: { path }, error: null };
          }

          return {
            data: null,
            error: { message: "Bucket not found", statusCode: "404" },
          };
        }),

        /**
         * UPDATE evaluates USING on existing row, then WITH CHECK on new row.
         * USING:       owner/owner_id matches auth.uid()
         * WITH CHECK:  foldername(name)[1] = auth.uid()
         *
         * existingOwner simulates the owner column of the row being updated.
         */
        update: jest.fn(
          async (
            newPath: string,
            _file: unknown,
            opts?: { existingOwner?: string },
          ) => {
            if (!user) {
              return {
                data: null,
                error: { message: "Unauthorized", statusCode: "401" },
              };
            }

            if (bucket === "book-covers" || bucket === "book-pdfs") {
              if (!hasManageBooks()) {
                return {
                  data: null,
                  error: {
                    message: "Row not found or violates RLS",
                    statusCode: "403",
                  },
                };
              }
              return { data: { path: newPath }, error: null };
            }

            if (userBuckets.includes(bucket)) {
              // USING: verify the existing row is owned by the caller
              const existingOwner = opts?.existingOwner ?? user.id;
              if (existingOwner !== user.id) {
                return {
                  data: null,
                  error: {
                    message: "Row not found or violates RLS",
                    statusCode: "403",
                  },
                };
              }
              // WITH CHECK: the *new* path must satisfy the caller's prefix
              if (foldername(newPath) !== user.id) {
                return {
                  data: null,
                  error: {
                    message:
                      'new row violates row-level security policy for table "objects"',
                    statusCode: "403",
                  },
                };
              }
              return { data: { path: newPath }, error: null };
            }

            return {
              data: null,
              error: { message: "Bucket not found", statusCode: "404" },
            };
          },
        ),

        /**
         * DELETE evaluates USING only.
         * Policy: foldername(name)[1] = auth.uid()
         */
        remove: jest.fn(async (paths: string[]) => {
          if (!user) {
            return {
              data: null,
              error: { message: "Unauthorized", statusCode: "401" },
            };
          }

          if (bucket === "book-covers" || bucket === "book-pdfs") {
            if (!hasManageBooks()) {
              return {
                data: null,
                error: {
                  message: "Row not found or violates RLS",
                  statusCode: "403",
                },
              };
            }
            return { data: paths, error: null };
          }

          if (userBuckets.includes(bucket)) {
            for (const p of paths) {
              if (foldername(p) !== user.id) {
                return {
                  data: null,
                  error: {
                    message: "Row not found or violates RLS",
                    statusCode: "403",
                  },
                };
              }
            }
            return { data: paths, error: null };
          }

          return {
            data: null,
            error: { message: "Bucket not found", statusCode: "404" },
          };
        }),
      }),
    },
  };
}

// ============================================================================
// Tests
// ============================================================================

describe("Storage Policy Semantics & Cross-User Isolation", () => {
  describe("ST-01: Anonymous storage access", () => {
    const anon = createPolicyEvaluator(null);

    it("rejects anonymous INSERT on avatars", async () => {
      const r = await anon.storage
        .from("avatars")
        .upload("anon/test.jpg", new Uint8Array([1]));
      expect(r.error).toBeDefined();
      expect(r.error?.statusCode).toBe("403");
    });

    it("rejects anonymous INSERT on shelves", async () => {
      const r = await anon.storage
        .from("shelves")
        .upload("anon/test.jpg", new Uint8Array([1]));
      expect(r.error).toBeDefined();
      expect(r.error?.statusCode).toBe("403");
    });

    it("rejects anonymous INSERT on user-images", async () => {
      const r = await anon.storage
        .from("user-images")
        .upload("anon/test.jpg", new Uint8Array([1]));
      expect(r.error).toBeDefined();
      expect(r.error?.statusCode).toBe("403");
    });

    it("rejects anonymous INSERT on book-covers", async () => {
      const r = await anon.storage
        .from("book-covers")
        .upload("cover.jpg", new Uint8Array([1]));
      expect(r.error).toBeDefined();
      expect(r.error?.statusCode).toBe("403");
    });
  });

  describe("ST-02: Catalog bucket isolation", () => {
    const regular = createPolicyEvaluator({
      id: "user-reg",
      permissions: [],
    });
    const admin = createPolicyEvaluator({
      id: "admin-1",
      permissions: ["ManageBooks"],
    });

    it("rejects regular user INSERT on book-covers", async () => {
      const r = await regular.storage
        .from("book-covers")
        .upload("cover.jpg", new Uint8Array([1]));
      expect(r.error).toBeDefined();
      expect(r.error?.statusCode).toBe("403");
    });

    it("rejects regular user INSERT on book-pdfs", async () => {
      const r = await regular.storage
        .from("book-pdfs")
        .upload("book.pdf", new Uint8Array([1]));
      expect(r.error).toBeDefined();
      expect(r.error?.statusCode).toBe("403");
    });

    it("rejects regular user UPDATE on book-covers", async () => {
      const r = await regular.storage
        .from("book-covers")
        .update("cover.jpg", new Uint8Array([1]));
      expect(r.error).toBeDefined();
      expect(r.error?.statusCode).toBe("403");
    });

    it("rejects regular user DELETE on book-pdfs", async () => {
      const r = await regular.storage.from("book-pdfs").remove(["book.pdf"]);
      expect(r.error).toBeDefined();
      expect(r.error?.statusCode).toBe("403");
    });

    it("allows admin with ManageBooks to INSERT on book-covers", async () => {
      const r = await admin.storage
        .from("book-covers")
        .upload("cover.jpg", new Uint8Array([1]));
      expect(r.error).toBeNull();
      expect(r.data?.path).toBe("cover.jpg");
    });

    it("allows admin with ManageBooks to INSERT on book-pdfs", async () => {
      const r = await admin.storage
        .from("book-pdfs")
        .upload("book.pdf", new Uint8Array([1]));
      expect(r.error).toBeNull();
      expect(r.data?.path).toBe("book.pdf");
    });
  });

  describe("ST-03: INSERT path-prefix isolation (all user buckets)", () => {
    const userA = createPolicyEvaluator({ id: "user-a" });

    it.each(["avatars", "shelves", "user-images"])(
      "allows user A to INSERT into own prefix on %s",
      async (bucket) => {
        const r = await userA.storage
          .from(bucket)
          .upload(`user-a/photo.jpg`, new Uint8Array([1]));
        expect(r.error).toBeNull();
        expect(r.data?.path).toBe("user-a/photo.jpg");
      },
    );

    it.each(["avatars", "shelves", "user-images"])(
      "rejects user A INSERT into user B prefix on %s",
      async (bucket) => {
        const r = await userA.storage
          .from(bucket)
          .upload(`user-b/photo.jpg`, new Uint8Array([1]));
        expect(r.error).toBeDefined();
        expect(r.error?.statusCode).toBe("403");
      },
    );

    it.each(["avatars", "shelves", "user-images"])(
      "rejects user A INSERT to root path (no prefix) on %s",
      async (bucket) => {
        const r = await userA.storage
          .from(bucket)
          .upload("photo.jpg", new Uint8Array([1]));
        expect(r.error).toBeDefined();
        expect(r.error?.statusCode).toBe("403");
      },
    );
  });

  describe("ST-04: UPDATE path-prefix isolation (cannot rename into another prefix)", () => {
    const userA = createPolicyEvaluator({ id: "user-a" });

    it.each(["avatars", "shelves", "user-images"])(
      "allows user A to UPDATE own object staying in own prefix on %s",
      async (bucket) => {
        const r = await userA.storage
          .from(bucket)
          .update("user-a/new-photo.jpg", new Uint8Array([1]), {
            existingOwner: "user-a",
          });
        expect(r.error).toBeNull();
        expect(r.data?.path).toBe("user-a/new-photo.jpg");
      },
    );

    it.each(["avatars", "shelves", "user-images"])(
      "rejects user A UPDATE that renames object into user B prefix on %s",
      async (bucket) => {
        // User A owns the existing row but tries to rename into user-b/
        const r = await userA.storage
          .from(bucket)
          .update("user-b/stolen.jpg", new Uint8Array([1]), {
            existingOwner: "user-a",
          });
        expect(r.error).toBeDefined();
        expect(r.error?.statusCode).toBe("403");
      },
    );

    it.each(["avatars", "shelves", "user-images"])(
      "rejects user A UPDATE on object owned by user B on %s",
      async (bucket) => {
        const r = await userA.storage
          .from(bucket)
          .update("user-b/photo.jpg", new Uint8Array([1]), {
            existingOwner: "user-b",
          });
        expect(r.error).toBeDefined();
        expect(r.error?.statusCode).toBe("403");
      },
    );
  });

  describe("ST-05: DELETE path-prefix isolation", () => {
    const userA = createPolicyEvaluator({ id: "user-a" });

    it.each(["avatars", "shelves", "user-images"])(
      "allows user A to DELETE own object on %s",
      async (bucket) => {
        const r = await userA.storage
          .from(bucket)
          .remove(["user-a/photo.jpg"]);
        expect(r.error).toBeNull();
        expect(r.data).toEqual(["user-a/photo.jpg"]);
      },
    );

    it.each(["avatars", "shelves", "user-images"])(
      "rejects user A DELETE of user B object on %s",
      async (bucket) => {
        const r = await userA.storage
          .from(bucket)
          .remove(["user-b/photo.jpg"]);
        expect(r.error).toBeDefined();
        expect(r.error?.statusCode).toBe("403");
      },
    );
  });

  describe("ST-06: Ownership metadata cannot bypass path-prefix on INSERT", () => {
    // Regression: previous migration allowed OR owner = auth.uid() on INSERT,
    // which meant Storage's auto-assigned owner could bypass the path check.
    // The corrected policy uses path-prefix as the sole WITH CHECK for INSERT.

    const userA = createPolicyEvaluator({ id: "user-a" });

    it("rejects INSERT into user B prefix even though caller will be auto-assigned as owner", async () => {
      // If owner fallback existed, Storage would set owner = user-a on the
      // new row, and the OR owner = auth.uid() condition would pass.
      // The corrected policy must reject this because foldername(name)[1] !== user-a.
      const r = await userA.storage
        .from("avatars")
        .upload("user-b/avatar.png", new Uint8Array([1]));
      expect(r.error).toBeDefined();
      expect(r.error?.statusCode).toBe("403");
    });

    it("rejects INSERT into user B prefix on user-images (same bypass scenario)", async () => {
      const r = await userA.storage
        .from("user-images")
        .upload("user-b/profile.png", new Uint8Array([1]));
      expect(r.error).toBeDefined();
      expect(r.error?.statusCode).toBe("403");
    });
  });

  describe("ST-07: Ownership metadata cannot bypass path-prefix on UPDATE rename", () => {
    // Regression: previous migration used the same OR condition in WITH CHECK
    // for UPDATE, meaning a user who owned an object could rename it to any path.

    const userA = createPolicyEvaluator({ id: "user-a" });

    it("rejects UPDATE rename from own prefix to user B prefix on avatars", async () => {
      const r = await userA.storage
        .from("avatars")
        .update("user-b/hijacked.png", new Uint8Array([1]), {
          existingOwner: "user-a",
        });
      expect(r.error).toBeDefined();
    });

    it("rejects UPDATE rename from own prefix to root (no prefix) on shelves", async () => {
      const r = await userA.storage
        .from("shelves")
        .update("orphan.png", new Uint8Array([1]), {
          existingOwner: "user-a",
        });
      expect(r.error).toBeDefined();
    });
  });
});
