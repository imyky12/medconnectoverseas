import { useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

/**
 * Renders Markdown as styled HTML.
 *
 * **Sanitised even though only admins can write it.** An admin account is not a
 * guarantee — it can be phished, shared, or left signed in — and this content is
 * shown to every visitor on a public page. Sanitising costs nothing and removes
 * a stored-XSS path that would otherwise reach the whole audience.
 *
 * Styling is applied here rather than through a typography plugin so the legal
 * pages match the rest of the site without pulling in another dependency.
 */

marked.setOptions({ gfm: true, breaks: false });

export function renderMarkdown(source: string): string {
  const raw = marked.parse(source ?? '', { async: false }) as string;
  return DOMPurify.sanitize(raw, {
    ADD_ATTR: ['target', 'rel'],
    // Deliberately no `style` — inline styles are a common way to smuggle
    // something that looks like part of the page.
    FORBID_ATTR: ['style', 'onerror', 'onload'],
    FORBID_TAGS: ['style', 'script', 'iframe', 'form', 'input'],
  });
}

export default function Markdown({ source, className = '' }: { source: string; className?: string }) {
  const html = useMemo(() => renderMarkdown(source), [source]);

  return (
    <div
      className={`md-body ${className}`}
      // Safe: `renderMarkdown` sanitises, and nothing else writes to this node.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
