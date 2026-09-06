import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2, Plus, Pencil, Users, Wifi, MapPin, Eye, EyeOff, Trash2 } from 'lucide-react';
import { api } from '../../services/api';

/**
 * An admin looks at this list to answer two things: what is coming up, and how
 * full is it. So events are ordered by date with seats shown per slot, and the
 * draft/live state is carried on the spine rather than in a badge.
 *
 * Attendance lives one click away on every row, because during an event that is
 * the only screen anyone opens.
 */

const fmtDay = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

function firstSlot(slots: any[]) {
  if (!slots?.length) return null;
  return [...slots].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
}

function seatSummary(slots: any[]) {
  const total = (slots ?? []).reduce((n, s) => n + (s.totalSeats ?? 0), 0);
  const booked = (slots ?? []).reduce((n, s) => n + (s.bookedSeats ?? 0), 0);
  return { total, booked };
}

export default function AdminEvents() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const token = localStorage.getItem('adminToken');

  const load = async () => {
    try {
      const res: any = await api.get('/admin/events', { headers: { Authorization: `Bearer ${token}` } });
      if (res.success) setEvents(res.data);
    } catch (e: any) {
      setError(e.message || 'Could not load events.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const togglePublish = async (ev: any) => {
    setBusy(ev._id);
    try {
      await api.put(`/admin/events/${ev._id}`, { isPublished: !ev.isPublished }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEvents((prev) => prev.map((e) => (e._id === ev._id ? { ...e, isPublished: !e.isPublished } : e)));
    } catch (e: any) {
      setError(e.message || 'Could not change visibility.');
    } finally {
      setBusy(null);
    }
  };

  const remove = async (ev: any) => {
    const { booked } = seatSummary(ev.slots);
    const warning = booked > 0
      ? `${ev.title} has ${booked} confirmed ${booked === 1 ? 'registration' : 'registrations'}. Deleting it cancels ${booked === 1 ? 'that place' : 'those places'} and emails everyone affected. Continue?`
      : `Delete ${ev.title}? This cannot be undone.`;
    if (!window.confirm(warning)) return;
    setBusy(ev._id);
    try {
      await api.delete(`/admin/events/${ev._id}`, { headers: { Authorization: `Bearer ${token}` } });
      setEvents((prev) => prev.filter((e) => e._id !== ev._id));
    } catch (e: any) {
      setError(e.message || 'Could not delete this event.');
    } finally {
      setBusy(null);
    }
  };

  const { upcoming, past } = useMemo(() => {
    const rows = events.map((e) => ({ e, slot: firstSlot(e.slots) }));
    const now = Date.now();
    return {
      upcoming: rows
        .filter((r) => r.slot && new Date(r.slot.date).getTime() >= now - 864e5)
        .sort((a, b) => new Date(a.slot.date).getTime() - new Date(b.slot.date).getTime()),
      past: rows
        .filter((r) => !r.slot || new Date(r.slot.date).getTime() < now - 864e5)
        .sort((a, b) => new Date(b.slot?.date ?? 0).getTime() - new Date(a.slot?.date ?? 0).getTime()),
    };
  }, [events]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-signal" />
      </div>
    );
  }

  const Row = ({ e, slot }: { e: any; slot: any }) => {
    const { total, booked } = seatSummary(e.slots);
    const full = total > 0 && booked >= total;
    return (
      <div className={`spine ${e.isPublished ? 'spine-confirmed' : 'spine-past'} flex flex-wrap items-center gap-x-5 gap-y-3 py-4 pr-5`}>
        <div className="w-[104px] shrink-0">
          <p className="tabular text-[14px] font-600 text-ink">{slot ? fmtDay(new Date(slot.date)) : 'No slots'}</p>
          <p className="tabular mt-0.5 text-[12px] text-muted">{slot ? slot.startTime : '—'}</p>
        </div>

        <div className="min-w-0 flex-1">
          <Link
            to={`/admin/events/${e._id}/registrations`}
            className="block max-w-full truncate text-[15px] font-medium text-ink hover:text-signal"
          >
            {e.title}
          </Link>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
            <span className="tabular">{e.eventCode}</span>
            <span className="inline-flex items-center gap-1">
              {e.mode === 'online'
                ? <><Wifi className="h-3.5 w-3.5" strokeWidth={1.75} /> Online</>
                : <><MapPin className="h-3.5 w-3.5" strokeWidth={1.75} /> {e.location || 'Venue not set'}</>}
            </span>
            {(e.slots?.length ?? 0) > 1 && <span className="text-faint">{e.slots.length} slots</span>}
            {!e.isPublished && <span className="state state-muted">Draft</span>}
          </p>
        </div>

        <div className="w-[92px] shrink-0 text-right">
          <p className={`tabular text-[14px] font-600 ${full ? 'text-declined' : 'text-ink'}`}>
            {booked}/{total}
          </p>
          <p className="mt-0.5 text-[12px] text-faint">seats</p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Link
            to={`/admin/events/${e._id}/registrations`}
            title="Registrations and check-in"
            aria-label={`Registrations and check-in for ${e.title}`}
            className="rounded-md border border-rule p-2 text-muted transition-colors hover:border-signal hover:text-signal"
          >
            <Users className="h-4 w-4" strokeWidth={1.75} />
          </Link>
          <button
            onClick={() => navigate(`/admin/events/${e._id}/edit`)}
            title="Edit event"
            className="rounded-md border border-rule p-2 text-muted transition-colors hover:border-signal hover:text-signal"
          >
            <Pencil className="h-4 w-4" strokeWidth={1.75} />
          </button>
          <button
            onClick={() => togglePublish(e)}
            disabled={busy === e._id}
            title={e.isPublished ? 'Hide from students' : 'Publish to students'}
            className="rounded-md border border-rule p-2 text-muted transition-colors hover:border-signal hover:text-signal disabled:opacity-40"
          >
            {e.isPublished
              ? <Eye className="h-4 w-4" strokeWidth={1.75} />
              : <EyeOff className="h-4 w-4" strokeWidth={1.75} />}
          </button>
          <button
            onClick={() => remove(e)}
            disabled={busy === e._id}
            title="Delete event"
            className="rounded-md border border-rule p-2 text-muted transition-colors hover:border-declined hover:text-declined disabled:opacity-40"
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[30px] font-600 leading-tight text-ink">Events</h1>
          <p className="mt-1.5 max-w-[62ch] text-[14px] text-muted">
            Drafts are invisible to students. Publishing one puts it on the events page immediately.
          </p>
        </div>
        <button
          onClick={() => navigate('/admin/events/new')}
          className="inline-flex shrink-0 items-center gap-2 rounded-md bg-signal px-4 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-signal-deep"
        >
          <Plus className="h-4 w-4" strokeWidth={2} /> New event
        </button>
      </header>

      {error && <p className="text-[13px] text-declined">{error}</p>}

      {events.length === 0 ? (
        <div className="panel px-6 py-16 text-center">
          <p className="text-[15px] font-medium text-ink">No events yet</p>
          <p className="mx-auto mt-1.5 max-w-[44ch] text-[13px] text-muted">
            Create one, add its time slots and seat limits, then publish it when you are ready.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {upcoming.length > 0 && (
            <section>
              <h2 className="mb-1 font-display text-[15px] font-600 text-muted">Coming up</h2>
              <div className="panel divide-y divide-rule-soft">
                {upcoming.map(({ e, slot }) => <Row key={e._id} e={e} slot={slot} />)}
              </div>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <h2 className="mb-1 font-display text-[15px] font-600 text-muted">Finished</h2>
              <div className="panel divide-y divide-rule-soft">
                {past.map(({ e, slot }) => <Row key={e._id} e={e} slot={slot} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
