import { useEffect, useMemo, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { api } from '../../services/api';
import type { User } from '../../context/AuthContext';

/**
 * A roster, not a CRM. The only decision available here is whether an account
 * stays open, so that sits at the end of each row and everything else is
 * reference: who they are, when they joined, how to reach them.
 */

interface ExtendedUser extends User {
  createdAt: string;
  isActive: boolean;
  mobile?: string;
  countryCode?: string;
  country?: string;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<ExtendedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const res: any = await api.get('/admin/users', { headers: { Authorization: `Bearer ${token}` } });
      if (res.success) setUsers(res.data);
    } catch (e: any) {
      setError(e.message || 'Could not load students.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggle = async (u: ExtendedUser) => {
    const suspending = u.isActive;
    const who = [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email;
    if (suspending && !window.confirm(`Suspend ${who}? They are emailed about it.`)) return;
    setBusyId(u.id);
    try {
      const token = localStorage.getItem('adminToken');
      const res: any = await api.patch(`/admin/users/${u.id}/toggle-status`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.success) await load();
      else setError(res.message);
    } catch (e: any) {
      setError(e.message || 'Could not change this account.');
    } finally {
      setBusyId(null);
    }
  };

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? users.filter((u) =>
          [u.firstName, u.lastName, u.email, u.mobile, u.referralCode]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(q)))
      : users;
    return [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [users, search]);

  const suspended = users.filter((u) => !u.isActive).length;

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-signal" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-[30px] font-600 leading-tight text-ink">Students</h1>
        <p className="mt-1.5 max-w-[62ch] text-[14px] text-muted">
          {users.length} {users.length === 1 ? 'account' : 'accounts'}
          {suspended > 0 && `, ${suspended} suspended`}. Suspending an account blocks sign-in and
          emails the student.
        </p>
      </header>

      <div className="relative max-w-[380px]">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" strokeWidth={1.75} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, mobile or code"
          className="w-full rounded-md border border-rule bg-surface py-2.5 pl-9 pr-3 text-[14px] text-ink placeholder:text-faint focus:border-signal focus:outline-none"
        />
      </div>

      {error && <p className="text-[13px] text-declined">{error}</p>}

      {rows.length === 0 ? (
        <div className="panel px-6 py-16 text-center">
          <p className="text-[15px] font-medium text-ink">
            {search ? 'Nobody matches that' : 'No students yet'}
          </p>
          <p className="mx-auto mt-1.5 max-w-[42ch] text-[13px] text-muted">
            {search ? 'Try a different name, email or referral code.' : 'Accounts appear here once students finish signing up.'}
          </p>
        </div>
      ) : (
        <div className="panel divide-y divide-rule-soft">
          {rows.map((u) => {
            const name = [u.firstName, u.lastName].filter(Boolean).join(' ');
            return (
              <div
                key={u.id}
                className={`spine ${u.isActive ? 'spine-confirmed' : 'spine-declined'} flex flex-wrap items-center gap-x-5 gap-y-2 py-4 pr-5`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium text-ink">{name || '—'}</p>
                  <p className="truncate text-[13px] text-muted">{u.email}</p>
                </div>

                <div className="hidden w-[150px] shrink-0 md:block">
                  <p className="tabular text-[13px] text-muted">
                    {u.mobile ? `${u.countryCode ?? ''}${u.mobile}` : 'No mobile'}
                  </p>
                  {u.referralCode && (
                    <p className="tabular mt-0.5 text-[12px] text-faint">Code {u.referralCode}</p>
                  )}
                </div>

                <p className="tabular hidden w-[110px] shrink-0 text-[13px] text-faint sm:block">
                  Joined {new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                </p>

                <span className={`state ${u.isActive ? 'state-confirmed' : 'state-declined'} w-[76px] shrink-0`}>
                  {u.isActive ? 'Active' : 'Suspended'}
                </span>

                <button
                  onClick={() => toggle(u)}
                  disabled={busyId === u.id}
                  className={[
                    'shrink-0 rounded-md border px-3.5 py-2 text-[13px] font-medium transition-colors disabled:opacity-40',
                    u.isActive
                      ? 'border-rule text-declined hover:border-declined hover:bg-declined-wash'
                      : 'border-rule text-confirmed hover:border-confirmed hover:bg-confirmed-wash',
                  ].join(' ')}
                >
                  {busyId === u.id ? '…' : u.isActive ? 'Suspend' : 'Restore'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
