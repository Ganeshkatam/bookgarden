# Accessibility (a11y) Standards

BookGarden treats accessibility as a core quality attribute. Shared UI primitives must build in accessibility behaviors out of the box.

## 1. Focus Indicators

- Every interactive element (buttons, links, inputs) must display a clear focus ring on keyboard tab focus.
- Use the `.focus-ring` utility class or implement custom focus outline.
- Never set `outline: none` without providing a distinct visual alternative.

## 2. Color Contrast

- Text-to-background contrast ratio must satisfy:
  - Normal text: Minimum **4.5:1** contrast.
  - Large text (18pt+ / 24px+): Minimum **3:1** contrast.
- Inspect theme variables to ensure slate/indigo variations satisfy these ratios.

## 3. Keyboard Interaction

- Shared primitives (modals, dropdowns) must handle keyboard focus traps and close keys:
  - Modals must close on `Escape`.
  - Focus must wrap inside the open modal bounds.

## 4. Reduced Motion

- Always wrap complex transitions in media queries checking user motion preferences:
  ```css
  @media (prefers-reduced-motion: reduce) {
    * {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
  ```
