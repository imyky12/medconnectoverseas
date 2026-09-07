import { useEffect, useState } from 'react';
import { Loader2, X, Mail, ArrowLeft, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import OtpInput from '../ui/otp-input';
import { api } from '../../services/api';

/**
 * The step between wanting an issue and getting it.
 *
 * An email address and a six-digit code — no account, no password, nothing to
 * remember. Anyone asked to "create an account" to read a newsletter closes the
 * tab, so the ask is kept to the one thing that is actually needed.
 *
 * The PDF address is never in this component. Verifying returns a short-lived
 * ticket, and the download is fetched from our own server with that ticket, so
 * nothing here can be copied out and shared.
 */

interface NewsletterGateProps {
  open: boolean;
  onClose: () => void;
  newsletter: { _id: string; title: string; edition: string } | null;
}

type Step = 'email' | 'code' | 'done';

const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api/v1';

export default function NewsletterGate({ open, onClose, newsletter }: NewsletterGateProps) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ticket, setTicket] = useState('');
  const [resentAt, setResentAt] = useState<number | null>(null);

  // A fresh dialog every time: reopening on the code step with a stale address
  // would be baffling.
  useEffect(() => {
    if (open) {
      setStep('email');
      setOtp('');
      setError('');
      setTicket('');
      setResentAt(null);
    }
  }, [open, newsletter?._id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !newsletter) return null;

  const sendCode = async (resend = false) => {
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    setBusy(true);
    setError('');
    try {
      const res: any = await api.post(`/newsletters/${newsletter._id}/request-access`, { email: email.trim() });
      if (res?.success) {
        setStep('code');
        if (resend) setResentAt(Date.now());
      } else setError(res?.message ?? 'We could not send the code.');
    } catch (e: any) {
      setError(e?.message ?? 'We could not send the code.');
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (otp.length !== 6) return;
    setBusy(true);
    setError('');
    try {
      const res: any = await api.post(`/newsletters/${newsletter._id}/verify-access`, {
        email: email.trim(),
        otp,
      });
      if (res?.success && res.data?.ticket) {
        setTicket(res.data.ticket);
        setStep('done');
        // Starts immediately — the person asked for the file, not for another
        // button to press.
        triggerDownload(res.data.ticket);
      } else {
        setError(res?.message ?? 'That code did not work.');
      }
    } catch (e: any) {
      setError(e?.message ?? 'That code did not work.');
      setOtp('');
    } finally {
      setBusy(false);
    }
  };

  const triggerDownload = (t: string) => {
    // A plain navigation rather than fetch-and-blob: the response carries
    // Content-Disposition, so the browser saves it with the right filename and
    // shows its own progress for a large file.
    window.location.href = `${API_BASE}/newsletters/${newsletter._id}/download?ticket=${encodeURIComponent(t)}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-ink/70 p-0 sm:items-center sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Get ${newsletter.title}`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[440px] rounded-t-2xl bg-surface sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-rule-soft px-6 py-4">
          <div>
            <p className="text-[12px] font-600 uppercase tracking-wide text-faint">
              {step === 'done' ? 'Ready' : `Step ${step === 'email' ? 1 : 2} of 2`}
            </p>
            <h2 className="mt-0.5 font-display text-[19px] font-600 leading-tight text-ink">
              {step === 'email' && 'Where should we send your code?'}
              {step === 'code' && 'Enter the code'}
              {step === 'done' && 'Your download has started'}
            </h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="-mr-1 rounded-md p-1.5 text-muted hover:bg-paper hover:text-ink">
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>

        <div className="px-6 py-5">
          <p className="mb-4 rounded-lg bg-paper px-3.5 py-2.5 text-[13px] text-muted">
            <span className="font-medium text-ink">{newsletter.title}</span> · {newsletter.edition}
          </p>

          {step === 'email' && (
            <>
              <p className="text-[14px] leading-relaxed text-muted">
                We send a six-digit code to check the address is real. No account, no password —
                the PDF opens as soon as you enter it.
              </p>
              <label htmlFor="nl-email" className="mt-4 block text-[13px] font-semibold text-ink">
                Email address
              </label>
              <div className="relative mt-1.5">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
                <input
                  id="nl-email"
                  type="email"
                  autoFocus
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') void sendCode(); }}
                  placeholder="you@example.com"
                  className="h-12 w-full rounded-lg border border-rule bg-surface pl-9 pr-3 text-[15px] text-ink outline-none transition-colors placeholder:text-faint focus:border-signal"
                />
              </div>
              {error && <ErrorLine>{error}</ErrorLine>}
              <button
                type="button"
                onClick={() => void sendCode()}
                disabled={busy || !email.trim()}
                className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-ink text-[15px] font-semibold text-white transition-colors hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send me the code'}
              </button>
              <p className="mt-3 text-center text-[12px] text-faint">
                We will also add you to the newsletter. Unsubscribe any time.
              </p>
            </>
          )}

          {step === 'code' && (
            <>
              <p className="text-[14px] leading-relaxed text-muted">
                Sent to <span className="font-semibold text-ink">{email}</span>. It expires in a few minutes.
              </p>
              <div className="mt-5">
                <OtpInput
                  value={otp}
                  onChange={(v) => { setOtp(v); if (error) setError(''); }}
                  onComplete={() => void verify()}
                  invalid={!!error}
                  label="The 6-digit code we emailed you"
                />
              </div>
              {error && <ErrorLine center>{error}</ErrorLine>}
              {resentAt && !error && (
                <p className="mt-3 text-center text-[13px] font-medium text-confirmed">A new code is on its way.</p>
              )}
              <button
                type="button"
                onClick={() => void verify()}
                disabled={otp.length !== 6 || busy}
                className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-ink text-[15px] font-semibold text-white transition-colors hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Download className="h-4 w-4" /> Open the newsletter</>}
              </button>
              <div className="mt-3 flex items-center justify-between text-[13px]">
                <button onClick={() => { setStep('email'); setError(''); }} className="inline-flex items-center gap-1.5 font-medium text-muted transition-colors hover:text-ink">
                  <ArrowLeft className="h-3.5 w-3.5" /> Change address
                </button>
                <button onClick={() => void sendCode(true)} disabled={busy} className="font-medium text-signal transition-colors hover:text-signal-deep disabled:opacity-40">
                  Send it again
                </button>
              </div>
            </>
          )}

          {step === 'done' && (
            <>
              <div className="flex items-start gap-3 rounded-lg bg-confirmed-wash px-4 py-3.5">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-confirmed" />
                <p className="text-[14px] leading-relaxed text-ink">
                  Verified. The PDF should be downloading now — check your downloads if you do not see it.
                </p>
              </div>
              <button
                type="button"
                onClick={() => triggerDownload(ticket)}
                className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-rule text-[15px] font-semibold text-ink transition-colors hover:border-signal hover:text-signal"
              >
                <Download className="h-4 w-4" /> Download again
              </button>
              <button onClick={onClose} className="mt-2 w-full py-2 text-[14px] font-medium text-muted transition-colors hover:text-ink">
                Done
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ErrorLine({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <p className={`mt-2 flex items-center gap-1.5 text-[13px] font-medium text-declined ${center ? 'justify-center' : ''}`}>
      <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {children}
    </p>
  );
}
