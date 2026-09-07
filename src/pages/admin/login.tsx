import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, MailCheck, ShieldCheck } from 'lucide-react';
import { api } from '../../services/api';

/**
 * A staff door, not a marketing page. It carries the same navy as the rest of
 * the admin side so there is no doubt which system you are entering, and says
 * nothing about the product — anyone here already knows what it is.
 *
 * Three panels, one at a time:
 *
 *   password → code → (first sign-in only) choose your own password
 *
 * The server decides which panel comes next by naming a `stage`, so the browser
 * cannot skip one: there is no "logged in" state here until the response
 * actually carries tokens.
 */

type Stage = 'password' | 'otp' | 'set-password';

const fieldCls =
  'mt-1.5 w-full rounded-md border border-white/15 bg-white/[0.06] px-3 py-2.5 text-[14px] text-white placeholder:text-white/30 focus:border-signal focus:bg-white/10 focus:outline-none';

export default function AdminLogin() {
  const [stage, setStage] = useState<Stage>('password');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [otp, setOtp] = useState('');
  const [challengeToken, setChallengeToken] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [expiryMinutes, setExpiryMinutes] = useState(5);

  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const otpRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem('adminToken')) navigate('/admin/dashboard', { replace: true });
  }, [navigate]);

  // Moving to a new panel should put the cursor in its first field — otherwise
  // the code arrives and you have to go looking for the box.
  useEffect(() => {
    if (stage === 'otp') otpRef.current?.focus();
  }, [stage]);

  /** Every response goes through here, so a stage change can only come from the server. */
  const applyResponse = (data: any) => {
    if (data?.stage === 'done' && data?.tokens?.access?.token) {
      localStorage.setItem('adminToken', data.tokens.access.token);
      localStorage.setItem('adminUser', JSON.stringify(data.admin));
      navigate('/admin/dashboard');
      return;
    }
    if (data?.stage === 'otp') {
      setChallengeToken(data.challengeToken);
      setSentTo(data.sentTo ?? '');
      setExpiryMinutes(data.expiryMinutes ?? 5);
      setOtp('');
      setStage('otp');
      return;
    }
    if (data?.stage === 'set-password') {
      setResetToken(data.resetToken);
      setStage('set-password');
      return;
    }
    setError('Something unexpected came back. Start again.');
  };

  const run = async (fn: () => Promise<any>, fallback: string) => {
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const res: any = await fn();
      if (res?.success) applyResponse(res.data);
      else setError(res?.message || fallback);
    } catch (err: any) {
      setError(err?.message || fallback);
    } finally {
      setLoading(false);
    }
  };

  const submitPassword = (e: React.FormEvent) => {
    e.preventDefault();
    void run(
      () => api.post('/admin/auth/login', { email, password }),
      'Could not sign you in. Try again.',
    );
  };

  const submitOtp = (e: React.FormEvent) => {
    e.preventDefault();
    void run(
      () => api.post('/admin/auth/verify-otp', { challengeToken, otp }),
      'Could not check that code. Try again.',
    );
  };

  const resend = async () => {
    setLoading(true);
    setError('');
    try {
      const res: any = await api.post('/admin/auth/resend-otp', { challengeToken });
      if (res?.success) {
        applyResponse(res.data);
        setNotice('A new code is on its way.');
      } else {
        setError(res?.message || 'Could not send a new code.');
      }
    } catch (err: any) {
      setError(err?.message || 'Could not send a new code.');
    } finally {
      setLoading(false);
    }
  };

  const submitNewPassword = (e: React.FormEvent) => {
    e.preventDefault();
    // Checked here as well as on the server so the mismatch is caught before a
    // round trip — the server still has the final say on strength.
    if (newPassword !== confirmPassword) {
      setError('The two passwords do not match.');
      return;
    }
    void run(
      () => api.post('/admin/auth/set-password', { resetToken, newPassword }),
      'Could not set that password. Try again.',
    );
  };

  /** Back to the beginning — the challenge token is abandoned, not reused. */
  const startOver = () => {
    setStage('password');
    setChallengeToken('');
    setResetToken('');
    setOtp('');
    setPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setNotice('');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-5 py-12">
      <div className="w-full max-w-[380px]">
        <div className="mb-8 flex items-center gap-3">
          <img src="/images/logo.png" alt="" className="h-10 w-10 rounded-md bg-white object-contain p-1" />
          <div>
            <p className="font-display text-[17px] font-600 leading-none text-white">MedConnects</p>
            <p className="mt-1 text-[12px] leading-none text-white/45">Admin</p>
          </div>
        </div>

        {stage === 'password' && (
          <>
            <h1 className="font-display text-[24px] font-600 leading-tight text-white">Sign in</h1>
            <p className="mt-1.5 text-[14px] text-white/55">
              Staff access to payments, events and students.
            </p>

            <form onSubmit={submitPassword} className="mt-7 space-y-4">
              <div>
                <label htmlFor="email" className="block text-[13px] font-medium text-white/80">Email</label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={fieldCls}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-[13px] font-medium text-white/80">Password</label>
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={fieldCls}
                />
              </div>

              {error && <p className="spine spine-declined py-1.5 text-[13px] text-white/85">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-md bg-signal px-4 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-signal-deep disabled:opacity-60"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? 'Checking…' : 'Continue'}
              </button>
            </form>

            <p className="mt-6 flex items-start gap-2 text-[12px] leading-relaxed text-white/35">
              <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
              We will email a one-time code to finish signing in.
            </p>
          </>
        )}

        {stage === 'otp' && (
          <>
            <h1 className="font-display text-[24px] font-600 leading-tight text-white">Check your email</h1>
            <p className="mt-1.5 text-[14px] leading-relaxed text-white/55">
              We sent a 6-digit code to <span className="text-white/80">{sentTo || 'your address'}</span>.
              It expires in {expiryMinutes} minutes.
            </p>

            <form onSubmit={submitOtp} className="mt-7 space-y-4">
              <div>
                <label htmlFor="otp" className="block text-[13px] font-medium text-white/80">Code</label>
                <input
                  ref={otpRef}
                  id="otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  className={`${fieldCls} text-center text-[20px] tracking-[0.5em]`}
                />
              </div>

              {notice && (
                <p className="flex items-center gap-2 text-[13px] text-white/70">
                  <MailCheck className="h-3.5 w-3.5" strokeWidth={1.75} /> {notice}
                </p>
              )}
              {error && <p className="spine spine-declined py-1.5 text-[13px] text-white/85">{error}</p>}

              <button
                type="submit"
                disabled={loading || otp.length < 6}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-md bg-signal px-4 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-signal-deep disabled:opacity-60"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? 'Checking…' : 'Sign in'}
              </button>
            </form>

            <div className="mt-6 flex items-center justify-between text-[12px]">
              <button onClick={startOver} className="flex items-center gap-1.5 text-white/45 hover:text-white/80">
                <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} /> Start again
              </button>
              <button onClick={resend} disabled={loading} className="text-white/45 hover:text-white/80 disabled:opacity-50">
                Send a new code
              </button>
            </div>
          </>
        )}

        {stage === 'set-password' && (
          <>
            <h1 className="font-display text-[24px] font-600 leading-tight text-white">Choose your password</h1>
            <p className="mt-1.5 text-[14px] leading-relaxed text-white/55">
              You signed in with a password somebody else set. Pick your own now — from here on nobody
              else knows it.
            </p>

            <form onSubmit={submitNewPassword} className="mt-7 space-y-4">
              <div>
                <label htmlFor="new-password" className="block text-[13px] font-medium text-white/80">New password</label>
                <input
                  id="new-password"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={fieldCls}
                />
                <p className="mt-1.5 text-[12px] text-white/35">
                  At least 12 characters, with a letter and a number.
                </p>
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-[13px] font-medium text-white/80">Repeat it</label>
                <input
                  id="confirm-password"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={fieldCls}
                />
              </div>

              {error && <p className="spine spine-declined py-1.5 text-[13px] text-white/85">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-md bg-signal px-4 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-signal-deep disabled:opacity-60"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? 'Saving…' : 'Save and continue'}
              </button>
            </form>
          </>
        )}

        <p className="mt-8 text-[12px] text-white/35">
          Locked out? Ask another administrator to reset your access.
        </p>
      </div>
    </div>
  );
}
