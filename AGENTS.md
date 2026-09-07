# Working notes for AI agents on this project

Read this before doing anything. It exists so the same instructions do not have to be repeated every session. Add to it whenever you learn something that would otherwise need explaining again.

---

## Commands go in `COMMANDS.md`

Whenever you need the user to run a command, **add it to `COMMANDS.md`** rather than only printing it in chat, so it can be copied without hunting back through the conversation.

- Write commands as **single lines** — backslash continuations break in PowerShell.
- Mark anything containing a credential with 🔑 and tell the user to run it in a normal terminal, not with the `!` prefix (which would put the secret in the transcript).
- Use obvious placeholders (`USERNAME`, `PASSWORD`) — never invent or guess a real value.

---

## Hard rules

### Never read `.env` files
Do not read, `cat`, `head`, `grep`, or otherwise open the contents of `.env`, `.env.*`, or any file holding secrets (credentials, connection strings, API keys, tokens, private keys, service-account JSON).

- Referencing a variable **by name** in code (`process.env.ZEPTOMAIL_TOKEN`) is fine. Reading its **value** is not.
- Never copy a secret into a config file, a command, a commit, or a chat message.
- Listing a directory is fine. Opening the file is not.
- If a value is genuinely needed, ask the user for it, or have a script load it via `dotenv` and print only a masked summary (length, last 4 characters).
- `.env.example` is safe to read and edit — it holds no real values. Keep it updated whenever a new variable is introduced.

### Never commit or push unless asked
Do not run `git commit` or `git push` unless the user explicitly says so.

### Do not assume — verify
This project has already produced several false alarms that were caught only by checking:
- A full-page screenshot showed empty sections. They were scroll-triggered animations; the content was there.
- Statistics showed `0`. They were count-up animations that had not started.
- A radio button "would not click". It was a 1×1px screen-reader input inside a styled label — normal, not a bug.
- A form field looked "cleared by the app". It was the automation tool's fill not persisting.

Before reporting a bug: check the DOM, the network tab, the console, and the database. State what you actually observed.

---

## Project shape

- **Frontend** — React + Vite + Tailwind, repo root, dev server on `http://localhost:5174` (`npm run dev`)
- **Backend** — Express + TypeScript + Mongoose, `backend/`, dev server on `http://localhost:5000` (`cd backend && npm run dev`)
- **Database** — MongoDB Atlas. The database is literally named `test`; that is where all real collections live.
- **Design system** — `design-system.md` is the source of truth for colours, typography and spacing. Navy `#041c44`, accent blue `#1e6ff1`, page background `#f8fafc`, Inter font. Follow it rather than inventing styles.

### Admin login (development seed)
`admin@medconnectsoverseas.com` / `adminpassword123` — created by `backend/src/utils/seedAdmin.ts`.

### The correct domain is `medconnectsoverseas.com`
With an **s** after "medconnect". The repo folder is named `medconnectoverseas` without it, which has already caused a real bug — email templates were generated pointing at a domain that does not exist. Do not infer the domain from the folder name.

---

## Email system

Templates live in `backend/src/templates/emails/`.

- **Never hand-edit the generated `.html` files.** Edit `_build.mjs` and run `npm run build:emails` from `backend/`. All 20 templates share one layout; editing them individually makes them drift.
- `manifest.json` is generated. It holds each template's subject, preheader, required variables and `sensitive` flag.
- Sending goes through `services/email/mailer.ts` → `enqueue()`. Controllers never call the provider directly and never `await` delivery — a mail failure must never fail a request.
- Every send writes an `EmailLog` row. Read it to verify behaviour instead of guessing.
- **Sensitive templates** (`auth-login-otp`, `admin-password-reset`) deliberately store **no body** and mask their merge values. The OTP is therefore not recoverable from the database or from server logs. Reading the real inbox is the only way to complete a login during testing.
- `tsc` does **not** copy `.html` into `dist/`. `npm run build` runs `scripts/copy-templates.mjs` afterwards. If you run `tsc` alone, production sends blank emails.
- After changing backend code, run `npm run build` before testing against `dist/` — a stale `dist` has already caused confusing failures.

---

## Testing

The end-to-end plan lives in `testing/event-flow-test-plan.md`: a mindmap, ~120 test cases in plain English, and a bugs section. Keep it updated as you test — mark cases ✅/❌/⚠️ and add every confirmed bug with a type and reproduction steps.

### These three UX rules must never break
From earlier user feedback, called out as very important:
1. **Registration state must be visible.** If a user has a pending *or* approved registration, never show them a "Register" button.
2. **Seat counts must include pending registrations.** Never show "1 seat left" when a pending registration already claims it.
3. **Reminders must be fully customisable.** The admin can add any offset (e.g. 2 hours before) and remove any of them — not a fixed list.

### Browser automation notes
- Custom radios and checkboxes are 1×1px inputs inside labels. The click tool cannot hit them — call `.click()` on the input via `evaluate_script` instead.
- React-controlled inputs need the native value setter plus an `input` event; setting `.value` alone does nothing.
- The admin forms use native `alert()` for validation errors. An alert **blocks the page**, so `evaluate_script` will appear to hang or return stale content. If a script behaves oddly after a form submit, check for an open dialog and handle it.
- Prefer `take_snapshot` (accessibility tree) over screenshots for checking content — screenshots miss animated content.

### This is a development environment — do not raise these as problems
Confirmed by the project owner:
- **`APP_BASE_URL` pointing at `http://localhost:5174` is expected.** Email links will point at localhost in dev. The production `.env` gets the real domain at deploy time. Do not report it as a bug.
- **The MongoDB database is a test database, not production.** Test users, probe events, orphaned orders and leftover coupons are fine to leave behind. No cleanup is required and data loss is not a concern.
- Test freely: create events, users, orders and coupons as needed.

### Database access
A read-only MongoDB MCP server is connected, scoped to this project only. Use `connectionId: "preconfigured"`, database `test`.

It **cannot write**, by design — read-only at three levels (Atlas role, `--readOnly` flag, `MDB_MCP_READ_ONLY`). If test data must be changed in a way the UI cannot achieve (forcing a record into an unnatural state, moving a date to trigger the cron), ask the user and batch the requests together.

Most "time travel" does **not** need database writes — create an event with a past or near-future date through the admin form instead.

Prefer verifying against documents rather than screens. A page can render correctly while the stored data is wrong, and the reverse. Checking the database is how BUG-001's true blast radius and BUG-010 were both found.

### The API base is `/api/v1`
Not `/api`. Confirmed from the network tab after guessing wrong twice. Example: `http://localhost:5000/api/v1/admin/events`.
