import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/landing/navbar';
import Footer from '../components/landing/footer';
import AuthModal from '../components/landing/auth-modal';
import {
  Loader2, CalendarDays, MapPin, Wifi, Users, Clock,
  ChevronRight, AlertCircle, Lock,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatSlotDate(date: string) {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function nearestSlot(slots: any[]): any | null {
  if (!slots?.length) return null;
  const now = Date.now();
  const future = slots.filter(s => new Date(s.date).getTime() >= now);
  if (future.length) return future.reduce((a, b) => new Date(a.date) < new Date(b.date) ? a : b);
  return slots.reduce((a, b) => new Date(a.date) > new Date(b.date) ? a : b);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PublicEventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authRedirect, setAuthRedirect] = useState('/dashboard/events');
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // No token needed — endpoint now uses optionalAuth
    api.get<any>('/events?tab=all')
      .then((res: any) => { if (res.success) setEvents(res.data); })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const handleRegisterClick = (eventCode: string) => {
    if (isAuthenticated) {
      navigate(`/dashboard/events/${eventCode}`);
    } else {
      setAuthRedirect(`/dashboard/events/${eventCode}`);
      setAuthModalOpen(true);
    }
  };

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-slate-50 pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-4 md:px-6">

          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-[#041c44] mb-2">Upcoming Events</h1>
            <p className="text-slate-500 text-sm max-w-xl mx-auto">
              Workshops, seminars, and networking sessions for medical students &amp; graduates going abroad.
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <CalendarDays className="h-10 w-10 text-slate-300 mb-4" />
              <p className="text-slate-600 font-semibold mb-1">No events scheduled right now</p>
              <p className="text-slate-400 text-sm">Check back soon — new events are added regularly.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {events.map(event => (
                <PublicEventCard
                  key={event._id}
                  event={event}
                  isAuthenticated={isAuthenticated}
                  onRegister={() => handleRegisterClick(event.eventCode)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        redirectTo={authRedirect}
      />
    </>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function PublicEventCard({
  event, isAuthenticated, onRegister,
}: {
  event: any;
  isAuthenticated: boolean;
  onRegister: () => void;
}) {
  const slot = nearestSlot(event.slots ?? []);
  const seatsLeft = slot
    ? (slot.availableSeats !== undefined ? slot.availableSeats : slot.totalSeats - slot.bookedSeats)
    : null;
  const isSoldOut = seatsLeft !== null && seatsLeft <= 0;
  const isPast = slot ? new Date(slot.date) < new Date() : false;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col hover:shadow-md transition-shadow duration-200">

      {/* Banner */}
      <div className="relative aspect-video bg-slate-100 shrink-0 overflow-hidden">
        <img
          src={event.bannerUrl || `https://placehold.co/480x270/041c44/ffffff?text=${encodeURIComponent(event.eventCode)}`}
          alt={event.title}
          className="w-full h-full object-cover"
          onError={e => { e.currentTarget.src = 'https://placehold.co/480x270/041c44/ffffff?text=MCO'; }}
        />
        {/* Mode badge */}
        <span className={`absolute top-2 left-2 flex items-center gap-1 text-[12px] font-semibold px-2 py-0.5 rounded-full border ${
          event.mode === 'online'
            ? 'bg-blue-50 text-blue-700 border-blue-200'
            : 'bg-amber-50 text-amber-700 border-amber-200'
        }`}>
          {event.mode === 'online' ? <Wifi className="h-2.5 w-2.5" /> : <MapPin className="h-2.5 w-2.5" />}
          {event.mode === 'online' ? 'Online' : 'Offline'}
        </span>
        {/* Sold out overlay */}
        {isSoldOut && (
          <span className="absolute top-2 right-2 text-[12px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
            Sold out
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="text-sm font-semibold text-slate-900 line-clamp-2 leading-snug mb-2">
          {event.title}
        </h3>

        {slot && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span>{formatSlotDate(slot.date)}</span>
            <span className="text-slate-300">·</span>
            <Clock className="h-3 w-3 shrink-0 text-slate-400" />
            <span>{slot.startTime}–{slot.endTime}</span>
          </div>
        )}

        {event.mode === 'offline' && event.location && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="truncate">{event.location}</span>
          </div>
        )}

        {slot && seatsLeft !== null && (
          <div className="flex items-center gap-1.5 text-xs mb-3">
            <Users className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            {seatsLeft > 0 ? (
              <span className={seatsLeft <= 5 ? 'text-red-600 font-semibold' : 'text-slate-500'}>
                {seatsLeft} seat{seatsLeft !== 1 ? 's' : ''} left
              </span>
            ) : (
              <span className="text-red-600 font-semibold">Sold out</span>
            )}
          </div>
        )}

        {/* Multiple slots pills */}
        {event.slots?.length > 1 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {event.slots.slice(0, 3).map((s: any) => (
              <span key={s.slotId} className="text-[12px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                {formatSlotDate(s.date)} {s.startTime}
              </span>
            ))}
            {event.slots.length > 3 && (
              <span className="text-[12px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                +{event.slots.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Price */}
        <div className="flex items-baseline gap-2 mb-4 mt-auto">
          <span className="text-base font-bold text-slate-900">
            ₹{event.discountedPrice ?? event.price}
          </span>
          {event.discountedPrice && (
            <span className="text-xs text-slate-400 line-through">₹{event.price}</span>
          )}
        </div>

        {/* CTA */}
        {isPast ? (
          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 py-2.5 rounded-lg bg-slate-50 border border-slate-100">
            <AlertCircle className="h-3.5 w-3.5" /> Event has ended
          </div>
        ) : isSoldOut ? (
          <div className="flex items-center justify-center gap-1.5 text-xs text-red-500 py-2.5 rounded-lg bg-red-50 border border-red-100">
            <AlertCircle className="h-3.5 w-3.5" /> Sold out
          </div>
        ) : (
          <button
            onClick={onRegister}
            className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold py-2.5 rounded-lg bg-[#041c44] text-white hover:bg-[#031533] transition-colors"
          >
            {!isAuthenticated && <Lock className="h-3 w-3" />}
            Register Now
            {isAuthenticated && <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        )}

        {/* Hint for guests */}
        {!isAuthenticated && !isPast && !isSoldOut && (
          <p className="text-center text-[10.5px] text-slate-400 mt-1.5">
            Login required to register
          </p>
        )}
      </div>
    </div>
  );
}
