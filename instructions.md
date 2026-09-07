# MedConnect Overseas — AI Developer Instructions

> **Any LLM working on this project MUST read this file in full before making any changes.**

---

## Project Overview

**MedConnect Overseas (MCO)** is a full-stack Learning Management System (LMS) platform targeting medical students pursuing education abroad (primarily Ukraine, Georgia, Russia, Philippines). It provides:

- A course marketplace with manual payment verification (QR Code → screenshot → admin approval)
- An admin portal for managing users, courses, coupons, and order approvals
- A student dashboard with Classic LMS aesthetic
- A referral-based onboarding system

**Production environment**: India-based medical education. Currency is **INR (₹)**. The audience is medical students.

---

## Repository Structure

```
medconnectoverseas/
├── backend/                    # Node.js + Express + TypeScript API
│   └── src/
│       ├── app.ts              # Express app setup (CORS, rate limiting, routes)
│       ├── server.ts           # HTTP server entry point
│       ├── config/
│       │   └── env.ts          # Env vars validation (PORT, MONGODB_URI, JWT_SECRET, etc.)
│       ├── controllers/
│       │   ├── admin/          # Admin-scoped controllers
│       │   │   ├── auth.controller.ts
│       │   │   ├── course.controller.ts
│       │   │   ├── coupon.controller.ts
│       │   │   ├── dashboard.controller.ts
│       │   │   ├── order.controller.ts
│       │   │   └── user.controller.ts
│       │   └── user/           # User-scoped controllers
│       │       ├── auth.controller.ts
│       │       ├── course.controller.ts
│       │       ├── order.controller.ts
│       │       └── profile.controller.ts
│       ├── middleware/
│       │   ├── auth.ts         # User JWT middleware (req.user = { userId, email, role })
│       │   └── adminAuth.ts    # Admin JWT middleware
│       ├── models/
│       │   ├── Admin.model.ts
│       │   ├── Coupon.model.ts
│       │   ├── Course.model.ts  -- NOTE: Has courseCode (6-char unique ID)
│       │   ├── Order.model.ts
│       │   └── User.model.ts
│       ├── routes/
│       │   ├── index.ts        # Aggregates all routes under /api/v1
│       │   ├── admin/          # Admin routes (adminAuth middleware protected)
│       │   └── user/           # User routes (auth middleware for protected ones)
│       └── utils/
│           ├── asyncHandler.ts
│           ├── ApiError.ts
│           ├── ApiResponse.ts
│           └── seedAdmin.ts    # Run to seed: npx ts-node src/utils/seedAdmin.ts
│
├── src/                        # React 19 + Vite + TypeScript frontend
│   ├── App.tsx                 # Route definitions
│   ├── index.css               # Tailwind + CSS variables (shadcn theme)
│   ├── components/
│   │   ├── admin/              # Admin sidebar, layout
│   │   ├── dashboard/          # User sidebar (Sidebar.tsx), UserLayout.tsx
│   │   ├── landing/            # Navbar, AuthModal, etc.
│   │   └── ui/                 # shadcn/ui primitives (Button, Card, Input, etc.)
│   ├── context/
│   │   └── AuthContext.tsx     # Global auth state. User interface defined here.
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── onboarding.tsx      # Multi-step onboarding wizard
│   │   ├── dashboard/
│   │   │   ├── index.tsx       # My Learning Center
│   │   │   ├── marketplace.tsx
│   │   │   ├── orders.tsx
│   │   │   ├── profile.tsx
│   │   │   └── course-overview.tsx  # Course detail + checkout
│   │   └── admin/
│   │       ├── login.tsx
│   │       ├── dashboard.tsx
│   │       ├── users.tsx
│   │       ├── courses.tsx
│   │       ├── add-course.tsx
│   │       ├── coupons.tsx
│   │       └── orders.tsx
│   └── services/
│       └── api.ts              # Axios instance for backend calls
│
├── public/
│   └── images/
│       └── logo.png            # Official MCO logo (use at width=140, height=auto)
├── instructions.md             # THIS FILE — read before working
└── design-system.md            # Design tokens, colors, typography, components
```

---

## Tech Stack

| Layer        | Technology                          |
|--------------|-------------------------------------|
| Frontend     | React 19, Vite, TypeScript          |
| Styling      | TailwindCSS v4 + shadcn/ui          |
| Routing      | React Router v7                     |
| State        | React Context (AuthContext)         |
| Backend      | Node.js, Express, TypeScript        |
| Database     | MongoDB + Mongoose                  |
| Auth         | JWT (access + refresh tokens)       |
| OTP (stub)   | Email OTP (production: SendGrid)    |
| SMS (stub)   | Phone verify (production: Twilio)   |

---

## Key Architectural Rules

### Authentication
- **Students**: OTP-based passwordless. Token stored in `localStorage` as `accessToken`. User data in `localStorage` as `user` (JSON).
- **Admins**: Password-based. Token stored as `adminToken`. Separate auth middleware `adminAuth.ts`.
- **Auth Context**: `useAuth()` gives `{ user, isAuthenticated, isLoading, login, logout, updateUser }`.
- **Onboarding Gate**: `UserLayout.tsx` wraps all dashboard routes and redirects to `/onboarding` if `user.isOnboardingComplete === false`.
- Admin login at `/admin/login` checks `localStorage.adminToken` and redirects to `/admin/dashboard` if already logged in.

### API
- All API calls go through `src/services/api.ts` (Axios instance with base URL `/api/v1`).
- Protected user routes pass `Authorization: Bearer <accessToken>`.
- Protected admin routes pass `Authorization: Bearer <adminToken>`.
- Response shape: `{ success: boolean, data: any, message: string }` via `ApiResponse`.
- Errors use `ApiError` class — caught by `asyncHandler`.

### Payments
- **No Stripe/Razorpay**. Manual QR-based flow:
  1. User selects course → sees price → optionally applies coupon code
  2. Admin's UPI QR code is displayed
  3. User pays physically, uploads screenshot + enters transaction ID
  4. Admin gets a pending order → manually approves/rejects
  5. On approval, user can access the course

### Course Code
- Every course has an auto-generated 6-character uppercase `courseCode` (e.g. `XZ9PA1`).
- Used for: coupon binding, user searching, issue reporting.
- Generated in `course.controller.ts → createCourse()` with collision retry.

### Coupon Engine
- Type: `percentage` (max 100%) or `fixed` (flat ₹ off)
- Constraints: `applicableCourses[]`, `applicableCategories[]`, `allowedEmails[]`, `minPurchaseAmount`, `maxDiscountAmount`, `usesPerUser`, `firstTimeUsersOnly`
- Schema-level validation: `pre('save')` enforces `value <= 100` for percentage.

---

## Payment Flow (Detailed)

```
User clicks "Enroll" on Course Overview page
    → Sees course price + optional coupon field
    → Applies coupon → price recalculates
    → Sees Admin QR Code for UPI payment
    → Pays externally (PhonePe, GPay, etc.)
    → Enters Transaction ID + uploads screenshot URL
    → POST /api/v1/orders → creates Order with status: 'pending'
    → Admin sees it in Admin → Orders & Approvals
    → Admin reviews screenshot, approves or rejects
    → On approval: user sees course in "My Learning Center"
```

---

## Running the Project

```bash
# Backend
cd backend
npm install
# Copy .env.example to .env and fill values
npm run dev   # Runs on port 5000

# Frontend
cd ..
npm install
npm run dev   # Runs on port 5174

# Seed Admin
cd backend
npx ts-node src/utils/seedAdmin.ts
# Default: admin@medconnectsoverseas.com / adminpassword123
```

**Backend .env required keys**: `PORT`, `MONGODB_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `NODE_ENV`

---

## Design Rules

See `design-system.md` for full token reference. Key rules:
- **Primary brand color**: `#041c44` (deep navy blue)
- **Accent**: `#1e6ff1` (vibrant blue)
- **Success**: `#16a34a` (green-600)
- **Warning**: `#d97706` (amber-600)
- **Error**: `#dc2626` (red-600)
- Font: **Inter** (loaded via Google Fonts in `index.html`)
- All dashboard pages use a consistent sidebar layout — do NOT add a top navbar inside the dashboard.
- Admin pages also use their own `AdminLayout` sidebar.
- Never add a footer inside the dashboard or admin portal.

---

## Important Conventions

1. **No placeholder logic** — every feature must be fully wired end-to-end.
2. **No `TODO` comments** — implement fully or don't include.
3. **Use shadcn/ui** components (Button, Card, Input, Label, etc.) from `src/components/ui/`.
4. **Path alias `@/`** maps to `src/`.
5. Controllers return via `ApiResponse` — frontend checks `res.success`.
6. Do NOT use `fetch()` — always use the `api` service from `src/services/api.ts`.
7. Keep form state local (no Redux or Zustand needed currently).
8. Currency is always **₹ (INR)**. Display as `₹{amount}`.
9. Import types with `import type { X }` to avoid runtime errors.
10. All `async` route handlers must be wrapped in `asyncHandler()`.
