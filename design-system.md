# MedConnect Overseas — Design System

> Reference this file for all UI decisions. Every component, color, spacing, and typography choice should align with this system.

---

## Brand Identity

**Name**: MedConnect Overseas (MCO)  
**Logo**: `/public/images/logo.png` — Use at `width=140px` in sidebar, `width=120px` in landing navbar. Always `object-contain`. Never distort.  
**Tagline**: *Connecting Medical Aspirants to World-Class Education*  
**Tone**: Professional, trustworthy, academic, modern. Not playful or generic.

---

## Color Palette

```
Primary (Navy Blue)       #041c44      → Sidebar bg, buttons, headings, CTA
Primary Hover             #031533      → Hover state of primary buttons
Accent Blue               #1e6ff1      → Active nav items, links, progress bars
Accent Blue Light         #dbeafe      → Badge backgrounds, highlights (blue-100)

Background (Main)         #f8fafc      → Page background (slate-50)
Background (Card)         #ffffff      → Card surfaces
Background (Sidebar)      #041c44      → User sidebar background
Sidebar Text              #cbd5e1      → Muted sidebar text (slate-300)
Sidebar Active BG         rgba(255,255,255,0.12)  → Active nav item background
Sidebar Active Text       #ffffff      → Active nav item text

Text Primary              #0f172a      → Main body text (slate-900)
Text Secondary            #475569      → Subheadings, descriptions (slate-600)
Text Muted                #94a3b8      → Labels, hints (slate-400)

Border                    #e2e8f0      → Card borders (slate-200)
Border Light              #f1f5f9      → Subtle dividers (slate-100)

Status Green              #16a34a      → Approved, success (green-600)
Status Green BG           #dcfce7      → Approved badge bg (green-100)
Status Amber              #d97706      → Pending, warning (amber-600)
Status Amber BG           #fef3c7      → Pending badge bg (amber-100)
Status Red                #dc2626      → Rejected, error (red-600)
Status Red BG             #fee2e2      → Rejected badge bg (red-100)
```

---

## Typography

**Font Family**: `Inter` — loaded in `index.html` from Google Fonts.

```
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
body { font-family: 'Inter', sans-serif; }
```

| Role                | Size         | Weight    | Class                             |
|---------------------|--------------|-----------|-----------------------------------|
| Page Title (H1)     | 28–32px      | 800 (Extra Bold) | `text-3xl font-extrabold`   |
| Section Heading (H2)| 20–22px      | 700       | `text-xl font-bold`               |
| Card Title          | 16–18px      | 600       | `text-lg font-semibold`           |
| Body Text           | 14px         | 400       | `text-sm`                         |
| Caption/Label       | 12px         | 500       | `text-xs font-medium`             |
| Monospace (IDs/TXN) | 12–14px      | 500       | `font-mono`                       |

---

## Spacing & Layout

- **Dashboard Layout**: Fixed left sidebar (260px wide) + fluid main content area.
- **Sidebar**: `fixed left-0 top-0 h-screen w-[260px] bg-[#041c44]`
- **Main Content**: `ml-[260px] min-h-screen bg-slate-50`
- **Page Padding**: `p-8` on the main content wrapper.
- **Max Widths**: 
  - Single column content: `max-w-3xl`
  - Two column: `max-w-5xl`
  - Wide grids: `max-w-7xl`
- **Card Radius**: `rounded-xl` (12px)
- **Button Radius**: `rounded-lg` for standard, `rounded-full` for pill CTAs

---

## Sidebar Design (User Dashboard)

The user sidebar uses the **dark navy theme** with the MCO logo at the top.

```
Background: #041c44 (primary)
Logo area: 72px tall, centered logo at width=140px
User info section: Avatar initials circle + name + email
Nav items: Text-slate-300, hover: text-white + bg-white/10
Active nav: text-white + bg-white/15 + left border accent
Bottom: Sign out button (text-slate-400, hover text-red-400)
```

**Nav Items** (in order):
1. 📚 My Learning Center → `/dashboard`
2. 🛒 Course Marketplace → `/dashboard/marketplace`
3. 🧾 Order History → `/dashboard/orders`
4. 👤 Profile & Referrals → `/dashboard/profile`

---

## Page Header Pattern

Each dashboard page uses a consistent top section:

```tsx
<div className="mb-8">
  <h1 className="text-3xl font-extrabold text-slate-900 mb-1">{Title}</h1>
  <p className="text-slate-500 text-sm">{Subtitle description}</p>
</div>
```

---

## Card Design

```tsx
// Standard card
<div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
```

```tsx
// Elevated card (hover effects on marketplace)
<div className="bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
```

---

## Status Badges

```tsx
// Approved
<span className="bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">Approved</span>

// Pending  
<span className="bg-amber-100 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full">Pending Review</span>

// Rejected
<span className="bg-red-100 text-red-700 text-xs font-semibold px-2.5 py-1 rounded-full">Rejected</span>

// Category badge
<span className="bg-blue-100 text-[#041c44] text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wide">{category}</span>

// Course Code
<span className="font-mono text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{courseCode}</span>
```

---

## Buttons

```tsx
// Primary CTA
<button className="bg-[#041c44] hover:bg-[#031533] text-white px-6 py-2.5 rounded-lg font-semibold text-sm transition-colors">

// Secondary/Outline
<button className="border border-[#041c44] text-[#041c44] hover:bg-[#041c44] hover:text-white px-6 py-2.5 rounded-lg font-semibold text-sm transition-colors">

// Destructive
<button className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg font-semibold text-sm transition-colors">

// Ghost
<button className="text-slate-500 hover:text-slate-900 hover:bg-slate-100 px-4 py-2 rounded-lg text-sm transition-colors">
```

---

## Loading States

```tsx
// Full page loader
<div className="flex items-center justify-center h-64">
  <div className="flex flex-col items-center gap-3">
    <Loader2 className="h-8 w-8 animate-spin text-[#041c44]" />
    <p className="text-sm text-slate-500">Loading...</p>
  </div>
</div>

// Inline spinner
<Loader2 className="h-4 w-4 animate-spin" />
```

---

## Empty States

```tsx
<div className="flex flex-col items-center justify-center py-20 text-center">
  <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
    <{Icon} className="h-7 w-7 text-slate-400" />
  </div>
  <h3 className="text-base font-semibold text-slate-700 mb-1">{Title}</h3>
  <p className="text-sm text-slate-500 max-w-xs">{Description}</p>
  // Optional CTA button
</div>
```

---

## Course Card Design (Marketplace)

```
[Thumbnail Image — 16:9 ratio, h-44]
  └── [Duration badge — bottom-right, dark pill]
[Card Body]
  ├── Category badge (uppercase, small)
  ├── Course Title (font-semibold, line-clamp-2)
  ├── Instructor name (text-slate-500, text-sm)
  ├── Star rating (if available)
  ├── Divider
  ├── Course Code (monospace, slate-400)
  └── Price row: ₹{discounted} strikethrough ₹{original} | Enroll button
```

---

## Difficulty Badges

```tsx
const difficultyColors = {
  beginner:     'bg-green-100 text-green-700',
  intermediate: 'bg-amber-100 text-amber-700',
  advanced:     'bg-red-100 text-red-700',
};
```

---

## Form Inputs

```tsx
<input className="w-full h-11 px-4 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm 
  placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#041c44]/30 
  focus:border-[#041c44] transition" />
```

---

## Admin Portal Design

- Sidebar: white background (`bg-white`), slate borders
- Admin accent: `#041c44` for active states
- Consistent with user dashboard in typography and spacing
- Admin sidebar width: `w-64` (256px)

---

## Page-Specific Notes

### My Learning Center
- Shows enrolled courses (approved orders only)
- Empty state CTA → Browse Marketplace
- Each card shows title, instructor, category, mock progress bar (0%)

### Course Marketplace
- Full-width hero banner (navy, search bar inside)
- Filter by category (client-side)
- Card grid: 3 columns desktop, 2 tablet, 1 mobile
- Each card navigates to `/dashboard/course/:courseCode`

### Course Overview + Checkout
- Left: course details (description, outcomes, prerequisites, instructor)
- Right: sticky enrollment panel (price, coupon field, QR code, upload form)
- After upload: shows "Pending Verification" state

### Order History
- Table layout: Status | Course | Transaction ID + Date | Amount
- Status uses colored badges
- Rejected orders show the rejection reason

### Profile & Referrals
- Left: Identity fields (name, email — read only)
- Right: Referral code card (dark navy, click-to-copy)
