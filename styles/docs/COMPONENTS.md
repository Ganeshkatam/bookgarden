# Component Architecture Guidelines

BookGarden separates components into two categories: **UI Primitives** (shared UI library) and **Domain Components** (feature-specific UI).

```
   UI Primitives (Button, Card, Input)
              ↓
  Domain Components (BookRail, SubjectChip)
              ↓
    Screens (HomeScreen, ReaderScreen)
```

---

## 1. UI Primitives

UI Primitives live under `modules/shared/ui/`.

- **Definition**: Core visual atoms of the application (e.g. Button, Card, Input, Modal).
- **Rules**:
  - Primitives must be **domain-agnostic**. They must NEVER import domain types or reference reading/learning/books concepts.
  - Primitives must support standard customization hooks (variants, disabled state, accessibility parameters).
  - Styles reside in scoped CSS Modules (`ComponentName.module.css`) alongside the TSX.

---

## 2. Domain Components

Domain Components live beside their respective domain presentation folders (e.g., `modules/reading/home/presentation/`).

- **Definition**: Reusable components representing business features (e.g., `BookRail`, `FeaturedBookCard`, `ContinueReadingCard`).
- **Rules**:
  - Build domain components using UI Primitives (`Card`, `Button`) combined with Tailwind composition utility classes.
  - Colocate their feature styles in CSS modules (e.g., `BookRail.module.css`) to prevent leaks.
