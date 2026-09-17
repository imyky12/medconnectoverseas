/**
 * Heuristics for the two public forms.
 *
 * Written after a bot found the contact form and sent an enquiry every five to
 * ten minutes, each with a random-string name and subject and a third party's
 * real email address. Two things made that expensive rather than merely noisy:
 * every submission emailed the admins, and every submission also emailed an
 * acknowledgement to the address supplied — so the site was relaying mail to
 * strangers who had never used it, on our sending domain's reputation.
 *
 * Nothing here is a CAPTCHA and nothing here is certain. The aim is to make the
 * cheap, generic attack stop working, and to do it without asking a real
 * student to prove anything.
 */

/** A word that looks machine-generated rather than typed by a person. */
function looksRandom(word: string): boolean {
  if (word.length < 8) return false;
  if (!/^[A-Za-z]+$/.test(word)) return false;

  // "GMCvpTDlrpXMSrJQMwSack" flips between cases constantly; "Balasubramanian"
  // flips once. Real names — including long South Indian ones and CamelCase
  // surnames like "McDonald" — stay well under four flips.
  let flips = 0;
  for (let i = 1; i < word.length; i += 1) {
    const prev = word[i - 1];
    const curr = word[i];
    if (prev === prev.toUpperCase() ? curr === curr.toLowerCase() : curr === curr.toUpperCase()) {
      flips += 1;
    }
  }
  if (flips >= 4) return true;

  // A long stretch with no vowel is not pronounceable, so it was not typed as a
  // name. 'y' counts as a vowel here, or "Smyth" style spellings trip it.
  return /[^aeiouyAEIOUY]{6,}/.test(word);
}

/**
 * True when a submission should be silently discarded.
 *
 * Silently is deliberate: an error response tells the operator which rule they
 * hit and what to vary next time, and the form is unauthenticated, so there is
 * nothing to stop them iterating. A cheerful 201 that stores nothing teaches
 * them nothing.
 */
export function looksLikeSpam(fields: {
  name?: string;
  subject?: string;
  message?: string;
}): boolean {
  const words = `${fields.name ?? ''} ${fields.subject ?? ''}`
    .split(/\s+/)
    .filter(Boolean);

  if (words.some(looksRandom)) return true;

  // A genuine first enquiry asks a question. It does not arrive carrying three
  // links, which is the shape of every SEO-spam payload.
  const links = (fields.message ?? '').match(/https?:\/\//gi)?.length ?? 0;
  if (links >= 3) return true;

  // BBCode appears in no real message and in a great deal of forum spam.
  return /\[url[=\]]/i.test(fields.message ?? '');
}

/**
 * True when the honeypot was filled in.
 *
 * The forms carry a field that is positioned off-screen and marked
 * `aria-hidden` with `tabIndex={-1}`, so a person cannot see it, tab to it or
 * have a password manager fill it. A bot that walks the DOM and fills every
 * input does. This catches far more than the string heuristics above, and
 * costs a real visitor nothing.
 */
export function honeypotTripped(body: any): boolean {
  return typeof body?.website === 'string' && body.website.trim() !== '';
}
