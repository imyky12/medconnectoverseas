import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { useAuth } from '../../context/AuthContext';
import {
  Loader2, AlertCircle, ChevronRight, MapPin, Wifi, CalendarDays,
  Clock, Users, Tag, X, CheckCircle, ExternalLink, Info,
  Award, FileText, Download,
} from 'lucide-react';
import CertificateTemplate from '../../components/dashboard/CertificateTemplate';
import EventPass from '../../components/dashboard/EventPass';
import BookingSheet from '../../components/dashboard/BookingSheet';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function isSlotOngoing(slot: any): boolean {
  const slotDate = new Date(slot.date);
  const now = new Date();
  const sameDay =
    slotDate.getFullYear() === now.getFullYear() &&
    slotDate.getMonth() === now.getMonth() &&
    slotDate.getDate() === now.getDate();
  if (!sameDay) return false;
  const [sh, sm] = slot.startTime.split(':').map(Number);
  const [eh, em] = slot.endTime.split(':').map(Number);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return nowMin >= sh * 60 + sm && nowMin <= eh * 60 + em;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EventDetail() {
  const { eventCode } = useParams<{ eventCode: string }>();
  const navigate = useNavigate();
  const token = localStorage.getItem('accessToken');
  const { user } = useAuth();

  const [event, setEvent] = useState<any>(null);
  const [paymentSettings, setPaymentSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Slot selection
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');

  // Enrollment panel / coupon
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [finalPrice, setFinalPrice] = useState<number | null>(null);

  // Certificate
  const certRef = useRef<HTMLDivElement>(null);
  const [certDownloading, setCertDownloading] = useState(false);
  const [notesLoading, setNotesLoading] = useState(false);

  // QR card

  // Payment modal
  const [showCheckout, setShowCheckout] = useState(false);
  const [transactionId, setTransactionId] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get<any>(`/events/${eventCode}`, { headers: { Authorization: `Bearer ${token}` } }),
      api.get<any>('/payment-settings'),
    ]).then(([evRes, payRes]) => {
      if ((evRes as any).success) {
        const ev = (evRes as any).data;
        setEvent(ev);
        setFinalPrice(ev.discountedPrice ?? ev.price);
        // Pre-select first slot
        if (ev.slots?.length) setSelectedSlotId(ev.slots[0].slotId);
      } else {
        setError('Event not found.');
      }
      if ((payRes as any).success) setPaymentSettings((payRes as any).data);
    }).catch(() => setError('Failed to load event.')).finally(() => setIsLoading(false));
  }, [eventCode]);

  const selectedSlot = event?.slots?.find((s: any) => s.slotId === selectedSlotId) ?? null;

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError('');
    try {
      const res: any = await api.post('/events/validate-coupon', {
        couponCode: couponCode.toUpperCase(),
        eventId: event._id,
      }, { headers: { Authorization: `Bearer ${token}` } });
      if (res.success) {
        setAppliedCoupon(res.data.coupon);
        setFinalPrice(res.data.finalPrice);
      } else {
        setCouponError(res.message || 'Invalid coupon.');
      }
    } catch (e: any) {
      setCouponError(e?.message || 'Failed to apply coupon.');
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
    setFinalPrice(event.discountedPrice ?? event.price);
  };

  const handleSubmitRegistration = async () => {
    if (!transactionId.trim() || !screenshotUrl.trim()) {
      setSubmitError('Please fill in both the transaction ID and screenshot URL.');
      return;
    }
    setIsSubmitting(true);
    setSubmitError('');
    try {
      const res: any = await api.post('/events/register', {
        eventId: event._id,
        slotId: selectedSlotId,
        transactionId: transactionId.trim(),
        screenshotUrl: screenshotUrl.trim(),
        couponCode: appliedCoupon?.code,
      }, { headers: { Authorization: `Bearer ${token}` } });
      if (res.success) {
        setSubmitSuccess(true);
      } else {
        setSubmitError(res.message || 'Failed to submit registration.');
      }
    } catch (e: any) {
      setSubmitError(e?.message || 'Submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-80">
      <Loader2 className="h-8 w-8 animate-spin text-ink" />
    </div>
  );

  if (error || !event) return (
    <div className="flex flex-col items-center justify-center h-80 gap-3">
      <AlertCircle className="h-10 w-10 text-red-400" />
      <p className="text-base font-semibold text-body">{error || 'Event unavailable'}</p>
      <button onClick={() => navigate('/dashboard/events')} className="text-sm text-ink hover:underline">
        Back to Events
      </button>
    </div>
  );

  const basePrice = event.discountedPrice ?? event.price;
  const isRegistered: boolean = event.isRegistered;
  const regStatus: 'pending' | 'approved' | null = event.registrationStatus ?? null;
  const myReg = event.myRegistration;
  const canAccessPostEvent = regStatus === 'approved' && myReg?.attended === true;

  const recordDownload = async (type: 'certificate' | 'notes') => {
    try {
      await api.post(
        `/events/${eventCode}/record-download`,
        { type },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (_) {}
  };

  const downloadCertPng = async () => {
    if (!certRef.current) return;
    setCertDownloading(true);
    try {
      const dataUrl = await toPng(certRef.current, { pixelRatio: 2 });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `certificate-${event.eventCode}.png`;
      a.click();
      await recordDownload('certificate');
    } finally {
      setCertDownloading(false);
    }
  };

  const downloadCertPdf = async () => {
    if (!certRef.current) return;
    setCertDownloading(true);
    try {
      const dataUrl = await toPng(certRef.current, { pixelRatio: 2 });
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [1122, 794] });
      pdf.addImage(dataUrl, 'PNG', 0, 0, 1122, 794);
      pdf.save(`certificate-${event.eventCode}.pdf`);
      await recordDownload('certificate');
    } finally {
      setCertDownloading(false);
    }
  };

  const openNotes = async () => {
    if (!event.notesUrl) return;
    setNotesLoading(true);
    try {
      await recordDownload('notes');
      window.open(event.notesUrl, '_blank', 'noopener,noreferrer');
    } finally {
      setNotesLoading(false);
    }
  };


  // Slot the user attended (for certificate date)
  const attendedSlot = myReg?.slotId
    ? event.slots?.find((s: any) => s.slotId === myReg.slotId)
    : null;
  const certSlotDate = attendedSlot
    ? new Date(attendedSlot.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  // Meet link visibility (only when approved + slot is ongoing)
  const meetLinkVisible = regStatus === 'approved' && myReg?.slotId && isSlotOngoing(
    event.slots.find((s: any) => s.slotId === myReg.slotId) ?? {}
  );

  return (
    <div className="max-w-6xl mx-auto">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-faint mb-6">
        <button onClick={() => navigate('/dashboard/events')} className="hover:text-body transition-colors">
          Events
        </button>
        <ChevronRight className="h-3 w-3" />
        <span className="text-body font-medium truncate max-w-xs">{event.title}</span>
      </nav>

      <div className="grid lg:grid-cols-3 gap-8">

        {/* ── Left: Event details (2/3) ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Banner */}
          <div className="relative rounded-lg overflow-hidden bg-rule-soft aspect-video">
            <img
              src={event.bannerUrl || `https://placehold.co/900x400/041c44/ffffff?text=${encodeURIComponent(event.eventCode)}`}
              alt={event.title}
              className="w-full h-full object-cover"
              onError={(e) => { e.currentTarget.src = 'https://placehold.co/900x400/041c44/ffffff?text=MCO'; }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            {/* Badges */}
            <div className="absolute bottom-4 left-4 flex items-center gap-2">
              <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                event.mode === 'online'
                  ? 'bg-blue-50/90 text-blue-700 border-blue-200'
                  : 'bg-holding-wash/90 text-holding border-holding/30'
              }`}>
                {event.mode === 'online'
                  ? <Wifi className="h-3 w-3" />
                  : <MapPin className="h-3 w-3" />}
                {event.mode === 'online' ? 'Online' : 'Offline'}
              </span>
              {event.category && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/90 text-body">
                  {event.category}
                </span>
              )}
            </div>
          </div>

          {/* Title + meta */}
          <div>
            <h1 className="text-2xl font-bold text-ink mb-3 leading-tight">{event.title}</h1>
            <p className="text-sm text-muted leading-relaxed mb-4">{event.shortDescription}</p>

            <div className="flex flex-wrap gap-4 text-sm text-muted">
              {event.mode === 'offline' && event.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-faint" />{event.location}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-faint" />{event.totalRegistrations ?? 0} registered
              </span>
            </div>
          </div>

          {/* Slot selector */}
          <div className="bg-white border border-rule rounded-lg p-5">
            <h2 className="text-sm font-bold text-ink mb-4 flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-ink" /> Pick a time
            </h2>
            <div className="space-y-2">
              {event.slots.map((slot: any) => {
                // Use pending-aware availableSeats if present
                const seats = slot.availableSeats !== undefined
                  ? slot.availableSeats
                  : slot.totalSeats - slot.bookedSeats;
                const isPast = new Date(slot.date) < new Date();
                const isFull = seats <= 0;
                const isMySlot = isRegistered && myReg?.slotId === slot.slotId;
                const disabled = isPast || isFull || isRegistered;
                return (
                  <label
                    key={slot.slotId}
                    className={`flex items-center justify-between gap-4 p-3.5 rounded-lg border-2 transition-colors ${
                      isMySlot
                        ? regStatus === 'approved'
                          ? 'border-emerald-400 bg-confirmed-wash cursor-default'
                          : 'border-amber-400 bg-holding-wash cursor-default'
                        : disabled
                          ? 'border-rule-soft bg-paper opacity-50 cursor-not-allowed'
                          : selectedSlotId === slot.slotId
                            ? 'border-ink bg-ink/5 cursor-pointer'
                            : 'border-rule hover:border-rule bg-white cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="slot"
                        value={slot.slotId}
                        checked={selectedSlotId === slot.slotId}
                        disabled={disabled}
                        onChange={() => !isRegistered && setSelectedSlotId(slot.slotId)}
                        className="accent-ink"
                      />
                      <div>
                        <p className="text-sm font-semibold text-ink">{formatDate(slot.date)}</p>
                        <p className="text-xs text-muted flex items-center gap-1 mt-0.5">
                          <Clock className="h-3 w-3" />{slot.startTime} – {slot.endTime}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {isMySlot ? (
                        regStatus === 'approved'
                          ? <span className="text-xs text-confirmed font-semibold">Your slot ✓</span>
                          : <span className="text-xs text-holding font-semibold">Pending approval</span>
                      ) : isPast ? (
                        <span className="text-xs text-faint">Past</span>
                      ) : isFull ? (
                        <span className="text-xs text-declined font-semibold">Sold out</span>
                      ) : (
                        <span className={`text-xs font-semibold ${seats <= 5 ? 'text-declined' : 'text-confirmed'}`}>
                          {seats} seat{seats !== 1 ? 's' : ''} left
                        </span>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* About */}
          <div className="bg-white border border-rule rounded-lg p-5">
            <h2 className="font-display text-[17px] font-600 text-ink mb-3">What happens on the day</h2>
            <p className="text-sm text-muted leading-relaxed whitespace-pre-line">{event.description}</p>
          </div>

          {/* Meet link — visible only when registered + slot is ongoing */}
          {meetLinkVisible && event.meetLink && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
              <h2 className="text-sm font-bold text-blue-900 mb-2 flex items-center gap-2">
                <Wifi className="h-4 w-4" /> Event is Live Now!
              </h2>
              <p className="text-xs text-blue-700 mb-3">Your event is currently ongoing. Click below to join.</p>
              <a
                href={event.meetLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
              >
                Join Meeting <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          )}

          {/* Entry pass — the same component the events list uses, so the pass
              looks and behaves identically wherever a student finds it. */}
          {isRegistered && (
            <div className="rounded-lg border border-rule bg-white p-5">
              <h2 className="font-display text-[17px] font-600 text-ink">Your entry pass</h2>
              <p className="mt-1 mb-5 text-[14px] leading-relaxed text-muted">
                Show this at the door. Pick a colour you like, then save it to your phone.
              </p>
              <EventPass
                qrImage={myReg?.qrCodeImage}
                userName={`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'Attendee'}
                eventTitle={event.title}
                eventCode={event.eventCode}
                slotDate={(() => {
                  const s = event.slots?.find((sl: any) => sl.slotId === myReg?.slotId);
                  return s ? new Date(s.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : undefined;
                })()}
                slotTime={(() => {
                  const s = event.slots?.find((sl: any) => sl.slotId === myReg?.slotId);
                  return s ? `${s.startTime} – ${s.endTime}` : undefined;
                })()}
              />
            </div>
          )}

          {/* Post-event section — only for attended+approved */}
          {canAccessPostEvent && (
            <div className="space-y-4">
              {/* Certificate */}
              <div className="bg-white border border-rule rounded-lg p-5">
                <h2 className="text-sm font-bold text-ink mb-1 flex items-center gap-2">
                  <Award className="h-4 w-4 text-[#c9a84c]" /> Your Certificate
                </h2>
                <p className="text-xs text-muted mb-4">
                  Download your certificate of attendance as an image or PDF.
                </p>

                {/* Hidden certificate for capture */}
                <div style={{ position: 'absolute', left: '-9999px', top: 0, pointerEvents: 'none' }}>
                  <CertificateTemplate
                    ref={certRef}
                    userName={`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'Attendee'}
                    eventTitle={event.title}
                    eventCode={event.eventCode}
                    slotDate={certSlotDate}
                  />
                </div>

                {/* Preview (scaled) */}
                <div style={{ width: '100%', height: `${794 * 0.38}px`, overflow: 'hidden', position: 'relative', marginBottom: '16px' }}>
                  <div style={{ transform: 'scale(0.38)', transformOrigin: 'top left', width: '1122px', height: '794px', pointerEvents: 'none', position: 'absolute', top: 0, left: 0 }}
                       className="rounded-lg overflow-hidden shadow-md">
                    <CertificateTemplate
                      userName={`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'Attendee'}
                      eventTitle={event.title}
                      eventCode={event.eventCode}
                      slotDate={certSlotDate}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={downloadCertPng}
                    disabled={certDownloading}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2.5 rounded-lg border border-rule text-body hover:bg-paper transition-colors disabled:opacity-50"
                  >
                    {certDownloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                    Download PNG
                  </button>
                  <button
                    onClick={downloadCertPdf}
                    disabled={certDownloading}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2.5 rounded-lg bg-ink text-white hover:bg-ink transition-colors disabled:opacity-50"
                  >
                    {certDownloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                    Download PDF
                  </button>
                </div>

                {myReg?.certificateDownloadedAt && (
                  <p className="text-[11px] text-faint text-center mt-2">
                    First downloaded on {new Date(myReg.certificateDownloadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                )}
              </div>

              {/* Notes */}
              {event.notesUrl ? (
                <div className="bg-white border border-rule rounded-lg p-5">
                  <h2 className="text-sm font-bold text-ink mb-1 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-ink" />
                    {event.notesTitle || 'Event Notes & Materials'}
                  </h2>
                  <p className="text-xs text-muted mb-4">
                    Access slides, recordings, and other materials from this event.
                  </p>
                  <button
                    onClick={openNotes}
                    disabled={notesLoading}
                    className="w-full flex items-center justify-center gap-2 text-sm font-semibold py-2.5 rounded-lg bg-ink text-white hover:bg-ink transition-colors disabled:opacity-50"
                  >
                    {notesLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                    View / Download Notes
                  </button>
                  {myReg?.notesAccessedAt && (
                    <p className="text-[11px] text-faint text-center mt-2">
                      First accessed on {new Date(myReg.notesAccessedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3 bg-paper border border-rule rounded-lg px-4 py-3">
                  <FileText className="h-4 w-4 text-faint shrink-0" />
                  <p className="text-xs text-muted">
                    Event notes and materials will be published here once available.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right: Enrollment panel (1/3) ── */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-4">
            <div className="bg-white border border-rule rounded-lg shadow-sm overflow-hidden">

              {/* Price — only while it is still a decision. Once you hold a
                  place it is history, so we say what you paid instead. */}
              <div className="p-5 border-b border-rule-soft">
                {isRegistered ? (
                  <>
                    <p className="text-[14px] text-muted">You paid</p>
                    <p className="tabular mt-1 text-[24px] font-700 leading-none text-ink">
                      {(finalPrice ?? basePrice) === 0 ? 'Nothing — this one is free' : `₹${finalPrice ?? basePrice}`}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="mb-1 flex items-baseline gap-3">
                      <span className="tabular text-[30px] font-700 text-ink">
                        {(finalPrice ?? basePrice) === 0 ? 'Free' : `₹${finalPrice ?? basePrice}`}
                      </span>
                      {event.discountedPrice && (
                        <span className="tabular text-[16px] text-faint line-through">₹{event.price}</span>
                      )}
                    </div>
                    {event.discountedPrice && (
                      <p className="text-[13px] font-600 text-confirmed">
                        You save ₹{event.price - (finalPrice ?? event.discountedPrice)}
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Coupon */}
              {!isRegistered && (
                <div className="p-5 border-b border-rule-soft">
                  <p className="text-xs font-semibold text-muted mb-3 flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5" /> Got a discount code?
                  </p>
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between bg-confirmed-wash border border-confirmed/30 rounded-lg px-3 py-2">
                      <div>
                        <p className="text-xs font-bold text-confirmed font-mono">{appliedCoupon.code}</p>
                        <p className="text-[11px] text-confirmed">Applied successfully</p>
                      </div>
                      <button onClick={removeCoupon} className="text-faint hover:text-declined transition-colors">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        placeholder="ENTER CODE"
                        className="flex-1 h-10 px-3 rounded-lg border border-rule text-sm font-mono  placeholder:normal-case placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-ink/20 focus:border-ink"
                      />
                      <button
                        onClick={applyCoupon}
                        disabled={couponLoading || !couponCode.trim()}
                        className="px-4 bg-rule-soft hover:bg-slate-200 text-body text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                      >
                        {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
                      </button>
                    </div>
                  )}
                  {couponError && <p className="mt-2 text-xs text-declined">{couponError}</p>}
                </div>
              )}

              {/* CTA */}
              <div className="p-5">
                {regStatus === 'approved' ? (
                  <div className="flex items-center gap-2 justify-center py-3 bg-confirmed-wash rounded-lg border border-confirmed/30">
                    <CheckCircle className="h-4 w-4 text-confirmed" />
                    <span className="text-sm font-semibold text-confirmed">Your place is confirmed</span>
                  </div>
                ) : regStatus === 'pending' ? (
                  <div className="flex flex-col items-center gap-1.5 py-3 bg-holding-wash rounded-lg border border-holding/30">
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4 text-holding" />
                      <span className="text-sm font-semibold text-holding">Awaiting payment approval</span>
                    </div>
                    <p className="text-[11px] text-holding text-center px-2">
                      Our team is verifying your payment. Usually within 1–2 hrs.
                    </p>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => setShowCheckout(true)}
                      disabled={!selectedSlotId}
                      className="w-full bg-ink hover:bg-ink disabled:opacity-50 disabled:cursor-not-allowed text-white py-3.5 rounded-lg font-semibold text-sm transition-colors"
                    >
                      Register Now — ₹{finalPrice ?? basePrice}
                    </button>
                    <p className="text-center text-[11px] text-faint mt-3">
                      You pay by UPI, then we check it by hand. Your seat is held once that clears.
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Quick info */}
            <div className="bg-white border border-rule rounded-lg p-4 space-y-3 text-sm">
              {selectedSlot && (
                <>
                  <div className="flex items-center gap-3 text-muted">
                    <CalendarDays className="h-4 w-4 text-faint shrink-0" />
                    {formatDate(selectedSlot.date)}
                  </div>
                  <div className="flex items-center gap-3 text-muted">
                    <Clock className="h-4 w-4 text-faint shrink-0" />
                    {selectedSlot.startTime} – {selectedSlot.endTime}
                  </div>
                </>
              )}
              <div className="flex items-center gap-3 text-muted">
                {event.mode === 'online'
                  ? <><Wifi className="h-4 w-4 text-faint shrink-0" /> Online Event</>
                  : <><MapPin className="h-4 w-4 text-faint shrink-0" />{event.location ?? 'Offline Event'}</>
                }
              </div>
              {/* Availability only matters while you are still deciding. Telling
                  someone who already has a place that "0 seats left" reads as a
                  warning about their own booking. */}
              <div className="flex items-center gap-3 text-muted">
                <Users className="h-4 w-4 shrink-0 text-faint" />
                {isRegistered
                  ? `${event.totalRegistrations ?? 0} going`
                  : selectedSlot
                    ? (() => {
                        const seats = selectedSlot.availableSeats !== undefined
                          ? selectedSlot.availableSeats
                          : selectedSlot.totalSeats - selectedSlot.bookedSeats;
                        if (seats <= 0) return 'This time is fully booked';
                        if (seats === 1) return 'Last seat for this time';
                        return `${seats} seats left for this time`;
                      })()
                    : `${event.totalRegistrations ?? 0} going`}
              </div>
            </div>
          </div>
        </div>
      </div>

      <BookingSheet
        open={showCheckout}
        onClose={() => setShowCheckout(false)}
        eventTitle={event.title}
        slotLabel={selectedSlot ? `${formatDate(selectedSlot.date)}, ${selectedSlot.startTime}` : undefined}
        amount={finalPrice ?? basePrice}
        couponCode={appliedCoupon?.code}
        payment={paymentSettings}
        reference={transactionId}
        setReference={setTransactionId}
        screenshot={screenshotUrl}
        setScreenshot={setScreenshotUrl}
        submitting={isSubmitting}
        error={submitError}
        success={submitSuccess}
        onSubmit={handleSubmitRegistration}
        onDone={() => navigate('/dashboard/orders')}
      />
    </div>
  );
}
