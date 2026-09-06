import { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, X, Trash2 } from 'lucide-react';
import { api } from '../../services/api';

/**
 * Two things happen here: writing a new discount, and checking on the ones
 * already out there. The form used to be an eleven-field wall labelled
 * "Advanced Coupon Engine"; it is now three plain questions — what the discount
 * is, where it works, and who may use it — with the narrowing options folded
 * away until they are wanted.
 */

interface CouponType {
  _id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  maxUses: number;
  usedCount: number;
  validUntil: string;
  isActive: boolean;
  appliesTo?: 'course' | 'event' | 'both';
  usesPerUser?: number;
  minPurchaseAmount?: number;
  maxDiscountAmount?: number;
  allowedEmails?: string[];
  firstTimeUsersOnly?: boolean;
}

const isExpired = (c: CouponType) => new Date(c.validUntil).getTime() < Date.now();
const isSpent = (c: CouponType) => c.usedCount >= c.maxUses;

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<CouponType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showMore, setShowMore] = useState(false);

  const [code, setCode] = useState('');
  const [type, setType] = useState<'percentage' | 'fixed'>('percentage');
  const [value, setValue] = useState('');
  const [maxUses, setMaxUses] = useState('100');
  const [validUntil, setValidUntil] = useState('');
  const [appliesTo, setAppliesTo] = useState<'course' | 'event' | 'both'>('both');
  const [usesPerUser, setUsesPerUser] = useState('1');
  const [minPurchaseAmount, setMinPurchase] = useState('');
  const [maxDiscountAmount, setMaxDiscount] = useState('');
  const [firstTimeUsersOnly, setFirstTimeOnly] = useState(false);
  const [allowedEmails, setAllowedEmails] = useState<string[]>([]);
  const [tempEmail, setTempEmail] = useState('');

  const token = localStorage.getItem('adminToken');

  const load = async () => {
    try {
      const res: any = await api.get('/admin/coupons', { headers: { Authorization: `Bearer ${token}` } });
      if (res.success) setCoupons(res.data);
    } catch (e: any) {
      setError(e.message || 'Could not load coupons.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const reset = () => {
    setCode(''); setValue(''); setValidUntil(''); setMaxUses('100');
    setUsesPerUser('1'); setMinPurchase(''); setMaxDiscount('');
    setFirstTimeOnly(false); setAllowedEmails([]); setAppliesTo('both'); setShowMore(false);
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!code.trim() || !value || !validUntil) {
      setError('A code, an amount and an expiry date are needed.');
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        code: code.trim().toUpperCase(),
        type,
        value: Number(value),
        maxUses: Number(maxUses),
        validFrom: new Date(),
        validUntil: new Date(validUntil),
        appliesTo,
        usesPerUser: Number(usesPerUser),
        firstTimeUsersOnly,
        isActive: true,
        allowedEmails: allowedEmails.length ? allowedEmails : undefined,
        minPurchaseAmount: minPurchaseAmount ? Number(minPurchaseAmount) : undefined,
        maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : undefined,
      };
      const res: any = await api.post('/admin/coupons', payload, { headers: { Authorization: `Bearer ${token}` } });
      if (res.success) { reset(); await load(); }
      else setError(res.message || 'Could not create that coupon.');
    } catch (err: any) {
      setError(err.message || 'Could not create that coupon.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c: CouponType) => {
    const note = c.usedCount > 0
      ? `${c.code} has been used ${c.usedCount} ${c.usedCount === 1 ? 'time' : 'times'}. Deleting it does not undo those discounts. Continue?`
      : `Delete ${c.code}?`;
    if (!window.confirm(note)) return;
    try {
      await api.delete(`/admin/coupons/${c._id}`, { headers: { Authorization: `Bearer ${token}` } });
      setCoupons((prev) => prev.filter((x) => x._id !== c._id));
    } catch (e: any) {
      setError(e.message || 'Could not delete that coupon.');
    }
  };

  const { live, finished } = useMemo(() => ({
    live: coupons.filter((c) => c.isActive && !isExpired(c) && !isSpent(c)),
    finished: coupons.filter((c) => !c.isActive || isExpired(c) || isSpent(c)),
  }), [coupons]);

  const preview = value
    ? type === 'percentage' ? `${value}% off` : `₹${Number(value).toLocaleString('en-IN')} off`
    : 'a discount';

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-signal" />
      </div>
    );
  }

  const Row = ({ c, dim }: { c: CouponType; dim?: boolean }) => {
    const reason = !c.isActive ? 'Switched off' : isExpired(c) ? 'Expired' : isSpent(c) ? 'Fully used' : null;
    return (
      <div className={`spine ${dim ? 'spine-past' : 'spine-confirmed'} flex flex-wrap items-center gap-x-5 gap-y-2 py-4 pr-5`}>
        <div className="w-[150px] shrink-0">
          <p className="tabular text-[15px] font-600 tracking-[0.04em] text-ink">{c.code}</p>
          <p className="mt-0.5 text-[12px] text-muted">
            {c.type === 'percentage' ? `${c.value}% off` : `₹${c.value} off`}
          </p>
        </div>

        <div className="min-w-0 flex-1 text-[13px] text-muted">
          <p>
            Works on {c.appliesTo === 'both' ? 'courses and events' : c.appliesTo === 'course' ? 'courses' : 'events'}
            {c.firstTimeUsersOnly && ' · first purchase only'}
            {c.allowedEmails?.length ? ` · locked to ${c.allowedEmails.length} ${c.allowedEmails.length === 1 ? 'person' : 'people'}` : ''}
          </p>
          <p className="tabular mt-0.5 text-[12px] text-faint">
            Expires {new Date(c.validUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>

        <div className="w-[90px] shrink-0 text-right">
          <p className="tabular text-[14px] font-600 text-ink">{c.usedCount}/{c.maxUses}</p>
          <p className="mt-0.5 text-[12px] text-faint">used</p>
        </div>

        {reason && <span className="state state-muted w-[86px] shrink-0 text-right">{reason}</span>}

        <button
          onClick={() => remove(c)}
          title={`Delete ${c.code}`}
          className="shrink-0 rounded-md border border-rule p-2 text-muted transition-colors hover:border-declined hover:text-declined"
        >
          <Trash2 className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-10">
      <header>
        <h1 className="font-display text-[30px] font-600 leading-tight text-ink">Coupons</h1>
        <p className="mt-1.5 max-w-[62ch] text-[14px] text-muted">
          Discounts students type in at checkout. A coupon stops working once it expires or its
          limit is reached.
        </p>
      </header>

      {/* Create */}
      <section className="panel">
        <div className="border-b border-rule-soft px-6 py-4">
          <h2 className="font-display text-[18px] font-600 text-ink">New coupon</h2>
          <p className="mt-1 text-[13px] text-muted">
            {code ? <>Students type <span className="tabular font-600 text-ink">{code.toUpperCase()}</span> and get {preview}.</> : 'Give it a code, an amount and a date it stops working.'}
          </p>
        </div>

        <form onSubmit={create} className="space-y-6 px-6 py-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2 lg:col-span-1">
              <label htmlFor="code" className="block text-[13px] font-medium text-ink">Code</label>
              <input
                id="code" value={code} onChange={(e) => setCode(e.target.value)}
                placeholder="WELCOME50"
                className="tabular mt-1.5 w-full rounded-md border border-rule bg-surface px-3 py-2.5 text-[14px]  tracking-[0.05em] text-ink placeholder:normal-case placeholder:tracking-normal placeholder:text-faint focus:border-signal focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-ink">Discount</label>
              <div className="mt-1.5 flex">
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as 'percentage' | 'fixed')}
                  className="rounded-l-md border border-r-0 border-rule bg-surface px-2.5 py-2.5 text-[14px] text-ink focus:border-signal focus:outline-none"
                >
                  <option value="percentage">%</option>
                  <option value="fixed">₹</option>
                </select>
                <input
                  type="number" min={1} max={type === 'percentage' ? 100 : undefined}
                  value={value} onChange={(e) => setValue(e.target.value)}
                  placeholder={type === 'percentage' ? '25' : '500'}
                  className="tabular w-full rounded-r-md border border-rule bg-surface px-3 py-2.5 text-[14px] text-ink placeholder:text-faint focus:border-signal focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="until" className="block text-[13px] font-medium text-ink">Stops working</label>
              <input
                id="until" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)}
                className="tabular mt-1.5 w-full rounded-md border border-rule bg-surface px-3 py-2.5 text-[14px] text-ink focus:border-signal focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="uses" className="block text-[13px] font-medium text-ink">Total uses</label>
              <input
                id="uses" type="number" min={1} value={maxUses} onChange={(e) => setMaxUses(e.target.value)}
                className="tabular mt-1.5 w-full rounded-md border border-rule bg-surface px-3 py-2.5 text-[14px] text-ink focus:border-signal focus:outline-none"
              />
            </div>
          </div>

          <div>
            <p className="text-[13px] font-medium text-ink">Works on</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {([['both', 'Courses and events'], ['course', 'Courses only'], ['event', 'Events only']] as const).map(([k, label]) => (
                <button
                  key={k} type="button" onClick={() => setAppliesTo(k)}
                  className={[
                    'rounded-md px-3.5 py-2 text-[13px] transition-colors',
                    appliesTo === k ? 'bg-ink font-medium text-white' : 'border border-rule text-muted hover:text-ink',
                  ].join(' ')}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {!showMore ? (
            <button type="button" onClick={() => setShowMore(true)} className="text-[13px] font-medium text-signal hover:text-signal-deep">
              Add limits — minimum spend, per-person cap, specific people
            </button>
          ) : (
            <div className="space-y-4 border-t border-rule-soft pt-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="per" className="block text-[13px] font-medium text-ink">Uses per person</label>
                  <input id="per" type="number" min={1} value={usesPerUser} onChange={(e) => setUsesPerUser(e.target.value)}
                    className="tabular mt-1.5 w-full rounded-md border border-rule bg-surface px-3 py-2.5 text-[14px] text-ink focus:border-signal focus:outline-none" />
                </div>
                <div>
                  <label htmlFor="min" className="block text-[13px] font-medium text-ink">Minimum spend</label>
                  <input id="min" type="number" min={0} value={minPurchaseAmount} onChange={(e) => setMinPurchase(e.target.value)} placeholder="No minimum"
                    className="tabular mt-1.5 w-full rounded-md border border-rule bg-surface px-3 py-2.5 text-[14px] text-ink placeholder:text-faint focus:border-signal focus:outline-none" />
                </div>
                <div>
                  <label htmlFor="cap" className="block text-[13px] font-medium text-ink">Most it can take off</label>
                  <input id="cap" type="number" min={0} value={maxDiscountAmount} onChange={(e) => setMaxDiscount(e.target.value)} placeholder="No cap"
                    className="tabular mt-1.5 w-full rounded-md border border-rule bg-surface px-3 py-2.5 text-[14px] text-ink placeholder:text-faint focus:border-signal focus:outline-none" />
                </div>
              </div>

              <label className="flex items-center gap-2.5 text-[14px] text-ink">
                <input type="checkbox" checked={firstTimeUsersOnly} onChange={(e) => setFirstTimeOnly(e.target.checked)} className="h-4 w-4 accent-[#1e6ff1]" />
                Only for someone&rsquo;s first purchase
              </label>

              <div>
                <label htmlFor="email" className="block text-[13px] font-medium text-ink">Lock to specific people</label>
                <p className="mt-0.5 text-[12px] text-faint">Leave empty and anyone with the code can use it.</p>
                <div className="mt-1.5 flex gap-2">
                  <input
                    id="email" type="email" value={tempEmail} onChange={(e) => setTempEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const v = tempEmail.trim().toLowerCase();
                        if (v && !allowedEmails.includes(v)) setAllowedEmails([...allowedEmails, v]);
                        setTempEmail('');
                      }
                    }}
                    placeholder="student@example.com"
                    className="flex-1 rounded-md border border-rule bg-surface px-3 py-2.5 text-[14px] text-ink placeholder:text-faint focus:border-signal focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const v = tempEmail.trim().toLowerCase();
                      if (v && !allowedEmails.includes(v)) setAllowedEmails([...allowedEmails, v]);
                      setTempEmail('');
                    }}
                    className="rounded-md border border-rule px-4 text-[13px] font-medium text-ink hover:border-signal hover:text-signal"
                  >
                    Add
                  </button>
                </div>
                {allowedEmails.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {allowedEmails.map((em) => (
                      <li key={em} className="inline-flex items-center gap-1.5 rounded-md bg-rule-soft px-2.5 py-1 text-[12px] text-ink">
                        {em}
                        <button type="button" onClick={() => setAllowedEmails(allowedEmails.filter((x) => x !== em))} aria-label={`Remove ${em}`}>
                          <X className="h-3 w-3" strokeWidth={2} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {error && <p className="text-[13px] text-declined">{error}</p>}

          <div className="border-t border-rule-soft pt-5">
            <button
              type="submit" disabled={saving}
              className="inline-flex items-center gap-2 rounded-md bg-signal px-5 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-signal-deep disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" strokeWidth={2} />}
              {saving ? 'Creating…' : 'Create coupon'}
            </button>
          </div>
        </form>
      </section>

      {live.length > 0 && (
        <section>
          <h2 className="mb-1 font-display text-[15px] font-600 text-muted">Working now</h2>
          <div className="panel divide-y divide-rule-soft">
            {live.map((c) => <Row key={c._id} c={c} />)}
          </div>
        </section>
      )}

      {finished.length > 0 && (
        <section>
          <h2 className="mb-1 font-display text-[15px] font-600 text-muted">No longer working</h2>
          <div className="panel divide-y divide-rule-soft">
            {finished.map((c) => <Row key={c._id} c={c} dim />)}
          </div>
        </section>
      )}

      {coupons.length === 0 && (
        <div className="panel px-6 py-14 text-center">
          <p className="text-[15px] font-medium text-ink">No coupons yet</p>
          <p className="mx-auto mt-1.5 max-w-[42ch] text-[13px] text-muted">
            Create one above and share the code with students.
          </p>
        </div>
      )}
    </div>
  );
}
