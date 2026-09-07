import { Request, Response } from 'express';
import { PolicyDocument } from '../../models/PolicyDocument.model';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { asyncHandler } from '../../utils/asyncHandler';

/**
 * Editing the legal documents.
 *
 * Two rules shape all of this:
 *
 *  1. **Editing never changes what the public reads.** Drafts live in their own
 *     field; only `publish` moves text into `publishedContent`.
 *  2. **Every published version is kept forever.** Someone who accepted the
 *     terms in March accepted the March wording, and "what did it say then?" has
 *     to be answerable. Versions are appended and never rewritten — there is
 *     deliberately no endpoint that edits or deletes one.
 */

const SLUGS = ['terms', 'privacy'] as const;

function requireKnownSlug(slug: unknown): string {
  const normalised = String(slug || '').toLowerCase();
  if (!SLUGS.includes(normalised as (typeof SLUGS)[number])) {
    throw new ApiError(404, `There is no "${slug}" document.`);
  }
  return normalised;
}

/** Both documents, with just enough to render the list — never the full bodies. */
export const listPolicies = asyncHandler(async (_req: Request, res: Response) => {
  const docs = await PolicyDocument.find()
    .select('slug title publishedVersion publishedAt publishedByName draftUpdatedAt draftUpdatedByName draftContent publishedContent versions')
    .lean();

  const summary = docs.map((d) => ({
    slug: d.slug,
    title: d.title,
    publishedVersion: d.publishedVersion,
    publishedAt: d.publishedAt,
    publishedByName: d.publishedByName,
    draftUpdatedAt: d.draftUpdatedAt,
    draftUpdatedByName: d.draftUpdatedByName,
    // The one thing an editor needs to see at a glance: is there unpublished work?
    hasUnpublishedChanges: (d.draftContent ?? '') !== (d.publishedContent ?? ''),
    versionCount: d.versions?.length ?? 0,
  }));

  res.status(200).json(new ApiResponse(200, summary, 'Policies fetched'));
});

/** One document in full, for the editor. */
export const getPolicy = asyncHandler(async (req: Request, res: Response) => {
  const slug = requireKnownSlug(req.params.slug);
  const doc = await PolicyDocument.findOne({ slug });
  if (!doc) throw new ApiError(404, 'That document has not been set up yet.');

  res.status(200).json(
    new ApiResponse(200, {
      slug: doc.slug,
      title: doc.title,
      draftContent: doc.draftContent,
      publishedContent: doc.publishedContent,
      publishedVersion: doc.publishedVersion,
      publishedAt: doc.publishedAt,
      publishedByName: doc.publishedByName,
      effectiveDate: doc.effectiveDate,
      draftUpdatedAt: doc.draftUpdatedAt,
      draftUpdatedByName: doc.draftUpdatedByName,
      hasUnpublishedChanges: doc.draftContent !== doc.publishedContent,
      versions: [...doc.versions]
        .sort((a, b) => b.version - a.version)
        .map((v) => ({
          version: v.version,
          title: v.title,
          publishedAt: v.publishedAt,
          effectiveDate: v.effectiveDate,
          publishedByName: v.publishedByName,
          publishedByEmail: v.publishedByEmail,
          changeNote: v.changeNote,
        })),
    }, 'Policy fetched')
  );
});

/** Saves work in progress. The live document is untouched. */
export const savePolicyDraft = asyncHandler(async (req: Request, res: Response) => {
  const slug = requireKnownSlug(req.params.slug);
  const { content, title } = req.body ?? {};

  if (typeof content !== 'string' || !content.trim()) {
    throw new ApiError(400, 'The document cannot be saved empty.');
  }

  const doc = await PolicyDocument.findOne({ slug });
  if (!doc) throw new ApiError(404, 'That document has not been set up yet.');

  doc.draftContent = content;
  if (typeof title === 'string' && title.trim()) doc.title = title.trim();
  doc.draftUpdatedAt = new Date();
  doc.draftUpdatedByName = req.admin?.name ?? 'Unknown';
  doc.draftUpdatedByEmail = req.admin?.email ?? '';
  await doc.save();

  res.status(200).json(
    new ApiResponse(200, {
      draftUpdatedAt: doc.draftUpdatedAt,
      draftUpdatedByName: doc.draftUpdatedByName,
      hasUnpublishedChanges: doc.draftContent !== doc.publishedContent,
    }, 'Draft saved. Nothing has changed for visitors yet.')
  );
});

/** Makes the draft live and freezes a copy of it in the history. */
export const publishPolicy = asyncHandler(async (req: Request, res: Response) => {
  const slug = requireKnownSlug(req.params.slug);
  const { changeNote, effectiveDate } = req.body ?? {};

  // The admin may state when the wording actually took effect. Left unset, it
  // falls back to the publish time — see the field's note on the model for why
  // the two are not the same thing.
  let effective: Date | undefined;
  if (effectiveDate) {
    const parsed = new Date(effectiveDate);
    if (Number.isNaN(parsed.getTime())) {
      throw new ApiError(400, 'That is not a valid effective date.');
    }
    effective = parsed;
  }

  const doc = await PolicyDocument.findOne({ slug });
  if (!doc) throw new ApiError(404, 'That document has not been set up yet.');
  if (!doc.draftContent?.trim()) {
    throw new ApiError(400, 'There is nothing in the draft to publish.');
  }
  // Refused only when *nothing* would change. An identical body normally means
  // a stray click, and recording it would add a history entry describing no
  // change — but correcting the stated "last updated" date without touching a
  // word is a real edit, so that alone is enough to justify a version.
  const sameContent = doc.draftContent === doc.publishedContent;
  const sameDate =
    !effective ||
    (doc.effectiveDate && new Date(doc.effectiveDate).getTime() === effective.getTime());

  if (sameContent && sameDate) {
    throw new ApiError(
      400,
      'Nothing would change — the draft matches what is published and the date is unchanged.'
    );
  }

  const nextVersion = doc.publishedVersion + 1;
  const now = new Date();

  doc.versions.push({
    version: nextVersion,
    content: doc.draftContent,
    title: doc.title,
    publishedAt: now,
    publishedByName: req.admin?.name ?? 'Unknown',
    publishedByEmail: req.admin?.email ?? '',
    publishedById: req.admin?.id as never,
    effectiveDate: effective ?? now,
    changeNote: typeof changeNote === 'string' ? changeNote.trim().slice(0, 500) : undefined,
  });

  doc.publishedContent = doc.draftContent;
  doc.publishedVersion = nextVersion;
  doc.publishedAt = now;
  doc.publishedByName = req.admin?.name ?? 'Unknown';
  doc.publishedByEmail = req.admin?.email ?? '';
  doc.effectiveDate = effective ?? now;
  await doc.save();

  res.status(200).json(
    new ApiResponse(200, { publishedVersion: nextVersion, publishedAt: now, effectiveDate: doc.effectiveDate }, `Version ${nextVersion} is now live.`)
  );
});

/** The full text of one past version, for reading or comparing. */
export const getPolicyVersion = asyncHandler(async (req: Request, res: Response) => {
  const slug = requireKnownSlug(req.params.slug);
  const version = Number(req.params.version);

  const doc = await PolicyDocument.findOne({ slug }).lean();
  if (!doc) throw new ApiError(404, 'That document has not been set up yet.');

  const found = doc.versions.find((v) => v.version === version);
  if (!found) throw new ApiError(404, `There is no version ${req.params.version} of this document.`);

  res.status(200).json(new ApiResponse(200, found, 'Version fetched'));
});

/**
 * Copies an old version back into the draft.
 *
 * It does **not** publish. Restoring loads the old text for review, and going
 * live is still a separate, deliberate act — which also means a restore appears
 * in the history as a new version rather than rewriting the past.
 */
export const restorePolicyVersion = asyncHandler(async (req: Request, res: Response) => {
  const slug = requireKnownSlug(req.params.slug);
  const version = Number(req.params.version);

  const doc = await PolicyDocument.findOne({ slug });
  if (!doc) throw new ApiError(404, 'That document has not been set up yet.');

  const found = doc.versions.find((v) => v.version === version);
  if (!found) throw new ApiError(404, `There is no version ${req.params.version} of this document.`);

  doc.draftContent = found.content;
  doc.draftUpdatedAt = new Date();
  doc.draftUpdatedByName = req.admin?.name ?? 'Unknown';
  doc.draftUpdatedByEmail = req.admin?.email ?? '';
  await doc.save();

  res.status(200).json(
    new ApiResponse(200, { draftContent: found.content }, `Version ${version} loaded into the draft. Review it, then publish when you are ready.`)
  );
});
