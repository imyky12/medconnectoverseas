import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { env } from '../../config/env';

/**
 * Loads the generated HTML templates and merges `{{snake_case}}` variables.
 *
 * Templates and manifest.json live in src/templates/emails and are copied into
 * dist/ by scripts/copy-templates.mjs at build time — `tsc` alone does not
 * carry non-.ts files across, so skipping that step ships empty bodies.
 */

const TEMPLATE_DIR = path.join(__dirname, '..', '..', 'templates', 'emails');

export interface TemplateManifestEntry {
  key: string;
  file: string;
  subject: string;
  preheader: string;
  audience: 'user' | 'admin';
  category: 'transactional' | 'marketing';
  /** Body is never persisted and merge values are masked in the audit log. */
  sensitive: boolean;
  trigger: string;
  variables: string[];
}

export type TemplateKey = string;
export type MergeData = Record<string, string | number | null | undefined>;

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
  templateHash: string;
  meta: TemplateManifestEntry;
}

export class TemplateError extends Error {}

// ─── Manifest + template cache ──────────────────────────────────────────────

let manifestCache: Map<string, TemplateManifestEntry> | null = null;
const htmlCache = new Map<string, { html: string; hash: string }>();

/** Dev re-reads from disk so template edits appear without a server restart. */
const shouldCache = (): boolean => env.NODE_ENV === 'production';

function loadManifest(): Map<string, TemplateManifestEntry> {
  if (manifestCache && shouldCache()) return manifestCache;

  const manifestPath = path.join(TEMPLATE_DIR, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new TemplateError(
      `Email manifest not found at ${manifestPath}. ` +
        `Run "node src/templates/emails/_build.mjs", and make sure the build copies templates into dist/.`
    );
  }

  const entries: TemplateManifestEntry[] = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifestCache = new Map(entries.map((e) => [e.key, e]));
  return manifestCache;
}

function loadHtml(file: string): { html: string; hash: string } {
  const cached = htmlCache.get(file);
  if (cached && shouldCache()) return cached;

  const filePath = path.join(TEMPLATE_DIR, file);
  if (!fs.existsSync(filePath)) {
    throw new TemplateError(`Email template file missing: ${filePath}`);
  }

  const html = fs.readFileSync(filePath, 'utf8');
  const hash = crypto.createHash('sha1').update(html).digest('hex').slice(0, 12);
  const record = { html, hash };
  htmlCache.set(file, record);
  return record;
}

export function getTemplateMeta(key: TemplateKey): TemplateManifestEntry {
  const meta = loadManifest().get(key);
  if (!meta) {
    throw new TemplateError(
      `Unknown email template "${key}". Known keys: ${[...loadManifest().keys()].join(', ')}`
    );
  }
  return meta;
}

export function listTemplates(): TemplateManifestEntry[] {
  return [...loadManifest().values()];
}

// ─── Merging ────────────────────────────────────────────────────────────────

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * Every merge value is HTML-escaped. This is not cosmetic: admin-contact-new
 * renders {{message}} straight from a public form into an admin's inbox, and
 * order-rejected renders admin-typed {{rejection_reason}}. Newlines become <br>
 * so multi-line messages survive.
 */
function escapeValue(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/[&<>"']/g, (c) => ESCAPES[c])
    .replace(/\r?\n/g, '<br>');
}

/** URLs go into href attributes — escape quotes but keep the URL usable. */
function escapeUrlValue(value: string | number | null | undefined): string {
  return String(value ?? '').replace(/["'<>]/g, (c) => ESCAPES[c]);
}

const URL_VARIABLE = /_url$/;

const MERGE_TAG = /\{\{\s*([a-z0-9_]+)\s*\}\}/gi;

/**
 * Subject lines are plain text — HTML-escaping them would put a literal
 * "&amp;" in the inbox. Newlines are stripped because a subject is a mail
 * header and must stay on one line.
 */
function mergePlain(source: string, data: MergeData, missing: Set<string>): string {
  return source.replace(MERGE_TAG, (_match, key: string) => {
    if (!(key in data) || data[key] === undefined || data[key] === null) {
      missing.add(key);
      return '';
    }
    return String(data[key]).replace(/[\r\n]+/g, ' ').trim();
  });
}

function merge(source: string, data: MergeData, missing: Set<string>): string {
  return source.replace(MERGE_TAG, (_match, key: string) => {
    if (!(key in data) || data[key] === undefined || data[key] === null) {
      missing.add(key);
      return '';
    }
    return URL_VARIABLE.test(key) ? escapeUrlValue(data[key]) : escapeValue(data[key]);
  });
}

/** Crude but adequate plain-text alternative — improves deliverability. */
function toPlainText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|h1|h2|h3|table)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#8377;/g, 'Rs.')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Renders a template. Throws TemplateError when a declared variable has no
 * value — the mailer catches this and writes a `failed` EmailLog row, so a
 * missing variable surfaces as a visible failure rather than an email
 * containing a literal "{{first_name}}".
 */
export function render(key: TemplateKey, data: MergeData = {}): RenderedEmail {
  const meta = getTemplateMeta(key);
  const { html: rawHtml, hash } = loadHtml(meta.file);

  const missing = new Set<string>();
  const html = merge(rawHtml, data, missing);
  const subject = mergePlain(meta.subject, data, missing);

  // unsubscribe_url is injected by the mailer for marketing mail only.
  missing.delete('unsubscribe_url');

  if (missing.size > 0) {
    throw new TemplateError(
      `Missing merge variable(s) for template "${key}": ${[...missing].join(', ')}`
    );
  }

  return { subject, html, text: toPlainText(html), templateHash: hash, meta };
}
