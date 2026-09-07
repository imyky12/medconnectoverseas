import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import 'react-phone-number-input/style.css';
import PhoneInput, { getCountryCallingCode } from 'react-phone-number-input';
import type { Country } from 'react-phone-number-input';
import en from 'react-phone-number-input/locale/en.json';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2, ArrowRight, ArrowLeft, Check, Search, X,
  AlertCircle, MessageSquare, Gift, User as UserIcon, Smartphone,
} from 'lucide-react';

// import OtpInput from '../components/ui/otp-input';  // restore with the 'verify' step
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import Navbar from '../components/landing/navbar';

/**
 * Setting up a new member's profile.
 *
 * This used to be seven screens, one of which was a title card with a single
 * button on it and two of which held one field each. Seven "Continue" clicks to
 * hand over five facts reads as a form that does not respect the person filling
 * it in. It is three now, grouped by what the questions are *for*: who you are,
 * how you got here, and how to reach you. Nothing was dropped.
 *
 * The referral code is checked against the server the moment it is typed. It
 * previously showed a green "Code applied" for any string at all and then threw
 * unrecognised codes away in silence, so a real code and a nonsense one looked
 * identical and nobody was ever told their friend had not been credited.
 */

type Step = 'about' | 'finding' | 'phone';

/**
 * Mobile verification is switched off — see MOBILE_OTP_ENABLED in the backend's
 * profile.controller. There is no SMS provider, so the code only ever reached
 * the server console and nobody could actually finish signing up.
 *
 * The 'verify' step and its OTP screen are kept in the file, commented out
 * below, along with `handleSendOtp`. Add 'verify' back to STEPS and restore
 * those two blocks when a real sender exists.
 */
const STEPS: { id: Step; label: string }[] = [
  { id: 'about', label: 'About you' },
  { id: 'finding', label: 'How you found us' },
  { id: 'phone', label: 'Your number' },
];

const SOURCES = [
  { value: 'Social Media', hint: 'Instagram, LinkedIn, elsewhere' },
  { value: 'Friend / Colleague', hint: 'Someone told you about us' },
  { value: 'Search Engine', hint: 'You found us searching' },
  { value: 'Event / Seminar', hint: 'You met us in person' },
  { value: 'Other', hint: 'Somewhere else entirely' },
];

const COUNTRIES: { code: string; name: string }[] = Object.entries(en as Record<string, string>)
  .filter(([code]) => code !== 'ZZ' && code.length === 2)
  .map(([code, name]) => ({ code, name }))
  .sort((a, b) => a.name.localeCompare(b.name));

/** What the server said about the referral code currently typed in. */
type CodeCheck =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'valid'; referrerName: string }
  | { state: 'invalid'; reason: string };

export default function OnboardingPage() {
  const { user, isAuthenticated, isLoading: isAuthLoading, updateUser } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('about');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [country, setCountry] = useState('');
  const [countrySearch, setCountrySearch] = useState('');
  const [countryOpen, setCountryOpen] = useState(false);
  const [source, setSource] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [codeCheck, setCodeCheck] = useState<CodeCheck>({ state: 'idle' });
  const [phone, setPhone] = useState<string | undefined>('');
  const [phoneCountry, setPhoneCountry] = useState<Country>('IN');
  // const [otp, setOtp] = useState('');  // restore with the 'verify' step

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const index = STEPS.findIndex((s) => s.id === step);

  useEffect(() => {
    const pending = localStorage.getItem('pendingReferralCode');
    if (pending) setReferralCode(pending.toUpperCase());
  }, []);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!isAuthenticated) navigate('/', { replace: true });
    // Onboarding is a one-time gate. Someone who has already been through it
    // has no fields left to fill, so send them where they were going.
    else if (user?.isOnboardingComplete) navigate('/dashboard', { replace: true });
  }, [isAuthLoading, isAuthenticated, user, navigate]);

  /* ---- referral code, checked against the server as it is typed ---- */

  const checkSeq = useRef(0);

  const checkCode = useCallback(async (raw: string) => {
    const code = raw.trim().toUpperCase();
    const seq = ++checkSeq.current;

    if (!code) { setCodeCheck({ state: 'idle' }); return; }
    setCodeCheck({ state: 'checking' });

    try {
      const res: any = await api.get(`/referrals/validate/${encodeURIComponent(code)}`);
      // A slower earlier request must never overwrite a newer answer.
      if (seq !== checkSeq.current) return;
      if (res?.data?.valid) setCodeCheck({ state: 'valid', referrerName: res.data.referrerName });
      else setCodeCheck({ state: 'invalid', reason: res?.data?.reason || 'We could not find that code.' });
    } catch {
      if (seq !== checkSeq.current) return;
      // A failed check is not a failed code. Say so, and let them continue.
      setCodeCheck({ state: 'invalid', reason: 'We could not check that code just now.' });
    }
  }, []);

  useEffect(() => {
    if (!referralCode.trim()) { setCodeCheck({ state: 'idle' }); return; }
    const t = setTimeout(() => void checkCode(referralCode), 450);
    return () => clearTimeout(t);
  }, [referralCode, checkCode]);

  /* ---- navigation ---- */

  const go = (dir: 1 | -1) => {
    setError('');
    const next = STEPS[index + dir];
    if (next) setStep(next.id);
  };

  const canLeaveAbout = firstName.trim() !== '' && lastName.trim() !== '' && country !== '';
  const canLeaveFinding = source !== '';

  /* Parked with mobile verification. Restore alongside the 'verify' step.
  const handleSendOtp = async () => {
    if (!phone) { setError('Please enter your mobile number.'); return; }
    setIsLoading(true);
    setError('');
    try {
      const dialCode = `+${getCountryCallingCode(phoneCountry)}`;
      const res: any = await api.post('/profile/request-mobile-otp', { mobile: phone, countryCode: dialCode });
      if (res.success) { setOtp(''); go(1); }
      else setError(res.message || 'We could not send the code.');
    } catch (err: any) {
      setError(err?.message || 'We could not send the code.');
    } finally {
      setIsLoading(false);
    }
  };
  */

  const handleSubmit = async () => {
    if (!phone) { setError('Please enter your mobile number.'); return; }
    setIsLoading(true);
    setError('');
    try {
      const dialCode = `+${getCountryCallingCode(phoneCountry)}`;
      const res: any = await api.post('/profile/onboarding', {
        firstName, lastName, country,
        mobile: phone,
        countryCode: dialCode,
        howDidYouHearAboutUs: source,
        // `otp` intentionally omitted — the server ignores it while
        // MOBILE_OTP_ENABLED is false.
        // Only a code the server confirmed is sent. An unverified one would be
        // dropped server-side anyway; not sending it keeps the two in step.
        referredByCode: codeCheck.state === 'valid' ? referralCode.trim().toUpperCase() : undefined,
      });
      if (res.success) {
        localStorage.removeItem('pendingReferralCode');
        updateUser(res.data.user);
        navigate('/dashboard');
      } else {
        setError(res.message || 'We could not finish setting up your profile.');
      }
    } catch (err: any) {
      setError(err?.message || 'We could not finish setting up your profile.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isAuthLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <Loader2 className="h-8 w-8 animate-spin text-signal" />
      </div>
    );
  }

  const matches = countrySearch.trim()
    ? COUNTRIES.filter((c) => c.name.toLowerCase().includes(countrySearch.trim().toLowerCase()))
    : COUNTRIES;

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <Navbar hideLinks />

      <main className="flex flex-1 items-start justify-center px-4 py-10 sm:items-center sm:py-16">
        <div className="w-full max-w-[540px]">

          {/* Where you are, and what is still to come. A rail rather than a bare
              bar: the fill says how far, the labels say of what. */}
          <ol className="mb-6 flex items-center gap-1.5 sm:gap-2">
            {STEPS.map((s, i) => (
              <li key={s.id} className="flex-1">
                <div
                  className={[
                    'h-1 rounded-full transition-colors duration-300',
                    i <= index ? 'bg-signal' : 'bg-rule',
                  ].join(' ')}
                />
                <span
                  className={[
                    'mt-2 hidden text-[11px] font-medium sm:block',
                    i === index ? 'text-ink' : 'text-faint',
                  ].join(' ')}
                >
                  {s.label}
                </span>
              </li>
            ))}
          </ol>
          <p className="mb-4 text-xs font-medium text-muted sm:hidden">
            Step {index + 1} of {STEPS.length} · {STEPS[index].label}
          </p>

          <div className="rounded-2xl border border-rule bg-surface p-6 shadow-[0_1px_2px_rgba(7,26,51,0.04)] sm:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.18 }}
              >

                {/* ---------------------------------------- 1. About you */}
                {step === 'about' && (
                  <>
                    <StepHeader
                      icon={<UserIcon className="h-4 w-4" />}
                      title="First, who are we speaking to?"
                      subtitle="This is the name that goes on your event passes and certificates, so use the one you would want printed."
                    />

                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      <Field label="First name">
                        <input
                          autoFocus
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="Priya"
                          className={inputClass}
                        />
                      </Field>
                      <Field label="Last name">
                        <input
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="Sharma"
                          className={inputClass}
                        />
                      </Field>
                    </div>

                    <div className="mt-4">
                      <Field label="Where you are studying or based">
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
                          <input
                            value={countryOpen ? countrySearch : country}
                            onChange={(e) => { setCountrySearch(e.target.value); setCountry(''); setCountryOpen(true); }}
                            onFocus={() => { setCountryOpen(true); setCountrySearch(''); }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && matches.length > 0) {
                                e.preventDefault();
                                setCountry(matches[0].name);
                                setCountryOpen(false);
                              }
                              if (e.key === 'Escape') setCountryOpen(false);
                            }}
                            placeholder="Start typing a country…"
                            className={`${inputClass} pl-9 pr-9`}
                          />
                          {country && !countryOpen && (
                            <Check className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-confirmed" />
                          )}
                          {countryOpen && (
                            <button
                              type="button"
                              onClick={() => setCountryOpen(false)}
                              aria-label="Close country list"
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-faint hover:text-body"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </Field>

                      {countryOpen && (
                        <div
                          role="listbox"
                          className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-rule bg-surface"
                        >
                          {matches.length === 0 ? (
                            <p className="px-4 py-6 text-center text-sm text-faint">
                              Nothing matches that search.
                            </p>
                          ) : (
                            matches.map((c) => (
                              <button
                                key={c.code}
                                type="button"
                                role="option"
                                aria-selected={country === c.name}
                                onClick={() => { setCountry(c.name); setCountryOpen(false); }}
                                className={[
                                  'flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors',
                                  country === c.name ? 'bg-signal-wash font-semibold text-ink' : 'text-body hover:bg-paper',
                                ].join(' ')}
                              >
                                {c.name}
                                {country === c.name && <Check className="h-4 w-4 text-signal" />}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    <Actions
                      onNext={() => go(1)}
                      nextDisabled={!canLeaveAbout}
                      nextLabel="Continue"
                    />
                  </>
                )}

                {/* ------------------------------------ 2. How you found us */}
                {step === 'finding' && (
                  <>
                    <StepHeader
                      icon={<MessageSquare className="h-4 w-4" />}
                      title="How did you come across us?"
                      subtitle="It tells us where students are actually finding us, which is how we decide where to put our effort."
                    />

                    <div className="mt-6 space-y-2">
                      {SOURCES.map((s) => {
                        const picked = source === s.value;
                        return (
                          <button
                            key={s.value}
                            type="button"
                            onClick={() => setSource(s.value)}
                            className={[
                              'flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors',
                              picked
                                ? 'border-signal bg-signal-wash'
                                : 'border-rule bg-surface hover:bg-paper',
                            ].join(' ')}
                          >
                            <span>
                              <span className={`block text-sm font-semibold ${picked ? 'text-ink' : 'text-body'}`}>
                                {s.value}
                              </span>
                              <span className="block text-xs text-muted">{s.hint}</span>
                            </span>
                            <span
                              className={[
                                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                                picked ? 'border-signal bg-signal text-white' : 'border-rule',
                              ].join(' ')}
                            >
                              {picked && <Check className="h-3 w-3" />}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Referral sits here rather than on a screen of its own —
                        it is the same question asked one level deeper. */}
                    <div className="mt-6 rounded-xl border border-rule-soft bg-paper p-4">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <Gift className="h-4 w-4 text-signal" />
                        <span className="text-sm font-semibold text-ink">Were you referred by a friend?</span>
                        <span className="text-xs text-faint">Optional</span>
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        Enter their code and they get credited when you make your first booking.
                      </p>

                      <div className="relative mt-3">
                        <input
                          value={referralCode}
                          onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                          placeholder="e.g. 5577"
                          maxLength={20}
                          aria-invalid={codeCheck.state === 'invalid'}
                          className={[
                            'h-11 w-full rounded-lg border bg-surface px-3 pr-10 font-mono text-[15px] tracking-wide',
                            'outline-none transition-colors placeholder:font-sans placeholder:tracking-normal placeholder:text-faint',
                            codeCheck.state === 'invalid'
                              ? 'border-holding focus:border-holding'
                              : codeCheck.state === 'valid'
                                ? 'border-confirmed focus:border-confirmed'
                                : 'border-rule focus:border-signal',
                          ].join(' ')}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2">
                          {codeCheck.state === 'checking' && <Loader2 className="h-4 w-4 animate-spin text-faint" />}
                          {codeCheck.state === 'valid' && <Check className="h-4 w-4 text-confirmed" />}
                          {codeCheck.state === 'invalid' && <AlertCircle className="h-4 w-4 text-holding" />}
                        </span>
                      </div>

                      {/* The whole point of the change: these two states have to
                          look different, and they have to be true. */}
                      {codeCheck.state === 'valid' && (
                        <p className="mt-2 text-xs font-medium text-confirmed">
                          Referred by {codeCheck.referrerName} — we will credit them.
                        </p>
                      )}
                      {codeCheck.state === 'invalid' && (
                        <p className="mt-2 text-xs font-medium text-holding">
                          {codeCheck.reason} You can carry on without one.
                        </p>
                      )}
                    </div>

                    <Actions
                      onBack={() => go(-1)}
                      onNext={() => go(1)}
                      nextDisabled={!canLeaveFinding || codeCheck.state === 'checking'}
                      nextLabel="Continue"
                    />
                  </>
                )}

                {/* --------------------------------------- 3. Your number */}
                {step === 'phone' && (
                  <>
                    <StepHeader
                      icon={<Smartphone className="h-4 w-4" />}
                      title="Last thing — how do we reach you?"
                      subtitle="We use this if an event you have booked is moved or cancelled. Nothing else."
                    />

                    <div className="mt-6">
                      <Field label="Mobile number">
                        <div className="flex h-12 items-center rounded-lg border border-rule bg-surface px-3 focus-within:border-signal">
                          <PhoneInput
                            international
                            defaultCountry="IN"
                            value={phone}
                            onChange={setPhone}
                            onCountryChange={(c) => { if (c) setPhoneCountry(c); }}
                            className="w-full border-0 bg-transparent text-[15px] outline-none focus:ring-0"
                          />
                        </div>
                      </Field>
                      {error && <ErrorLine>{error}</ErrorLine>}
                    </div>

                    <Actions
                      onBack={() => go(-1)}
                      onNext={handleSubmit}
                      nextDisabled={!phone || isLoading}
                      nextLabel={isLoading ? 'Setting up' : 'Finish setting up'}
                      busy={isLoading}
                    />
                  </>
                )}

                {/* ---------------------------------- 4. Verify (parked)
                    Mobile verification is off — see STEPS above. Restore this
                    block, `handleSendOtp`, and 'verify' in STEPS together.

                {step === 'verify' && (
                  <>
                    <StepHeader
                      icon={<Smartphone className="h-4 w-4" />}
                      title="Enter the code we texted you"
                      subtitle={
                        <>
                          Sent to <span className="font-semibold text-ink">{phone}</span>. It is valid for five minutes.
                        </>
                      }
                    />

                    <div className="mt-7">
                      <OtpInput
                        value={otp}
                        onChange={(v) => { setOtp(v); if (error) setError(''); }}
                        invalid={!!error}
                        label="The 6-digit code we texted you"
                      />
                      {error && <ErrorLine center>{error}</ErrorLine>}
                    </div>

                    <div className="mt-7 space-y-3">
                      <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={otp.length !== 6 || isLoading}
                        className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-ink text-[15px] font-semibold text-white transition-colors hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Finish setting up <ArrowRight className="h-4 w-4" /></>}
                      </button>
                      <button
                        type="button"
                        onClick={() => go(-1)}
                        disabled={isLoading}
                        className="w-full text-sm font-medium text-muted transition-colors hover:text-ink disabled:opacity-40"
                      >
                        Use a different number
                      </button>
                    </div>
                  </>
                )}
                */}

              </motion.div>
            </AnimatePresence>
          </div>

          <p className="mt-5 text-center text-xs text-faint">
            Your details are used to run your bookings and nothing else.
          </p>
        </div>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ bits */

const inputClass =
  'h-12 w-full rounded-lg border border-rule bg-surface px-3 text-[15px] text-body outline-none ' +
  'transition-colors placeholder:text-faint focus:border-signal';

function StepHeader({ icon, title, subtitle }: {
  icon: React.ReactNode;
  title: string;
  subtitle: React.ReactNode;
}) {
  return (
    <div>
      <span className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-signal-wash text-signal">
        {icon}
      </span>
      <h1 className="font-display text-[22px] font-semibold leading-tight text-ink sm:text-[25px]">
        {title}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">{subtitle}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold text-ink">{label}</span>
      {children}
    </label>
  );
}

function ErrorLine({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <p className={`mt-2 text-sm font-medium text-declined ${center ? 'text-center' : ''}`}>
      {children}
    </p>
  );
}

function Actions({ onBack, onNext, nextDisabled, nextLabel, busy }: {
  onBack?: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
  nextLabel: string;
  busy?: boolean;
}) {
  return (
    <div className="mt-7 flex items-center justify-between gap-3 border-t border-rule-soft pt-5">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          disabled={busy}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-ink disabled:opacity-40"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      ) : (
        <span />
      )}
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        className="inline-flex h-11 items-center gap-2 rounded-lg bg-ink px-6 text-[15px] font-semibold text-white transition-colors hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>{nextLabel} <ArrowRight className="h-4 w-4" /></>}
      </button>
    </div>
  );
}
