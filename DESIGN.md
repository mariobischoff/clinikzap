# Design System Guide — ClinikZap

This document describes the design tokens, visual language, component aesthetics, and UI guidelines for **ClinikZap**. It serves as a visual specification and anchor for both human developers and AI coding agents to maintain consistency across the codebase.

---

## 1. Visual Aesthetics & Theme

ClinikZap features an **AI-first premium dark glassmorphic** theme. All screens must respect this visual standard:
*   **Palette**: Dark slate backgrounds with high contrast, vibrant accents, and subtle borders.
*   **Aesthetics**: Glassmorphism (translucency + backdrop blur), fine borders, deep drop shadows, and soft glowing backgrounds.
*   **Responsiveness**: Layouts must scale cleanly from mobile devices up to large desktop screens.

---

## 2. Design Tokens & Classes

These tokens are configured in [globals.css](file:///c:/Users/mario/Workspace/clinikzap/src/app/globals.css) and should be reused across the application rather than styling elements with ad-hoc colors.

### A. Color Palette
| Variable | Value / Hex | Usage |
|---|---|---|
| `--background` | `#030712` (Slate 950) | Core body background |
| `--foreground` | `#f3f4f6` (Gray 100) | Core text color |
| Teal Accent | `from-teal-500 to-teal-600` | Primary action accents, glows, active borders |
| Indigo Accent | `from-indigo-500 to-indigo-600` | Secondary accents, brand highlights |

### B. Core Class Utilities
Always apply these classes to achieve the premium visual tone:

*   **`.glass-panel`**: Used for cards, modals, and container panels.
    ```css
    background: rgba(17, 24, 39, 0.55);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.06);
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.4);
    ```
*   **`.glass-panel-hover`**: Extends `.glass-panel` for interactive cards. It transitions smoothly on hover by lifting up 2px, lighting the border teal (`rgba(20, 184, 166, 0.25)`), and adding a faint background glow.
*   **`.glass-input`**: Used for all text fields, select lists, and textareas. It lights up teal under focus (`focus:border-teal-500/60`).
*   **`.gradient-text`**: Clips a shiny linear gradient (teal -> indigo -> purple) over text headlines to draw attention.

---

## 3. Typography & Icons

*   **Font Family**: Vercel Geist Sans (`var(--font-geist-sans)`) for clean, modern readability.
*   **Iconography**: Use `lucide-react`. Accents on icons should typically use `text-teal-400` or `text-indigo-400` with soft sizes (e.g., `w-4 h-4` or `w-5 h-5`).

---

## 4. Keyframe Animations

We use two primary motion behaviors defined in `@theme` to bring the application to life:
1.  **`animate-pulse-slow`**: A gentle, slow opacity pulse (3s duration) applied to glowing background blobs.
2.  **`animate-float`**: A translation animation that bounces elements up and down by 15px over an 8s cycle to simulate organic movement.

---

## 5. Guidelines for AI Coding Agents

When editing or creating new components in ClinikZap:
1.  **Do Not Break E2E Locators**: Keep existing HTML `id` values (e.g. `#pname`, `#name`, `#email`), exact button text labels (e.g. `'Confirmar Agendamento'`, `'Escolher Horário'`), and accessibility tags. Playwright tests rely on them.
2.  **Maintain the Theme**: Never use plain solid white (`bg-white`), solid red/blue/green cards, or thick saturated borders. Always prefer translucent gradients, `.glass-panel`, and soft border colors (`border-white/5` or `border-white/10`).
3.  **Add Glow Blobs in Backgrounds**: For new layouts/pages, insert floating blurred background circles using `absolute blur-[100px] bg-teal-500/10 rounded-full animate-float` to keep the premium atmosphere.
4.  **Use Micro-interactions**: Buttons must have smooth scaling/transitions (e.g., `transition-all active:scale-[0.99] hover:scale-[1.01] hover:brightness-110`).
