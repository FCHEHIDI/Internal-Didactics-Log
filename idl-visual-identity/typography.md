# IDL — Typography

## Design Principle
Geometric, legible, cold. No decorative serif. Monospace for all technical content.
Type scale follows a strict modular ratio (1.25 — Major Third).

---

## Font Families

| Role | Family | Fallback |
|------|--------|----------|
| Headings | `Space Grotesk` | `IBM Plex Sans`, `system-ui` |
| Body | `IBM Plex Sans` | `Inter`, `system-ui` |
| Code / Mono | `JetBrains Mono` | `IBM Plex Mono`, `monospace` |
| Caption / Label | `IBM Plex Sans Condensed` | `IBM Plex Sans`, `system-ui` |

All fonts are available via [Google Fonts](https://fonts.google.com) or self-hosted.

---

## Type Scale (base: 16px)

| Level | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| Display | 48px | 700 | 1.1 | Site title only |
| H1 | 36px | 700 | 1.15 | Page / entry title |
| H2 | 28px | 600 | 1.2 | Section headings |
| H3 | 22px | 600 | 1.25 | Subsection headings |
| H4 | 18px | 500 | 1.3 | Minor headings |
| Body | 16px | 400 | 1.7 | Paragraph text |
| Small | 14px | 400 | 1.6 | Captions, meta, dates |
| Micro | 12px | 400 | 1.5 | Tags, labels, footnotes |
| Code | 14px | 400 | 1.6 | Inline and block code |

---

## Rules

1. **Headings are never italic.**
2. **Body text is never bold** — use a separate heading level instead.
3. **All uppercase is reserved for labels and navigation items only** — never headings or body.
4. **Letter spacing:** headings `−0.02em`, labels `+0.08em`, body `0`.
5. **Measure (line length):** 65–75 characters for body text. Never exceed 80ch.
6. **Code blocks:** always `JetBrains Mono`, never proportional fonts.
