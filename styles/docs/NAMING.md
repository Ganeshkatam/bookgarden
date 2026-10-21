# Naming Conventions

Maintain strict naming consistency across BookGarden styles, design tokens, primitives, layouts, and domain components.

---

## 1. CSS Custom Properties (Variables)

- **Format**: All variables must use kebab-case.
- **Prefixes**:
  - Raw color palette: `--[color]-[shade]` (e.g., `--slate-950`, `--indigo-500`).
  - Spacing scale: `--space-[index]` (e.g., `--space-4`, `--space-16`).
  - Border radius: `--radius-[scale]` (e.g., `--radius-md`, `--radius-3xl`).
  - Transition duration: `--duration-[speed]` (e.g., `--duration-fast`).
  - Transition easing: `--ease-[type]` (e.g., `--ease-spring`).
  - Z-Index layers: `--z-[layer]` (e.g., `--z-modal`, `--z-header`).
  - Semantic variables: `--[concept]-[modifier]` (e.g., `--surface-canvas`, `--border-default`, `--text-primary`).

---

## 2. CSS Class Names (Global & Layout)

- **Format**: Kebab-case.
- **Prefixes**:
  - Layout primitives: `.layout-[name]` (e.g., `.layout-stack`, `.layout-cluster`, `.layout-rail`).
  - Layout modifiers: `.layout-[name]-[modifier]` (e.g., `.layout-stack-lg`, `.layout-cluster-xs`).
  - Global utilities: Kebab-case without prefix (e.g., `.visually-hidden`, `.no-scrollbar`, `.spinner`).

---

## 3. CSS Modules

- **Format**: camelCase for class selectors to enable direct key access in JavaScript.
  ```typescript
  import styles from './Button.module.css';
  // ...
  className={styles.buttonSpinner}
  ```
- **File Naming**: Match the React component file name (e.g., `ContinueReadingCard.module.css` for `ContinueReadingCard.tsx`).

---

## 4. React Components

- **Format**: PascalCase.
- **Directories**:
  - UI Primitives (domain-agnostic): `modules/shared/ui/[ComponentName]/[ComponentName].tsx`
  - Domain Components (business logic/data-dependent): `modules/[domain]/[feature]/presentation/[ComponentName].tsx`
- **Naming Rule**: Domain components must reflect product concepts, not screen locations.
  -  `HomeHero`
  -  `FeaturedBookCard`
  -  `LibrarySidebar`
  -  `BookshelfNavigation`
