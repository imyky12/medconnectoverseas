import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, ArrowRight } from 'lucide-react';
import { api } from '../../services/api';

/**
 * The admin's job is a queue: payments are verified by hand, and nothing
 * happens for the student until someone decides. So the page opens with what
 * is waiting, oldest first — not with revenue.
 *
 * Figures come second and are set as a plain row of numbers on a rule rather
 * than four identical cards, because they are context, not the task.
 */

interface Stats {
  totalUsers: number;
  activeCourses: number;
  activeCoupons: number;
  totalRevenue: number;
}

interface Order {
  _id: string;
  orderType: 'course' | 'event';
  finalPrice: number;
  createdAt: string;
  user?: { firstName?: string; lastName?: string; email?: string } | null;
  course?: { title?: string } | null;
  event?: { title?: string; eventCode?: string } | null;
}

interface EventRow {
  _id: string;
  title: string;
  eventCode: string;
  isPublished: boolean;
  slots?: { date: string; startTime: string; totalSeats: number; bookedSeats: number }[];
}

const money = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

function waitingFor(iso: string): string {
  const hours = Math.floor((Date.now() - new Date(iso).getTime()) / 3600e3);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function nextSlot(ev: EventRow) {
  const future = (ev.slots ?? [])
    .map((s) => {
      const [h, m] = (s.startTime || '00:00').split(':').map(Number);
      const d = new Date(s.date);
      d.setHours(h, m, 0, 0);
      return { ...s, at: d };
    })
    .sort((a, b) => a.at.getTime() - b.at.getTime());
  return future.find((s) => s.at.getTime() >= Date.now()) ?? future[future.length - 1];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [pending, setPending] = useState<Order[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    const auth = { headers: { Authorization: `Bearer ${token}` } };
    Promise.allSettled([
      api.get<any>('/admin/dashboard', auth),
      api.get<any>('/admin/orders?status=pending', auth),
      api.get<any>('/admin/events', auth),
    ])
      .then(([s, o, e]) => {
        if (s.status === 'fulfilled' && s.value?.success) setStats(s.value.data);
        else setError('Could not load the figures.');
        if (o.status === 'fulfilled') setPending(o.value?.data ?? []);
        if (e.status === 'fulfilled') setEvents(e.value?.data ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-signal" />
      </div>
    );
  }

  const oldest = [...pending].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  const upcoming = events
    .filter((e) => e.isPublished)
    .map((e) => ({ ev: e, slot: nextSlot(e) }))
    .filter((x) => x.slot && new Date(x.slot.at).getTime() >= Date.now())
    .sort((a, b) => a.slot!.at.getTime() - b.slot!.at.getTime())
    .slice(0, 4);

  return (
    <div className="space-y-12">
      <header>
        <h1 className="font-display text-[30px] font-600 leading-tight text-ink">Overview</h1>
        <p className="mt-1.5 max-w-[60ch] text-[14px] text-muted">
          Payments are verified by hand. Until you approve one, the student has no seat and no
          course access.
        </p>
      </header>

      {/* ── The queue ─────────────────────────────────────────────────────── */}
      <section>
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <h2 className="font-display text-[19px] font-600 text-ink">
            {oldest.length > 0 ? 'Waiting on you' : 'Nothing waiting'}
          </h2>
          {oldest.length > 4 && (
            <Link
              to="/admin/orders"
              className="text-[13px] font-medium text-signal hover:text-signal-deep"
            >
              See all {oldest.length}
            </Link>
          )}
        </div>

        {oldest.length === 0 ? (
          <div className="panel px-6 py-10 text-center">
            <p className="text-[14px] text-muted">
              Every payment has been reviewed. New ones will appear here.
            </p>
          </div>
        ) : (
          <div className="panel divide-y divide-rule-soft">
            {oldest.slice(0, 5).map((o) => {
              const who = [o.user?.firstName, o.user?.lastName].filter(Boolean).join(' ');
              // The item can be missing if the event or course was deleted after
              // the order was placed — say so rather than showing a bare label.
              const item =
                o.event?.title ?? o.course?.title ?? 'item no longer available';
              return (
                <Link
                  key={o._id}
                  to="/admin/orders"
                  className="spine spine-holding flex items-center gap-4 py-4 pr-5 transition-colors hover:bg-paper/60"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-ink">
                      {who || o.user?.email || 'Deleted user'}
                    </p>
                    <p className="mt-0.5 truncate text-[13px] text-muted">
                      {o.orderType === 'event' ? 'Event' : 'Course'} — {item}
                    </p>
                  </div>
                  <p className="tabular shrink-0 text-[15px] font-600 text-ink">
                    {money(o.finalPrice)}
                  </p>
                  <p className="tabular w-14 shrink-0 text-right text-[13px] text-holding">
                    {waitingFor(o.createdAt)}
                  </p>
                  <ArrowRight className="h-4 w-4 shrink-0 text-faint" strokeWidth={1.75} />
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Figures ───────────────────────────────────────────────────────── */}
      {stats && (
        <section>
          <h2 className="mb-4 font-display text-[19px] font-600 text-ink">The numbers</h2>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-6 border-t border-rule pt-6 sm:grid-cols-4">
            {[
              { label: 'Earned', value: money(stats.totalRevenue), note: 'approved payments only' },
              { label: 'Students', value: String(stats.totalUsers), note: 'completed sign-up' },
              { label: 'Courses live', value: String(stats.activeCourses), note: 'visible to students' },
              { label: 'Coupons live', value: String(stats.activeCoupons), note: 'currently redeemable' },
            ].map((f) => (
              <div key={f.label}>
                <dt className="text-[13px] text-muted">{f.label}</dt>
                <dd className="tabular mt-1 text-[26px] font-600 leading-none text-ink">{f.value}</dd>
                <p className="mt-1.5 text-[12px] text-faint">{f.note}</p>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* ── Events ────────────────────────────────────────────────────────── */}
      <section>
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <h2 className="font-display text-[19px] font-600 text-ink">Coming up</h2>
          <Link to="/admin/events" className="text-[13px] font-medium text-signal hover:text-signal-deep">
            All events
          </Link>
        </div>

        {upcoming.length === 0 ? (
          <div className="panel px-6 py-10 text-center">
            <p className="text-[14px] text-muted">No published events are scheduled.</p>
            <Link
              to="/admin/events/new"
              className="mt-3 inline-block text-[14px] font-medium text-signal hover:text-signal-deep"
            >
              Create an event
            </Link>
          </div>
        ) : (
          <div className="panel divide-y divide-rule-soft">
            {upcoming.map(({ ev, slot }) => {
              const filled = slot!.bookedSeats;
              const total = slot!.totalSeats;
              const full = filled >= total;
              return (
                <Link
                  key={ev._id}
                  to={`/admin/events/${ev._id}/registrations`}
                  className="flex items-center gap-5 px-5 py-4 transition-colors hover:bg-paper/60"
                >
                  <div className="w-[70px] shrink-0">
                    <p className="tabular text-[20px] font-600 leading-none text-ink">
                      {slot!.at.getDate()}
                    </p>
                    <p className="mt-1 text-[12px] text-muted">
                      {slot!.at.toLocaleDateString('en-IN', { month: 'short' })}
                    </p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-ink">{ev.title}</p>
                    <p className="mt-0.5 text-[13px] text-muted">
                      {slot!.startTime} · {ev.eventCode}
                    </p>
                  </div>
                  <p className={`tabular shrink-0 text-[13px] ${full ? 'text-declined' : 'text-muted'}`}>
                    {filled}/{total} seats{full ? ' · full' : ''}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {error && <p className="text-[13px] text-declined">{error}</p>}
    </div>
  );
}
