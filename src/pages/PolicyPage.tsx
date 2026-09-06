import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, AlertCircle, ArrowUp, Printer, Mail, FileText, ShieldCheck } from 'lucide-react';
import Navbar from '../components/landing/navbar';
import Footer from '../components/landing/footer';
import { renderMarkdown } from '../components/ui/markdown';
import { api } from '../services/api';

/**
 * Renders whichever legal document is asked for — Terms or Privacy.
 *
 * These are long: fourteen numbered sections in the Terms, twelve in the
 * Privacy Policy. A single unbroken column is how legal text gets abandoned
 * halfway, so the page is built around finding things: every `##` heading
 * becomes an anchor, a contents list sits alongside on desktop, and the section
 * you are currently reading is highlighted as you scroll.
 *
 * The **version number is deliberately not shown.** It is an editing detail;
 * telling a student they are reading "version 5" only raises the question of
 * what the other four said, which this page cannot answer. The date can be
 * acted on — the version number cannot.
 */

interface PolicyPageProps {
  slug: 'terms' | 'privacy';
  fallbackTitle: string;
}

interface Policy {
  title: string;
  content: string;
  lastUpdated: string | null;
}

interface Section {
  id: string;
  text: string;
}

/** A stable, readable anchor from a heading — "3. Pricing & Payment" → "pricing-payment". */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/^\d+\.\s*/, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

export default function PolicyPage({ slug, fallbackTitle }: PolicyPageProps) {
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sections, setSections] = useState<Section[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [showTop, setShowTop] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setSections([]);

    api
      .get<any>(`/policies/${slug}`)
      .then((res: any) => {
        if (cancelled) return;
        if (res?.success && res.data) setPolicy(res.data);
        else setError('This document is not available right now.');
      })
      .catch(() => { if (!cancelled) setError('This document is not available right now.'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [slug]);

  useEffect(() => {
    document.title = `${policy?.title ?? fallbackTitle} — MedConnects Overseas`;
  }, [policy, fallbackTitle]);

  /**
   * Renders the Markdown and stamps an id onto every `##` heading, in one pass.
   *
   * The ids go into the HTML **string**, not onto the DOM afterwards. Setting
   * them imperatively looked equivalent and was not: showing the contents column
   * changes the grid's children, React remounts the article, and every id set by
   * hand is wiped — leaving a contents list whose links all go nowhere. Baking
   * them in means no re-render can lose them.
   *
   * The anchors are added here rather than in the Markdown so the document an
   * admin edits stays clean prose with no ids to maintain.
   */
  const { html, headings } = useMemo(() => {
    if (!policy) return { html: '', headings: [] as Section[] };

    const raw = renderMarkdown(policy.content);
    const doc = new DOMParser().parseFromString(`<div>${raw}</div>`, 'text/html');
    const found: Section[] = [];
    const used = new Set<string>();

    doc.querySelectorAll('h2').forEach((h) => {
      const text = h.textContent ?? '';
      let id = slugify(text);
      // Two sections could reduce to the same slug; a duplicate id would send
      // both contents links to the first one.
      let n = 2;
      while (used.has(id)) id = `${slugify(text)}-${n++}`;
      used.add(id);
      h.setAttribute('id', id);
      // Keeps the heading clear of the sticky navbar when jumped to.
      h.setAttribute('style', 'scroll-margin-top:96px');
      found.push({ id, text });
    });

    return { html: doc.body.firstElementChild?.innerHTML ?? raw, headings: found };
  }, [policy]);

  useEffect(() => { setSections(headings); }, [headings]);

  // Highlights the section in view. `rootMargin` biases the trigger to the
  // upper third so the highlight matches what is actually being read rather
  // than whatever happens to be at the very top edge.
  useEffect(() => {
    if (sections.length === 0 || !bodyRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActiveId(visible.target.id);
      },
      { rootMargin: '-88px 0px -66% 0px', threshold: 0 },
    );
    bodyRef.current.querySelectorAll('h2').forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [sections]);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 700);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const updated = policy?.lastUpdated
    ? new Date(policy.lastUpdated).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : null;

  const isTerms = slug === 'terms';
  const Icon = isTerms ? FileText : ShieldCheck;

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <Navbar />

      {/* Header. Dark, so the document itself reads as a clean sheet below it. */}
      <header className="bg-ink px-4 pb-12 pt-12 sm:pb-16 sm:pt-16">
        <div className="mx-auto w-full max-w-[1100px]">
          <nav className="mb-5 flex items-center gap-2 text-[13px] text-white/50">
            <Link to="/" className="transition-colors hover:text-white">Home</Link>
            <span aria-hidden>/</span>
            <span className="text-white/80">{policy?.title ?? fallbackTitle}</span>
          </nav>

          <div className="flex items-start gap-4">
            <span className="mt-1 hidden rounded-xl bg-white/10 p-3 text-white sm:block">
              <Icon className="h-6 w-6" strokeWidth={1.75} />
            </span>
            <div>
              <h1 className="font-display text-[30px] font-600 leading-tight text-white sm:text-[38px]">
                {policy?.title ?? fallbackTitle}
              </h1>
              <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-white/70">
                {isTerms
                  ? 'The terms you agree to when you register for an event, book a workshop, or use anything on this site.'
                  : 'What we collect, why we collect it, and what we do with it.'}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2">
                {updated && (
                  <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1.5 text-[13px] font-medium text-white">
                    Last updated {updated}
                  </span>
                )}
                <Link
                  to={isTerms ? '/privacy' : '/terms'}
                  className="text-[13px] font-medium text-white/70 underline-offset-4 transition-colors hover:text-white hover:underline"
                >
                  {isTerms ? 'Read the Privacy Policy' : 'Read the Terms & Conditions'}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-10 sm:py-14">
        <div className="mx-auto w-full max-w-[1100px]">
          {loading ? (
            <div className="flex min-h-[40vh] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-signal" />
            </div>
          ) : error ? (
            <div className="mx-auto max-w-[620px] rounded-xl border border-rule bg-surface px-6 py-12 text-center">
              <AlertCircle className="mx-auto h-6 w-6 text-holding" />
              <p className="mt-3 text-[15px] font-medium text-ink">{error}</p>
              <p className="mt-1 text-[14px] text-muted">
                Please try again shortly, or email{' '}
                <a href="mailto:medconnectsoverseas@gmail.com" className="font-medium text-signal hover:underline">
                  medconnectsoverseas@gmail.com
                </a>
                .
              </p>
            </div>
          ) : (
            <div className="grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
              {/* Contents. Sticky on desktop; on small screens it sits above the
                  document as a plain jump list rather than eating the fold. */}
              {sections.length > 1 && (
                <aside className="lg:sticky lg:top-24 lg:self-start">
                  <p className="mb-3 text-[12px] font-600 uppercase tracking-wide text-faint">
                    On this page
                  </p>
                  <nav className="max-h-[70vh] overflow-y-auto border-l border-rule">
                    {sections.map((s) => (
                      <a
                        key={s.id}
                        href={`#${s.id}`}
                        onClick={() => setActiveId(s.id)}
                        className={[
                          'block border-l-2 py-1.5 pl-3 text-[13px] leading-snug transition-colors -ml-px',
                          activeId === s.id
                            ? 'border-signal font-medium text-signal'
                            : 'border-transparent text-muted hover:border-rule hover:text-ink',
                        ].join(' ')}
                      >
                        {s.text}
                      </a>
                    ))}
                  </nav>
                </aside>
              )}

              <article className="min-w-0">
                <div className="rounded-2xl border border-rule bg-surface px-5 py-7 sm:px-10 sm:py-10">
                  <div
                    ref={bodyRef}
                    className="md-body"
                    // Safe: `renderMarkdown` sanitises before this is inserted.
                    dangerouslySetInnerHTML={{ __html: html }}
                  />
                </div>

                {/* A real next step, rather than a dead end at the foot of a
                    long legal page. */}
                <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-rule bg-surface px-5 py-5 sm:px-7">
                  <div>
                    <p className="text-[14px] font-600 text-ink">Something here unclear?</p>
                    <p className="mt-0.5 text-[13px] text-muted">
                      Ask us before you book — we would rather answer first.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href="mailto:medconnectsoverseas@gmail.com"
                      className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-ink-soft"
                    >
                      <Mail className="h-4 w-4" /> Email us
                    </a>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="inline-flex items-center gap-2 rounded-lg border border-rule px-4 py-2.5 text-[14px] font-medium text-ink transition-colors hover:border-signal hover:text-signal"
                    >
                      <Printer className="h-4 w-4" /> Print or save as PDF
                    </button>
                  </div>
                </div>
              </article>
            </div>
          )}
        </div>
      </main>

      {showTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Back to top"
          className="fixed bottom-6 right-6 z-40 rounded-full bg-ink p-3 text-white shadow-lg transition-colors hover:bg-ink-soft print:hidden"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      )}

      <Footer />
    </div>
  );
}
