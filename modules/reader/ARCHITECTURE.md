# Reader Domain Architecture

This module is the **highest-complexity, highest-performance-pressure subsystem** in BookGarden. It must be treated with extreme architectural rigor.

##  Core Directives

### 1. State Management (Anti-Collapse Rule)

Do **NOT** use a giant global React Context for the reader.

- **Global State (`/state/reader-store.ts`)**: ONLY for session-level coordination (active book, current page, sync status, offline mode). We use Zustand for this to allow out-of-react subscriptions.
- **Local State**: Interaction-heavy UI (selection coordinates, hover states, toolbar visibility) MUST live in local component state. If centralized, render performance will collapse.

### 2. Services Split

Services are strictly bounded:

- `parser/`: Parsing logic (PDF.js wrappers, ePub.js adapters).
- `sync/`: Network synchronization (annotations, progress).
- `persistence/`: Local IndexedDB caching and offline snapshots.

### 3. Annotations Subsystem

Annotations (highlights, notes, comments, references) are a massive domain. They have their own dedicated bounded context at `/modules/reader/annotations`. Do not leak annotation logic into the base reader components.

### 4. Progress Tracking

Progress (`/progress`) is currently tracked here, but it will eventually become shared learning infrastructure powering analytics, recommendations, and the planner.

## Module Structure

```text
/modules/reader
├── contracts/       #  Foundation: Abstract models and engine interfaces
├── application/     # Application services and CQRS commands
├── domain/          # Domain entities and events
├── infrastructure/  # Repositories and external integrations
├── presentation/    # Screens and composite views
├── components/      # Pure UI components (Viewer, Toolbar)
├── services/        # Adapters (PdfJsEngine) and parsers
├── state/           # Session-level Zustand stores
└── annotations/     # Annotations bounded context
```
