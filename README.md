# BookGarden

[![Website](https://img.shields.io/badge/Website-bookgarden.tomesphere.in-4f46e5?style=flat-square)](https://bookgarden.tomesphere.in)

BookGarden is a next-generation digital reading platform and knowledge archive built with clean architecture, domain-driven design, and a modern web technology stack.

---

## Overview

BookGarden provides readers, students, and researchers with a focused, distraction-free environment to discover, read, annotate, and organize literature. The platform combines full-text catalog search, normalized subject taxonomies, customizable personal bookshelves, and an integrated reader experience with cross-device reading progress.

---

## Core Capabilities

- **Catalog Discovery & Search**: High-performance full-text search with typo tolerance, verified author directories, and multi-facet filtering across subjects and genres.
- **Distraction-Free Reader**: Dedicated reader shell supporting PDF and EPUB formats with custom typography, font sizing, line height controls, and theme modes.
- **Reading Annotations & Highlights**: Inline text highlighting, color coding, page bookmarks, and markdown study notes anchored to book positions.
- **Personal Bookshelves**: User-curated custom reading shelves, library reading status queues (Want to Read, Currently Reading, Completed), and annual reading goals.
- **Granular Security & Privacy**: 100% Row Level Security (RLS) enforcement across all database tables, isolated background workers, and automated GDPR data export packages.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Runtime & Framework** | Next.js 16 (Turbopack, App Router, React 19) on Node.js 24+ |
| **Language** | TypeScript 5 (Strict Mode) |
| **Styling** | Tailwind CSS with Semantic Theme Tokens (Light & Dark modes) |
| **Database** | PostgreSQL 17.6 via Supabase |
| **ORM & Client** | Supabase SSR Client with strictly generated TypeScript database types |
| **Icons** | Lucide React |

---

## Getting Started

### Prerequisites

- Node.js 24.0.0 or higher
- npm 10 or higher
- A configured Supabase project (PostgreSQL 15+)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Ganeshkatam/bookgarden.git
   cd bookgarden
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_APP_URL=https://your_website_url
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

4. Run database migrations:
   Apply migrations through the Supabase CLI or management dashboard.

5. Start the development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

---

## Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Next.js development server with Turbopack |
| `npm run dev:host` | Starts the development server binding to `0.0.0.0` for network testing |
| `npm run build` | Compiles and optimizes the production build |
| `npm run start` | Starts the Next.js production server |
| `npm run lint` | Runs ESLint across all routes, modules, and components |
| `npm run test` | Executes domain and application test suites using Jest |
| `npx tsc --noEmit` | Validates TypeScript strict mode type checking without emitting files |

---

## License

This project is licensed under the MIT License.
