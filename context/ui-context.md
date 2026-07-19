# Clocksy — UI Design Context

Aesthetic: **light, friendly, minimal**. White and warm off-white base. Two accent colors used sparingly. High legibility. No heavy gradients, no dark backgrounds, no decorative flourishes.

---

## Color Tokens

### Base (Neutrals)

| Token | Hex | Usage |
|---|---|---|
| `color-background` | `#FFFFFF` | Page / window background |
| `color-surface` | `#F7F6F3` | Cards, panels, sidebar background |
| `color-surface-raised` | `#FFFFFF` | Elevated cards on top of `color-surface` (with shadow) |
| `color-surface-sunken` | `#EFEDE8` | Input backgrounds, inset wells |
| `color-border` | `#E3E1DC` | Default borders, table dividers, card outlines |
| `color-border-subtle` | `#F0EFE9` | Subtle separators, skeleton loaders |

### Text

| Token | Hex | Usage |
|---|---|---|
| `color-text-primary` | `#1C1A17` | Body copy, headings, labels |
| `color-text-secondary` | `#6B6762` | Supporting text, metadata, timestamps |
| `color-text-muted` | `#A8A49E` | Placeholder text, disabled labels, empty states |
| `color-text-inverse` | `#FFFFFF` | Text on dark or accent-colored surfaces |
| `color-text-link` | `#D97B2A` | Inline links (orange-derived, accessible on white) |

### Accent — Yellow (`#F5ED30`)

| Token | Hex | Usage |
|---|---|---|
| `color-yellow-50` | `#FEFCE8` | Tinted backgrounds, highlight bands |
| `color-yellow-100` | `#FBF5A0` | Hover state on yellow elements |
| `color-yellow-400` | `#F5ED30` | Primary accent: active-session indicator, Start button ring, chart highlights |
| `color-yellow-500` | `#D4CC0A` | Hover / pressed state on `yellow-400` elements |
| `color-yellow-foreground` | `#1C1A17` | Text or icons placed directly on a yellow background |

### Accent — Orange (`#FE934E`)

| Token | Hex | Usage |
|---|---|---|
| `color-orange-50` | `#FFF4EC` | Tinted alert/notice backgrounds |
| `color-orange-100` | `#FFD4B0` | Hover state on orange elements |
| `color-orange-400` | `#FE934E` | Secondary accent: badges, progress fills, CTA buttons |
| `color-orange-500` | `#E07535` | Hover / pressed state on `orange-400` elements |
| `color-orange-foreground` | `#FFFFFF` | Text or icons placed directly on an orange background |

### Semantic Status

| Token | Hex | Usage |
|---|---|---|
| `color-status-active` | `#22C55E` | "Active" session pill, online indicator dot |
| `color-status-active-bg` | `#DCFCE7` | Background behind active status pill |
| `color-status-idle` | `#F59E0B` | "Idle" session pill, idle time segment in chart |
| `color-status-idle-bg` | `#FEF3C7` | Background behind idle status pill |
| `color-status-offline` | `#9CA3AF` | "Offline" pill, disconnected state |
| `color-status-offline-bg` | `#F3F4F6` | Background behind offline status pill |
| `color-status-error` | `#EF4444` | Error messages, failed upload indicator |
| `color-status-error-bg` | `#FEE2E2` | Background behind error messages |

### Shadows

| Token | Value | Usage |
|---|---|---|
| `shadow-sm` | `0 1px 2px rgba(28,26,23,0.06)` | Subtle card lift |
| `shadow-md` | `0 4px 12px rgba(28,26,23,0.08)` | Raised cards, dropdowns |
| `shadow-lg` | `0 8px 24px rgba(28,26,23,0.10)` | Modals, popovers |

---

## Typography

### Font Family

| Token | Value | Usage |
|---|---|---|
| `font-sans` | `Inter, ui-sans-serif, system-ui, sans-serif` | All UI text |
| `font-mono` | `JetBrains Mono, ui-monospace, monospace` | Timestamps, elapsed timer, code |

Use Inter from Google Fonts or bundle it locally via `fontsource`. Mono font is optional — fall back to `ui-monospace` if not bundled.

### Font Size Scale

| Token | px | rem | Usage |
|---|---|---|---|
| `text-xs` | 11px | 0.6875rem | Micro labels, keyboard shortcut hints |
| `text-sm` | 13px | 0.8125rem | Secondary metadata, table cells, status pills |
| `text-base` | 14px | 0.875rem | Default body text, form inputs |
| `text-md` | 16px | 1rem | Section headings, card titles |
| `text-lg` | 18px | 1.125rem | Page sub-headings |
| `text-xl` | 22px | 1.375rem | Page titles, elapsed timer display |
| `text-2xl` | 28px | 1.75rem | Stat tile numbers (hours, active count) |
| `text-3xl` | 36px | 2.25rem | Hero numbers if needed |

### Font Weight

| Token | Value | Usage |
|---|---|---|
| `font-normal` | 400 | Body copy, metadata |
| `font-medium` | 500 | Labels, table column headers, button text |
| `font-semibold` | 600 | Card titles, stat numbers, nav items |

### Line Height

| Token | Value | Usage |
|---|---|---|
| `leading-tight` | 1.25 | Headings, single-line labels |
| `leading-normal` | 1.5 | Body copy, multiline descriptions |
| `leading-relaxed` | 1.65 | Help text, longer prose |

### Letter Spacing

| Token | Value | Usage |
|---|---|---|
| `tracking-tight` | `-0.01em` | Large headings and stat numbers |
| `tracking-normal` | `0em` | Body text |
| `tracking-wide` | `0.04em` | Uppercase micro labels (e.g. `TODAY`, `IDLE`) |

---

## Border Radius Scale

| Token | px | Usage |
|---|---|---|
| `radius-none` | 0px | Table cell borders where flush alignment is needed |
| `radius-sm` | 4px | Inputs, small badges, inline code |
| `radius-md` | 8px | Buttons, dropdown items, toast notifications |
| `radius-lg` | 12px | Cards, panels, modal containers |
| `radius-xl` | 16px | Large modals, drawer panels |
| `radius-full` | 9999px | Status pills, avatar rings, toggle switches |

---

## Spacing Reference (Base-4 Scale)

| Token | px | Usage |
|---|---|---|
| `space-1` | 4px | Icon-to-label gap, tight inline padding |
| `space-2` | 8px | Small component internal padding |
| `space-3` | 12px | Button padding (vertical), list item padding |
| `space-4` | 16px | Default card padding, form field gap |
| `space-6` | 24px | Section gap within a card |
| `space-8` | 32px | Between cards / major sections |
| `space-12` | 48px | Page-level vertical rhythm |
| `space-16` | 64px | Top-of-page breathing room |

---

## Tailwind Config Extensions

Add to `dashboard/tailwind.config.js` and `desktop/tailwind.config.js`:

```js
theme: {
  extend: {
    colors: {
      yellow: {
        50:  '#FEFCE8',
        100: '#FBF5A0',
        400: '#F5ED30',
        500: '#D4CC0A',
      },
      orange: {
        50:  '#FFF4EC',
        100: '#FFD4B0',
        400: '#FE934E',
        500: '#E07535',
      },
    },
    fontFamily: {
      sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
    },
    borderRadius: {
      sm:   '4px',
      md:   '8px',
      lg:   '12px',
      xl:   '16px',
    },
    boxShadow: {
      sm: '0 1px 2px rgba(28,26,23,0.06)',
      md: '0 4px 12px rgba(28,26,23,0.08)',
      lg: '0 8px 24px rgba(28,26,23,0.10)',
    },
  },
},
```

Add CSS variables to the global stylesheet (`globals.css`) so shadcn/ui components pick them up:

```css
:root {
  --background:        #FFFFFF;
  --surface:           #F7F6F3;
  --surface-sunken:    #EFEDE8;
  --border:            #E3E1DC;
  --border-subtle:     #F0EFE9;

  --text-primary:      #1C1A17;
  --text-secondary:    #6B6762;
  --text-muted:        #A8A49E;
  --text-inverse:      #FFFFFF;

  --accent-yellow:     #F5ED30;
  --accent-yellow-fg:  #1C1A17;
  --accent-orange:     #FE934E;
  --accent-orange-fg:  #FFFFFF;

  --status-active:     #22C55E;
  --status-idle:       #F59E0B;
  --status-offline:    #9CA3AF;
  --status-error:      #EF4444;
}
```

---

## Usage Rules

- Use `color-yellow-400` and `color-orange-400` as **accents only** — active-state indicators, the Start/Stop button highlight, chart segment fill, badge backgrounds. Never as page or card backgrounds.
- Status pills use semantic status tokens (`color-status-*`) — do not reuse the yellow/orange accents for status states to avoid ambiguity between "active session" yellow and "idle" yellow.
- Keep text on yellow backgrounds (`color-yellow-400`) in `color-yellow-foreground` (`#1C1A17`) — yellow has a luminance high enough that white text fails WCAG AA contrast. Use dark text only.
- Orange backgrounds (`color-orange-400`) use `color-orange-foreground` (`#FFFFFF`) — it passes WCAG AA at this value.
- The desktop tracker window uses the same tokens but is even more restrained: the only accent visible should be the session-active ring or the Start button. Everything else is neutral.
