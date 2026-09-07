import {
  Facebook, Twitter, Instagram, Linkedin, Youtube, Send, MessageCircle,
} from 'lucide-react';
import type { SocialKey } from '../hooks/useSiteContent';

/**
 * The icon and label for each network we can link to.
 *
 * The addresses themselves used to live here as constants, which meant adding a
 * profile was a code change and a deploy. They are now settings an admin edits
 * from **Site content → Contact & social**; only the drawing of them stayed
 * behind, because an icon is not content.
 *
 * A network with no address set is never rendered — an icon that goes nowhere
 * reads as an unfinished site.
 */
export const SOCIAL_ICONS: Record<SocialKey, { Icon: typeof Facebook; label: string }> = {
  instagram: { Icon: Instagram, label: 'Instagram' },
  linkedin: { Icon: Linkedin, label: 'LinkedIn' },
  twitter: { Icon: Twitter, label: 'Twitter / X' },
  facebook: { Icon: Facebook, label: 'Facebook' },
  youtube: { Icon: Youtube, label: 'YouTube' },
  telegram: { Icon: Send, label: 'Telegram' },
  whatsapp: { Icon: MessageCircle, label: 'WhatsApp' },
};
