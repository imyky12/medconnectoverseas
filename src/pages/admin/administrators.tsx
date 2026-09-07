import { useEffect, useState } from 'react';
import {
  Loader2, Plus, X, ShieldCheck, ShieldOff, KeyRound, AlertCircle, CheckCircle2, Copy, Check,
} from 'lucide-react';
import { api } from '../../services/api';

/**
 * Who can get into the admin area.
 *
 * Everyone listed here can add, suspend and reset everyone else — there are no
 * tiers. For a team this size a permission hierarchy nobody maintains ends up
 * with everybody in the top tier anyway, and the activity log already answers
 * "who did this" for every action.
 *
 * The password set when adding someone is a **handover** password: it is shown
 * once, here, for the person adding the account to pass on however they trust,
 * and the account cannot reach the dashboard until its owner has replaced it.
 * It is deliberately never emailed — that mailbox is the second factor for
 * signing in, and putting the first factor in there too collapses the two into
 * one.
 */

interface AdminRow {
  _id: string;
  email: string;
  fullName: string;
  isActive: boolean;
  lastLogin?: string;
  mustChangePassword: boolean;
  passwordChangedAt?: string;
  createdByName?: string;
  createdAt: string;
}

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` },
});

const me = () => {
  try { return JSON.parse(localStorage.getItem('adminUser') || '{}'); } catch { return {}; }
};

const inputCls =
  'h-11 w-full rounded-lg border border-rule bg-surface px-3 text-[14px] text-ink outline-none transition-colors placeholder:text-faint focus:border-signal';

const when = (value?: string) =>
  value
    ? new Date(value).toLocaleString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : null;

export default function AdminAdministrators() {
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);

  const [adding, setAdding] = useState(false);
  const [resetting, setResetting] = useState<AdminRow | null>(null);

  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [resetPassword, setResetPassword] = useState('');

  const load = async () => {
    try {
      const res: any = await api.get<any>('/admin/admins', authHeaders());
      setRows(res?.data ?? []);
    } catch (e: any) {
      setNotice({ tone: 'bad', text: e?.message ?? 'Could not load administrators.' });
    }
  };

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  const add = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const res: any = await api.post<any>('/admin/admins', form, authHeaders());
      if (res?.success) {
        setNotice({ tone: 'ok', text: res.message });
        setAdding(false);
        setForm({ fullName: '', email: '', password: '' });
        await load();
      } else {
        setNotice({ tone: 'bad', text: res?.message ?? 'Could not add them.' });
      }
    } catch (e: any) {
      setNotice({ tone: 'bad', text: e?.message ?? 'Could not add them.' });
    } finally {
      setBusy(false);
    }
  };

  const setActive = async (row: AdminRow, isActive: boolean) => {
    if (!isActive && !window.confirm(`Switch off access for ${row.fullName}?`)) return;
    setNotice(null);
    try {
      const res: any = await api.patch<any>(`/admin/admins/${row._id}/active`, { isActive }, authHeaders());
      setNotice({ tone: res?.success ? 'ok' : 'bad', text: res?.message ?? 'Could not change that.' });
      await load();
    } catch (e: any) {
      setNotice({ tone: 'bad', text: e?.message ?? 'Could not change that.' });
    }
  };

  const doReset = async () => {
    if (!resetting) return;
    setBusy(true);
    setNotice(null);
    try {
      const res: any = await api.post<any>(
        `/admin/admins/${resetting._id}/reset-password`,
        { password: resetPassword },
        authHeaders(),
      );
      if (res?.success) {
        setNotice({ tone: 'ok', text: res.message });
        setResetting(null);
        setResetPassword('');
        await load();
      } else {
        setNotice({ tone: 'bad', text: res?.message ?? 'Could not reset it.' });
      }
    } catch (e: any) {
      setNotice({ tone: 'bad', text: e?.message ?? 'Could not reset it.' });
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

  const myId = me()?.id;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[30px] font-600 leading-tight text-ink">Administrators</h1>
          <p className="mt-1.5 max-w-[64ch] text-[14px] text-muted">
            Everyone here can sign in with their own address and password, and a one-time code sent
            to that address. Every action they take is recorded against their name.
          </p>
        </div>
        <button
          onClick={() => { setAdding(true); setNotice(null); }}
          className="inline-flex items-center gap-2 rounded-md bg-signal px-4 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-signal-deep"
        >
          <Plus className="h-4 w-4" /> Add administrator
        </button>
      </header>

      {notice && (
        <p className={`flex items-start gap-2 rounded-md px-4 py-3 text-[13px] font-medium ${
          notice.tone === 'ok' ? 'bg-confirmed-wash text-confirmed' : 'bg-declined-wash text-declined'
        }`}>
          {notice.tone === 'ok'
            ? <CheckCircle2 className="mt-px h-4 w-4 shrink-0" />
            : <AlertCircle className="mt-px h-4 w-4 shrink-0" />}
          {notice.text}
        </p>
      )}

      <div className="panel divide-y divide-rule-soft">
        {rows.map((row) => {
          const isMe = row._id === myId;
          return (
            <div key={row._id} className="flex flex-wrap items-center gap-4 px-5 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-signal-wash text-[13px] font-semibold text-signal">
                {row.fullName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
              </div>

              <div className="min-w-[200px] flex-1">
                <p className="text-[15px] font-600 text-ink">
                  {row.fullName}
                  {isMe && <span className="ml-2 text-[12px] font-normal text-muted">(you)</span>}
                </p>
                <p className="text-[13px] text-muted">{row.email}</p>
                <p className="mt-1 text-[12px] text-faint">
                  {when(row.lastLogin) ? `Last signed in ${when(row.lastLogin)}` : 'Has never signed in'}
                  {row.createdByName && ` · added by ${row.createdByName}`}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {!row.isActive && (
                  <span className="rounded-full bg-declined-wash px-2.5 py-1 text-[12px] font-medium text-declined">
                    No access
                  </span>
                )}
                {row.isActive && row.mustChangePassword && (
                  <span className="rounded-full bg-holding-wash px-2.5 py-1 text-[12px] font-medium text-holding">
                    Must set their password
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setResetting(row); setResetPassword(''); setNotice(null); }}
                  disabled={isMe}
                  title={isMe ? 'Change your own password from the sign-in screen' : 'Give them a new temporary password'}
                  className="inline-flex items-center gap-1.5 rounded-md border border-rule px-3 py-2 text-[13px] text-muted transition-colors hover:border-signal hover:text-signal disabled:opacity-40 disabled:hover:border-rule disabled:hover:text-muted"
                >
                  <KeyRound className="h-3.5 w-3.5" /> Reset password
                </button>

                {row.isActive ? (
                  <button
                    onClick={() => setActive(row, false)}
                    disabled={isMe}
                    title={isMe ? 'You cannot switch off your own access' : 'Switch off access'}
                    className="inline-flex items-center gap-1.5 rounded-md border border-rule px-3 py-2 text-[13px] text-muted transition-colors hover:border-declined hover:text-declined disabled:opacity-40 disabled:hover:border-rule disabled:hover:text-muted"
                  >
                    <ShieldOff className="h-3.5 w-3.5" /> Suspend
                  </button>
                ) : (
                  <button
                    onClick={() => setActive(row, true)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-rule px-3 py-2 text-[13px] text-muted transition-colors hover:border-confirmed hover:text-confirmed"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" /> Restore
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {adding && (
        <Dialog title="Add an administrator" onClose={() => setAdding(false)}>
          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
            <Field label="Full name" required hint="This is the name the activity log will show.">
              <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Email address" required hint="Their sign-in code is sent here, so it must be an inbox only they can open.">
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Temporary password" required hint="At least 12 characters, with a letter and a number.">
              <PasswordField value={form.password} onChange={(v) => setForm({ ...form, password: v })} />
            </Field>

            <p className="rounded-lg bg-signal-wash px-4 py-3 text-[13px] leading-relaxed text-ink">
              Pass this password on yourself — we do not email it. They will be asked to replace it
              the first time they sign in, so after that only they know it.
            </p>
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-rule-soft px-6 py-4">
            <button onClick={() => setAdding(false)} className="rounded-md px-4 py-2.5 text-[14px] font-medium text-muted transition-colors hover:text-ink">
              Cancel
            </button>
            <button onClick={add} disabled={busy}
              className="inline-flex items-center gap-2 rounded-md bg-ink px-5 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-ink-soft disabled:opacity-50">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Add
            </button>
          </div>
        </Dialog>
      )}

      {resetting && (
        <Dialog title={`Reset the password for ${resetting.fullName}`} onClose={() => setResetting(null)}>
          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
            <Field label="New temporary password" required hint="At least 12 characters, with a letter and a number.">
              <PasswordField value={resetPassword} onChange={setResetPassword} />
            </Field>
            <p className="rounded-lg bg-signal-wash px-4 py-3 text-[13px] leading-relaxed text-ink">
              Their current password stops working straight away. Give them this one, and they will
              be asked to choose their own at the next sign-in.
            </p>
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-rule-soft px-6 py-4">
            <button onClick={() => setResetting(null)} className="rounded-md px-4 py-2.5 text-[14px] font-medium text-muted transition-colors hover:text-ink">
              Cancel
            </button>
            <button onClick={doReset} disabled={busy}
              className="inline-flex items-center gap-2 rounded-md bg-ink px-5 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-ink-soft disabled:opacity-50">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Reset
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}

/** Same shape as the other admin dialogs: pinned header and footer, body scrolls. */
function Dialog({ title, onClose, children }: {
  title: string; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 sm:p-6">
      <div className="flex max-h-full w-full max-w-[520px] flex-col overflow-hidden rounded-2xl bg-surface">
        <div className="flex shrink-0 items-center justify-between border-b border-rule-soft px-6 py-4">
          <h2 className="font-display text-[18px] font-600 text-ink">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1.5 text-muted hover:bg-paper hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/**
 * Shown in the clear, with a copy button.
 *
 * Masking it would be theatre: the person typing it is the one who has to pass
 * it on, and a password they cannot read is a password they will get wrong.
 */
function PasswordField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard blocked — they can still select the text */ }
  };

  return (
    <div className="flex gap-2">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        spellCheck={false}
        className={`${inputCls} font-mono`}
      />
      <button
        type="button"
        onClick={copy}
        disabled={!value}
        title="Copy"
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-rule text-muted transition-colors hover:border-signal hover:text-signal disabled:opacity-40"
      >
        {copied ? <Check className="h-4 w-4 text-confirmed" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}

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
