import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Loader2, Eye, Pencil, Save, Send, History, RotateCcw, X,
  AlertCircle, CheckCircle2, ExternalLink, Bold, Italic, List, Link2, Heading,
} from 'lucide-react';
import { api } from '../../services/api';
import Markdown from '../../components/ui/markdown';

/**
 * Editing the Terms and Privacy Policy.
 *
 * The shape of this screen follows from one rule: **typing must never change
 * what the public is reading.** So there are two distinct actions — *Save draft*
 * and *Publish* — and the difference between them is stated on screen rather
 * than left for the admin to infer. An unpublished draft is flagged everywhere
 * it is relevant, because the failure mode worth designing against is someone
 * editing carefully, leaving, and assuming it went live.
 *
 * Every publish is kept. The history panel lists who published each version and
 * when, and can load an old version back into the draft for review — never
 * straight to live, so going back is as deliberate as going forward.
 */

interface PolicySummary {
  slug: string;
  title: string;
  publishedVersion: number;
  publishedAt: string | null;
  publishedByName?: string;
  effectiveDate?: string | null;
  draftUpdatedAt: string | null;
  draftUpdatedByName?: string;
  hasUnpublishedChanges: boolean;
  versionCount: number;
}

interface VersionRow {
  version: number;
  publishedAt: string;
  publishedByName: string;
  publishedByEmail?: string;
  changeNote?: string;
}

interface PolicyDetail extends PolicySummary {
  draftContent: string;
  publishedContent: string;
  versions: VersionRow[];
}

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` },
});

function when(iso?: string | null): string {
  if (!iso) return 'never';
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function AdminPolicies() {
  const [list, setList] = useState<PolicySummary[]>([]);
  const [slug, setSlug] = useState<string | null>(null);
  const [doc, setDoc] = useState<PolicyDetail | null>(null);
  const [draft, setDraft] = useState('');
  const [tab, setTab] = useState<'write' | 'preview'>('write');
  const [showHistory, setShowHistory] = useState(false);
  const [changeNote, setChangeNote] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'' | 'saving' | 'publishing'>('');
  const [notice, setNotice] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);

  const loadList = () =>
    api.get<any>('/admin/policies', authHeaders()).then((r: any) => setList(r?.data ?? []));

  useEffect(() => {
    loadList().finally(() => setLoading(false));
  }, []);

  const openDoc = async (s: string) => {
    setLoading(true);
    setNotice(null);
    setShowHistory(false);
    setChangeNote('');
    try {
      const res: any = await api.get<any>(`/admin/policies/${s}`, authHeaders());
      setDoc(res.data);
      setDraft(res.data.draftContent ?? '');
      // Pre-filled with what is currently shown, so publishing a typo fix keeps
      // the date rather than silently moving it to today.
      setEffectiveDate(res.data.effectiveDate ? String(res.data.effectiveDate).slice(0, 10) : '');
      setSlug(s);
      setTab('write');
    } catch (e: any) {
      setNotice({ tone: 'bad', text: e?.message ?? 'Could not open that document.' });
    } finally {
      setLoading(false);
    }
  };

  // Compared against what is actually live, not against the last save — the
  // question the admin needs answered is "is this live?", not "did I save?".
  const differsFromLive = useMemo(
    () => doc != null && draft !== doc.publishedContent,
    [draft, doc],
  );
  const unsaved = useMemo(() => doc != null && draft !== doc.draftContent, [draft, doc]);

  const saveDraft = async () => {
    if (!slug) return;
    setBusy('saving');
    setNotice(null);
    try {
      const res: any = await api.put<any>(`/admin/policies/${slug}/draft`, { content: draft }, authHeaders());
      setNotice({ tone: 'ok', text: res?.message ?? 'Draft saved.' });
      setDoc((d) => (d ? { ...d, draftContent: draft, draftUpdatedAt: res.data.draftUpdatedAt, draftUpdatedByName: res.data.draftUpdatedByName } : d));
      void loadList();
    } catch (e: any) {
      setNotice({ tone: 'bad', text: e?.message ?? 'Could not save the draft.' });
    } finally {
      setBusy('');
    }
  };

  const publish = async () => {
    if (!slug) return;
    // A confirm step, because this one is public the instant it succeeds.
    if (!window.confirm('Publish this version? It replaces what visitors see immediately.')) return;
    setBusy('publishing');
    setNotice(null);
    try {
      // Saved first, so publishing always ships exactly what is on screen —
      // publishing a stale draft because someone forgot to save would be the
      // worst possible bug in this screen.
      await api.put<any>(`/admin/policies/${slug}/draft`, { content: draft }, authHeaders());
      const res: any = await api.post<any>(
        `/admin/policies/${slug}/publish`,
        { changeNote, effectiveDate: effectiveDate || undefined },
        authHeaders(),
      );
      setNotice({ tone: 'ok', text: res?.message ?? 'Published.' });
      setChangeNote('');
      await openDoc(slug);
      void loadList();
    } catch (e: any) {
      setNotice({ tone: 'bad', text: e?.message ?? 'Could not publish.' });
    } finally {
      setBusy('');
    }
  };

  const restore = async (version: number) => {
    if (!slug) return;
    if (!window.confirm(`Load version ${version} into the draft? Nothing goes live until you publish.`)) return;
    try {
      const res: any = await api.post<any>(`/admin/policies/${slug}/versions/${version}/restore`, {}, authHeaders());
      setDraft(res.data.draftContent);
      setDoc((d) => (d ? { ...d, draftContent: res.data.draftContent } : d));
      setNotice({ tone: 'ok', text: res?.message ?? `Version ${version} loaded into the draft.` });
      setShowHistory(false);
      setTab('write');
    } catch (e: any) {
      setNotice({ tone: 'bad', text: e?.message ?? 'Could not restore that version.' });
    }
  };

  /** Wraps or prefixes the selection — the small set of things people reach for. */
  const applyFormat = (kind: 'bold' | 'italic' | 'h2' | 'list' | 'link') => {
    const el = textarea.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = draft.slice(start, end);
    let replacement = selected;
    let caretShift = 0;

    if (kind === 'bold') { replacement = `**${selected || 'bold text'}**`; caretShift = 2; }
    if (kind === 'italic') { replacement = `_${selected || 'italic text'}_`; caretShift = 1; }
    if (kind === 'h2') { replacement = `## ${selected || 'Heading'}`; caretShift = 3; }
    if (kind === 'list') {
      replacement = (selected || 'List item')
        .split('\n').map((l) => (l.trim().startsWith('- ') ? l : `- ${l}`)).join('\n');
      caretShift = 2;
    }
    if (kind === 'link') { replacement = `[${selected || 'link text'}](https://)`; caretShift = 1; }

    const next = draft.slice(0, start) + replacement + draft.slice(end);
    setDraft(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + caretShift, start + caretShift + (selected.length || 9));
    });
  };

  if (loading && !doc) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-signal" />
      </div>
    );
  }

  /* ── Document picker ── */
  if (!slug || !doc) {
    return (
      <div className="space-y-8">
        <header>
          <h1 className="font-display text-[30px] font-600 leading-tight text-ink">Legal documents</h1>
          <p className="mt-1.5 max-w-[62ch] text-[14px] text-muted">
            The Terms and Privacy Policy shown on the public site. Edits are saved as a draft —
            visitors keep seeing the published version until you publish a new one.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          {list.map((p) => (
            <button
              key={p.slug}
              onClick={() => openDoc(p.slug)}
              className="panel px-5 py-5 text-left transition-colors hover:border-signal"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-display text-[17px] font-600 text-ink">{p.title}</h2>
                {p.hasUnpublishedChanges && (
                  <span className="shrink-0 rounded-full bg-holding-wash px-2.5 py-1 text-[11px] font-600 text-holding">
                    Unpublished draft
                  </span>
                )}
              </div>
              <dl className="mt-3 space-y-1 text-[13px] text-muted">
                <div>Live version <span className="tabular font-600 text-ink">v{p.publishedVersion}</span></div>
                <div>Published {when(p.publishedAt)}{p.publishedByName ? ` by ${p.publishedByName}` : ''}</div>
                <div>{p.versionCount} version{p.versionCount === 1 ? '' : 's'} in history</div>
              </dl>
              <span className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-signal">
                <Pencil className="h-3.5 w-3.5" /> Open editor
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  /* ── Editor ── */
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <button
            onClick={() => { setSlug(null); setDoc(null); }}
            className="mb-1 text-[13px] font-medium text-muted transition-colors hover:text-ink"
          >
            ← All documents
          </button>
          <h1 className="font-display text-[26px] font-600 leading-tight text-ink">{doc.title}</h1>
          <p className="mt-1 text-[13px] text-muted">
            Live: <span className="tabular font-600 text-ink">v{doc.publishedVersion}</span> · published {when(doc.publishedAt)}
            {doc.publishedByName ? ` by ${doc.publishedByName}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/${doc.slug === 'terms' ? 'terms' : 'privacy'}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-rule px-3 py-2 text-[13px] font-medium text-ink transition-colors hover:border-signal hover:text-signal"
          >
            <ExternalLink className="h-3.5 w-3.5" /> View live page
          </a>
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-md border border-rule px-3 py-2 text-[13px] font-medium text-ink transition-colors hover:border-signal hover:text-signal"
          >
            <History className="h-3.5 w-3.5" /> History ({doc.versions.length})
          </button>
          <button
            onClick={saveDraft}
            disabled={!!busy}
            className="inline-flex items-center gap-1.5 rounded-md border border-rule px-3 py-2 text-[13px] font-medium text-ink transition-colors hover:border-signal hover:text-signal disabled:opacity-50"
          >
            {busy === 'saving' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save draft
          </button>
          <button
            onClick={publish}
            disabled={!!busy || !differsFromLive}
            title={differsFromLive ? undefined : 'The draft already matches what is live'}
            className="inline-flex items-center gap-1.5 rounded-md bg-signal px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-signal-deep disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy === 'publishing' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Publish
          </button>
        </div>
      </header>

      {notice && (
        <p className={`flex items-center gap-2 rounded-md px-4 py-3 text-[13px] font-medium ${
          notice.tone === 'ok' ? 'bg-confirmed-wash text-confirmed' : 'bg-declined-wash text-declined'
        }`}>
          {notice.tone === 'ok' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {notice.text}
        </p>
      )}

      {/* The state that actually matters, said plainly rather than implied. */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-md border border-rule-soft bg-paper px-4 py-3 text-[13px]">
        <span className={differsFromLive ? 'font-600 text-holding' : 'text-muted'}>
          {differsFromLive
            ? 'This draft differs from the live page — visitors do not see these changes yet.'
            : 'The draft matches the live page.'}
        </span>
        {unsaved && <span className="font-600 text-declined">Unsaved changes</span>}
        <span className="text-faint">
          Draft last saved {when(doc.draftUpdatedAt)}{doc.draftUpdatedByName ? ` by ${doc.draftUpdatedByName}` : ''}
        </span>
        <span className="text-faint">
          Visitors see &ldquo;Last updated{' '}
          {doc.effectiveDate
            ? new Date(doc.effectiveDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
            : when(doc.publishedAt)}
          &rdquo;
        </span>
      </div>

      {showHistory && (
        <div className="panel divide-y divide-rule-soft">
          <div className="flex items-center justify-between px-5 py-3">
            <h2 className="font-display text-[15px] font-600 text-ink">Published versions</h2>
            <button onClick={() => setShowHistory(false)} aria-label="Close history" className="rounded p-1 text-muted hover:text-ink">
              <X className="h-4 w-4" />
            </button>
          </div>
          {doc.versions.length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-muted">Nothing published yet.</p>
          ) : (
            doc.versions.map((v) => (
              <div key={v.version} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
                <span className="tabular w-12 shrink-0 text-[14px] font-600 text-ink">v{v.version}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-ink">
                    {when(v.publishedAt)} · <span className="text-muted">{v.publishedByName}</span>
                    {v.version === doc.publishedVersion && (
                      <span className="ml-2 rounded-full bg-confirmed-wash px-2 py-0.5 text-[11px] font-600 text-confirmed">Live</span>
                    )}
                  </p>
                  {v.changeNote && <p className="mt-0.5 text-[12px] text-muted">{v.changeNote}</p>}
                </div>
                <button
                  onClick={() => restore(v.version)}
                  className="inline-flex shrink-0 items-center gap-1.5 text-[12px] font-medium text-signal hover:text-signal-deep"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Load into draft
                </button>
              </div>
            ))
          )}
        </div>
      )}

      <div className="panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule-soft px-4 py-2.5">
          <div className="flex gap-1">
            {(['write', 'preview'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] transition-colors ${
                  tab === t ? 'bg-ink font-medium text-white' : 'text-muted hover:bg-rule-soft hover:text-ink'
                }`}
              >
                {t === 'write' ? <Pencil className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {t === 'write' ? 'Write' : 'Preview'}
              </button>
            ))}
          </div>
          {tab === 'write' && (
            <div className="flex items-center gap-1">
              {([
                ['h2', Heading, 'Heading'],
                ['bold', Bold, 'Bold'],
                ['italic', Italic, 'Italic'],
                ['list', List, 'Bullet list'],
                ['link', Link2, 'Link'],
              ] as const).map(([kind, Icon, label]) => (
                <button
                  key={kind}
                  type="button"
                  title={label}
                  aria-label={label}
                  onClick={() => applyFormat(kind)}
                  className="rounded p-1.5 text-muted transition-colors hover:bg-rule-soft hover:text-ink"
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          )}
        </div>

        {tab === 'write' ? (
          <textarea
            ref={textarea}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            spellCheck
            className="block h-[62vh] w-full resize-y bg-surface p-5 font-mono text-[13px] leading-relaxed text-body outline-none"
            placeholder="Write the document in Markdown…"
          />
        ) : (
          <div className="h-[62vh] overflow-y-auto p-6">
            {/* Exactly the renderer the public page uses, so the preview is the
                page rather than an approximation of it. */}
            <Markdown source={draft} />
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px]">
        <div>
          <label htmlFor="note" className="block text-[13px] font-medium text-ink">
            What changed? <span className="font-normal text-faint">(optional, saved with the version)</span>
          </label>
          <input
            id="note"
            value={changeNote}
            onChange={(e) => setChangeNote(e.target.value)}
            maxLength={500}
            placeholder="e.g. Updated the refund window in section 5"
            className="mt-1.5 h-10 w-full rounded-md border border-rule bg-surface px-3 text-[13px] text-ink outline-none transition-colors placeholder:text-faint focus:border-signal"
          />
        </div>
        <div>
          <label htmlFor="effective" className="block text-[13px] font-medium text-ink">
            &ldquo;Last updated&rdquo; date
          </label>
          <input
            id="effective"
            type="date"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
            className="mt-1.5 h-10 w-full rounded-md border border-rule bg-surface px-3 text-[13px] text-ink outline-none transition-colors focus:border-signal"
          />
          {/* The reason this field exists: fixing a typo should not tell every
              visitor that the terms changed today. */}
          <p className="mt-1 text-[12px] text-faint">
            Shown to visitors. Leave as-is for a correction; move it forward when the wording really changes.
          </p>
        </div>
      </div>
    </div>
  );
}
