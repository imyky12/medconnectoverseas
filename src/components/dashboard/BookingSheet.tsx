import { useState } from 'react';
import { Loader2, X, Copy, Check, ArrowLeft, ArrowRight, ExternalLink } from 'lucide-react';

/**
 * Booking a place, as two plain steps rather than one dense form.
 *
 * The old sheet showed payment details and the proof fields side by side, so a
 * student had to work out for themselves what to do first. Paying and then
 * telling us about it are two separate moments, minutes apart — often with a
 * trip to another app in between — so they are now two screens, and the sheet
 * only ever asks for one thing at a time.
 */

export interface BookingSheetProps {
  open: boolean;
  onClose: () => void;
  eventTitle: string;
  slotLabel?: string;
  amount: number;
  couponCode?: string;
  payment: {
    upiId?: string;
    upiName?: string;
    qrCodeUrl?: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    accountHolderName?: string;
    additionalInstructions?: string;
  } | null;
  reference: string;
  setReference: (v: string) => void;
  screenshot: string;
  setScreenshot: (v: string) => void;
  submitting: boolean;
  error?: string;
  success: boolean;
  onSubmit: () => void;
  onDone: () => void;
}

export default function BookingSheet({
  open, onClose, eventTitle, slotLabel, amount, couponCode, payment,
  reference, setReference, screenshot, setScreenshot,
  submitting, error, success, onSubmit, onDone,
}: BookingSheetProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [copied, setCopied] = useState<string | null>(null);
  const [showBank, setShowBank] = useState(false);

  if (!open) return null;

  const free = amount === 0;
  const copy = (label: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(null), 1800);
  };

  const canSubmit = reference.trim() !== '' && screenshot.trim() !== '' && !submitting;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-ink/70 p-0 sm:items-center sm:p-6"
      onClick={() => !submitting && onClose()}
    >
      <div
        className="relative w-full max-w-[440px] rounded-t-2xl bg-surface sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Book your place at ${eventTitle}`}
      >
        {success ? (
          <div className="px-6 py-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-confirmed-wash">
              <Check className="h-7 w-7 text-confirmed" strokeWidth={2.25} />
            </div>
            <h2 className="mt-4 font-display text-[22px] font-600 text-ink">You&rsquo;re on the list</h2>
            <p className="mx-auto mt-2 max-w-[34ch] text-[15px] leading-relaxed text-muted">
              We are checking your payment now. Your place is confirmed once that is done — usually
              within a couple of hours — and we will email you the pass to show at the door.
            </p>
            <button
              onClick={onDone}
              className="mt-6 w-full rounded-lg bg-signal px-5 py-3.5 text-[15px] font-medium text-white transition-colors hover:bg-signal-deep"
            >
              See my payments
            </button>
          </div>
        ) : (
          <>
            <header className="flex items-start justify-between gap-4 px-6 pb-4 pt-6">
              <div className="min-w-0">
                <p className="text-[13px] text-muted">Step {step} of 2</p>
                <h2 className="mt-1 font-display text-[20px] font-600 leading-tight text-ink">
                  {step === 1 ? (free ? 'Confirm your place' : `Pay ₹${amount.toLocaleString('en-IN')}`) : 'Tell us you have paid'}
                </h2>
                <p className="mt-1 truncate text-[13px] text-muted">
                  {eventTitle}{slotLabel ? ` · ${slotLabel}` : ''}
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                disabled={submitting}
                className="-mr-2 shrink-0 rounded-lg p-2 text-muted transition-colors hover:bg-paper hover:text-ink"
              >
                <X className="h-5 w-5" strokeWidth={1.75} />
              </button>
            </header>

            {/* progress */}
            <div className="flex gap-1.5 px-6">
              <span className={`h-1 flex-1 rounded-full ${step >= 1 ? 'bg-signal' : 'bg-rule'}`} />
              <span className={`h-1 flex-1 rounded-full ${step >= 2 ? 'bg-signal' : 'bg-rule'}`} />
            </div>

            {step === 1 ? (
              <div className="px-6 py-6">
                <p className="text-[15px] leading-relaxed text-muted">
                  Open any UPI app and send{' '}
                  <span className="font-600 text-ink">₹{amount.toLocaleString('en-IN')}</span> to the
                  ID below. Take a screenshot when it goes through — you will need it on the next step.
                </p>

                {couponCode && (
                  <p className="mt-2 text-[14px] text-confirmed">
                    Coupon <span className="tabular font-600">{couponCode}</span> is already taken off this
                    amount.
                  </p>
                )}

                {payment?.upiId ? (
                  <div className="mt-5 rounded-xl border border-rule p-4">
                    <p className="text-[13px] text-muted">UPI ID</p>
                    <div className="mt-1.5 flex items-center gap-3">
                      <p className="tabular min-w-0 flex-1 truncate text-[17px] font-600 text-ink">
                        {payment.upiId}
                      </p>
                      <button
                        onClick={() => copy('upi', payment.upiId!)}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-ink px-3.5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-ink/90"
                      >
                        {copied === 'upi'
                          ? <><Check className="h-3.5 w-3.5" strokeWidth={2.25} /> Copied</>
                          : <><Copy className="h-3.5 w-3.5" strokeWidth={1.75} /> Copy</>}
                      </button>
                    </div>
                    {payment.upiName && (
                      <p className="mt-1 text-[13px] text-muted">Account name: {payment.upiName}</p>
                    )}

                    {payment.qrCodeUrl && (
                      <div className="mt-4 border-t border-rule-soft pt-4 text-center">
                        <img
                          src={payment.qrCodeUrl}
                          alt="Scan this code in your UPI app to pay"
                          className="mx-auto h-32 w-32 rounded-lg object-contain"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                        />
                        <p className="mt-2 text-[13px] text-muted">or scan this in your UPI app</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="mt-5 rounded-xl bg-holding-wash px-4 py-3 text-[14px] text-ink">
                    Payment details are not set up yet. Please contact us before paying.
                  </p>
                )}

                {(payment?.bankName || payment?.accountNumber) && (
                  <div className="mt-3">
                    <button
                      onClick={() => setShowBank((v) => !v)}
                      className="text-[14px] font-medium text-signal hover:text-signal-deep"
                    >
                      {showBank ? 'Hide bank transfer details' : 'Prefer a bank transfer?'}
                    </button>
                    {showBank && (
                      <dl className="mt-3 rounded-xl border border-rule px-4 py-3">
                        {([
                          ['Bank', payment?.bankName],
                          ['Account number', payment?.accountNumber],
                          ['IFSC', payment?.ifscCode],
                          ['Account name', payment?.accountHolderName],
                        ] as [string, string | undefined][]).filter(([, v]) => v).map(([k, v]) => (
                          <div key={k} className="flex items-baseline justify-between gap-4 py-1.5">
                            <dt className="text-[13px] text-muted">{k}</dt>
                            <dd className="tabular text-[14px] text-ink">{v}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </div>
                )}

                {payment?.additionalInstructions && (
                  <p className="mt-3 rounded-lg bg-paper px-4 py-3 text-[14px] leading-relaxed text-muted">
                    {payment.additionalInstructions}
                  </p>
                )}

                <button
                  onClick={() => setStep(2)}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-signal px-5 py-3.5 text-[15px] font-medium text-white transition-colors hover:bg-signal-deep"
                >
                  I have sent the money <ArrowRight className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>
            ) : (
              <div className="px-6 py-6">
                <p className="text-[15px] leading-relaxed text-muted">
                  Two last things, so we can match your payment to your booking.
                </p>

                <div className="mt-5">
                  <label htmlFor="ref" className="block text-[14px] font-medium text-ink">
                    Payment reference number
                  </label>
                  <p className="mt-0.5 text-[13px] text-muted">
                    Your UPI app calls this the UTR or transaction ID.
                  </p>
                  <input
                    id="ref"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="426081234567"
                    inputMode="numeric"
                    className="tabular mt-2 w-full rounded-lg border border-rule px-3.5 py-3 text-[15px] text-ink placeholder:text-faint focus:border-signal focus:outline-none"
                  />
                </div>

                <div className="mt-5">
                  <label htmlFor="shot" className="block text-[14px] font-medium text-ink">
                    Link to your screenshot
                  </label>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-muted">
                    Upload it to Google Drive or Imgur, set it to anyone-with-the-link, then paste
                    that link here.
                  </p>
                  <input
                    id="shot"
                    type="url"
                    value={screenshot}
                    onChange={(e) => setScreenshot(e.target.value)}
                    placeholder="https://drive.google.com/..."
                    className="mt-2 w-full rounded-lg border border-rule px-3.5 py-3 text-[15px] text-ink placeholder:text-faint focus:border-signal focus:outline-none"
                  />
                  <a
                    href="https://drive.google.com"
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-signal hover:text-signal-deep"
                  >
                    Open Google Drive <ExternalLink className="h-3 w-3" strokeWidth={1.75} />
                  </a>
                </div>

                {error && (
                  <p className="mt-4 rounded-lg bg-declined-wash px-4 py-3 text-[14px] text-ink">{error}</p>
                )}

                <button
                  onClick={onSubmit}
                  disabled={!canSubmit}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-signal px-5 py-3.5 text-[15px] font-medium text-white transition-colors hover:bg-signal-deep disabled:opacity-45"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />}
                  {submitting ? 'Booking your place…' : 'Book my place'}
                </button>

                <button
                  onClick={() => setStep(1)}
                  disabled={submitting}
                  className="mt-3 inline-flex w-full items-center justify-center gap-1.5 text-[14px] font-medium text-muted transition-colors hover:text-ink"
                >
                  <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> Back to payment details
                </button>

                <p className="mt-4 text-center text-[13px] leading-relaxed text-muted">
                  A person checks every payment by hand. We will email you as soon as your place is
                  confirmed.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
