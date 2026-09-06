/**
 * Every social profile link on the public site, in one place.
 *
 * Leave a value as an empty string and its icon is not rendered at all — an
 * icon that goes nowhere reads as an unfinished site, which is worse than not
 * showing it. So paste a real URL here and the icon appears; delete it and the
 * icon disappears. Nothing else needs editing.
 */

export interface SocialLinks {
  facebook?: string;
  twitter?: string;
  instagram?: string;
  linkedin?: string;
}

/** Organisation accounts — shown in the footer. */
export const ORG_SOCIALS: SocialLinks = {
  facebook: '',
  twitter: '',
  // Share links arrive carrying utm/igsi tracking parameters; they are not
  // part of the address and are stripped so the link stays clean.
  instagram: 'https://www.instagram.com/medconnectsoverseas',
  linkedin: '',
};

/**
 * Personal accounts, keyed by the co-founder's name exactly as it appears in
 * `src/components/landing/co-founders.tsx`.
 */
export const FOUNDER_SOCIALS: Record<string, SocialLinks> = {
  'Astha Singh Sengar': {
    linkedin: 'https://www.linkedin.com/in/astha-sengar-4704b3320',
    twitter: '',
  },
  'Bhavy Gaba': {
    linkedin: 'https://www.linkedin.com/in/bhavy-gaba-713a94327',
    twitter: '',
  },
};

/** Drops the blanks, so a component can just map over what is actually set. */
export function activeLinks(links: SocialLinks): [keyof SocialLinks, string][] {
  return Object.entries(links).filter(([, url]) => !!url?.trim()) as [keyof SocialLinks, string][];
}
