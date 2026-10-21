# BookGarden Architectural Rules & Conventions

**STATUS: ENFORCED**
This document serves as the absolute source of truth for architectural boundaries within the BookGarden platform. Do not merge PRs that violate these rules.

## 1. Directory Strictness

- **`NO NEW ROOT FOLDERS IN /app`**: The `/app` directory is exclusively for Next.js App Router routing (`page.tsx`, `layout.tsx`, `route.ts`).
- **`NO UI COMPONENTS IN /app`**: All business logic and UI must live inside `/modules` or `/components/ui`.
- **`ALL NEW LOGIC GOES INTO /modules`**: Feature-Sliced Design is mandatory. If you build a new feature, create a new module (e.g., `/modules/planner`).

## 2. Module Ownership Contract

Every module (e.g., `/modules/books`) MUST strictly own its:

- `/actions` (Server Actions / Mutations)
- `/components` (Domain-aware UI components)
- `/services` (Business logic / Heavy compute)
- `/schemas` (Zod validation contracts)
- `/types` (TypeScript interfaces)
- `/hooks` (Client-side React hooks)
- `/pages` (Top-level view orchestration to be imported by `/app`)

## 3. Security & Type Safety

- **`NO "any" TYPES`**: All data fetched from Supabase must be strictly typed using generated Database types or strict Zod schemas.
- **`ALL MUTATIONS REQUIRE ZOD`**: Never trust client input. Every Server Action must validate inputs using Zod before interacting with the database.
- **`NEVER LEAK RAW ERRORS`**: Catch blocks must log raw errors internally and return sanitized, generic error strings to the user to prevent PostgreSQL schema leaks.

## 4. UI Component Hierarchy

- **`/components/ui`**: Reserved strictly for highly reusable, domain-agnostic primitives (e.g., `Button`, `Modal`, `Input`).

- **`/modules/[domain]/components`**: Reserved for business-specific UI (e.g., `BookCard`, `StudyPlanWidget`).
- **`NO DUPLICATE SYSTEMS`**: Do not create generic components outside of `/components/ui`.

## 5. Performance Constraints

- **`ALL COLLECTION QUERIES MUST PAGINATE`**: Do not use unbounded `.select('*')` queries. Feeds, messages, and searches must enforce a `.limit()`.
- **`USE GRANULAR SUSPENSE`**: Wrap heavy data-fetching components in `<Suspense>` rather than relying exclusively on global `loading.tsx` files.

## 6. Route Topology Freeze (V1)

**The public route topology for V1 is explicitly frozen. No new top-level routes may be introduced without architectural justification.**

- **Discovery:** Canonical destinations only (`/discover`, `/discover/authors`, etc.). Filters strictly belong in query parameters.
- **Authentication:** Flows are fixed (`/login`, `/signup`, `/forgot-password`, `/reset-password`).
- **Workspace:** Maps directly to bounded contexts (`/me`, `/library`, `/me/account`).
- **Reader:** Remains a standalone application shell (`/read/[id]`).
- **Admin:** Evolves independently from the public app as a separate bounded context.

---

_These rules are designed to prevent architectural entropy. If a pattern doesn't fit within these rules, the pattern is likely wrong._
