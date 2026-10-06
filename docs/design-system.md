# HEDS Design System & Component Guidelines

## 1. Design Principles

- **Clarity over Decoration**: Every visual element must serve comprehension or action. No floating blobs, gradients, or decorative graphics.
- **Operational Density**: Interfaces must present necessary data compactly so operators can parse status in 2-3 seconds.
- **Calm & Grounded**: Soft neutral backgrounds, clean 1px borders, and subtle surface elevation rather than heavy floating shadows.
- **Semantic Restraint**: Semantic colors (Green, Blue, Amber, Red) indicate state only, never decoration.

---

## 2. Color Palette

### Neutrals (Surfaces & Typography)
- **Background**:
  - Light (Student Web): `#f8fafc` (Slate 50)
  - Dark (Shop Dashboard): `#090d16` (Slate 950)
- **Surfaces**:
  - Light: `#ffffff` (White) / Border: `#e2e8f0` (Slate 200)
  - Dark: `#0f172a` (Slate 900) / Border: `#1e293b` (Slate 800)
- **Primary Text**:
  - Light: `#0f172a` (Slate 900)
  - Dark: `#f8fafc` (Slate 50)
- **Muted Text**:
  - Light: `#64748b` (Slate 500)
  - Dark: `#94a3b8` (Slate 400)

### Brand Accent
- **Navy / Deep Indigo**: `#1e3a8a` (Blue 900) to `#2563eb` (Blue 600) for interactive elements, focus outlines, and primary brand identity.

### Semantic Status
- **Success / Completed**: `#16a34a` (Emerald 600) / BG: `#f0fdf4` (Light) / `#052e16` (Dark)
- **Active / Processing**: `#2563eb` (Blue 600) / BG: `#eff6ff` (Light) / `#172554` (Dark)
- **Waiting / Warning**: `#d97706` (Amber 600) / BG: `#fffbeb` (Light) / `#451a03` (Dark)
- **Error / Failed**: `#dc2626` (Red 600) / BG: `#fef2f2` (Light) / `#450a0a` (Dark)
- **Offline / Neutral**: `#64748b` (Slate 500) / BG: `#f1f5f9` (Light) / `#1e293b` (Dark)

---

## 3. Typography Hierarchy

- **Font Family**: Inter, system-ui, -apple-system, sans-serif.
- **Page Titles**: `text-lg` or `text-xl` font-semibold tracking-tight (no giant 48px hero headers).
- **Section Headers**: `text-xs` font-semibold uppercase tracking-wider text-muted.
- **Body / Table Cells**: `text-xs` or `text-sm` font-normal text-primary.
- **Micro / Metadata**: `text-[11px]` or `text-xs` text-muted.
- **Monospace Tokens (Order IDs, OTPs, Keys)**: `font-mono font-medium`.

---

## 4. Spacing & Radius

- **Radius**: Restrained rounding.
  - Buttons & Inputs: `rounded-md` (6px) or `rounded-lg` (8px).
  - Cards & Tables: `rounded-lg` (8px).
  - Badges: `rounded-md` (4px).
  - Status Dots: `rounded-full` (8px circle).
- **Borders**: 1px solid subtle border (`border-slate-200` light / `border-slate-800` dark).
- **Shadows**: Restrained elevation (`shadow-sm` or `shadow`), never multi-layered glowing drop-shadows.

---

## 5. Standard Component Primitives

1. **`StatusIndicator`**: Dot (`w-2 h-2 rounded-full`) + label (`text-xs font-medium`).
2. **`Badge`**: Compact inline tag with subtle background and 1px border.
3. **`Button`**:
   - `primary`: Solid brand accent with white text.
   - `secondary`: Neutral surface with subtle border.
   - `danger`: Red outline or muted red background.
   - `ghost`: Transparent with hover background.
4. **`Table`**: Structured 1px border grid, uppercase muted headers, compact padding (`px-3 py-2.5`).
5. **`Modal`**: Centered dialog with backdrop blur, crisp border, explicit title, and actionable buttons.
6. **`EmptyState`**: Informative description of absence of data with next logical action.
7. **`ErrorState`**: Clear description of what failed and how to recover.
