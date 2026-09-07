import { useEffect, useMemo, useState } from 'react';
import {
  Loader2, Plus, Trash2, Pencil, X, Eye, EyeOff, ArrowUp, ArrowDown,
  AlertCircle, CheckCircle2, Save, ExternalLink,
} from 'lucide-react';
import { api } from '../../services/api';
import ImageUpload from '../../components/ui/image-upload';

/**
 * Everything on the public site that used to be hardcoded.
 *
 * One screen with tabs rather than five separate pages: the sections are the
 * same shape underneath — an ordered list of items with a heading, some text and
 * sometimes a picture — and five near-identical screens would be five places to
 * fix the next bug in.
 *
 * The generic field names (`heading`, `body`) are labelled per section, so the
 * person editing a testimonial sees "Name" and "What they said" rather than the
 * database's words for them.
 */

type Section = 'testimonial' | 'stat' | 'faq' | 'founder' | 'activity';

interface Item {
  _id: string;
  section: Section;
  order: number;
  isPublished: boolean;
  heading: string;
  subheading?: string;
  body?: string;
  imageUrl?: string;
  value?: number;
  suffix?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  email?: string;
}

/** What each section calls its fields, and which ones it actually uses. */
const SHAPE: Record<Section, {
  tab: string;
  blurb: string;
  headingLabel: string;
  subheadingLabel?: string;
  bodyLabel?: string;
  image?: 'optional' | 'required';
  number?: boolean;
  socials?: boolean;
  where: string;
}> = {
  testimonial: {
    tab: 'Testimonials', blurb: 'Quotes shown on the home page.',
    headingLabel: 'Name', subheadingLabel: 'Their year or role',
    bodyLabel: 'What they said', image: 'optional', where: '/',
  },
  stat: {
    tab: 'Impact numbers', blurb: 'The figures in the “Our Impact in Numbers” band.',
    headingLabel: 'Label', number: true, where: '/',
  },
  faq: {
    tab: 'FAQ', blurb: 'Questions and answers on the home page.',
    headingLabel: 'Question', bodyLabel: 'Answer', where: '/',
  },
  founder: {
    tab: 'Founders', blurb: 'Shown on the home page and the contact page.',
    headingLabel: 'Name', subheadingLabel: 'Role', bodyLabel: 'Short biography',
    image: 'optional', socials: true, where: '/contact',
  },
  activity: {
    tab: 'Activities', blurb: 'The activities listed on the activities page.',
    headingLabel: 'Title', bodyLabel: 'Description', image: 'optional', where: '/activities',
  },
};

const SECTIONS = Object.keys(SHAPE) as Section[];

interface SettingSpec {
  key: string;
  label: string;
  hint: string;
  multiline: boolean;
}

const SETTINGS: SettingSpec[] = [
  { key: 'mission.summary', label: 'Mission — one line', hint: 'The bold sentence under “Mission”.', multiline: false },
  { key: 'mission.points', label: 'Mission — bullet points', hint: 'One per line.', multiline: true },
  { key: 'vision.summary', label: 'Vision — one line', hint: 'The bold sentence under “Vision”.', multiline: false },
  { key: 'vision.points', label: 'Vision — bullet points', hint: 'One per line.', multiline: true },
];

/**
 * How to reach us, and where. Shown on the contact page and, for the email,
 * phone and location, in the footer of every page.
 *
 * **Blank means the line is not drawn at all.** That is deliberate: a phone
 * number nobody answers, or a Facebook icon linking to a page that does not
 * exist, reads worse than not offering one. So an unused field is simply left
 * empty rather than filled with something plausible.
 */
const CONTACT_SETTINGS: SettingSpec[] = [
  { key: 'contact.email', label: 'Email address', hint: 'Shown on the contact page and in the footer. Leave blank to hide it.', multiline: false },
  { key: 'contact.phone', label: 'Phone number', hint: 'Include the country code, e.g. +995 555 123 456. Leave blank to hide it.', multiline: false },
  { key: 'contact.location', label: 'Location', hint: 'e.g. Tbilisi, Georgia. Leave blank to hide it.', multiline: false },
];

/**
 * One row per network. The same addresses feed the contact page and the footer,
 * so the Instagram link appears in both the moment it is saved here.
 */
const SOCIAL_SETTINGS: SettingSpec[] = [
  { key: 'social.instagram', label: 'Instagram', hint: 'Full address, e.g. https://www.instagram.com/…', multiline: false },
  { key: 'social.linkedin', label: 'LinkedIn', hint: 'Full address, e.g. https://www.linkedin.com/company/…', multiline: false },
  { key: 'social.twitter', label: 'Twitter / X', hint: 'Full address, e.g. https://x.com/…', multiline: false },
  { key: 'social.facebook', label: 'Facebook', hint: 'Full address, e.g. https://www.facebook.com/…', multiline: false },
  { key: 'social.youtube', label: 'YouTube', hint: 'Full address, e.g. https://www.youtube.com/@…', multiline: false },
  { key: 'social.telegram', label: 'Telegram', hint: 'Full address, e.g. https://t.me/…', multiline: false },
  { key: 'social.whatsapp', label: 'WhatsApp', hint: 'An invite link, e.g. https://wa.me/995555123456', multiline: false },
];

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` },
});

const blank = (section: Section): Partial<Item> => ({
  section, heading: '', subheading: '', body: '', imageUrl: '',
  suffix: '', linkedinUrl: '', twitterUrl: '', email: '', isPublished: true,
});

export default function AdminSiteContent() {
  const [tab, setTab] = useState<Section | 'missionVision' | 'contactSocial'>('testimonial');
  const [items, setItems] = useState<Item[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Partial<Item> | null>(null);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);

  const load = async () => {
    const [all, pub] = await Promise.all([
      api.get<any>('/admin/site-content', authHeaders()).catch(() => ({ data: [] })),
      api.get<any>('/site-content').catch(() => ({ data: {} })),
    ]);
    setItems((all as any)?.data ?? []);
    setSettings((pub as any)?.data?.settings ?? {});
  };

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  const rows = useMemo(
    () => items.filter((i) => i.section === tab).sort((a, b) => a.order - b.order),
    [items, tab],
  );

  const save = async () => {
    if (!editing) return;
    if (!editing.heading?.trim()) {
      setNotice({ tone: 'bad', text: 'This needs a heading.' });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const res: any = editing._id
        ? await api.put<any>(`/admin/site-content/${editing._id}`, editing, authHeaders())
        : await api.post<any>('/admin/site-content', editing, authHeaders());
      setNotice({ tone: res?.success ? 'ok' : 'bad', text: res?.message ?? 'Could not save.' });
      if (res?.success) { setEditing(null); await load(); }
    } catch (e: any) {
      setNotice({ tone: 'bad', text: e?.message ?? 'Could not save.' });
    } finally {
      setBusy(false);
    }
  };

  const patch = async (row: Item, changes: Partial<Item>) => {
    try {
      await api.put<any>(`/admin/site-content/${row._id}`, changes, authHeaders());
      await load();
    } catch (e: any) {
      setNotice({ tone: 'bad', text: e?.message ?? 'Could not update.' });
    }
  };

  /** Swaps this row's position with its neighbour — the two writes keep the list contiguous. */
  const move = async (row: Item, direction: -1 | 1) => {
    const list = rows;
    const at = list.findIndex((r) => r._id === row._id);
    const other = list[at + direction];
    if (!other) return;
    await Promise.all([
      api.put<any>(`/admin/site-content/${row._id}`, { order: other.order }, authHeaders()),
      api.put<any>(`/admin/site-content/${other._id}`, { order: row.order }, authHeaders()),
    ]);
    await load();
  };

  const remove = async (row: Item) => {
    if (!window.confirm(`Remove “${row.heading}” from the site?`)) return;
    try {
      await api.delete<any>(`/admin/site-content/${row._id}`, authHeaders());
      setNotice({ tone: 'ok', text: 'Removed.' });
      await load();
    } catch (e: any) {
      setNotice({ tone: 'bad', text: e?.message ?? 'Could not remove.' });
    }
  };

  const saveSetting = async (key: string, value: string) => {
    setBusy(true);
    try {
      await api.put<any>(`/admin/site-settings/${key}`, { value }, authHeaders());
      setNotice({ tone: 'ok', text: 'Saved — the public site shows this now.' });
      await load();
    } catch (e: any) {
      setNotice({ tone: 'bad', text: e?.message ?? 'Could not save.' });
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-signal" />
      </div>
    );
  }

  const isList = tab !== 'missionVision' && tab !== 'contactSocial';
  const shape = isList ? SHAPE[tab as Section] : null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-[30px] font-600 leading-tight text-ink">Site content</h1>
        <p className="mt-1.5 max-w-[64ch] text-[14px] text-muted">
          The words and figures on the public pages. Everything here used to be fixed in the code —
          changing it meant a developer and a deploy.
        </p>
      </header>

      {notice && (
        <p className={`flex items-center gap-2 rounded-md px-4 py-3 text-[13px] font-medium ${
          notice.tone === 'ok' ? 'bg-confirmed-wash text-confirmed' : 'bg-declined-wash text-declined'
        }`}>
          {notice.tone === 'ok' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {notice.text}
        </p>
      )}

      <div className="flex flex-wrap gap-1 border-b border-rule pb-3">
        {SECTIONS.map((s) => (
          <button
            key={s}
            onClick={() => { setTab(s); setNotice(null); }}
            className={`rounded-md px-3 py-1.5 text-[13px] transition-colors ${
              tab === s ? 'bg-ink font-medium text-white' : 'text-muted hover:bg-rule-soft hover:text-ink'
            }`}
          >
            {SHAPE[s].tab}
            <span className="tabular ml-1.5 opacity-60">{items.filter((i) => i.section === s).length}</span>
          </button>
        ))}
        <button
          onClick={() => { setTab('missionVision'); setNotice(null); }}
          className={`rounded-md px-3 py-1.5 text-[13px] transition-colors ${
            tab === 'missionVision' ? 'bg-ink font-medium text-white' : 'text-muted hover:bg-rule-soft hover:text-ink'
          }`}
        >
          Mission &amp; Vision
        </button>
        <button
          onClick={() => { setTab('contactSocial'); setNotice(null); }}
          className={`rounded-md px-3 py-1.5 text-[13px] transition-colors ${
            tab === 'contactSocial' ? 'bg-ink font-medium text-white' : 'text-muted hover:bg-rule-soft hover:text-ink'
          }`}
        >
          Contact &amp; social
        </button>
      </div>

      {tab === 'missionVision' ? (
        <div className="space-y-5">
          <p className="text-[13px] text-muted">Shown side by side on the home page.</p>
          {SETTINGS.map((f) => (
            <SettingField
              key={f.key}
              field={f}
              value={settings[f.key] ?? ''}
              busy={busy}
              onSave={(v) => saveSetting(f.key, v)}
            />
          ))}
        </div>
      ) : tab === 'contactSocial' ? (
        <div className="space-y-8">
          <section className="space-y-5">
            <div>
              <h2 className="font-display text-[16px] font-600 text-ink">How to reach us</h2>
              <p className="mt-1 text-[13px] text-muted">
                Shown on the{' '}
                <a href="/contact" target="_blank" rel="noreferrer"
                   className="inline-flex items-center gap-1 font-medium text-signal hover:text-signal-deep">
                  contact page <ExternalLink className="h-3 w-3" />
                </a>{' '}
                and in the footer of every page. Anything left blank is not shown at all.
              </p>
            </div>
            {CONTACT_SETTINGS.map((f) => (
              <SettingField
                key={f.key}
                field={f}
                value={settings[f.key] ?? ''}
                busy={busy}
                onSave={(v) => saveSetting(f.key, v)}
              />
            ))}
          </section>

          <section className="space-y-5">
            <div>
              <h2 className="font-display text-[16px] font-600 text-ink">Social profiles</h2>
              <p className="mt-1 text-[13px] text-muted">
                One address per network. Only the ones you fill in get an icon — an icon that goes
                nowhere makes the site look unfinished, so the rest stay hidden.
              </p>
            </div>
            {SOCIAL_SETTINGS.map((f) => (
              <SettingField
                key={f.key}
                field={f}
                value={settings[f.key] ?? ''}
                busy={busy}
                onSave={(v) => saveSetting(f.key, v)}
              />
            ))}
          </section>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13px] text-muted">
              {shape!.blurb}{' '}
              <a href={shape!.where} target="_blank" rel="noreferrer"
                 className="inline-flex items-center gap-1 font-medium text-signal hover:text-signal-deep">
                View page <ExternalLink className="h-3 w-3" />
              </a>
            </p>
            <button
              onClick={() => { setEditing(blank(tab as Section)); setNotice(null); }}
              className="inline-flex items-center gap-2 rounded-md bg-signal px-4 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-signal-deep"
            >
              <Plus className="h-4 w-4" /> Add
            </button>
          </div>

          {rows.length === 0 ? (
            <div className="panel px-6 py-12 text-center">
              <p className="text-[14px] text-muted">Nothing here yet.</p>
            </div>
          ) : (
            <div className="panel divide-y divide-rule-soft">
              {rows.map((row, i) => (
                <div key={row._id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                  {shape!.image && (
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-paper">
                      {/* Initials rather than the word "none" — it matches what
                          the public page falls back to, so the row previews the
                          real thing instead of describing an absence. */}
                      {row.imageUrl
                        ? <img src={row.imageUrl} alt="" className="h-full w-full object-cover" />
                        : (
                          <div className="flex h-full w-full items-center justify-center bg-signal-wash text-[13px] font-600 text-signal">
                            {row.heading.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                        )}
                    </div>
                  )}
                  {shape!.number && (
                    <span className="tabular w-16 shrink-0 text-[20px] font-600 text-ink">
                      {row.value ?? 0}{row.suffix}
                    </span>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-600 text-ink">{row.heading}</p>
                    {row.subheading && <p className="truncate text-[13px] text-muted">{row.subheading}</p>}
                    {row.body && <p className="mt-0.5 line-clamp-2 text-[12px] text-faint">{row.body}</p>}
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button onClick={() => move(row, -1)} disabled={i === 0} aria-label="Move up"
                      className="rounded-md border border-rule p-1.5 text-muted transition-colors hover:border-signal hover:text-signal disabled:opacity-30">
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => move(row, 1)} disabled={i === rows.length - 1} aria-label="Move down"
                      className="rounded-md border border-rule p-1.5 text-muted transition-colors hover:border-signal hover:text-signal disabled:opacity-30">
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => patch(row, { isPublished: !row.isPublished })}
                      title={row.isPublished ? 'Hide from the site' : 'Show on the site'}
                      className={`rounded-md border p-1.5 transition-colors ${
                        row.isPublished ? 'border-rule text-muted hover:border-signal hover:text-signal'
                                        : 'border-holding text-holding'
                      }`}>
                      {row.isPublished ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </button>
                    <button onClick={() => { setEditing({ ...row }); setNotice(null); }} aria-label="Edit"
                      className="rounded-md border border-rule p-1.5 text-muted transition-colors hover:border-signal hover:text-signal">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => remove(row)} aria-label="Remove"
                      className="rounded-md border border-rule p-1.5 text-muted transition-colors hover:border-declined hover:text-declined">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {editing && shape && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 sm:p-6">
          <div className="flex max-h-full w-full max-w-[560px] flex-col overflow-hidden rounded-2xl bg-surface">
            <div className="flex shrink-0 items-center justify-between border-b border-rule-soft px-6 py-4">
              <h2 className="font-display text-[18px] font-600 text-ink">
                {editing._id ? 'Edit' : 'Add'} — {shape.tab.replace(/s$/, '')}
              </h2>
              <button onClick={() => setEditing(null)} aria-label="Close"
                className="rounded-md p-1.5 text-muted hover:bg-paper hover:text-ink">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              <Field label={shape.headingLabel} required>
                <input value={editing.heading ?? ''} onChange={(e) => setEditing({ ...editing, heading: e.target.value })} className={inputCls} />
              </Field>

              {shape.subheadingLabel && (
                <Field label={shape.subheadingLabel}>
                  <input value={editing.subheading ?? ''} onChange={(e) => setEditing({ ...editing, subheading: e.target.value })} className={inputCls} />
                </Field>
              )}

              {shape.number && (
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Number" required>
                    <input type="number" value={editing.value ?? ''} onChange={(e) => setEditing({ ...editing, value: e.target.value === '' ? undefined : Number(e.target.value) })} className={inputCls} />
                  </Field>
                  <Field label="Suffix" hint="e.g. + — leave blank for none">
                    <input maxLength={8} value={editing.suffix ?? ''} onChange={(e) => setEditing({ ...editing, suffix: e.target.value })} className={inputCls} />
                  </Field>
                </div>
              )}

              {shape.bodyLabel && (
                <Field label={shape.bodyLabel}>
                  <textarea rows={4} value={editing.body ?? ''} onChange={(e) => setEditing({ ...editing, body: e.target.value })} className={`${inputCls} h-auto py-2.5`} />
                </Field>
              )}

              {shape.image && (
                <ImageUpload
                  value={editing.imageUrl ?? ''}
                  onChange={(url) => setEditing({ ...editing, imageUrl: url })}
                  purpose="course-thumbnail"
                  asAdmin
                  aspect="square"
                  label="Photograph"
                  hint={tab === 'testimonial' ? 'Optional. Without one, their initials are shown instead.' : 'Optional.'}
                />
              )}

              {shape.socials && (
                <div className="space-y-4">
                  <Field label="LinkedIn URL"><input value={editing.linkedinUrl ?? ''} onChange={(e) => setEditing({ ...editing, linkedinUrl: e.target.value })} placeholder="https://linkedin.com/in/…" className={inputCls} /></Field>
                  <Field label="Twitter / X URL"><input value={editing.twitterUrl ?? ''} onChange={(e) => setEditing({ ...editing, twitterUrl: e.target.value })} placeholder="https://x.com/…" className={inputCls} /></Field>
                  <Field label="Email"><input value={editing.email ?? ''} onChange={(e) => setEditing({ ...editing, email: e.target.value })} className={inputCls} /></Field>
                </div>
              )}

              <label className="flex items-center gap-2.5 rounded-lg border border-rule px-4 py-3">
                <input type="checkbox" checked={editing.isPublished !== false}
                  onChange={(e) => setEditing({ ...editing, isPublished: e.target.checked })} className="h-4 w-4" />
                <span className="text-[14px] text-ink">
                  Show on the site
                  <span className="block text-[12px] text-muted">Untick to keep it here but hide it from visitors.</span>
                </span>
              </label>
            </div>

            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-rule-soft px-6 py-4">
              <button onClick={() => setEditing(null)} className="rounded-md px-4 py-2.5 text-[14px] font-medium text-muted transition-colors hover:text-ink">Cancel</button>
              <button onClick={save} disabled={busy}
                className="inline-flex items-center gap-2 rounded-md bg-ink px-5 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-ink-soft disabled:opacity-50">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls =
  'h-11 w-full rounded-lg border border-rule bg-surface px-3 text-[14px] text-ink outline-none transition-colors placeholder:text-faint focus:border-signal';

function Field({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold text-ink">
        {label} {required && <span className="text-declined">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[12px] text-muted">{hint}</span>}
    </label>
  );
}

/** Kept as its own component so each field holds its own unsaved draft. */
function SettingField({ field, value, busy, onSave }: {
  field: SettingSpec;
  value: string;
  busy: boolean;
  onSave: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => { setDraft(value); }, [value]);
  const dirty = draft !== value;

  return (
    <div className="panel px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[13px] font-semibold text-ink">{field.label}</p>
          <p className="text-[12px] text-muted">{field.hint}</p>
        </div>
        <button onClick={() => onSave(draft)} disabled={!dirty || busy}
          className="inline-flex items-center gap-1.5 rounded-md bg-ink px-3.5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-ink-soft disabled:opacity-40">
          <Save className="h-3.5 w-3.5" /> Save
        </button>
      </div>
      {field.multiline ? (
        <textarea rows={4} value={draft} onChange={(e) => setDraft(e.target.value)} className={`${inputCls} mt-3 h-auto py-2.5 font-mono text-[13px]`} />
      ) : (
        <input value={draft} onChange={(e) => setDraft(e.target.value)} className={`${inputCls} mt-3`} />
      )}
    </div>
  );
}
