import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { api } from '../../services/api';

/**
 * A staff door, not a marketing page. It carries the same navy as the rest of
 * the admin side so there is no doubt which system you are entering, and says
 * nothing about the product — anyone here already knows what it is.
 */

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  React.useEffect(() => {
    if (localStorage.getItem('adminToken')) navigate('/admin/dashboard', { replace: true });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res: any = await api.post('/admin/auth/login', { email, password });
      if (res.success) {
        localStorage.setItem('adminToken', res.data.tokens.access.token);
        localStorage.setItem('adminUser', JSON.stringify(res.data.admin));
        navigate('/admin/dashboard');
      } else {
        setError(res.message || 'Those details were not recognised.');
      }
    } catch (err: any) {
      setError(err.message || 'Could not sign you in. Try again.');
    } finally {
      setLoading(false);
    }
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

        <h1 className="font-display text-[24px] font-600 leading-tight text-white">Sign in</h1>
        <p className="mt-1.5 text-[14px] text-white/55">
          Staff access to payments, events and students.
        </p>

        <form onSubmit={submit} className="mt-7 space-y-4">
          <div>
            <label htmlFor="email" className="block text-[13px] font-medium text-white/80">Email</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-md border border-white/15 bg-white/[0.06] px-3 py-2.5 text-[14px] text-white placeholder:text-white/30 focus:border-signal focus:bg-white/10 focus:outline-none"
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
              className="mt-1.5 w-full rounded-md border border-white/15 bg-white/[0.06] px-3 py-2.5 text-[14px] text-white placeholder:text-white/30 focus:border-signal focus:bg-white/10 focus:outline-none"
            />
          </div>

          {error && (
            <p className="spine spine-declined py-1.5 text-[13px] text-white/85">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-md bg-signal px-4 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-signal-deep disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-8 text-[12px] text-white/35">
          Locked out? Ask another administrator to reset your access.
        </p>
      </div>
    </div>
  );
}
