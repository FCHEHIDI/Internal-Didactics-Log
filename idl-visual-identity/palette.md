# IDL — Colour Palette

## Design Principle
Monochrome-first. Every interface element is legible at maximum contrast before colour is introduced.
One cold accent is permitted. No warm colours.

---

## Base Palette

| Role | Name | Hex | Usage |
|------|------|-----|-------|
| Background | Void | `#0a0a0a` | Page background, deep surfaces |
| Surface | Obsidian | `#111111` | Cards, panels, code blocks |
| Border | Ash | `#1f1f1f` | Dividers, outlines, grid lines |
| Muted | Graphite | `#3a3a3a` | Disabled text, subtle borders |
| Secondary text | Smoke | `#888888` | Dates, labels, captions |
| Primary text | Chalk | `#d4d4d4` | Body text |
| High contrast | White | `#f0f0f0` | Headings, active states |

## Accent Palette (use sparingly)

| Role | Name | Hex | Usage |
|------|------|-----|-------|
| Accent | Phosphor | `#a3e4b0` | Active links, highlights, tags |
| Accent dim | Phosphor Dim | `#4a7d54` | Hover states, secondary accent |
| Danger | Signal Red | `#c0392b` | Warnings, errors only |

---

## Usage Rules

1. **Never use colour to convey information alone** — always pair with shape or text.
2. **Accent (`#a3e4b0`) must appear on dark backgrounds only.**
3. **No gradients.** Use flat fills and sharp borders exclusively.
4. **Code blocks:** background `#0d0d0d`, text `#c9d1d9`, keywords in `#f0f0f0`.
5. **Links:** unvisited `#a3e4b0`, visited `#4a7d54`, no underline on hover — use brightness shift instead.

---

## Dark Mode

This palette is dark-mode native. A light mode is explicitly not supported.
