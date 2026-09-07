/**
 * One canonical shape for a mobile number: E.164, e.g. "+919820115577".
 *
 * The onboarding form uses react-phone-number-input, which already hands back
 * a full E.164 string — but it *also* sends the dial code separately, and both
 * were being stored. Anything that joined them produced "+91+919820115577",
 * which the SMS stub printed and the admin payment email showed. Storing one
 * canonical value and never concatenating removes the whole class of problem.
 *
 * `countryCode` is still kept on the user, because knowing which country a
 * number belongs to is genuinely useful — it is just no longer a prefix that
 * has to be glued back on.
 */

/**
 * Reduces any of the shapes a client might send to a single E.164 string.
 * A number that already carries its own "+" prefix is trusted as-is; a bare
 * national number is given the supplied dial code.
 */
export function normalizeMobile(mobile: string, countryCode?: string): string {
  const raw = String(mobile ?? '').replace(/[\s()\-.]/g, '');
  if (!raw) return '';

  if (raw.startsWith('+')) return raw;

  const dial = String(countryCode ?? '').replace(/[\s()\-.]/g, '');
  if (!dial) return `+${raw.replace(/^0+/, '')}`;

  const prefix = dial.startsWith('+') ? dial : `+${dial}`;
  // A national number written with a trunk prefix ("09820115577") drops it.
  return `${prefix}${raw.replace(/^0+/, '')}`;
}

/** True for something that could plausibly be dialled. Deliberately loose. */
export function isPlausibleMobile(e164: string): boolean {
  return /^\+[1-9]\d{6,15}$/.test(e164);
}
