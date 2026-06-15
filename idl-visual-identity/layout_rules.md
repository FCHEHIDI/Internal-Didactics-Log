# IDL — Layout Rules

## Design Principle
Dense, information-rich, precise. Reminiscent of scientific papers and engineering notebooks.
No visual padding waste. Every pixel serves legibility or structure.

---

## Grid System

| Property | Value |
|----------|-------|
| Grid type | 12-column |
| Max content width | 1100px |
| Column gutter | 24px |
| Page padding (desktop) | 48px horizontal |
| Page padding (mobile) | 16px horizontal |

### Column Usage

| Zone | Columns |
|------|---------|
| Full-width section | 12 |
| Main content (entry) | 8 |
| Sidebar / TOC | 3 (offset 9) |
| Narrow article | 7 (centered) |
| Index card grid | 4 per card (3-up) |

---

## Spacing Scale (8px base unit)

| Token | Value | Usage |
|-------|-------|-------|
| `space-1` | 4px | Micro gaps, icon padding |
| `space-2` | 8px | Inline spacing |
| `space-3` | 16px | Component internal padding |
| `space-4` | 24px | Between small components |
| `space-5` | 32px | Section internal spacing |
| `space-6` | 48px | Between major sections |
| `space-7` | 64px | Page-level separation |
| `space-8` | 96px | Hero / header zones |

---

## Breakpoints

| Name | Min Width | Behaviour |
|------|-----------|-----------|
| `xs` | 0px | Single column, no sidebar |
| `sm` | 480px | Single column, wider padding |
| `md` | 768px | Two columns possible, sidebar collapses |
| `lg` | 1024px | Full grid, sidebar visible |
| `xl` | 1280px | Max content width capped |

---

## Page Structure

```
[navigation bar — full width, sticky]
[entry header / hero — full width, background texture]
[breadcrumb]
[main content — 8 col] | [sidebar TOC — 3 col]
[footer — full width]
```

---

## Rules

1. **No centered hero text.** All text is left-aligned.
2. **Navigation bar:** always at top, sticky, full-width, height 48px, border-bottom `1px solid #1f1f1f`.
3. **No rounded corners** on structural elements (cards, panels, code blocks). `border-radius: 0`.
4. **Borders only:** use `1px solid` borders instead of shadows. No box-shadow decorative use.
5. **Tables:** full-width within their container, always have a header row, minimal padding.
6. **Images:** always constrained to content column width. Never full-bleed within article body.
7. **Sidebar TOC:** visible on `lg` and above. On smaller screens, rendered as a collapsed `<details>` block.
