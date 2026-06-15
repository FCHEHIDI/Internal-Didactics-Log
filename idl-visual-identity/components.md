# IDL — Components

## Design Principle
Every component is a precision instrument. No decoration. No shadows. No gradients.
Each component must function at high information density without visual noise.

---

## Navigation Bar

- Height: 48px
- Background: `#0a0a0a`
- Border-bottom: `1px solid #1f1f1f`
- Position: sticky top
- Content: site name (left) + nav links (right): Home · Search · Glossary
- Font: `IBM Plex Sans Condensed`, 13px, weight 500, uppercase, letter-spacing `+0.08em`
- Active link: colour `#f0f0f0`, no underline
- Inactive link: colour `#888888`, no underline
- Hover: colour `#a3e4b0`

---

## Entry Cards (Index Pages)

- Border: `1px solid #1f1f1f`
- Background: `#111111`
- Padding: `space-4` (24px)
- Border-radius: 0
- Layout: date (top, `#888888` 12px) → title (H3) → abstract (body 14px) → tags (bottom)
- Hover: border-colour shifts to `#3a3a3a`
- No card shadows

---

## Tags / Labels

- Display: inline-block
- Font: `JetBrains Mono`, 11px, weight 400
- Padding: 2px 6px
- Border: `1px solid #3a3a3a`
- Background: transparent
- Text colour: `#888888`
- Hover text colour: `#a3e4b0`
- Hover border: `1px solid #a3e4b0`
- Prefix: `#` rendered in `#3a3a3a`

---

## Code Blocks

- Font: `JetBrains Mono`, 13px, line-height 1.6
- Background: `#0d0d0d`
- Border: `1px solid #1f1f1f`
- Border-left: `3px solid #3a3a3a` (accent on active/focused: `#a3e4b0`)
- Padding: `space-3` (16px)
- Border-radius: 0
- Scrollable horizontally on overflow
- Language label: top-right, `#3a3a3a`, 11px monospace

### Inline Code

- Font: `JetBrains Mono`, 13px
- Background: `#111111`
- Padding: 1px 4px
- Border: `1px solid #1f1f1f`
- No border-radius

---

## Callout / Aside Boxes

Variants: `note`, `warning`, `definition`, `insight`

- Border-left: `3px solid [variant-colour]`
- Background: `#111111`
- Padding: `space-3`
- Margin: `space-5` vertical
- Label (top): variant name, uppercase, 11px monospace, `[variant-colour]`

| Variant | Colour |
|---------|--------|
| `note` | `#888888` |
| `warning` | `#c0392b` |
| `definition` | `#a3e4b0` |
| `insight` | `#f0f0f0` |

---

## Media Captions

- Font: `IBM Plex Sans Condensed`, 12px, weight 400
- Colour: `#888888`
- Display: block, below the media element
- Prefix: figure number in `#f0f0f0` weight 500 — e.g. **Fig. 1**
- Max-width: matches image width

---

## Glossary Entries

- Term: H3, `#f0f0f0`, weight 600
- Definition: body text, `#d4d4d4`
- Field tag: inline tag component (see Tags)
- See-also: small 12px, `#888888`, links in accent colour
- Separator: `1px solid #1f1f1f` between entries

---

## Search Results

- Layout: list, full-width rows
- Row: date (`#888888`, 12px, monospace) · title (H4, link) · abstract (body 14px) · tags
- Row border-bottom: `1px solid #1f1f1f`
- Highlighted match: background `#1f1f1f`, text `#a3e4b0`
- No result state: centred text `#3a3a3a`, 14px — "No entries match this query."

---

## Footer

- Height: 48px
- Background: `#0a0a0a`
- Border-top: `1px solid #1f1f1f`
- Content: copyright / attribution (left), back-to-top link (right)
- Font: 12px, `#3a3a3a`
