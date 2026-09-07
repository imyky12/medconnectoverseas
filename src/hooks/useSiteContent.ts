import { useEffect, useState } from 'react';
import { api } from '../services/api';

/**
 * The editable content of the public site — testimonials, impact numbers, the
 * FAQ, founders, activities and the mission/vision text.
 *
 * Fetched **once per page load and shared**, because several components on the
 * home page need different slices of it. Without the shared promise, opening the
 * home page would fire the same request four or five times.
 *
 * Every consumer takes a `fallback`. If the request fails, or an admin has
 * emptied a section, the page shows what it always showed rather than a hole —
 * a landing page missing its testimonials looks broken in a way that a stale
 * paragraph does not.
 */

export interface ContentItem {
  _id: string;
  heading: string;
  subheading?: string;
  body?: string;
  imageUrl?: string;
  value?: number;
  suffix?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  email?: string;
  order: number;
}

export interface SiteContent {
  testimonial: ContentItem[];
  stat: ContentItem[];
  faq: ContentItem[];
  founder: ContentItem[];
  activity: ContentItem[];
  settings: Record<string, string>;
}

const EMPTY: SiteContent = {
  testimonial: [], stat: [], faq: [], founder: [], activity: [], settings: {},
};

let shared: Promise<SiteContent> | null = null;

function load(): Promise<SiteContent> {
  if (!shared) {
    shared = api
      .get<any>('/site-content')
      .then((res: any) => (res?.success && res.data ? { ...EMPTY, ...res.data } : EMPTY))
      .catch(() => EMPTY);
  }
  return shared;
}

export function useSiteContent(): { content: SiteContent; loading: boolean } {
  const [content, setContent] = useState<SiteContent>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    load()
      .then((c) => { if (!cancelled) setContent(c); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { content, loading };
}

/** A setting's text, or the built-in copy when it has not been set. */
export function setting(content: SiteContent, key: string, fallback: string): string {
  return content.settings?.[key]?.trim() || fallback;
}

/** Splits a multi-line setting into its lines — used for the mission/vision points. */
export function settingLines(content: SiteContent, key: string, fallback: string[]): string[] {
  const raw = content.settings?.[key]?.trim();
  if (!raw) return fallback;
  return raw.split('\n').map((l) => l.trim()).filter(Boolean);
}

/* ── Contact details and social profiles ─────────────────────────────────── */

/**
 * The order here is the order the icons appear in, on both the footer and the
 * contact page. Adding a network is a one-line change here plus its icon in the
 * two components that draw them.
 */
export const SOCIAL_KEYS = [
  'instagram', 'linkedin', 'twitter', 'facebook', 'youtube', 'telegram', 'whatsapp',
] as const;
export type SocialKey = (typeof SOCIAL_KEYS)[number];

export interface ContactDetails {
  email: string;
  phone: string;
  location: string;
}

/**
 * Blank means "we do not have one", not "show an empty line". A phone number
 * nobody answers is worse than no phone number, so an unset value is dropped
 * rather than rendered — the same rule the social icons follow.
 */
export function contactDetails(content: SiteContent): ContactDetails {
  const s = content.settings ?? {};
  return {
    email: (s['contact.email'] ?? '').trim(),
    phone: (s['contact.phone'] ?? '').trim(),
    location: (s['contact.location'] ?? '').trim(),
  };
}

/** Only the networks an admin has actually filled in, in display order. */
export function socialLinks(content: SiteContent): [SocialKey, string][] {
  const s = content.settings ?? {};
  return SOCIAL_KEYS
    .map((key) => [key, (s[`social.${key}`] ?? '').trim()] as [SocialKey, string])
    .filter(([, url]) => !!url);
}
