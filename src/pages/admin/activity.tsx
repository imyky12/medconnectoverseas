import { useEffect, useMemo, useState } from 'react';
import { Loader2, Search, ShieldCheck, User as UserIcon, Server, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../../services/api';

/**
 * Who did what, and when.
 *
 * Every state-changing request is recorded automatically by middleware, so this
 * covers admin actions and student actions alike — including endpoints nobody
 * has written yet. Reads are not logged: a `GET` changes nothing, and logging
 * every list view would bury the rows that matter.
 *
 * Refused attempts are kept and shown as prominently as successful ones. "Who
 * tried to do this and was stopped" is usually the more interesting question.
 */

interface Row {
  _id: string;
  actorType: 'admin' | 'user' | 'system';
  actorName: string;
  actorEmail: string;
  action: string;
  summary: string;
  method?: string;
  path?: string;
  statusCode?: number;
  success: boolean;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` },
});

const ACTOR_ICON = {
  admin: ShieldCheck,
  user: UserIcon,
  system: Server,
} as const;

function ago(iso: string): string {
  const secs = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default function AdminActivity() {
  const [rows, setRows] = useState<Row[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [actorType, setActorType] = useState('');
  const [action, setAction] = useState('');
  const [failuresOnly, setFailuresOnly] = useState(false);
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQ(q); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    api.get<any>('/admin/activity/actions', authHeaders())
      .then((r: any) => setActions(r?.data ?? []))
      .catch(() => setActions([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '50' });
    if (actorType) params.set('actorType', actorType);
    if (action) params.set('action', action);
    if (failuresOnly) params.set('success', 'false');
    if (debouncedQ) params.set('q', debouncedQ);

    api.get<any>(`/admin/activity?${params.toString()}`, authHeaders())
      .then((r: any) => {
        if (cancelled) return;
        setRows(r?.data?.rows ?? []);
        setTotal(r?.data?.total ?? 0);
        setPages(r?.data?.pages ?? 1);
      })
      .catch(() => { if (!cancelled) setRows([]); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [page, actorType, action, failuresOnly, debouncedQ]);

  const filtersOn = useMemo(
    () => Boolean(actorType || action || failuresOnly || debouncedQ),
    [actorType, action, failuresOnly, debouncedQ],
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-[30px] font-600 leading-tight text-ink">Activity</h1>
        <p className="mt-1.5 max-w-[64ch] text-[14px] text-muted">
          Every action that changed something — by an admin or a student — with who did it and when.
          Page views are not recorded; only changes.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by person or what they did…"
            className="h-10 w-full rounded-md border border-rule bg-surface pl-9 pr-3 text-[14px] text-ink outline-none transition-colors placeholder:text-faint focus:border-signal"
          />
        </div>

        <select
          value={actorType}
          onChange={(e) => { setActorType(e.target.value); setPage(1); }}
          className="h-10 rounded-md border border-rule bg-surface px-3 text-[13px] text-ink outline-none focus:border-signal"
        >
          <option value="">Everyone</option>
          <option value="admin">Admins only</option>
          <option value="user">Students only</option>
          <option value="system">Anonymous / system</option>
        </select>

        <select
          value={action}
          onChange={(e) => { setAction(e.target.value); setPage(1); }}
          className="h-10 max-w-[200px] rounded-md border border-rule bg-surface px-3 text-[13px] text-ink outline-none focus:border-signal"
        >
          <option value="">All actions</option>
          {actions.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>

        <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-rule bg-surface px-3 text-[13px] text-ink">
          <input
            type="checkbox"
            checked={failuresOnly}
            onChange={(e) => { setFailuresOnly(e.target.checked); setPage(1); }}
            className="h-3.5 w-3.5"
          />
          Refused only
        </label>

        {filtersOn && (
          <button
            onClick={() => { setActorType(''); setAction(''); setFailuresOnly(false); setQ(''); setPage(1); }}
            className="text-[13px] font-medium text-signal hover:text-signal-deep"
          >
            Clear
          </button>
        )}
      </div>

      <p className="text-[13px] text-muted">
        {loading ? 'Loading…' : `${total.toLocaleString('en-IN')} record${total === 1 ? '' : 's'}`}
      </p>

      {loading && rows.length === 0 ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-signal" />
        </div>
      ) : rows.length === 0 ? (
        <div className="panel px-6 py-12 text-center">
          <p className="text-[14px] text-muted">
            {filtersOn ? 'Nothing matches those filters.' : 'Nothing recorded yet.'}
          </p>
        </div>
      ) : (
        <div className="panel divide-y divide-rule-soft">
          {rows.map((r) => {
            const Icon = ACTOR_ICON[r.actorType] ?? Server;
            const open = expanded === r._id;
            return (
              <button
                key={r._id}
                onClick={() => setExpanded(open ? null : r._id)}
                className="flex w-full items-start gap-3.5 px-5 py-3.5 text-left transition-colors hover:bg-paper/60"
              >
                <span className={`mt-0.5 shrink-0 rounded-md p-1.5 ${
                  r.actorType === 'admin' ? 'bg-signal-wash text-signal'
                  : r.actorType === 'user' ? 'bg-paper text-muted'
                  : 'bg-rule-soft text-faint'
                }`}>
                  <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-[14px] text-ink">
                    <span className="font-medium">{r.actorName}</span>
                    <span className="text-muted"> — {r.summary}</span>
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2.5 text-[12px] text-faint">
                    <span>{r.actorEmail || 'no email'}</span>
                    <span>·</span>
                    <span className="font-mono">{r.action}</span>
                    {!r.success && (
                      <>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1 font-600 text-declined">
                          <AlertCircle className="h-3 w-3" /> refused {r.statusCode}
                        </span>
                      </>
                    )}
                  </p>

                  {open && (
                    <dl className="mt-2.5 grid gap-x-6 gap-y-1 rounded-md bg-paper px-3 py-2.5 text-[12px] sm:grid-cols-2">
                      <div><dt className="inline text-faint">When: </dt><dd className="inline text-ink">{new Date(r.createdAt).toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'medium' })}</dd></div>
                      <div><dt className="inline text-faint">Request: </dt><dd className="inline font-mono text-ink">{r.method} {r.path}</dd></div>
                      <div><dt className="inline text-faint">Status: </dt><dd className="inline text-ink">{r.statusCode}</dd></div>
                      <div><dt className="inline text-faint">IP: </dt><dd className="inline text-ink">{r.ipAddress || '—'}</dd></div>
                      {r.metadata && Object.keys(r.metadata).length > 0 && (
                        <div className="sm:col-span-2">
                          <dt className="text-faint">Details:</dt>
                          <dd className="mt-0.5 break-all font-mono text-[11px] text-body">{JSON.stringify(r.metadata)}</dd>
                        </div>
                      )}
                    </dl>
                  )}
                </div>

                <span className="tabular shrink-0 text-[12px] text-faint">{ago(r.createdAt)}</span>
              </button>
            );
          })}
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="inline-flex items-center gap-1.5 rounded-md border border-rule px-3 py-2 text-[13px] font-medium text-ink transition-colors hover:border-signal disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Newer
          </button>
          <span className="tabular text-[13px] text-muted">Page {page} of {pages}</span>
          <button
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page >= pages}
            className="inline-flex items-center gap-1.5 rounded-md border border-rule px-3 py-2 text-[13px] font-medium text-ink transition-colors hover:border-signal disabled:opacity-40"
          >
            Older <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
