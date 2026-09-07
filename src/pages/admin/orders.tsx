import { useEffect, useMemo, useState } from 'react';
import { Loader2, X, ImageOff, ExternalLink } from 'lucide-react';
import { api } from '../../services/api';

/**
 * Verifying a payment means holding a UTR next to a screenshot and deciding.
 * The screenshot used to sit behind a modal, so the slowest part of the job was
 * hidden — it now rides in the row as a thumbnail, and the review panel opens
 * with the full image.
 *
 * The list defaults to Pending and sorts oldest first: this is a queue, and the
 * person who has waited longest is the one to serve next.
 */

interface OrderType {
  _id: string;
  orderType: 'course' | 'event';
  user: { firstName?: string; lastName?: string; email?: string; mobile?: string } | null;
  course?: { title?: string } | null;
  event?: { title?: string; eventCode?: string; slots?: any[] } | null;
  slotId?: string;
  finalPrice: number;
  transactionId: string;
  screenshotUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  createdAt: string;
}

const money = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

const spineFor = (s: OrderType['status']) =>
  s === 'approved' ? 'spine-confirmed' : s === 'rejected' ? 'spine-declined' : 'spine-holding';

const stateFor = (s: OrderType['status']) =>
  s === 'approved' ? 'state-confirmed' : s === 'rejected' ? 'state-declined' : 'state-holding';

function waited(iso: string): string {
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600e3);
  if (h < 1) return 'just now';
  if (h < 24) return `waiting ${h}h`;
  return `waiting ${Math.floor(h / 24)}d`;
}

function slotLabel(o: OrderType): string | null {
  if (o.orderType !== 'event' || !o.event?.slots || !o.slotId) return null;
  const s = o.event.slots.find((x: any) => x.slotId === o.slotId);
  if (!s) return null;
  const d = new Date(s.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return `${d}, ${s.startTime}–${s.endTime}`;
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<OrderType[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [open, setOpen] = useState<OrderType | null>(null);
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [type, setType] = useState<'all' | 'course' | 'event'>('all');
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const res: any = await api.get('/admin/orders', { headers: { Authorization: `Bearer ${token}` } });
      if (res.success) setOrders(res.data);
      else setError(res.message || 'Could not load payments.');
    } catch (e: any) {
      setError(e.message || 'Could not load payments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const decide = async (id: string, next: 'approved' | 'rejected') => {
    if (next === 'rejected' && !reason.trim()) return;
    setBusyId(id);
    try {
      const token = localStorage.getItem('adminToken');
      const res: any = await api.patch(
        `/admin/orders/${id}/status`,
        { status: next, rejectionReason: reason },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.success) { setOpen(null); setReason(''); await load(); }
      else setError(res.message);
    } catch (e: any) {
      setError(e.message || 'Could not update this payment.');
    } finally {
      setBusyId(null);
    }
  };

  const counts = useMemo(() => ({
    pending: orders.filter((o) => o.status === 'pending').length,
    approved: orders.filter((o) => o.status === 'approved').length,
    rejected: orders.filter((o) => o.status === 'rejected').length,
    all: orders.length,
  }), [orders]);

  const rows = useMemo(() => {
    const list = orders
      .filter((o) => status === 'all' || o.status === status)
      .filter((o) => type === 'all' || o.orderType === type);
    // Pending is a queue — oldest first. Everything else reads newest first.
    return list.sort((a, b) =>
      status === 'pending'
        ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [orders, status, type]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-signal" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-[30px] font-600 leading-tight text-ink">Payments</h1>
        <p className="mt-1.5 max-w-[62ch] text-[14px] text-muted">
          Check the reference against the screenshot, then approve or decline. Approving an event
          payment confirms the seat and sends the entry pass.
        </p>
      </header>

      {/* Filters — status is the queue, type narrows it */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-rule pb-4">
        <div className="flex flex-wrap items-center gap-1">
          {(['pending', 'approved', 'rejected', 'all'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={[
                'rounded-md px-3 py-1.5 text-[13px] transition-colors',
                status === s ? 'bg-ink font-medium text-white' : 'text-muted hover:bg-rule-soft hover:text-ink',
              ].join(' ')}
            >
              {s === 'all' ? 'Everything' : s.charAt(0).toUpperCase() + s.slice(1)}
              <span className="tabular ml-1.5 opacity-60">{counts[s]}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {(['all', 'course', 'event'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={[
                'rounded-md px-3 py-1.5 text-[13px] transition-colors',
                type === t ? 'bg-rule-soft font-medium text-ink' : 'text-muted hover:text-ink',
              ].join(' ')}
            >
              {t === 'all' ? 'All types' : t === 'course' ? 'Courses' : 'Events'}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-[13px] text-declined">{error}</p>}

      {rows.length === 0 ? (
        <div className="panel px-6 py-14 text-center">
          <p className="text-[15px] font-medium text-ink">
            {status === 'pending' ? 'No payments waiting' : 'Nothing here'}
          </p>
          <p className="mx-auto mt-1.5 max-w-[42ch] text-[13px] text-muted">
            {status === 'pending'
              ? 'Every payment has been reviewed. New submissions appear here as students pay.'
              : 'Try a different filter.'}
          </p>
        </div>
      ) : (
        <div className="panel divide-y divide-rule-soft">
          {rows.map((o) => {
            const who = [o.user?.firstName, o.user?.lastName].filter(Boolean).join(' ');
            const item = o.event?.title ?? o.course?.title ?? 'Item no longer available';
            const slot = slotLabel(o);
            return (
              <div key={o._id} className={`spine ${spineFor(o.status)} flex items-center gap-4 py-4 pr-5`}>
                {/* screenshot — the thing you actually check */}
                <a
                  href={o.screenshotUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="relative hidden h-12 w-12 shrink-0 overflow-hidden rounded border border-rule bg-paper sm:block"
                  title="Open payment screenshot"
                >
                  <ImageOff
                    className="absolute inset-0 m-auto h-4 w-4 text-faint"
                    strokeWidth={1.5}
                    aria-hidden
                  />
                  <img
                    src={o.screenshotUrl}
                    alt=""
                    className="relative h-full w-full object-cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
                  />
                </a>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium text-ink">
                    {who || o.user?.email || 'Deleted user'}
                  </p>
                  <p className="mt-0.5 truncate text-[13px] text-muted">
                    {item}
                    {slot && <span className="text-faint"> — {slot}</span>}
                  </p>
                </div>

                <p className="tabular hidden shrink-0 text-[12px] text-faint md:block">{o.transactionId}</p>

                <p className="tabular w-20 shrink-0 text-right text-[15px] font-600 text-ink">
                  {money(o.finalPrice)}
                </p>

                <p className={`w-24 shrink-0 text-right text-[12px] ${o.status === 'pending' ? 'text-holding' : 'text-faint'}`}>
                  {o.status === 'pending'
                    ? waited(o.createdAt)
                    : new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </p>

                {o.status === 'pending' ? (
                  <button
                    onClick={() => { setOpen(o); setReason(''); }}
                    className="shrink-0 rounded-md bg-signal px-3.5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-signal-deep"
                  >
                    Review
                  </button>
                ) : (
                  <span className={`state ${stateFor(o.status)} w-[74px] shrink-0 text-right`}>
                    {o.status === 'approved' ? 'Approved' : 'Declined'}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {open && (
        <ReviewPanel
          order={open}
          reason={reason}
          setReason={setReason}
          busy={busyId === open._id}
          onClose={() => { setOpen(null); setReason(''); }}
          onDecide={(next) => decide(open._id, next)}
        />
      )}
    </div>
  );
}

function ReviewPanel({
  order, reason, setReason, busy, onClose, onDecide,
}: {
  order: OrderType;
  reason: string;
  setReason: (v: string) => void;
  busy: boolean;
  onClose: () => void;
  onDecide: (next: 'approved' | 'rejected') => void;
}) {
  const who = [order.user?.firstName, order.user?.lastName].filter(Boolean).join(' ');
  const item = order.event?.title ?? order.course?.title ?? 'Item no longer available';
  const slot = slotLabel(order);

  const facts: [string, string][] = [
    ['Student', who || order.user?.email || 'Deleted user'],
    ['Email', order.user?.email ?? '—'],
    ...(order.user?.mobile ? ([['Mobile', order.user.mobile]] as [string, string][]) : []),
    [order.orderType === 'event' ? 'Event' : 'Course', item],
    ...(slot ? ([['Slot', slot]] as [string, string][]) : []),
    ['Amount', money(order.finalPrice)],
    ['Reference', order.transactionId],
    ['Submitted', new Date(order.createdAt).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-6" onClick={onClose}>
      <div
        className="max-h-[92vh] w-full max-w-[880px] overflow-y-auto rounded-t-xl bg-surface sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Review payment"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-rule bg-surface px-6 py-4">
          <h2 className="font-display text-[18px] font-600 text-ink">Review payment</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1.5 text-muted hover:bg-paper hover:text-ink">
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>

        <div className="grid gap-6 p-6 md:grid-cols-[1.1fr_1fr]">
          {/* the screenshot, at a size you can actually read a UTR from */}
          <div>
            <p className="mb-2 text-[13px] text-muted">Payment screenshot</p>
            <a
              href={order.screenshotUrl}
              target="_blank"
              rel="noreferrer"
              className="group relative block overflow-hidden rounded-lg border border-rule bg-paper"
            >
              <img
                src={order.screenshotUrl}
                alt="Payment screenshot submitted by the student"
                className="max-h-[420px] w-full object-contain"
                onError={(e) => {
                  const el = e.currentTarget as HTMLImageElement;
                  el.style.display = 'none';
                  el.parentElement?.querySelector('[data-fallback]')?.classList.remove('hidden');
                }}
              />
              <div data-fallback className="hidden flex-col items-center gap-2 px-6 py-16 text-center">
                <ImageOff className="h-6 w-6 text-faint" strokeWidth={1.5} />
                <p className="text-[13px] text-muted">This screenshot could not be loaded.</p>
              </div>
              <span className="absolute right-2 top-2 flex items-center gap-1 rounded bg-ink/80 px-2 py-1 text-[11px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                <ExternalLink className="h-3 w-3" /> Open full size
              </span>
            </a>
          </div>

          <div>
            <dl className="divide-y divide-rule-soft">
              {facts.map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-4 py-2.5">
                  <dt className="shrink-0 text-[13px] text-muted">{k}</dt>
                  <dd className={`text-right text-[13px] text-ink ${k === 'Reference' || k === 'Amount' ? 'tabular font-600' : ''}`}>{v}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-6">
              <label htmlFor="reason" className="block text-[13px] text-muted">
                Reason — required to decline
              </label>
              <textarea
                id="reason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="The reference does not match any payment we received."
                className="mt-1.5 w-full resize-none rounded-md border border-rule bg-surface px-3 py-2 text-[14px] text-ink placeholder:text-faint focus:border-signal focus:outline-none"
              />
              <p className="mt-1.5 text-[12px] text-faint">The student sees this word for word.</p>
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <button
                disabled={busy}
                onClick={() => onDecide('approved')}
                className="flex-1 rounded-md bg-signal px-4 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-signal-deep disabled:opacity-50"
              >
                {busy ? 'Working…' : 'Approve payment'}
              </button>
              <button
                disabled={busy || !reason.trim()}
                onClick={() => onDecide('rejected')}
                className="rounded-md border border-rule px-4 py-2.5 text-[14px] font-medium text-declined transition-colors hover:border-declined hover:bg-declined-wash disabled:opacity-40"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
