# Email Templates — MedConnect Overseas

20 transactional/marketing HTML templates, ready to load into ZeptoMail.

```
backend/src/templates/emails/
├── _build.mjs        ← the ONLY file you hand-edit
├── manifest.json     ← generated: key, subject, preheader, variables, trigger
├── README.md
└── *.html            ← generated: 20 templates
```

## Regenerating

```bash
cd backend/src/templates/emails
node _build.mjs
```

**Never hand-edit the `.html` files.** They are generated from a single layout in
`_build.mjs`; editing one by hand means 20 templates slowly stop looking like
each other. Change the layout, palette, brand constants or copy in `_build.mjs`
and rebuild.

---

## Naming convention

```
<domain>-<event>[-<variant>].html
```

- **`<domain>`** — the part of the product the mail belongs to:
  `auth` · `account` · `order` · `event` · `referral` · `newsletter` · `contact`
- **`<event>`** — what just happened, past tense where it reads naturally:
  `submitted`, `approved`, `rejected`, `cancelled`, `reminder`
- **`<variant>`** — only when one event splits by object type:
  `order-submitted-course` vs `order-submitted-event`
- **Admin-audience mail is prefixed `admin-`** and renders an "Admin
  Notification" strip under the logo: `admin-order-new`, `admin-contact-new`,
  `admin-password-reset`

Lowercase kebab-case throughout. The **file name minus `.html` is the template
key** — the same string used in `manifest.json`, in the ZeptoMail template
alias, and in the backend `sendMail({ template: 'order-approved-event' })` call.
Keep those four in sync and there is exactly one name to remember per email.

---

## The 20 templates

### auth
| Key | Subject | Fires from |
|---|---|---|
| `auth-login-otp` | `{{otp}} is your MedConnect Overseas login code` | `user/auth.controller.ts` → `requestOtp` |
| `auth-welcome` | `Welcome aboard, {{first_name}} — your MCO journey starts here` | `user/profile.controller.ts` → `onboarding` |

### account
| Key | Subject | Fires from |
|---|---|---|
| `account-suspended` | `Your MedConnect Overseas account has been suspended` | `admin/user.controller.ts` → `toggleUserStatus` (→ false) |
| `account-reactivated` | `You're back in — your MCO account is active again` | `admin/user.controller.ts` → `toggleUserStatus` (→ true) |
| `admin-password-reset` | `Reset your MedConnect Overseas admin password` | `admin/auth.controller.ts` → reset flow *(not built yet)* |

### orders & payments
| Key | Subject | Fires from |
|---|---|---|
| `order-submitted-course` | `Payment received — we're verifying your {{course_title}} order` | `user/order.controller.ts` → `createOrder` |
| `order-submitted-event` | `You're on the list for {{event_title}} — pending verification` | `user/event.controller.ts` → `registerForEvent` |
| `order-approved-course` | `You're in! {{course_title}} is now unlocked` | `admin/order.controller.ts` → `updateOrderStatus` |
| `order-approved-event` | `Seat confirmed for {{event_title}} — here is your entry QR` | `admin/order.controller.ts` → `updateOrderStatus` |
| `order-rejected` | `Action needed: we couldn't verify your payment` | `admin/order.controller.ts` → `updateOrderStatus` |
| `admin-order-new` | `[MCO] New {{order_type}} payment awaiting review — ₹{{final_price}}` | both order-creation paths |

### events
| Key | Subject | Fires from |
|---|---|---|
| `event-reminder` | `{{event_title}} is {{reminder_phrase}}` | `jobs/reminderCron.ts` → `processReminders` |
| `event-updated` | `Schedule change for {{event_title}} — please check the new timing` | `admin/event.controller.ts` → `updateEvent` |
| `event-cancelled` | `{{event_title}} has been cancelled — here is what happens next` | `admin/event.controller.ts` → `deleteEvent` |
| `event-attendance-confirmed` | `Thanks for attending {{event_title}} — your certificate is ready` | `admin/eventRegistration.controller.ts` → `scanAttendance` |

### referrals
| Key | Subject | Fires from |
|---|---|---|
| `referral-signup` | `{{referred_name}} just joined using your code` | `user/profile.controller.ts` → `onboarding` |
| `referral-converted` | `Your referral just enrolled — reward unlocked` | `admin/order.controller.ts` → first approved purchase |

### site
| Key | Subject | Fires from |
|---|---|---|
| `newsletter-welcome` | `You're on the list — MedConnect Overseas insider access` | newsletter subscribe *(endpoint not built yet)* |
| `contact-ack` | `We've got your message — MedConnect Overseas` | contact form *(endpoint not built yet)* |
| `admin-contact-new` | `[MCO] New enquiry from {{name}} — {{enquiry_subject}}` | contact form *(endpoint not built yet)* |

`manifest.json` carries the full variable list for each — read it at boot if you
want the backend to fail loudly when a required merge variable is missing.

---

## Merge variables

Syntax is `{{snake_case}}` — ZeptoMail's own merge syntax, so the same file works
whether you upload it as a hosted template (variables passed in `merge_info`) or
send it as raw `htmlbody` after a local string-replace.

Conventions the backend must honour:

- **`first_name`** — always pass something. Fall back to `"there"`, never an
  empty string, or greetings render as `"Hi ,"`.
- **Money** — pass the number only (`"1499"` or `"1,499"`). The ₹ symbol is baked
  into the template as `&#8377;`.
- **Dates** — pre-format server-side (`"Monday, 12 January 2026"`, `"10:00 – 13:00"`).
  Templates do no formatting.
- **`event_location`** — one string for the "Where" row. Pass the venue for
  offline events and something like `"Online — link in your dashboard"` for
  online ones. ZeptoMail has no conditionals, so the branch happens in the
  controller, not the template.
- **`reminder_label` / `reminder_phrase`** — map from `ReminderType` in
  `services/reminder.service.ts`:

  | `ReminderType` | `reminder_label` | `reminder_phrase` |
  |---|---|---|
  | `3_days_before` | `3 days to go` | `in 3 days` |
  | `1_day_before` | `Tomorrow` | `tomorrow` |
  | `day_of_8am` | `Today` | `today` |
  | `10_min_before` | `Starting now` | `starting in 10 minutes` |

- **`unsubscribe_url`** — only `newsletter-welcome` renders it. Transactional
  mail deliberately has no unsubscribe link.

### The QR code

`order-approved-event` expects `qr_code_url` in an `<img src>`. The value
currently produced in `admin/order.controller.ts` is a **`data:` URI** from
`QRCode.toDataURL()`, and Gmail strips `data:` image sources. Pick one:

1. Upload the PNG to your CDN/S3 on approval and pass the absolute URL — simplest, works everywhere.
2. Send it as a ZeptoMail inline attachment and pass `cid:qr` as `qr_code_url`.

Do not ship the raw data URI.

---

## Rendering notes

- Table-based, inline styles, 600px max width, single-column — no flex/grid.
- Palette and type scale come straight from `design-system.md`
  (navy `#041c44`, accent `#1e6ff1`, page `#f8fafc`, Inter with a system fallback
  stack, since Inter will not load in most desktop clients).
- Every template has hidden **preheader** text — the grey line next to the
  subject in the inbox list. Worth keeping distinct from the subject.
- Locked to light mode via `color-scheme: light` with explicit `bgcolor` on
  every coloured cell, so dark-mode clients cannot invert the navy header into
  something unreadable.
- `<img>` uses an absolute logo URL. Update `BRAND.logoUrl` in `_build.mjs` if
  the production domain changes — it is referenced in all 20 files.

## Previewing

Open any `.html` directly in a browser to check layout; merge tags render as
literal `{{...}}`. Before going live, run the key ones (`order-approved-event`,
`event-reminder`, `auth-login-otp`) through a client-preview tool — Outlook and
Gmail's clipping at 102KB are the two things worth verifying.
