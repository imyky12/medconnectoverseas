import { useEffect, useState } from 'react';
import {
  Loader2, Plus, Trash2, Pencil, X, FileText, Eye, EyeOff, Download, AlertCircle, CheckCircle2, Send,
} from 'lucide-react';
import { api } from '../../services/api';
import ImageUpload from '../../components/ui/image-upload';
import PdfUpload from '../../components/ui/pdf-upload';

/**
 * Managing Med Nexus issues.
 *
 * An issue has two files: a cover, which is public and exists to make someone
 * want to read it, and the PDF, which is not. The form keeps that distinction
 * visible — the PDF field says outright that readers only get it after verifying
 * an email, because an admin uploading a document should know where it will end
 * up.
 *
 * Draft and published work the way they do everywhere else here: nothing appears
 * on the public page until it is deliberately published.
 */

interface Issue {
  _id: string;
  title: string;
  edition: string;
  summary: string;
  coverImageUrl?: string;
  fileUrl?: string;
  filePublicId?: string;
  fileSizeBytes?: number;
  pageCount?: number;
  isPublished: boolean;
  publishedAt?: string;
  downloadCount: number;
  notifiedAt?: string;
  notifiedCount?: number;
  createdByName?: string;
  createdAt: string;
}

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` },
});

const EMPTY = {
  title: '', edition: '', summary: '',
  coverImageUrl: '', fileUrl: '', filePublicId: '',
  fileSizeBytes: undefined as number | undefined,
  pageCount: undefined as number | undefined,
  isPublished: false,
};

export default function AdminNewsletters() {
  const [rows, setRows] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<(typeof EMPTY & { _id?: string }) | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);

  const load = () =>
    api.get<any>('/admin/newsletters', authHeaders())
      .then((r: any) => setRows(r?.data ?? []))
      .catch(() => setRows([]));

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  const save = async () => {
    if (!editing) return;
    if (!editing.title.trim() || !editing.edition.trim() || !editing.summary.trim()) {
      setNotice({ tone: 'bad', text: 'Title, edition and summary are all required.' });
      return;
    }
    if (!editing.fileUrl) {
      setNotice({ tone: 'bad', text: 'Upload the newsletter PDF before saving.' });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const body = { ...editing };
      const res: any = editing._id
        ? await api.put<any>(`/admin/newsletters/${editing._id}`, body, authHeaders())
        : await api.post<any>('/admin/newsletters', body, authHeaders());
      if (res?.success) {
        setNotice({ tone: 'ok', text: res.message ?? 'Saved.' });
        setEditing(null);
        await load();
      } else setNotice({ tone: 'bad', text: res?.message ?? 'Could not save.' });
    } catch (e: any) {
      setNotice({ tone: 'bad', text: e?.message ?? 'Could not save.' });
    } finally {
      setBusy(false);
    }
  };

  const togglePublish = async (row: Issue) => {
    try {
      await api.put<any>(`/admin/newsletters/${row._id}`, { isPublished: !row.isPublished }, authHeaders());
      setNotice({
        tone: 'ok',
        text: row.isPublished ? 'Taken off the public page.' : 'Published — it is on the newsletter page now.',
      });
      await load();
    } catch (e: any) {
      setNotice({ tone: 'bad', text: e?.message ?? 'Could not change that.' });
    }
  };

  const notify = async (row: Issue) => {
    const again = row.notifiedAt
      ? `

This issue was already sent on ${new Date(row.notifiedAt).toLocaleString('en-GB')}. Anyone who already received it will not get a second copy.`
      : '';
    if (!window.confirm(`Email every active subscriber about "${row.title}"?${again}`)) return;
    setBusy(true);
    try {
      const res: any = await api.post<any>(`/admin/newsletters/${row._id}/notify`, {}, authHeaders());
      setNotice({ tone: res?.success ? 'ok' : 'bad', text: res?.message ?? 'Could not send.' });
      await load();
    } catch (e: any) {
      setNotice({ tone: 'bad', text: e?.message ?? 'Could not send.' });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row: Issue) => {
    if (!window.confirm(`Delete "${row.title}"? This cannot be undone.`)) return;
    try {
      await api.delete<any>(`/admin/newsletters/${row._id}`, authHeaders());
      setNotice({ tone: 'ok', text: 'Deleted.' });
      await load();
    } catch (e: any) {
      setNotice({ tone: 'bad', text: e?.message ?? 'Could not delete.' });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-signal" />
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[30px] font-600 leading-tight text-ink">Newsletter</h1>
          <p className="mt-1.5 max-w-[62ch] text-[14px] text-muted">
            Issues of Med Nexus. Readers see the cover and summary on the public page; the PDF itself
            is only released after they verify an email address.
          </p>
        </div>
        <button
          onClick={() => { setEditing({ ...EMPTY }); setNotice(null); }}
          className="inline-flex items-center gap-2 rounded-md bg-signal px-4 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-signal-deep"
        >
          <Plus className="h-4 w-4" /> New issue
        </button>
      </header>

      {notice && (
        <p className={`flex items-center gap-2 rounded-md px-4 py-3 text-[13px] font-medium ${
          notice.tone === 'ok' ? 'bg-confirmed-wash text-confirmed' : 'bg-declined-wash text-declined'
        }`}>
          {notice.tone === 'ok' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {notice.text}
        </p>
      )}

      {rows.length === 0 ? (
        <div className="panel px-6 py-12 text-center">
          <FileText className="mx-auto h-7 w-7 text-faint" />
          <p className="mt-3 text-[15px] font-medium text-ink">No issues yet</p>
          <p className="mt-1 text-[13px] text-muted">Add the first one and publish it when you are ready.</p>
        </div>
      ) : (
        <div className="panel divide-y divide-rule-soft">
          {rows.map((row) => (
            <div key={row._id} className="flex flex-wrap items-center gap-4 px-5 py-4">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-paper">
                {row.coverImageUrl ? (
                  <img src={row.coverImageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <FileText className="h-5 w-5 text-faint" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[15px] font-600 text-ink">{row.title}</h2>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-600 ${
                    row.isPublished ? 'bg-confirmed-wash text-confirmed' : 'bg-holding-wash text-holding'
                  }`}>
                    {row.isPublished ? 'Live' : 'Draft'}
                  </span>
                </div>
                <p className="mt-0.5 text-[13px] text-muted">{row.edition}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 text-[12px] text-faint">
                  <span className="inline-flex items-center gap-1"><Download className="h-3 w-3" /> {row.downloadCount} reads</span>
                  {row.notifiedAt && (
                    <span className="inline-flex items-center gap-1 text-confirmed">
                      <Send className="h-3 w-3" /> emailed to {row.notifiedCount ?? 0} on{' '}
                      {new Date(row.notifiedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </span>
                  )}
                  {row.createdByName && <span>added by {row.createdByName}</span>}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                {/* Only offered once it is live — a link in that email would
                    404 for every recipient otherwise. */}
                {row.isPublished && (
                  <button
                    onClick={() => notify(row)}
                    disabled={busy}
                    title="Email every active subscriber a link to this issue"
                    className="inline-flex items-center gap-1.5 rounded-md border border-rule px-3 py-2 text-[13px] font-medium text-ink transition-colors hover:border-signal hover:text-signal disabled:opacity-50"
                  >
                    <Send className="h-3.5 w-3.5" /> {row.notifiedAt ? 'Send again' : 'Email subscribers'}
                  </button>
                )}
                <button
                  onClick={() => togglePublish(row)}
                  title={row.isPublished ? 'Take off the public page' : 'Publish'}
                  className="inline-flex items-center gap-1.5 rounded-md border border-rule px-3 py-2 text-[13px] font-medium text-ink transition-colors hover:border-signal hover:text-signal"
                >
                  {row.isPublished ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  {row.isPublished ? 'Unpublish' : 'Publish'}
                </button>
                <button
                  onClick={() => { setEditing({ ...EMPTY, ...row }); setNotice(null); }}
                  aria-label="Edit"
                  className="rounded-md border border-rule p-2 text-muted transition-colors hover:border-signal hover:text-signal"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => remove(row)}
                  aria-label="Delete"
                  className="rounded-md border border-rule p-2 text-muted transition-colors hover:border-declined hover:text-declined"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 sm:p-6">
          <div className="flex max-h-full w-full max-w-[640px] flex-col overflow-hidden rounded-2xl bg-surface">
            <div className="flex shrink-0 items-center justify-between border-b border-rule-soft px-6 py-4">
              <h2 className="font-display text-[18px] font-600 text-ink">
                {editing._id ? 'Edit issue' : 'New issue'}
              </h2>
              <button onClick={() => setEditing(null)} aria-label="Close" className="rounded-md p-1.5 text-muted hover:bg-paper hover:text-ink">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px]">
                <Field label="Title" required>
                  <input
                    value={editing.title}
                    onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                    placeholder="e.g. Matching abroad without an agent"
                    className={inputCls}
                  />
                </Field>
                <Field label="Edition" required>
                  <input
                    value={editing.edition}
                    onChange={(e) => setEditing({ ...editing, edition: e.target.value })}
                    placeholder="e.g. April 2026"
                    className={inputCls}
                  />
                </Field>
              </div>

              <Field label="Summary" required hint="One or two lines. This is what makes someone click.">
                <textarea
                  rows={3}
                  maxLength={600}
                  value={editing.summary}
                  onChange={(e) => setEditing({ ...editing, summary: e.target.value })}
                  className={`${inputCls} h-auto py-2.5`}
                />
              </Field>

              <ImageUpload
                value={editing.coverImageUrl}
                onChange={(url) => setEditing({ ...editing, coverImageUrl: url })}
                purpose="newsletter-cover"
                asAdmin
                label="Cover image"
                hint="Public — shown on the newsletter page."
              />

              <PdfUpload
                value={editing.fileUrl}
                onChange={(url, meta) =>
                  setEditing({
                    ...editing,
                    fileUrl: url,
                    filePublicId: meta?.publicId ?? editing.filePublicId,
                    fileSizeBytes: meta?.sizeBytes ?? editing.fileSizeBytes,
                  })
                }
                required
                label="The issue (PDF)"
                hint="Never shown publicly. Readers get it only after verifying their email address."
              />

              <Field label="Pages" hint="Optional — shown on the card.">
                <input
                  type="number"
                  min={1}
                  value={editing.pageCount ?? ''}
                  onChange={(e) => setEditing({ ...editing, pageCount: e.target.value ? Number(e.target.value) : undefined })}
                  className={`${inputCls} max-w-[140px]`}
                />
              </Field>

              <label className="flex items-center gap-2.5 rounded-lg border border-rule px-4 py-3">
                <input
                  type="checkbox"
                  checked={editing.isPublished}
                  onChange={(e) => setEditing({ ...editing, isPublished: e.target.checked })}
                  className="h-4 w-4"
                />
                <span className="text-[14px] text-ink">
                  Publish now
                  <span className="block text-[12px] text-muted">
                    Leave unticked to save it as a draft — nothing appears publicly until this is on.
                  </span>
                </span>
              </label>
            </div>

            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-rule-soft px-6 py-4">
              <button onClick={() => setEditing(null)} className="rounded-md px-4 py-2.5 text-[14px] font-medium text-muted transition-colors hover:text-ink">
                Cancel
              </button>
              <button
                onClick={save}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-md bg-ink px-5 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-ink-soft disabled:opacity-50"
              >
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
