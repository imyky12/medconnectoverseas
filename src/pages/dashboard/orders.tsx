import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Check, Clock, AlertCircle, ExternalLink, ChevronRight, Copy, LifeBuoy } from 'lucide-react';
import { api } from '../../services/api';

/**
 * Money makes people anxious, so every entry leads with a plain-English
 * sentence about where things stand — not a colour-coded badge to decode — and
 * says what happens next, including when nothing is required of them.
 *
 * Two things this page has to do that a plain list does not: put the payments
 * still being checked at the top, because that is the only thing anyone opens
 * this page worried about; and let a confirmed payment lead somewhere, because
 * "Paid and confirmed" with no way through to the pass or the course is a dead
 * end exactly where the student is most ready to act.
 */

const money = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

const SUPPORT_EMAIL = 'support@medconnectsoverseas.com';

function slotLabel(order: any): string | null {
  if (order.orderType !== 'event' || !order.event || !order.slotId) return null;
  const s = order.event.slots?.find((x: any) => x.slotId === order.slotId);
  if (!s) return null;
  return `${new Date(s.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}, ${s.startTime}`;
}

/** "3 hours ago" beats a date when the question is "how long have I waited?" */
function ago(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins} minutes ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'yesterday' : `${days} days ago`;
}

const STATE = {
  approved: {
    icon: Check,
    line: 'Paid and confirmed',
    chip: 'bg-confirmed-wash text-confirmed',
    spine: 'bg-confirmed',
  },
  pending: {
    icon: Clock,
    line: 'We are checking your payment',
    chip: 'bg-holding-wash text-holding',
    spine: 'bg-holding',
  },
  rejected: {
    icon: AlertCircle,
    line: 'We could not match this payment',
    chip: 'bg-declined-wash text-declined',
    spine: 'bg-declined',
  },
} as const;

export default function UserOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    api
      .get<any>('/orders', { headers: { Authorization: `Bearer ${token}` } })
      .then((res: any) => { if (res.success) setOrders((res.data ?? []).filter(Boolean)); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Waiting first — that is what people come here anxious about. Everything
  // else stays newest-first, the order the server already returns.
  const { waiting, settled, confirmedTotal } = useMemo(() => ({
    waiting: orders.filter((o) => o.status === 'pending'),
    settled: orders.filter((o) => o.status !== 'pending'),
    confirmedTotal: orders
      .filter((o) => o.status === 'approved')
      .reduce((sum, o) => sum + (o.finalPrice ?? 0), 0),
  }), [orders]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-signal" />
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <header>
        <h1 className="font-display text-[32px] font-600 leading-tight text-ink">Payments</h1>
        <p className="mt-2 max-w-[56ch] text-[15px] leading-relaxed text-muted">
          {waiting.length > 0
            ? `We are checking ${waiting.length === 1 ? 'one payment' : `${waiting.length} payments`} right now. This usually takes an hour or two, and we will email you the moment it is done.`
            : 'Everything you have paid for, and where each payment stands.'}
        </p>
      </header>

      {orders.length === 0 ? (
        <div className="rounded-xl border border-rule bg-surface px-6 py-16 text-center">
          <p className="text-[17px] font-600 text-ink">No payments yet</p>
          <p className="mx-auto mt-2 max-w-[44ch] text-[15px] leading-relaxed text-muted">
            When you book an event or join a course, it will appear here so you can see exactly
            where it is up to.
          </p>
          <button
            onClick={() => navigate('/dashboard/events')}
            className="mt-5 rounded-lg bg-signal px-6 py-3 text-[15px] font-medium text-white transition-colors hover:bg-signal-deep"
          >
            See what&rsquo;s on
          </button>
        </div>
      ) : (
        <>
          {/* A two-line answer to "where do I stand", before any detail */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-rule bg-surface px-5 py-4">
              <p className="text-[14px] text-muted">Being checked</p>
              <p className="tabular mt-1 text-[26px] font-700 leading-none text-ink">
                {waiting.length}
              </p>
              <p className="mt-1.5 text-[13px] text-faint">
                {waiting.length === 0 ? 'Nothing waiting on us' : 'Nothing for you to do'}
              </p>
            </div>
            <div className="rounded-xl border border-rule bg-surface px-5 py-4">
              <p className="text-[14px] text-muted">Confirmed so far</p>
              <p className="tabular mt-1 text-[26px] font-700 leading-none text-ink">
                {money(confirmedTotal)}
              </p>
              <p className="mt-1.5 text-[13px] text-faint">
                Across {orders.filter((o) => o.status === 'approved').length} booking
                {orders.filter((o) => o.status === 'approved').length === 1 ? '' : 's'}
              </p>
            </div>
          </div>

          {waiting.length > 0 && (
            <section>
              <h2 className="mb-3 font-display text-[16px] font-600 text-ink">Being checked</h2>
              <div className="space-y-4">
                {waiting.map((o) => <PaymentCard key={o._id} order={o} navigate={navigate} />)}
              </div>
            </section>
          )}

          {settled.length > 0 && (
            <section>
              {waiting.length > 0 && (
                <h2 className="mb-3 font-display text-[16px] font-600 text-ink">Everything else</h2>
              )}
              <div className="space-y-4">
                {settled.map((o) => <PaymentCard key={o._id} order={o} navigate={navigate} />)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function PaymentCard({ order: o, navigate }: { order: any; navigate: (to: string) => void }) {
  const [copied, setCopied] = useState(false);
  const s = STATE[o.status as keyof typeof STATE] ?? STATE.pending;
  const Icon = s.icon;

  const isEvent = o.orderType === 'event';
  const subject = isEvent ? o.event : o.course;
  const item = subject?.title ?? 'This item is no longer available';
  const slot = slotLabel(o);
  const image = isEvent ? o.event?.bannerUrl : o.course?.thumbnail;

  // What was it worth before any discount? Only claim a saving we can see.
  const listPrice = subject?.discountedPrice ?? subject?.price;
  const saved = typeof listPrice === 'number' && listPrice > o.finalPrice ? listPrice - o.finalPrice : 0;

  // Where this payment leads once it is confirmed.
  const destination = o.status === 'approved' && subject
    ? isEvent && o.event?.eventCode
      ? { label: 'See my pass', to: `/dashboard/events/${o.event.eventCode}` }
      : !isEvent && o.course?.courseCode
        ? { label: 'Open the course', to: `/dashboard/course/${o.course.courseCode}` }
        : null
    : null;

  const slow = o.status === 'pending' && Date.now() - new Date(o.createdAt).getTime() > 24 * 3600 * 1000;

  const copyRef = () => {
    navigator.clipboard.writeText(o.transactionId ?? '');
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <article className="overflow-hidden rounded-xl border border-rule bg-surface">
      {/* status carried on the edge, so the list scans at a glance */}
      <div className="flex">
        <div className={`w-1 shrink-0 ${s.spine}`} aria-hidden />

        <div className="min-w-0 flex-1 p-5">
          <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
            <div className="flex min-w-0 flex-1 gap-4">
              {image && (
                <img
                  src={image}
                  alt=""
                  className="hidden h-16 w-24 shrink-0 rounded-lg object-cover sm:block"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              )}
              <div className="min-w-0">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-600 ${s.chip}`}>
                  <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                  {s.line}
                </span>
                <h3 className="mt-2.5 text-[17px] font-600 leading-snug text-ink">{item}</h3>
                <p className="mt-1 text-[14px] text-muted">
                  {isEvent ? 'Event' : 'Course'}
                  {slot && <> · {slot}</>}
                </p>
              </div>
            </div>

            <div className="text-right">
              <p className="tabular text-[22px] font-700 leading-none text-ink">{money(o.finalPrice)}</p>
              {saved > 0 && (
                <p className="mt-1.5 text-[13px] text-confirmed">
                  You saved {money(saved)}
                  {o.coupon?.code && <> with {o.coupon.code}</>}
                </p>
              )}
              <p className="mt-1.5 text-[13px] text-faint">
                {o.status === 'approved' ? 'Paid ' : 'Sent '}
                {ago(o.createdAt)}
              </p>
            </div>
          </div>

          {o.status === 'pending' && (
            <p className="mt-4 rounded-lg bg-paper px-4 py-3 text-[14px] leading-relaxed text-muted">
              {slow
                ? 'This is taking longer than it usually does. Nothing has gone wrong with your booking, but if you would rather not wait, get in touch and we will look at it now.'
                : 'There is nothing for you to do. We check every payment by hand and will email you as soon as yours is confirmed.'}
            </p>
          )}

          {o.status === 'rejected' && (
            <div className="mt-4 rounded-lg bg-declined-wash px-4 py-3">
              <p className="text-[14px] leading-relaxed text-ink">
                <span className="font-600">Why: </span>
                {o.rejectionReason || 'No reason was given. Get in touch and we will explain.'}
              </p>
              <p className="mt-2 text-[14px] leading-relaxed text-muted">
                If money did leave your account, your bank will return it within about a week.
                You are welcome to try again.
              </p>
              <button
                onClick={() => navigate(isEvent ? '/dashboard/events' : '/dashboard/marketplace')}
                className="mt-3 rounded-lg bg-signal px-4 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-signal-deep"
              >
                Try booking again
              </button>
            </div>
          )}

          {destination && (
            <button
              onClick={() => navigate(destination.to)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-ink px-4 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-ink/90"
            >
              {destination.label} <ChevronRight className="h-4 w-4" strokeWidth={2} />
            </button>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-rule-soft pt-3 text-[13px]">
            <span className="tabular text-faint">Reference {o.transactionId}</span>
            <button
              onClick={copyRef}
              className="inline-flex items-center gap-1 text-muted transition-colors hover:text-signal"
            >
              {copied ? <Check className="h-3 w-3" strokeWidth={2.25} /> : <Copy className="h-3 w-3" strokeWidth={1.75} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            {o.screenshotUrl && (
              <a
                href={o.screenshotUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-muted underline-offset-2 hover:text-signal hover:underline"
              >
                The screenshot you sent <ExternalLink className="h-3 w-3" strokeWidth={1.75} />
              </a>
            )}
            {(slow || o.status === 'rejected') && (
              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Payment ${o.transactionId}`)}`}
                className="inline-flex items-center gap-1 font-medium text-signal hover:text-signal-deep"
              >
                <LifeBuoy className="h-3 w-3" strokeWidth={1.75} /> Ask about this payment
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
