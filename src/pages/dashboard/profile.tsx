import { useState, useEffect } from 'react';
import { Copy, Check, Share2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

/**
 * Two jobs on one page: confirm who you are, and share your code.
 *
 * The referral code is the only thing here a student comes to *use*, so it is
 * the largest object on the page and the rest stays quiet — rather than both
 * sitting in matching cards competing for attention.
 */

export default function Profile() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [referred, setReferred] = useState<number | null>(null);

  useEffect(() => {
    api.get<any>('/referrals')
      .then((res) => { if (res.success) setReferred(res.data.referredCount); })
      .catch(() => {});
  }, []);

  const code = user?.referralCode ?? '';

  const copy = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const share = () => {
    if (navigator.share && code) {
      navigator.share({
        title: 'Join MedConnects Overseas',
        text: `Use my code ${code} when you sign up and you'll get a discount on your first course.`,
        url: window.location.origin,
      }).catch(() => {});
    } else {
      copy();
    }
  };

  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || '—';

  // Only what the auth context actually carries — country and mobile live on
  // the user document but are not returned to the client.
  const details: [string, string][] = [
    ['Name', name],
    ['Email', user?.email ?? '—'],
  ];

  return (
    <div className="space-y-10">
      <header>
        <h1 className="font-display text-[32px] font-600 leading-tight text-ink">Your account</h1>
        <p className="mt-2 max-w-[54ch] text-[15px] leading-relaxed text-muted">
          Your details, and the code you share with friends so they get money off their first course.
        </p>
      </header>

      {/* Referral — the thing you came to use */}
      <section className="panel overflow-hidden">
        <div className="border-b border-rule-soft px-6 py-5">
          <h2 className="font-display text-[18px] font-600 text-ink">Invite a friend</h2>
          <p className="mt-1 max-w-[58ch] text-[13px] text-muted">
            Send a friend your code. They save money on their first course, and once they join we email you a reward code to spend on anything.
          </p>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-6 px-6 py-6">
          <div>
            <p className="text-[15px] text-muted">Your code</p>
            <p className="tabular mt-1.5 text-[40px] font-700 leading-none tracking-[0.08em] text-ink">
              {code || '····'}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={copy}
              disabled={!code}
              className="inline-flex items-center gap-2 rounded-md bg-signal px-4 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-signal-deep disabled:opacity-40"
            >
              {copied
                ? <><Check className="h-4 w-4" strokeWidth={2} /> Copied</>
                : <><Copy className="h-4 w-4" strokeWidth={1.75} /> Copy code</>}
            </button>
            <button
              onClick={share}
              disabled={!code}
              className="inline-flex items-center gap-2 rounded-md border border-rule px-4 py-2.5 text-[14px] font-medium text-ink transition-colors hover:border-signal hover:text-signal disabled:opacity-40"
            >
              <Share2 className="h-4 w-4" strokeWidth={1.75} /> Share
            </button>
          </div>
        </div>

        <div className="border-t border-rule-soft px-6 py-4">
          <p className="text-[15px] text-muted">
            {referred === null
              ? 'Counting…'
              : referred === 0
                ? 'Nobody has used your code yet — you will be the first to know when they do.'
                : `${referred} ${referred === 1 ? 'person has' : 'people have'} signed up with your code.`}
          </p>
        </div>
      </section>

      {/* Details — quiet by comparison */}
      <section>
        <h2 className="mb-4 font-display text-[19px] font-600 text-ink">Your details</h2>
        <dl className="divide-y divide-rule-soft border-t border-rule">
          {details.map(([k, v]) => (
            <div key={k} className="flex flex-wrap items-baseline justify-between gap-4 py-3.5">
              <dt className="text-[15px] text-muted">{k}</dt>
              <dd className="text-[15px] text-ink">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-[14px] text-muted">
          Need any of this changed? Reply to any email from us and we will sort it out.
        </p>
      </section>
    </div>
  );
}
