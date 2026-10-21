# Architectural Decisions Records (ADR)

This document registers the core engineering decisions made during BookGarden's frontend architecture refactoring.

## 1. CSS Modules over Global Styles for Features

- **Context**: A growing app leads to global style collisions and selector leakages.
- **Decision**: All composite/route components must use CSS Modules (`*.module.css`) for appearance styles.
- **Reasoning**: Isolation is enforced at build time. Selector hashing prevents unexpected side effects across routes.

## 2. Decoupled UI Primitives

- **Context**: Keeping button and card styles globally in stylesheets leads to dead-code, loose types, and code drift.
- **Decision**: Relocate primitive CSS to live beside their React components inside `modules/shared/ui/`.
- **Reasoning**: A primitive Button comprises keyboard navigation, ARIA attributes, logic states (loading, disabled), and variant configurations. Separating styling from the component is an anti-pattern.

## 3. CSS Cascade Layers

- **Context**: Precedence order of Tailwind utility sheets, design tokens, and components can cause styling collision (e.g. utility classes overridden by components).
- **Decision**: Define native CSS `@layer` in `globals.css` in the order: `foundation, base, themes, layouts, utilities`.
- **Reasoning**: Standardizes styling precedence and ensures utilities always override foundation and component classes.
