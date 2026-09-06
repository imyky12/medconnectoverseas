/**
 * Email template builder — MedConnect Overseas
 * ---------------------------------------------------------------------------
 * ONE layout, many content blocks. Run `node _build.mjs` to regenerate every
 * .html file in this folder plus manifest.json.
 *
 * Do NOT hand-edit the generated .html files — edit this file and rebuild,
 * otherwise the templates drift apart visually.
 *
 * Placeholders use ZeptoMail merge syntax: {{snake_case}}
 * Works with ZeptoMail hosted templates (via `merge_info`) and with a plain
 * local string-replace when sending raw HTML through the `htmlbody` field.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = dirname(fileURLToPath(import.meta.url));

// ─── Brand constants — single source of truth ────────────────────────────────
const BRAND = {
  name: 'MedConnect Overseas',
  tagline: 'Connecting Medical Aspirants to World-Class Education',
  logoUrl: 'https://medconnectsoverseas.com/images/logo.png',
  siteUrl: 'https://medconnectsoverseas.com',
  dashboardUrl: 'https://medconnectsoverseas.com/dashboard',
  ordersUrl: 'https://medconnectsoverseas.com/dashboard/orders',
  eventsUrl: 'https://medconnectsoverseas.com/dashboard/events',
  profileUrl: 'https://medconnectsoverseas.com/dashboard/profile',
  marketplaceUrl: 'https://medconnectsoverseas.com/dashboard/marketplace',
  supportEmail: 'support@medconnectsoverseas.com',
  address: 'MedConnect Overseas, India',
};

// Palette lifted verbatim from design-system.md
const C = {
  navy: '#041c44',
  blue: '#1e6ff1',
  blueLight: '#dbeafe',
  pageBg: '#f8fafc',
  card: '#ffffff',
  text: '#0f172a',
  text2: '#475569',
  muted: '#94a3b8',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  green: '#16a34a',
  greenBg: '#dcfce7',
  amber: '#d97706',
  amberBg: '#fef3c7',
  red: '#dc2626',
  redBg: '#fee2e2',
  navySoft: '#8fa8cc',
};

const FONT = "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO = "'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace";

const TONES = {
  info: [C.blue, C.blueLight],
  success: [C.green, C.greenBg],
  warn: [C.amber, C.amberBg],
  danger: [C.red, C.redBg],
};

// ─── Content block helpers ──────────────────────────────────────────────────
const p = (html, opts = {}) =>
  `<p style="margin:0 0 16px;font-family:${FONT};font-size:14px;line-height:24px;color:${opts.muted ? C.text2 : C.text};${opts.small ? 'font-size:13px;line-height:21px;' : ''}">${html}</p>`;

const h2 = (t) =>
  `<p style="margin:28px 0 12px;font-family:${FONT};font-size:15px;font-weight:700;line-height:22px;color:${C.navy};">${t}</p>`;

const pill = (label, tone) => {
  const [fg, bg] = TONES[tone];
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;"><tr><td style="background-color:${bg};border-radius:999px;padding:6px 14px;font-family:${FONT};font-size:11px;font-weight:700;line-height:16px;color:${fg};letter-spacing:.08em;text-transform:uppercase;">${label}</td></tr></table>`;
};

const btn = (label, href) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0" class="btn" style="margin:6px 0 20px;"><tr>
        <td align="center" bgcolor="${C.blue}" style="border-radius:8px;">
          <a href="${href}" target="_blank" style="display:inline-block;padding:13px 30px;font-family:${FONT};font-size:14px;font-weight:600;line-height:18px;color:#ffffff;text-decoration:none;border-radius:8px;">${label}</a>
        </td></tr></table>`;

const btnGhost = (label, href) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0" class="btn" style="margin:6px 0 20px;"><tr>
        <td align="center" bgcolor="#ffffff" style="border-radius:8px;border:1px solid ${C.border};">
          <a href="${href}" target="_blank" style="display:inline-block;padding:12px 28px;font-family:${FONT};font-size:14px;font-weight:600;line-height:18px;color:${C.navy};text-decoration:none;border-radius:8px;">${label}</a>
        </td></tr></table>`;

/**
 * Key/value detail card — the workhorse for orders, events and payments.
 * rows: [label, value, { mono?, strike?, tone? }]
 */
const details = (rows) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 22px;background-color:${C.pageBg};border:1px solid ${C.border};border-radius:12px;">
        <tr><td style="padding:4px 20px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${rows
  .map(([k, v, o = {}], i) => {
    const last = i === rows.length - 1;
    const edge = last ? '' : `border-bottom:1px solid ${C.borderLight};`;
    const valStyle = [
      `font-family:${o.mono ? MONO : FONT}`,
      `font-size:${o.mono ? '12px' : '14px'}`,
      'font-weight:600',
      'line-height:20px',
      `color:${o.tone ? TONES[o.tone][0] : C.text}`,
      o.strike ? 'text-decoration:line-through;opacity:.6' : '',
    ]
      .filter(Boolean)
      .join(';');
    return `            <tr>
              <td width="40%" style="padding:12px 12px 12px 0;${edge}font-family:${FONT};font-size:12px;font-weight:500;line-height:20px;color:${C.muted};">${k}</td>
              <td align="right" style="padding:12px 0;${edge}${valStyle};">${v}</td>
            </tr>`;
  })
  .join('\n')}
          </table>
        </td></tr></table>`;

const callout = (html, tone = 'info') => {
  const [fg, bg] = TONES[tone];
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 22px;background-color:${bg};border-radius:10px;">
        <tr><td style="padding:14px 18px;border-left:4px solid ${fg};border-radius:10px;font-family:${FONT};font-size:13px;line-height:21px;color:${C.text};">${html}</td></tr></table>`;
};

/** Big centred code block — OTPs, referral codes, reward codes. */
const codeBlock = (value, caption) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:2px 0 22px;">
        <tr><td align="center" bgcolor="${C.navy}" style="background-color:${C.navy};border-radius:12px;padding:26px 20px;">
          <div style="font-family:${FONT};font-size:34px;font-weight:800;line-height:40px;color:#ffffff;letter-spacing:.2em;">${value}</div>
          ${caption ? `<div style="margin-top:10px;font-family:${FONT};font-size:12px;font-weight:500;line-height:18px;color:${C.navySoft};">${caption}</div>` : ''}
        </td></tr></table>`;

/** Centred image — QR codes, banners. Accepts an absolute URL or a cid: ref. */
const imageBlock = (src, alt, width, caption) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:2px 0 22px;">
        <tr><td align="center" bgcolor="#ffffff" style="background-color:#ffffff;border:1px solid ${C.border};border-radius:12px;padding:24px;">
          <img src="${src}" alt="${alt}" width="${width}" style="display:block;width:${width}px;max-width:100%;height:auto;border:0;border-radius:8px;">
          ${caption ? `<div style="margin-top:14px;font-family:${FONT};font-size:12px;font-weight:500;line-height:18px;color:${C.muted};">${caption}</div>` : ''}
        </td></tr></table>`;

const steps = (items) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 22px;">
${items
  .map(
    (it, i) => `        <tr>
          <td width="30" valign="top" style="padding:0 12px 14px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" width="24" height="24" bgcolor="${C.blueLight}" style="background-color:${C.blueLight};border-radius:999px;font-family:${FONT};font-size:12px;font-weight:700;line-height:24px;color:${C.blue};">${i + 1}</td></tr></table>
          </td>
          <td valign="top" style="padding:0 0 14px;font-family:${FONT};font-size:14px;line-height:24px;color:${C.text};">${it}</td>
        </tr>`
  )
  .join('\n')}
      </table>`;

const divider = () =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:2px 0 24px;"><tr><td style="border-top:1px solid ${C.border};font-size:0;line-height:0;">&nbsp;</td></tr></table>`;

const signoff = (line = 'Warm regards,') =>
  `<p style="margin:26px 0 0;font-family:${FONT};font-size:14px;line-height:24px;color:${C.text2};">${line}<br><strong style="color:${C.navy};">Team ${BRAND.name}</strong></p>`;

// ─── Layout ─────────────────────────────────────────────────────────────────
function layout({ key, subject, preheader, heading, body, footerNote, audience, unsubscribe }) {
  const isAdmin = audience === 'admin';
  return `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${subject}</title>
<!-- GENERATED FILE — edit _build.mjs and run \`node _build.mjs\` instead. -->
<!-- template-key: ${key} -->
<!-- subject: ${subject} -->
<!--[if mso]>
<noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
<![endif]-->
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
  table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}
  img{-ms-interpolation-mode:bicubic;border:0;outline:none;text-decoration:none;}
  body{margin:0!important;padding:0!important;width:100%!important;}
  @media only screen and (max-width:620px){
    .wrap{width:100%!important;}
    .px{padding-left:24px!important;padding-right:24px!important;}
    .btn a{display:block!important;text-align:center!important;}
    h1{font-size:21px!important;line-height:29px!important;}
  }
</style>
</head>
<body style="margin:0;padding:0;width:100%;background-color:${C.pageBg};">
<div style="display:none;font-size:1px;color:${C.pageBg};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}&#8203;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${C.pageBg};">
  <tr><td align="center" style="padding:32px 12px;">

    <table role="presentation" class="wrap" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">

      <!-- Header -->
      <tr><td align="center" bgcolor="${C.navy}" style="background-color:${C.navy};border-radius:14px 14px 0 0;padding:26px 32px;">
        <!-- The logo asset is square (400x400) and dark-coloured, so it vanishes
             against the navy header. Sit it on a white tile: guarantees contrast
             whatever the artwork does, and keeps the header compact. Sizing it
             like a wide wordmark previously made the header ~200px tall. -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;">
          <tr><td align="center" bgcolor="#ffffff" style="background-color:#ffffff;border-radius:14px;padding:10px;line-height:0;">
            <img src="${BRAND.logoUrl}" alt="${BRAND.name}" width="52" height="52" style="display:block;width:52px;height:52px;max-width:52px;">
          </td></tr>
        </table>
        <div style="margin-top:12px;font-family:${FONT};font-size:15px;font-weight:700;line-height:20px;color:#ffffff;letter-spacing:.01em;">${BRAND.name}</div>
        ${isAdmin ? `<div style="margin-top:8px;font-family:${FONT};font-size:10px;font-weight:700;line-height:16px;color:${C.navySoft};letter-spacing:.14em;text-transform:uppercase;">Admin Notification</div>` : ''}
      </td></tr>

      <!-- Card -->
      <tr><td bgcolor="${C.card}" class="px" style="background-color:${C.card};padding:36px 40px 32px;border-left:1px solid ${C.border};border-right:1px solid ${C.border};">
        <h1 style="margin:0 0 16px;font-family:${FONT};font-size:24px;font-weight:800;line-height:32px;color:${C.navy};">${heading}</h1>
${body}
      </td></tr>

      <!-- Footer -->
      <tr><td bgcolor="${C.card}" class="px" style="background-color:${C.card};padding:0 40px 30px;border-left:1px solid ${C.border};border-right:1px solid ${C.border};border-bottom:1px solid ${C.border};border-radius:0 0 14px 14px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="border-top:1px solid ${C.borderLight};padding-top:22px;">
            ${footerNote ? `<p style="margin:0 0 12px;font-family:${FONT};font-size:12px;line-height:19px;color:${C.muted};">${footerNote}</p>` : ''}
            <p style="margin:0;font-family:${FONT};font-size:12px;line-height:19px;color:${C.text2};">Questions? Reply to this email or write to <a href="mailto:${BRAND.supportEmail}" style="color:${C.blue};text-decoration:none;font-weight:600;">${BRAND.supportEmail}</a>.</p>
          </td></tr>
        </table>
      </td></tr>

      <!-- Sub-footer -->
      <tr><td align="center" style="padding:24px 24px 8px;">
        <p style="margin:0 0 6px;font-family:${FONT};font-size:12px;font-weight:700;line-height:18px;color:${C.navy};">${BRAND.name}</p>
        <p style="margin:0 0 12px;font-family:${FONT};font-size:11px;line-height:17px;color:${C.muted};">${BRAND.tagline}</p>
        <p style="margin:0;font-family:${FONT};font-size:11px;line-height:17px;color:${C.muted};">
          <a href="${BRAND.siteUrl}" style="color:${C.muted};text-decoration:none;">Website</a> &nbsp;&#183;&nbsp;
          <a href="${BRAND.dashboardUrl}" style="color:${C.muted};text-decoration:none;">Dashboard</a>${unsubscribe ? ` &nbsp;&#183;&nbsp;\n          <a href="{{unsubscribe_url}}" style="color:${C.muted};text-decoration:none;">Unsubscribe</a>` : ''}
        </p>
        <p style="margin:10px 0 0;font-family:${FONT};font-size:11px;line-height:17px;color:${C.muted};">${BRAND.address}</p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>
`;
}

// ─── Templates ──────────────────────────────────────────────────────────────
// Naming convention: <domain>-<event>[-<variant>].html
// Admin-audience templates are prefixed `admin-`. See README.md.

const templates = [
  // ══ auth ══════════════════════════════════════════════════════════════════
  {
    key: 'auth-login-otp',
    sensitive: true, // carries a live OTP — body is never persisted to EmailLog
    trigger: 'user/auth.controller.ts → requestOtp',
    subject: '{{otp}} is your MedConnect Overseas login code',
    preheader: 'Your one-time password expires in {{expiry_minutes}} minutes.',
    heading: "Let's verify it's you",
    vars: ['first_name', 'otp', 'expiry_minutes'],
    body: [
      p('Hi {{first_name}}, use the one-time password below to finish signing in to your MedConnect Overseas account.'),
      codeBlock('{{otp}}', 'Valid for {{expiry_minutes}} minutes'),
      callout('<strong>Keep this code to yourself.</strong> Our team will never call, message or email you asking for it.', 'warn'),
      p("Didn't try to sign in? You can safely ignore this email — no one can access your account without this code.", { muted: true, small: true }),
      signoff(),
    ],
  },
  {
    key: 'newsletter-access-otp',
    sensitive: true, // carries a live OTP — body is never persisted to EmailLog
    trigger: 'newsletter.controller.ts → requestNewsletterAccess',
    subject: '{{otp}} is your code for {{newsletter_title}}',
    preheader: 'Enter this code to open the issue. It expires in {{expiry_minutes}} minutes.',
    heading: 'Here is your access code',
    vars: ['otp', 'newsletter_title', 'expiry_minutes'],
    body: [
      p('You asked to read <strong>{{newsletter_title}}</strong>. Enter the code below and the PDF opens straight away — there is no account to create.'),
      codeBlock('{{otp}}', 'Valid for {{expiry_minutes}} minutes'),
      p("Didn't ask for this? Ignore this email — nothing has been sent to you and no account has been made.", { muted: true, small: true }),
      signoff(),
    ],
  },
  {
    key: 'auth-welcome',
    trigger: 'user/profile.controller.ts → onboarding',
    subject: 'Welcome aboard, {{first_name}} — your MCO journey starts here',
    preheader: 'Your account is ready. Grab your referral code and pick your first course.',
    heading: 'Welcome to MedConnect Overseas',
    vars: ['first_name', 'referral_code'],
    body: [
      pill('Account active', 'success'),
      p("Hi {{first_name}}, your profile is complete and your account is live. You're now part of a community of medical aspirants building careers across borders."),
      h2('Your personal referral code'),
      codeBlock('{{referral_code}}', 'Share it — they get onboarded, you get rewarded'),
      h2('Three things worth doing first'),
      steps([
        '<strong>Browse the marketplace</strong> — find the course that matches where you are in your prep.',
        '<strong>Reserve an event seat</strong> — live sessions fill up fast and seats are limited.',
        '<strong>Complete your profile</strong> — it keeps your certificates and records accurate.',
      ]),
      btn('Go to my dashboard', BRAND.dashboardUrl),
      signoff(),
    ],
  },

  // ══ account ═══════════════════════════════════════════════════════════════
  {
    key: 'account-suspended',
    trigger: 'admin/user.controller.ts → toggleUserStatus (isActive → false)',
    subject: 'Your MedConnect Overseas account has been suspended',
    preheader: 'Access is paused for now. Here is how to get it reviewed.',
    heading: 'Your account access is on hold',
    vars: ['first_name', 'email', 'suspended_on', 'reason'],
    body: [
      pill('Suspended', 'danger'),
      p('Hi {{first_name}}, access to your MedConnect Overseas account has been suspended by our team. You will not be able to sign in or open your purchased content until this is resolved.'),
      details([
        ['Account', '{{email}}'],
        ['Suspended on', '{{suspended_on}}'],
      ]),
      callout('<strong>Reason given:</strong> {{reason}}', 'danger'),
      p('If you believe this was a mistake, reply to this email with your account address and we will review it within one business day.'),
      btnGhost('Contact support', `mailto:${BRAND.supportEmail}`),
      signoff(),
    ],
  },
  {
    key: 'account-reactivated',
    trigger: 'admin/user.controller.ts → toggleUserStatus (isActive → true)',
    subject: "You're back in — your MCO account is active again",
    preheader: 'Your access has been restored. Everything is right where you left it.',
    heading: 'Your account is active again',
    vars: ['first_name', 'reactivated_on'],
    body: [
      pill('Reactivated', 'success'),
      p('Good news, {{first_name}} — your MedConnect Overseas account has been restored. Your courses, event registrations and certificates are all exactly where you left them.'),
      details([['Reactivated on', '{{reactivated_on}}']]),
      btn('Return to my dashboard', BRAND.dashboardUrl),
      signoff(),
    ],
  },
  {
    key: 'admin-password-reset',
    audience: 'admin',
    sensitive: true, // carries a working reset link — body is never persisted to EmailLog
    trigger: 'admin/auth.controller.ts → requestPasswordReset (to be built)',
    subject: 'Reset your MedConnect Overseas admin password',
    preheader: 'This secure link expires in {{expiry_minutes}} minutes.',
    heading: 'Reset your admin password',
    vars: ['admin_name', 'reset_url', 'expiry_minutes', 'ip_address', 'requested_at'],
    body: [
      p('Hi {{admin_name}}, we received a request to reset the password on your MedConnect Overseas admin account. Use the button below to choose a new one.'),
      btn('Reset my password', '{{reset_url}}'),
      details([
        ['Requested at', '{{requested_at}}'],
        ['Origin IP', '{{ip_address}}', { mono: true }],
        ['Link expires in', '{{expiry_minutes}} minutes'],
      ]),
      callout("<strong>Didn't request this?</strong> Do nothing and the link expires on its own — but tell the team, because someone knows this admin address.", 'warn'),
      signoff(),
    ],
    footerNote: 'This link works once and only from this email. Never forward it.',
  },

  // ══ orders / payments ═════════════════════════════════════════════════════
  {
    key: 'order-submitted-course',
    trigger: 'user/order.controller.ts → createOrder',
    subject: "Payment received — we're verifying your {{course_title}} order",
    preheader: 'Manual verification usually takes {{verification_window}}. We will email you the moment it clears.',
    heading: "We've got your payment",
    vars: ['first_name', 'course_title', 'order_id', 'final_price', 'transaction_id', 'submitted_on', 'verification_window'],
    body: [
      pill('Pending verification', 'warn'),
      p('Hi {{first_name}}, thanks for your payment. Our team verifies every transaction manually, so hold tight — this usually takes {{verification_window}}.'),
      details([
        ['Course', '{{course_title}}'],
        ['Order ID', '{{order_id}}', { mono: true }],
        ['Amount paid', '&#8377;{{final_price}}'],
        ['Transaction ID', '{{transaction_id}}', { mono: true }],
        ['Submitted on', '{{submitted_on}}'],
      ]),
      callout('<strong>Course access is not unlocked yet.</strong> You will get a separate email with your access link once the payment is approved.', 'info'),
      btnGhost('Track this order', BRAND.ordersUrl),
      signoff(),
    ],
  },
  {
    key: 'order-submitted-event',
    trigger: 'user/event.controller.ts → registerForEvent',
    subject: "You're on the list for {{event_title}} — pending verification",
    preheader: 'Your seat is reserved only after we verify your payment. We will confirm shortly.',
    heading: 'Registration submitted',
    vars: ['first_name', 'event_title', 'event_code', 'slot_date', 'slot_time', 'event_location', 'order_id', 'final_price', 'transaction_id', 'submitted_on'],
    body: [
      pill('Pending verification', 'warn'),
      p('Hi {{first_name}}, we have received your registration for <strong>{{event_title}}</strong> along with your payment details.'),
      details([
        ['Event', '{{event_title}}'],
        ['Event code', '{{event_code}}', { mono: true }],
        ['Date', '{{slot_date}}'],
        ['Time', '{{slot_time}}'],
        ['Where', '{{event_location}}'],
        ['Order ID', '{{order_id}}', { mono: true }],
        ['Amount paid', '&#8377;{{final_price}}'],
        ['Transaction ID', '{{transaction_id}}', { mono: true }],
      ]),
      callout('<strong>Your seat is not confirmed yet.</strong> Seats are limited and are only held once our team approves your payment. You will receive a confirmation email with your entry QR code as soon as that happens.', 'warn'),
      btnGhost('View my registrations', BRAND.eventsUrl),
      signoff(),
    ],
  },
  {
    key: 'order-approved-course',
    trigger: 'admin/order.controller.ts → updateOrderStatus (approved, orderType: course)',
    subject: "You're in! {{course_title}} is now unlocked",
    preheader: 'Payment verified. Your course is ready whenever you are.',
    heading: 'Payment approved — start learning',
    vars: ['first_name', 'course_title', 'order_id', 'final_price', 'approved_on', 'course_url'],
    body: [
      pill('Payment approved', 'success'),
      p('Great news, {{first_name}} — your payment cleared and <strong>{{course_title}}</strong> is now sitting in your learning centre.'),
      details([
        ['Course', '{{course_title}}'],
        ['Order ID', '{{order_id}}', { mono: true }],
        ['Amount paid', '&#8377;{{final_price}}'],
        ['Approved on', '{{approved_on}}', { tone: 'success' }],
      ]),
      btn('Start the course', '{{course_url}}'),
      p('Your access does not expire — pick it up whenever it suits your schedule.', { muted: true, small: true }),
      signoff('Happy studying,'),
    ],
    footerNote: 'Keep this email as your receipt for order {{order_id}}.',
  },
  {
    key: 'order-approved-event',
    trigger: 'admin/order.controller.ts → updateOrderStatus (approved, orderType: event)',
    subject: 'Seat confirmed for {{event_title}} — here is your entry QR',
    preheader: 'Your QR code is inside. It is scanned at entry, so keep this email handy.',
    heading: 'Your seat is confirmed',
    vars: ['first_name', 'event_title', 'event_code', 'slot_date', 'slot_time', 'event_location', 'registration_id', 'qr_code_url'],
    body: [
      pill('Seat confirmed', 'success'),
      p('You are all set, {{first_name}}. Your payment is verified and your seat at <strong>{{event_title}}</strong> is locked in.'),
      details([
        ['Event', '{{event_title}}'],
        ['Event code', '{{event_code}}', { mono: true }],
        ['Date', '{{slot_date}}'],
        ['Time', '{{slot_time}}'],
        ['Where', '{{event_location}}'],
        ['Registration ID', '{{registration_id}}', { mono: true }],
      ]),
      h2('Your entry pass'),
      imageBlock('{{qr_code_url}}', 'Entry QR code for {{event_title}}', 220, 'Registration {{registration_id}}'),
      callout('<strong>Screenshot this QR code now.</strong> It is scanned at entry, it is unique to you, and it works only once — please do not share or forward it.', 'warn'),
      p('We will send you reminders as the date approaches so it does not slip your mind.', { muted: true, small: true }),
      btnGhost('View my ticket online', BRAND.eventsUrl),
      signoff('See you there,'),
    ],
  },
  {
    key: 'order-rejected',
    trigger: 'admin/order.controller.ts → updateOrderStatus (rejected)',
    subject: "Action needed: we couldn't verify your payment",
    preheader: 'Your order for {{item_title}} could not be approved. Here is what to do next.',
    heading: "We couldn't verify this payment",
    vars: ['first_name', 'item_title', 'order_id', 'final_price', 'transaction_id', 'rejection_reason', 'reviewed_on', 'retry_url'],
    body: [
      pill('Payment not verified', 'danger'),
      p('Hi {{first_name}}, our team reviewed your order for <strong>{{item_title}}</strong> and was not able to verify the payment.'),
      callout('<strong>Reason:</strong> {{rejection_reason}}', 'danger'),
      details([
        ['Item', '{{item_title}}'],
        ['Order ID', '{{order_id}}', { mono: true }],
        ['Amount', '&#8377;{{final_price}}'],
        ['Transaction ID', '{{transaction_id}}', { mono: true }],
        ['Reviewed on', '{{reviewed_on}}'],
      ]),
      h2('How to fix this'),
      steps([
        'Check the transaction ID and payment screenshot against your bank or UPI app record.',
        'Resubmit with the corrected details — it takes under a minute.',
        'Still stuck? Reply to this email with your screenshot and we will sort it out for you.',
      ]),
      btn('Resubmit payment', '{{retry_url}}'),
      callout('<strong>Was money actually debited?</strong> Nothing has been captured on our side. Failed or unmatched payments are reversed by your bank, typically within 5&#8211;7 working days.', 'info'),
      signoff(),
    ],
  },
  {
    key: 'admin-order-new',
    audience: 'admin',
    trigger: 'user/order.controller.ts → createOrder AND user/event.controller.ts → registerForEvent',
    subject: '[MCO] New {{order_type}} payment awaiting review — ₹{{final_price}}',
    preheader: '{{user_name}} submitted a payment for {{item_title}}. Verify it in the admin panel.',
    heading: 'A payment is waiting for review',
    vars: ['order_type', 'item_title', 'user_name', 'user_email', 'user_mobile', 'order_id', 'final_price', 'transaction_id', 'submitted_on', 'admin_order_url', 'screenshot_url'],
    body: [
      pill('Action required', 'warn'),
      p('A new <strong>{{order_type}}</strong> order has been submitted and is sitting in the pending queue.'),
      details([
        ['Item', '{{item_title}}'],
        ['User', '{{user_name}}'],
        ['Email', '{{user_email}}'],
        ['Mobile', '{{user_mobile}}'],
        ['Order ID', '{{order_id}}', { mono: true }],
        ['Amount', '&#8377;{{final_price}}'],
        ['Transaction ID', '{{transaction_id}}', { mono: true }],
        ['Submitted on', '{{submitted_on}}'],
      ]),
      btn('Review in admin panel', '{{admin_order_url}}'),
      btnGhost('Open payment screenshot', '{{screenshot_url}}'),
      p('Event orders hold a seat only after approval — clear these promptly so seat counts stay accurate.', { muted: true, small: true }),
    ],
    footerNote: 'Automated notification from the MedConnect Overseas backend.',
  },

  // ══ events ════════════════════════════════════════════════════════════════
  {
    key: 'event-reminder',
    trigger: 'jobs/reminderCron.ts → processReminders (all four offsets)',
    subject: '{{event_title}} is {{reminder_phrase}}',
    preheader: '{{slot_date}} at {{slot_time}}. Your entry QR is in your confirmation email.',
    heading: '{{event_title}} is {{reminder_phrase}}',
    vars: ['first_name', 'event_title', 'event_code', 'reminder_label', 'reminder_phrase', 'slot_date', 'slot_time', 'event_mode', 'event_location', 'ticket_url'],
    body: [
      pill('{{reminder_label}}', 'info'),
      p('Hi {{first_name}}, a quick nudge so <strong>{{event_title}}</strong> does not sneak up on you.'),
      details([
        ['Event', '{{event_title}}'],
        ['Event code', '{{event_code}}', { mono: true }],
        ['Date', '{{slot_date}}'],
        ['Time', '{{slot_time}}'],
        ['Mode', '{{event_mode}}'],
        ['Where', '{{event_location}}'],
      ]),
      btn('Open my ticket &amp; QR code', '{{ticket_url}}'),
      callout('<strong>Before you head out:</strong> have your entry QR code ready on your phone, and arrive about 10 minutes early so the check-in queue stays short.', 'info'),
      signoff('See you soon,'),
    ],
    footerNote: 'You receive these because you are registered for {{event_code}}.',
  },
  {
    key: 'event-updated',
    trigger: 'admin/event.controller.ts → updateEvent (slot date/time changed)',
    subject: 'Schedule change for {{event_title}} — please check the new timing',
    preheader: 'New date and time inside. Your registration and QR code stay valid.',
    heading: 'The schedule has changed',
    vars: ['first_name', 'event_title', 'event_code', 'old_slot_date', 'old_slot_time', 'new_slot_date', 'new_slot_time', 'event_location', 'change_note', 'ticket_url'],
    body: [
      pill('Schedule updated', 'warn'),
      p('Hi {{first_name}}, the organisers have rescheduled <strong>{{event_title}}</strong>. Please update your calendar.'),
      details([
        ['Was', '{{old_slot_date}}, {{old_slot_time}}', { strike: true }],
        ['Now', '{{new_slot_date}}, {{new_slot_time}}', { tone: 'success' }],
        ['Where', '{{event_location}}'],
        ['Event code', '{{event_code}}', { mono: true }],
      ]),
      callout('<strong>Note from the organisers:</strong> {{change_note}}', 'info'),
      p('<strong>Your registration and entry QR code remain valid</strong> — there is nothing you need to re-do. If the new timing does not work for you, reply to this email and we will help you move slots or arrange a refund.'),
      btn('View my updated ticket', '{{ticket_url}}'),
      signoff(),
    ],
    footerNote: 'You receive these because you are registered for {{event_code}}.',
  },
  {
    key: 'event-cancelled',
    trigger: 'admin/event.controller.ts → deleteEvent / unpublish',
    subject: '{{event_title}} has been cancelled — here is what happens next',
    preheader: 'We are sorry. Your refund details are inside.',
    heading: 'This event has been cancelled',
    vars: ['first_name', 'event_title', 'event_code', 'slot_date', 'cancellation_reason', 'refund_note'],
    body: [
      pill('Event cancelled', 'danger'),
      p('Hi {{first_name}}, we are sorry to share that <strong>{{event_title}}</strong>, scheduled for {{slot_date}}, has been cancelled.'),
      callout('<strong>Reason:</strong> {{cancellation_reason}}', 'danger'),
      details([
        ['Event', '{{event_title}}'],
        ['Event code', '{{event_code}}', { mono: true }],
        ['Was scheduled for', '{{slot_date}}', { strike: true }],
      ]),
      h2('About your payment'),
      p('{{refund_note}}'),
      p('Your entry QR code for this event is now void. We know this is disappointing — keep an eye on the events page, as we usually reschedule cancelled sessions within a few weeks.'),
      btnGhost('Browse upcoming events', BRAND.eventsUrl),
      signoff('With apologies,'),
    ],
  },
  {
    key: 'event-attendance-confirmed',
    trigger: 'admin/eventRegistration.controller.ts → scanAttendance',
    subject: 'Thanks for attending {{event_title}} — your certificate is ready',
    preheader: 'Your attendance is recorded. Download your certificate and session notes.',
    heading: 'Thanks for showing up',
    vars: ['first_name', 'event_title', 'event_code', 'attended_on', 'certificate_url', 'notes_url'],
    body: [
      pill('Attendance marked', 'success'),
      p('Hi {{first_name}}, your attendance at <strong>{{event_title}}</strong> has been recorded. Your certificate is generated and ready to download.'),
      details([
        ['Event', '{{event_title}}'],
        ['Event code', '{{event_code}}', { mono: true }],
        ['Attended on', '{{attended_on}}', { tone: 'success' }],
      ]),
      btn('Download my certificate', '{{certificate_url}}'),
      btnGhost('Get the session notes', '{{notes_url}}'),
      divider(),
      p('Both stay available in your dashboard, so there is no rush — but downloading now saves you a search later.', { muted: true, small: true }),
      signoff(),
    ],
  },

  // ══ referrals ═════════════════════════════════════════════════════════════
  {
    key: 'referral-signup',
    trigger: 'user/profile.controller.ts → onboarding (referrer resolved)',
    subject: '{{referred_name}} just joined using your code',
    preheader: 'That is {{referred_count}} people you have brought to MCO. Your reward unlocks on their first enrolment.',
    heading: 'Someone joined through you',
    vars: ['first_name', 'referred_name', 'joined_on', 'referral_code', 'referred_count'],
    body: [
      pill('Referral signed up', 'info'),
      p('Nice one, {{first_name}} — <strong>{{referred_name}}</strong> just created an account using your referral code.'),
      details([
        ['Who joined', '{{referred_name}}'],
        ['Joined on', '{{joined_on}}'],
        ['Your code', '{{referral_code}}', { mono: true }],
        ['Total referrals', '{{referred_count}}', { tone: 'success' }],
      ]),
      callout('<strong>Your reward is not unlocked yet.</strong> It is credited once {{referred_name}} completes their first enrolment — we will email you the moment that happens.', 'info'),
      btnGhost('View my referrals', BRAND.profileUrl),
      signoff(),
    ],
    footerNote: 'Keep sharing your code — there is no cap on how many people you can refer.',
  },
  {
    key: 'referral-converted',
    trigger: 'admin/order.controller.ts → updateOrderStatus (approved, referred user first purchase)',
    subject: 'Your referral just enrolled — reward unlocked',
    preheader: '{{referred_name}} enrolled in {{item_title}}. Here is your reward code.',
    heading: 'Reward unlocked',
    vars: ['first_name', 'referred_name', 'item_title', 'reward_code', 'reward_value', 'referral_code'],
    body: [
      pill('Reward unlocked', 'success'),
      p('This one is on you, {{first_name}} — <strong>{{referred_name}}</strong> just enrolled in <strong>{{item_title}}</strong> after joining with your code.'),
      h2('Your reward code'),
      codeBlock('{{reward_code}}', 'Worth &#8377;{{reward_value}} on your next purchase'),
      details([
        ['Referred member', '{{referred_name}}'],
        ['They enrolled in', '{{item_title}}'],
        ['Your referral code', '{{referral_code}}', { mono: true }],
        ['Reward value', '&#8377;{{reward_value}}', { tone: 'success' }],
      ]),
      p('Apply the code at checkout on any course or event.'),
      btn('Spend it in the marketplace', BRAND.marketplaceUrl),
      signoff(),
    ],
  },

  // ══ marketing / site ══════════════════════════════════════════════════════
  {
    key: 'newsletter-welcome',
    trigger: 'newsletter.controller.ts → subscribe (endpoint not built yet)',
    unsubscribe: true,
    subject: "You're on the list — MedConnect Overseas insider access",
    preheader: 'Licensing deadlines, scholarship windows and new batches, before they go public.',
    heading: "You're subscribed",
    vars: ['email'],
    body: [
      pill('Subscribed', 'success'),
      p('Thanks for subscribing. From here on you will hear from us before anyone else does.'),
      h2('What lands in your inbox'),
      steps([
        '<strong>Licensing and exam deadlines</strong> across the countries our students apply to.',
        '<strong>Scholarship and intake windows</strong> while there is still time to act on them.',
        '<strong>Early access to new batches</strong> and live sessions, usually a week before public release.',
      ]),
      p('We send roughly twice a month. No spam, no selling your address on — just the things worth knowing.'),
      btn('Explore the platform', BRAND.siteUrl),
      signoff(),
    ],
    footerNote: 'You are subscribed as {{email}}. Changed your mind? Unsubscribe below — no hard feelings.',
  },
  {
    key: 'newsletter-issue',
    trigger: 'newsletter.controller.ts → notifySubscribers',
    subject: 'Med Nexus — {{newsletter_title}}',
    preheader: '{{newsletter_summary}}',
    heading: '{{newsletter_title}}',
    vars: ['newsletter_title', 'newsletter_edition', 'newsletter_summary', 'download_url'],
    body: [
      pill('{{newsletter_edition}}', 'info'),
      p('{{newsletter_summary}}'),
      // The link carries a signed ticket tied to this address, so a subscriber
      // who is already known does not have to prove the same email twice.
      btn('Read this issue', '{{download_url}}'),
      p('The link above works only from this email address and stays valid for 30 days. If it expires, you can always open the issue from the newsletter page.', { muted: true, small: true }),
      signoff(),
    ],
  },
  {
    key: 'contact-ack',
    trigger: 'contact.controller.ts → submitEnquiry (endpoint not built yet)',
    subject: "We've got your message — MedConnect Overseas",
    preheader: 'Reference {{ticket_id}}. Our team replies within {{response_window}}.',
    heading: 'Message received',
    vars: ['name', 'ticket_id', 'enquiry_subject', 'message', 'submitted_on', 'response_window'],
    body: [
      pill('Received', 'info'),
      p('Hi {{name}}, thanks for reaching out. A real person on our team reads every message, and you can expect a reply within <strong>{{response_window}}</strong>.'),
      details([
        ['Reference ID', '{{ticket_id}}', { mono: true }],
        ['Subject', '{{enquiry_subject}}'],
        ['Submitted on', '{{submitted_on}}'],
      ]),
      h2('What you sent us'),
      callout('{{message}}', 'info'),
      p('Reply to this email if you want to add anything — it stays attached to reference {{ticket_id}}.', { muted: true, small: true }),
      signoff(),
    ],
  },
  {
    key: 'admin-contact-new',
    audience: 'admin',
    trigger: 'contact.controller.ts → submitEnquiry (endpoint not built yet)',
    subject: '[MCO] New enquiry from {{name}} — {{enquiry_subject}}',
    preheader: '{{name}} ({{email}}) submitted a contact form enquiry.',
    heading: 'New contact enquiry',
    vars: ['name', 'email', 'mobile', 'enquiry_subject', 'message', 'submitted_on', 'ticket_id'],
    body: [
      pill('Needs a reply', 'warn'),
      details([
        ['Reference ID', '{{ticket_id}}', { mono: true }],
        ['Name', '{{name}}'],
        ['Email', '{{email}}'],
        ['Mobile', '{{mobile}}'],
        ['Subject', '{{enquiry_subject}}'],
        ['Submitted on', '{{submitted_on}}'],
      ]),
      h2('Message'),
      callout('{{message}}', 'info'),
      btn('Reply to {{name}}', 'mailto:{{email}}?subject=Re:%20{{enquiry_subject}}%20[{{ticket_id}}]'),
    ],
    footerNote: 'Automated notification from the MedConnect Overseas backend.',
  },
];

// ─── Build ──────────────────────────────────────────────────────────────────
const manifest = [];

for (const t of templates) {
  const file = `${t.key}.html`;
  const html = layout({
    key: t.key,
    subject: t.subject,
    preheader: t.preheader,
    heading: t.heading,
    body: t.body.map((b) => `        ${b}`).join('\n'),
    footerNote: t.footerNote,
    audience: t.audience,
    unsubscribe: t.unsubscribe,
  });
  writeFileSync(join(OUT, file), html, 'utf8');
  manifest.push({
    key: t.key,
    file,
    subject: t.subject,
    preheader: t.preheader,
    audience: t.audience || 'user',
    category: t.unsubscribe ? 'marketing' : 'transactional',
    sensitive: Boolean(t.sensitive),
    trigger: t.trigger,
    variables: t.vars,
  });
  console.log(`  ✓ ${file}`);
}

writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
console.log(`\n${manifest.length} templates + manifest.json written to ${OUT}`);
