import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Loader2, ArrowLeft, Download, ScanLine, X, Check, Search } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { api } from '../../services/api';

/**
 * This is the door screen. During an event someone is standing at the entrance
 * with a phone, so check-in is the loudest thing on the page and the arrival
 * count sits at the top where it can be read at a glance.
 *
 * Payments are decided in Payments, not here — this page only records who
 * turned up and hands out what they earned.
 */

type Tab = 'all' | 'pending' | 'approved' | 'rejected';

const SPINE: Record<string, string> = {
  approved: 'spine-confirmed',
  pending: 'spine-holding',
  rejected: 'spine-declined',
};

export default function AdminEventRegistrations() {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const token = localStorage.getItem('adminToken');

  const [event, setEvent] = useState<any>(null);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');

  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string; user?: any } | null>(null);
  const [manualToken, setManualToken] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerDivId = 'qr-scanner-region';

  const fetchData = async () => {
    try {
      const [evRes, regRes] = await Promise.all([
        api.get<any>(`/admin/events/${eventId}`, { headers: { Authorization: `Bearer ${token}` } }),
        api.get<any>(`/admin/events/${eventId}/registrations`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if ((evRes as any).success) setEvent((evRes as any).data);
      if ((regRes as any).success) setRegistrations((regRes as any).data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [eventId]);

  const handleDownload = () => {
    const url = `${(import.meta as any).env.VITE_API_URL || 'http://localhost:5000/api/v1'}/admin/events/${eventId}/registrations/download`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.blob())
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `${event?.eventCode ?? 'event'}_registrations.xlsx`;
        a.click();
        URL.revokeObjectURL(blobUrl);
      })
      .catch(console.error);
  };

  /**
   * Records one attendance token, however it arrived.
   *
   * Shared by the camera and the manual box so both take exactly the same path
   * to the API — the door staff should not get different behaviour depending on
   * whether the camera happened to work.
   */
  const submitToken = async (rawToken: string) => {
    const qrToken = rawToken.trim();
    if (!qrToken) return;
    setSubmitting(true);
    try {
      const res: any = await api.post(
        '/admin/events/attendance/scan',
        { qrToken },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.success) {
        setScanResult({
          success: true,
          message: res.data.alreadyMarked ? 'Already checked in' : 'Checked in',
          user: res.data.registration?.user,
        });
        setManualToken('');
        fetchData();
      } else {
        setScanResult({ success: false, message: res.message || 'That pass was not recognised.' });
      }
    } catch (e: any) {
      setScanResult({ success: false, message: e.message || 'Could not record that scan.' });
    } finally {
      setSubmitting(false);
    }
  };

  const startScanner = async () => {
    setScanResult(null);
    setCameraError('');
    setScannerOpen(true);

    // `getUserMedia` does not exist outside a secure context, so on a venue
    // laptop served over plain HTTP the camera can never work. Say so up front
    // rather than showing an instruction that will never come true.
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        'The camera is unavailable because this page is not on a secure (https) connection. Type or paste the pass code below instead.',
      );
      return;
    }

    setTimeout(async () => {
      try {
        const qr = new Html5Qrcode(scannerDivId);
        scannerRef.current = qr;

        // The original code awaited start() with no ceiling. When it neither
        // resolved nor rejected — which is what actually happened on a machine
        // with no usable camera — the catch never ran and the prompt sat there
        // forever with no error at all. A hang is now a message.
        await Promise.race([
          qr.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            async (decodedText) => {
              try { await qr.stop(); } catch { /* already stopping */ }
              scannerRef.current = null;
              await submitToken(decodedText);
            },
            () => {},
          ),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('camera-timeout')), 8000),
          ),
        ]);
      } catch (e: any) {
        setCameraError(
          e?.message === 'camera-timeout'
            ? 'The camera did not start. Type or paste the pass code below instead.'
            : 'Could not access the camera. Type or paste the pass code below instead.',
        );
      }
    }, 100);
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch { /* already stopped */ }
      scannerRef.current = null;
    }
    setScannerOpen(false);
    setScanResult(null);
    setCameraError('');
  };

  const stats = useMemo(() => {
    const approved = registrations.filter((r) => r.status === 'approved');
    return {
      approved: approved.length,
      pending: registrations.filter((r) => r.status === 'pending').length,
      arrived: approved.filter((r) => r.attended).length,
      seats: (event?.slots ?? []).reduce((n: number, s: any) => n + (s.totalSeats ?? 0), 0),
    };
  }, [registrations, event]);

  const slotLabel = (slotId: string) => {
    const s = event?.slots?.find((x: any) => x.slotId === slotId);
    if (!s) return slotId;
    return `${new Date(s.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, ${s.startTime}`;
  };

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return registrations
      .filter((r) => tab === 'all' || r.status === tab)
      .filter((r) => !q || [r.user?.firstName, r.user?.lastName, r.user?.email, r.user?.mobile]
        .filter(Boolean).some((v: string) => String(v).toLowerCase().includes(q)));
  }, [registrations, tab, search]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-signal" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <button
          onClick={() => navigate('/admin/events')}
          className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> All events
        </button>

        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-[28px] font-600 leading-tight text-ink">{event?.title}</h1>
            <p className="tabular mt-1.5 text-[13px] text-muted">
              {event?.eventCode} · {event?.mode === 'online' ? 'Online' : event?.location}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-2 rounded-md border border-rule bg-surface px-4 py-2.5 text-[14px] font-medium text-ink transition-colors hover:border-signal hover:text-signal"
            >
              <Download className="h-4 w-4" strokeWidth={1.75} /> Attendee list
            </button>
            <button
              onClick={scannerOpen ? stopScanner : startScanner}
              className="inline-flex items-center gap-2 rounded-md bg-signal px-4 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-signal-deep"
            >
              <ScanLine className="h-4 w-4" strokeWidth={1.75} />
              {scannerOpen ? 'Stop scanning' : 'Check people in'}
            </button>
          </div>
        </header>
      </div>

      {/* Arrivals — the number that matters at the door */}
      <div className="panel flex flex-wrap items-end gap-x-10 gap-y-5 px-6 py-5">
        <div>
          <p className="text-[13px] text-muted">Arrived</p>
          <p className="tabular mt-1 text-[30px] font-600 leading-none text-ink">
            {stats.arrived}
            <span className="text-[18px] font-500 text-faint"> / {stats.approved}</span>
          </p>
        </div>
        <div>
          <p className="text-[13px] text-muted">Confirmed places</p>
          <p className="tabular mt-1 text-[22px] font-600 leading-none text-ink">{stats.approved}</p>
        </div>
        {stats.pending > 0 && (
          <div>
            <p className="text-[13px] text-muted">Payments still to check</p>
            <p className="tabular mt-1 text-[22px] font-600 leading-none text-holding">{stats.pending}</p>
            <Link to="/admin/orders" className="mt-1 inline-block text-[12px] font-medium text-signal hover:text-signal-deep">
              Go to Payments
            </Link>
          </div>
        )}
        <div>
          <p className="text-[13px] text-muted">Seats offered</p>
          <p className="tabular mt-1 text-[22px] font-600 leading-none text-ink">{stats.seats}</p>
        </div>
      </div>

      {scannerOpen && (
        <div className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-rule-soft px-5 py-3">
            <p className="text-[14px] font-medium text-ink">Point the camera at an entry pass</p>
            <button onClick={stopScanner} aria-label="Stop scanning" className="rounded-md p-1.5 text-muted hover:bg-paper hover:text-ink">
              <X className="h-5 w-5" strokeWidth={1.75} />
            </button>
          </div>
          {!cameraError && <div id={scannerDivId} className="mx-auto w-full max-w-[420px] p-4" />}

          {cameraError && (
            <p className="mx-4 mt-4 rounded-md bg-holding-wash px-4 py-3 text-[13px] text-ink">
              {cameraError}
            </p>
          )}

          {/* Always present, camera or not. If the camera fails at the door and
              there is no way to type a code, the queue simply stops — which is
              the more serious half of this problem, and the half that does not
              depend on the machine. */}
          <form
            onSubmit={(e) => { e.preventDefault(); void submitToken(manualToken); }}
            className="mx-4 mb-4 mt-4 border-t border-rule-soft pt-4"
          >
            <label htmlFor="manual-token" className="block text-[13px] font-medium text-ink">
              Or enter the pass code by hand
            </label>
            <p className="mt-0.5 text-[12px] text-muted">
              It is printed under the QR on the attendee&rsquo;s pass and in their confirmation email.
            </p>
            <div className="mt-2 flex gap-2">
              <input
                id="manual-token"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder="e.g. 3f9a1c7e-…"
                autoComplete="off"
                className="h-10 flex-1 rounded-md border border-rule bg-surface px-3 font-mono text-[13px] text-ink outline-none transition-colors placeholder:font-sans placeholder:text-faint focus:border-signal"
              />
              <button
                type="submit"
                disabled={!manualToken.trim() || submitting}
                className="rounded-md bg-ink px-4 text-[14px] font-medium text-white transition-colors hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitting ? 'Checking…' : 'Check in'}
              </button>
            </div>
          </form>

          {scanResult && (
            <div className={`spine ${scanResult.success ? 'spine-confirmed' : 'spine-declined'} mx-4 mb-4 py-3`}>
              <p className={`state ${scanResult.success ? 'state-confirmed' : 'state-declined'}`}>
                {scanResult.message}
              </p>
              {scanResult.user && (
                <p className="mt-0.5 text-[14px] text-ink">
                  {scanResult.user.firstName} {scanResult.user.lastName}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Roster */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-rule pb-4">
        <div className="flex flex-wrap gap-1">
          {(['all', 'approved', 'pending', 'rejected'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={[
                'rounded-md px-3 py-1.5 text-[13px] transition-colors',
                tab === t ? 'bg-ink font-medium text-white' : 'text-muted hover:bg-rule-soft hover:text-ink',
              ].join(' ')}
            >
              {t === 'all' ? 'Everyone' : t.charAt(0).toUpperCase() + t.slice(1)}
              <span className="tabular ml-1.5 opacity-60">
                {t === 'all' ? registrations.length : registrations.filter((r) => r.status === t).length}
              </span>
            </button>
          ))}
        </div>
        <div className="relative min-w-[220px] flex-1 sm:max-w-[300px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" strokeWidth={1.75} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find a name"
            className="w-full rounded-md border border-rule bg-surface py-2 pl-9 pr-3 text-[14px] text-ink placeholder:text-faint focus:border-signal focus:outline-none"
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="panel px-6 py-14 text-center">
          <p className="text-[15px] font-medium text-ink">Nobody here</p>
          <p className="mx-auto mt-1.5 max-w-[42ch] text-[13px] text-muted">
            {search ? 'No one matches that search.' : 'Registrations appear once students sign up for this event.'}
          </p>
        </div>
      ) : (
        <div className="panel divide-y divide-rule-soft">
          {rows.map((r) => {
            const name = [r.user?.firstName, r.user?.lastName].filter(Boolean).join(' ');
            const collected = [
              r.certificateDownloadedAt && 'certificate',
              r.notesAccessedAt && 'notes',
            ].filter(Boolean) as string[];
            return (
              <div key={r._id} className={`spine ${SPINE[r.status] ?? ''} flex flex-wrap items-center gap-x-5 gap-y-2 py-4 pr-5`}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium text-ink">{name || '—'}</p>
                  <p className="truncate text-[13px] text-muted">{r.user?.email ?? '—'}</p>
                </div>

                <p className="tabular hidden w-[130px] shrink-0 text-[13px] text-muted sm:block">
                  {slotLabel(r.slotId)}
                </p>

                <p className="tabular hidden w-[120px] shrink-0 text-[13px] text-faint md:block">
                  {r.user?.mobile ?? '—'}
                </p>

                {r.status === 'approved' ? (
                  r.attended ? (
                    <span className="state state-confirmed inline-flex w-[104px] shrink-0 items-center gap-1.5">
                      <Check className="h-4 w-4" strokeWidth={2.25} /> Arrived
                    </span>
                  ) : (
                    <span className="state state-muted w-[104px] shrink-0">Not yet in</span>
                  )
                ) : (
                  <span className={`state w-[104px] shrink-0 ${r.status === 'pending' ? 'state-holding' : 'state-declined'}`}>
                    {r.status === 'pending' ? 'Payment pending' : 'Declined'}
                  </span>
                )}

                <p className="w-[92px] shrink-0 text-right text-[12px] text-faint">
                  {collected.length ? `Took ${collected.join(' + ')}` : ''}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
