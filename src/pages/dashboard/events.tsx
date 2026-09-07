import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, QrCode, X, MapPin, Wifi, Clock, Users } from 'lucide-react';
import { api } from '../../services/api';
import EventPass from '../../components/dashboard/EventPass';
import { useAuth } from '../../context/AuthContext';

/**
 * Written for a medical student on a phone, not for an operator at a desk.
 *
 * That means: the picture stays (it is how you recognise an event and it makes
 * the page feel like somewhere worth being), the description is shown rather
 * than hidden behind a click, and every card answers the three questions a
 * student actually has — what is it, can I still get in, and what do I do next.
 */

type Tab = 'all' | 'upcoming' | 'previous';

const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'Browse events' },
  { key: 'upcoming', label: "I'm going" },
  { key: 'previous', label: 'Been to' },
];

/**
 * When a slot actually starts — date *and* time.
 *
 * Comparing `date` alone made every slot on the same day compare equal, so the
 * reducer below kept whichever came last in the array. An event with 10:00 and
 * 15:00 on one day showed the 15:00 slot, and its seat count with it. Same-day
 * multi-slot events are the normal case here, not an edge case.
 */
function slotStart(slot: any): number {
  const [h, m] = String(slot?.startTime ?? '00:00').split(':').map(Number);
  const at = new Date(slot.date);
  at.setHours(h || 0, m || 0, 0, 0);
  return at.getTime();
}

function nearestSlot(slots: any[]): any | null {
  if (!slots?.length) return null;
  const now = Date.now();
  const future = slots.filter((s) => slotStart(s) >= now);
  if (future.length) return future.reduce((a, b) => (slotStart(a) <= slotStart(b) ? a : b));
  return slots.reduce((a, b) => (slotStart(a) >= slotStart(b) ? a : b));
}

/** Seats free right now, across every slot that has not yet started. */
function seatsAcrossUpcomingSlots(slots: any[]): number {
  const now = Date.now();
  return (slots ?? [])
    .filter((s) => slotStart(s) >= now)
    .reduce((sum, s) => {
      const free = s.availableSeats !== undefined ? s.availableSeats : s.totalSeats - s.bookedSeats;
      return sum + Math.max(0, free ?? 0);
    }, 0);
}

export default function EventsPage() {
  const [tab, setTab] = useState<Tab>('all');
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrEvent, setQrEvent] = useState<any | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    const token = localStorage.getItem('accessToken');
    api
      .get<any>(`/events?tab=${tab}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res: any) => { if (res.success) setEvents((res.data ?? []).filter(Boolean)); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [tab]);

  const rows = useMemo(
    () =>
      events
        .map((e) => ({ e, slot: nearestSlot(e.slots ?? []) }))
        .filter((x) => x.slot)
        .sort((a, b) => slotStart(a.slot) - slotStart(b.slot)),
    [events],
  );

  return (
    <div className="space-y-7">
      <header>
        <h1 className="font-display text-[32px] font-600 leading-tight text-ink">Events</h1>
        <p className="mt-2 max-w-[54ch] text-[15px] leading-relaxed text-muted">
          Workshops, masterclasses and free webinars run by doctors who have been through the same
          exams you are preparing for.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={[
              'rounded-full px-4 py-2 text-[14px] transition-colors',
              tab === t.key
                ? 'bg-ink font-medium text-white'
                : 'border border-rule bg-surface text-muted hover:border-ink hover:text-ink',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-signal" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState tab={tab} onBrowse={() => setTab('all')} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {rows.map(({ e, slot }) => (
            <EventCard
              key={e._id}
              event={e}
              slot={slot}
              onOpen={() => navigate(`/dashboard/events/${e.eventCode}`)}
              onShowPass={() => setQrEvent(e)}
            />
          ))}
        </div>
      )}

      {qrEvent && <PassModal event={qrEvent} onClose={() => setQrEvent(null)} />}
    </div>
  );
}

function EventCard({
  event, slot, onOpen, onShowPass,
}: {
  event: any; slot: any; onOpen: () => void; onShowPass: () => void;
}) {
  const date = new Date(slot.date);
  const reg: 'pending' | 'approved' | null = event.registrationStatus ?? null;
  const seats = slot.availableSeats !== undefined ? slot.availableSeats : slot.totalSeats - slot.bookedSeats;
  const isPast = slotStart(slot) < Date.now();
  const price = event.discountedPrice ?? event.price;
  const free = price === 0;

  // Counted across every upcoming slot, not just the one on show. Reporting the
  // first slot's seats alone said "1 seat left" for an event with three free
  // across two sittings — false urgency, and it hides the other sitting
  // entirely. The rule is that seat availability must never mislead.
  const upcomingSlots = (event.slots ?? []).filter((sl: any) => slotStart(sl) >= Date.now());
  const seatsAll = seatsAcrossUpcomingSlots(event.slots ?? []);
  const multiSlot = upcomingSlots.length > 1;

  // Say the seat situation the way a person would.
  const seatLine = multiSlot
    ? (seatsAll <= 0
        ? 'Fully booked'
        : `${seatsAll} ${seatsAll === 1 ? 'seat' : 'seats'} left across ${upcomingSlots.length} sittings`)
    : seats <= 0 ? 'Fully booked'
    : seats === 1 ? 'Last seat'
    : seats <= 5 ? `Only ${seats} seats left`
    : `${seats} seats left`;

  // Colour and the call to action follow whichever count is on show.
  const seatsShown = multiSlot ? seatsAll : seats;

  return (
    <article className="overflow-hidden rounded-xl border border-rule bg-surface transition-shadow hover:shadow-[0_2px_16px_rgba(7,26,51,0.08)]">
      {/* The picture — how you recognise an event at a glance */}
      <button onClick={onOpen} className="relative block aspect-[16/7] w-full overflow-hidden bg-paper text-left">
        {event.bannerUrl ? (
          <img
            src={event.bannerUrl}
            alt=""
            className="h-full w-full object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
          />
        ) : null}

        {/* date, sitting on the image */}
        <span className="absolute left-4 top-4 flex flex-col items-center rounded-lg bg-surface px-3 py-2 shadow-sm">
          <span className="tabular text-[20px] font-700 leading-none text-ink">{date.getDate()}</span>
          <span className="mt-0.5 text-[11px] font-medium text-muted">
            {date.toLocaleDateString('en-IN', { month: 'short' })}
          </span>
        </span>

        {reg === 'approved' && (
          <span className="absolute right-4 top-4 rounded-full bg-confirmed px-3 py-1.5 text-[12px] font-600 text-white">
            You&rsquo;re going
          </span>
        )}
        {reg === 'pending' && (
          <span className="absolute right-4 top-4 rounded-full bg-holding px-3 py-1.5 text-[12px] font-600 text-white">
            Checking your payment
          </span>
        )}
      </button>

      <div className="p-5">
        <button onClick={onOpen} className="block text-left">
          <h2 className="text-[18px] font-600 leading-snug text-ink hover:text-signal">{event.title}</h2>
        </button>

        {event.shortDescription && (
          <p className="mt-2 line-clamp-2 text-[14px] leading-relaxed text-muted">{event.shortDescription}</p>
        )}

        <div className="mt-4 space-y-1.5 text-[14px] text-muted">
          <p className="flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0 text-faint" strokeWidth={1.75} />
            {date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}, {slot.startTime}–{slot.endTime}
          </p>
          <p className="flex items-center gap-2">
            {event.mode === 'online'
              ? <><Wifi className="h-4 w-4 shrink-0 text-faint" strokeWidth={1.75} /> Online — join from anywhere</>
              : <><MapPin className="h-4 w-4 shrink-0 text-faint" strokeWidth={1.75} /> {event.location || 'Venue announced soon'}</>}
          </p>
          {!isPast && !reg && (
            <p className={`flex items-center gap-2 ${seatsShown <= 0 ? 'text-declined' : seatsShown <= 5 ? 'text-holding' : ''}`}>
              <Users className="h-4 w-4 shrink-0 text-faint" strokeWidth={1.75} />
              {seatLine}
            </p>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between gap-4 border-t border-rule-soft pt-4">
          <div>
            <p className="tabular text-[20px] font-700 leading-none text-ink">
              {free ? 'Free' : `₹${price.toLocaleString('en-IN')}`}
            </p>
            {!free && event.discountedPrice != null && event.discountedPrice < event.price && (
              <p className="tabular mt-1 text-[13px] text-faint line-through">
                ₹{event.price.toLocaleString('en-IN')}
              </p>
            )}
          </div>

          {reg === 'approved' ? (
            <button
              onClick={onShowPass}
              className="inline-flex items-center gap-2 rounded-lg bg-ink px-5 py-3 text-[15px] font-medium text-white transition-colors hover:bg-ink/90"
            >
              <QrCode className="h-4 w-4" strokeWidth={1.75} /> My pass
            </button>
          ) : reg === 'pending' ? (
            <button
              onClick={onOpen}
              className="rounded-lg border border-rule px-5 py-3 text-[15px] font-medium text-ink transition-colors hover:border-ink"
            >
              See details
            </button>
          ) : isPast ? (
            <span className="text-[14px] text-faint">Finished</span>
          ) : (
            <button
              onClick={onOpen}
              className="rounded-lg bg-signal px-6 py-3 text-[15px] font-medium text-white transition-colors hover:bg-signal-deep"
            >
              {seatsShown <= 0 ? 'See details' : 'Book a place'}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function EmptyState({ tab, onBrowse }: { tab: Tab; onBrowse: () => void }) {
  const copy = {
    all: {
      title: 'No events open just now',
      body: 'New workshops and webinars go up regularly. Have a look again in a few days.',
    },
    upcoming: {
      title: "You haven't booked anything yet",
      body: 'Once you book a place and we have checked your payment, it shows up here along with the pass you show at the door.',
    },
    previous: {
      title: 'Nothing here yet',
      body: 'Events you have been to appear here, with your certificate to download.',
    },
  }[tab];

  return (
    <div className="rounded-xl border border-rule bg-surface px-6 py-16 text-center">
      <p className="text-[17px] font-600 text-ink">{copy.title}</p>
      <p className="mx-auto mt-2 max-w-[44ch] text-[15px] leading-relaxed text-muted">{copy.body}</p>
      {tab !== 'all' && (
        <button
          onClick={onBrowse}
          className="mt-5 rounded-lg bg-signal px-5 py-3 text-[15px] font-medium text-white transition-colors hover:bg-signal-deep"
        >
          See what&rsquo;s on
        </button>
      )}
    </div>
  );
}

function PassModal({ event, onClose }: { event: any; onClose: () => void }) {
  const { user } = useAuth();
  const slot = event.slots?.find((s: any) => s.slotId === event.myRegistration?.slotId);
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Attendee';

  // The card already carries the event name, date, time, code and attendee, so
  // the sheet adds no header of its own — it would just say it all twice.
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-ink/70 p-0 sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[468px] rounded-t-2xl bg-surface px-6 pb-7 pt-14 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Your entry pass for ${event.title}`}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-lg p-2 text-muted transition-colors hover:bg-paper hover:text-ink"
        >
          <X className="h-5 w-5" strokeWidth={1.75} />
        </button>

        <EventPass
          qrImage={event.myRegistration?.qrCodeImage}
          userName={name}
          eventTitle={event.title}
          eventCode={event.eventCode}
          slotDate={slot ? new Date(slot.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : undefined}
          slotTime={slot ? `${slot.startTime} – ${slot.endTime}` : undefined}
        />
      </div>
    </div>
  );
}
