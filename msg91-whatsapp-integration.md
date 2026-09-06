# MSG91 / WhatsApp — what it takes to switch this on

Reference for wiring WhatsApp (and optionally SMS) into MedConnects Overseas through
MSG91. Written **2026-09-06**, before any of it exists in the codebase.

Two things in the app are waiting on this, both currently `console.log` stubs:

| Stub | File | Used by |
|---|---|---|
| `sendEventReminderWhatsapp` | `backend/src/services/reminder.service.ts` | the reminder cron, already wired and already wrapped in try/catch |
| `sendOtpSms` | `backend/src/services/sms.service.ts` | the mobile OTP step in onboarding |

MSG91 covers both channels, so one provider can replace both stubs.

> **The short version:** the code is roughly a day's work. Meta's business
> verification is the long pole and everything else is blocked behind it, so
> start that first and build in parallel.

---

## 1. Meta side — start this today

WhatsApp Business API access is granted by **Meta**, not by MSG91. MSG91 is the
provider sitting on top of it. Nothing below can be skipped or bought around.

- [ ] **A personal Facebook account** — needed to reach Meta Business Suite. It is
      only a door; it does not become the business identity.
- [ ] **A Meta Business Portfolio** at `business.facebook.com` — official
      organisation name, primary contact person, and a business email that can
      receive a confirmation link.
- [ ] **Meta business verification** — upload business documents: registration
      certificate, a utility bill, a bank statement showing the legal entity.
      **This is where people get stuck.** The name on the documents has to match
      the portfolio name exactly. Takes days, sometimes weeks.
- [ ] **A dedicated phone number**, **not currently registered on WhatsApp** —
      not a personal number, not one already on the WhatsApp Business app. If the
      number is already on WhatsApp, that account must be deleted first. It has
      to receive one SMS or call to verify.
- [ ] **A display name** approved by Meta. It must plausibly relate to the
      business — "MedConnects Overseas" is fine.

## 2. MSG91 side

- [ ] An **MSG91 account**, and its **`authkey`** (sent as an `authkey` header).
- [ ] The number **integrated** in the MSG91 panel. This becomes
      `integrated_number` on every request.
- [ ] **Approved message templates** — see the next section, which is the part
      that actually changes how the code has to be written.

Send endpoint:

```
POST https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/
authkey: <MSG91_AUTHKEY>
```

---

## 3. Templates — the constraint that shapes the code

Reminders are **business-initiated**, so they cannot be free text. Every message
must use a Meta-approved template: fixed wording, with `{{1}}`-style variables.
Approval runs from minutes to about a day, and rejections are common for vague or
promotional-sounding copy.

**This collides with something specific in this codebase.** Reminder wording is
derived from `offsetMinutes`, not from a fixed list — that was the BUG-001 fix,
and it is what lets an admin type any custom offset and still get sensible
wording ("in 3 days", "tomorrow", "starting in 10 minutes"). A fixed WhatsApp
template cannot reproduce that on its own.

Two ways out:

| Approach | Verdict |
|---|---|
| **One template, timing as a variable** — `Reminder: {{1}} starts {{2}}. Venue: {{3}}` | **Recommended.** Keeps "reminders must be fully customisable" intact — the rule that any offset can be added or removed. |
| One template per offset | Rejected. Breaks custom offsets, which is the entire point of that rule. |

**OTP is a different template type.** It needs an **`authentication`-category**
template, which has its own rules: no URLs or custom text in the body, and a
copy-code button. Do not try to send an OTP through a utility template.

---

## 4. Consent — currently missing

Meta requires opt-in before messaging anyone. Onboarding today collects a mobile
number and verifies it with an OTP, but **never asks permission to send
WhatsApp**. That needs an explicit checkbox and a stored timestamp.

This is not paperwork. Recipient reports degrade the number's quality rating, and
enough of them get the number restricted or blocked outright. The stored consent
is the defence.

---

## 5. Cost

Charged per **delivered template message**, by category. India, as of 2026:

| Category | Rate | Used for |
|---|---|---|
| Utility | ~₹0.115 | event reminders, schedule changes |
| Authentication | ~₹0.115 | mobile OTP |
| Marketing | ~₹0.863 | not used here |

All **plus 18% GST**. Volume discounts on utility and authentication reach about
30%. Both of this platform's use cases sit on the cheap tiers.

⚠️ **From 1 October 2026**, Meta begins charging for service messages that are
currently free inside the 24-hour customer-initiated reply window, at the same
rate as utility. Worth re-checking rates at build time — they move.

---

## 6. What the code will need

Into `backend/.env` (never into the repo, never pasted into a chat):

```
MSG91_AUTHKEY=
MSG91_WHATSAPP_NUMBER=        # the integrated number, E.164
MSG91_WA_TEMPLATE_REMINDER=   # approved template name
MSG91_WA_TEMPLATE_OTP=        # only if OTP moves to WhatsApp
```

Follow the pattern already used for Cloudinary: **default every value to empty and
degrade cleanly**. With the keys unset the stubs keep logging to console exactly
as they do now, so nothing is blocked while Meta verifies the business, and the
integration goes live the moment the values are filled in.

### One thing that already works in our favour

`user.mobile` is stored as clean E.164 (`+919820115599`) with nothing
concatenating a second country code onto it — that was the BUG-012 fix. It is
exactly the format MSG91 and WhatsApp expect, so no conversion layer is needed.

### Failure handling

`sendEventReminderWhatsapp` is already called inside a try/catch in
`backend/src/jobs/reminderCron.ts`, so a provider outage cannot break the cron or
stop the email reminders. Keep it that way. Worth adding when the real sender
lands: log delivery failures somewhere durable, the way `EmailLog` already does
for email, so a silently undelivered reminder is discoverable.

---

## Sources

- [MSG91 WhatsApp docs](https://docs.msg91.com/whatsapp)
- [MSG91 — how to begin with WhatsApp](https://msg91.com/help/whatsapp/how-to-begin-with-whatsapp)
- [MSG91 — send WhatsApp message](https://msg91.com/help/whatsapp/send-whatsapp)
- [WhatsApp Business API pricing in India, 2026](https://myoperator.com/blog/whatsapp-business-api-pricing-india-2026)
- [WhatsApp API pricing explained, 2026](https://www.authgear.com/post/whatsapp-api-pricing/)

Rates and Meta's policies change. Re-check both before committing to a budget.
