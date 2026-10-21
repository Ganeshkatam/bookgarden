# Design System Contributor Guide

Follow these guidelines when contributing new styles or components to BookGarden.

## 1. When to add a new token

- **Raw Palette Token**: Only when introducing a completely new color spectrum.
- **Semantic Theme Token**: When introducing a state/element with visual adaptations across themes. Mappings should exist in both `dark.css` and `light.css`.
- **Generated TS Tokens**: Do not write manually. Re-run `npm run generate-tokens` to parse variables to `tokens.ts`.

## 2. Layout Primitives Rules

- Never add feature-specific layouts to `styles/layouts/`. The layout folder is restricted to finite, reusable, and structural layout primitives (`stack`, `cluster`, `grid`, etc.).
- Page/dashboard specific grids belong in the domain component's module CSS.

## 3. UI Primitives vs Domain Components

- If a component has business dependencies (e.g. references a `Book`, `User`, `Progress`), it must stay in the domain folder (e.g. `modules/reading/`).
- If a component is entirely reusable and agnostic (e.g., a tab list, toggle, alert), it can reside in `modules/shared/ui/`.
