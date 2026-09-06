import fs from 'fs';
import path from 'path';
import { PolicyDocument } from '../models/PolicyDocument.model';

/**
 * Puts the Terms and Privacy Policy into the database if they are not there.
 *
 * Runs once at startup and does nothing when a document already exists — the
 * whole point of making these editable is that the database becomes the source
 * of truth, so a seed that overwrote on every boot would silently discard the
 * admin's edits on the next restart.
 *
 * The Markdown lives in `src/templates/policies/` so the initial text is
 * reviewable in version control rather than buried in a string literal.
 */

/**
 * `effectiveDate` is the date the organisation states the wording took effect —
 * it came from the "Last Updated" line at the foot of the supplied Terms. That
 * line has been removed from the Markdown: the page renders the date itself, and
 * two copies of the same fact drift apart the moment one is edited.
 */
const SEEDS: { slug: string; title: string; file: string; effectiveDate: string }[] = [
  { slug: 'terms', title: 'Terms & Conditions', file: 'terms.md', effectiveDate: '2026-08-22' },
  { slug: 'privacy', title: 'Privacy Policy', file: 'privacy.md', effectiveDate: '2026-08-22' },
];

export async function seedPolicies(): Promise<void> {
  const dir = path.join(__dirname, '..', 'templates', 'policies');

  for (const seed of SEEDS) {
    const existing = await PolicyDocument.findOne({ slug: seed.slug });
    if (existing) continue;

    const filePath = path.join(dir, seed.file);
    if (!fs.existsSync(filePath)) {
      console.warn(`[policies] no seed file for "${seed.slug}" at ${filePath}`);
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const now = new Date();
    const effectiveDate = new Date(seed.effectiveDate);

    // Seeded straight to published — these are the documents the site is
    // launching with, and leaving them as an unpublished draft would mean the
    // public pages 404 until somebody noticed.
    await PolicyDocument.create({
      slug: seed.slug,
      title: seed.title,
      publishedContent: content,
      draftContent: content,
      publishedVersion: 1,
      publishedAt: now,
      publishedByName: 'System (initial import)',
      publishedByEmail: '',
      effectiveDate,
      versions: [
        {
          version: 1,
          content,
          title: seed.title,
          publishedAt: now,
          publishedByName: 'System (initial import)',
          publishedByEmail: '',
          effectiveDate,
          changeNote: 'Initial import of the document supplied by the organisation.',
        },
      ],
    });

    console.log(`📄 Seeded "${seed.title}" (v1)`);
  }
}
