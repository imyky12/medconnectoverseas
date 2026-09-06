import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Calendar, Download, Loader2, FileText, Lock } from 'lucide-react';
import Navbar from '@/components/landing/navbar';
import Footer from '@/components/landing/footer';
import NewsletterSignup from '@/components/landing/newsletter-signup';
import NewsletterGate from '@/components/landing/newsletter-gate';
import { api } from '@/services/api';

/**
 * Med Nexus — the published issues.
 *
 * This page previously listed three hardcoded issues with `image` paths that did
 * not exist and a Download button wired to nothing. It now reads real issues
 * from the database.
 *
 * What arrives here is **only what describes an issue** — title, edition,
 * summary, cover, date. The PDF address is never sent to the browser; reading an
 * issue goes through the gate dialog, which trades a verified email for a
 * short-lived ticket. So there is nothing on this page to copy out.
 */

interface Issue {
  _id: string;
  title: string;
  edition: string;
  summary: string;
  coverImageUrl?: string;
  publishedAt?: string;
  downloadCount?: number;
  pageCount?: number;
}

export default function NewsletterPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [wanted, setWanted] = useState<Issue | null>(null);
  const [params, setParams] = useSearchParams();
  const [emailedNotice, setEmailedNotice] = useState('');

  /**
   * A link from the announcement email arrives as `?issue=…&ticket=…`.
   *
   * The ticket was minted for that subscriber's address, so they have already
   * proved who they are — asking for the email and a code again would be asking
   * them to prove the same thing twice. The download starts on arrival.
   *
   * The parameters are stripped from the address bar straight away so the ticket
   * is not left sitting in history or copied out of the URL bar.
   */
  useEffect(() => {
    const issue = params.get('issue');
    const ticket = params.get('ticket');
    if (!issue || !ticket) return;

    setEmailedNotice('Your download should be starting — check your downloads if you do not see it.');
    window.location.href =
      `${(import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api/v1'}` +
      `/newsletters/${issue}/download?ticket=${encodeURIComponent(ticket)}`;

    const next = new URLSearchParams(params);
    next.delete('issue');
    next.delete('ticket');
    setParams(next, { replace: true });
  }, [params, setParams]);

  useEffect(() => {
    let cancelled = false;
    api
      .get<any>('/newsletters')
      .then((res: any) => {
        if (cancelled) return;
        if (res?.success) setIssues(res.data ?? []);
        else setFailed(true);
      })
      .catch(() => { if (!cancelled) setFailed(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <section className="bg-[#041c44] px-4 py-16 text-white">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="text-3xl font-bold sm:text-4xl">Med Nexus</h1>
          <p className="mx-auto mt-4 max-w-2xl text-blue-100">
            Our newsletter for medical students heading overseas — licensing deadlines, scholarship
            windows, and what students who have already made the move wish they had known.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-14">
        {emailedNotice && (
          <p className="mx-auto mb-8 max-w-xl rounded-lg bg-green-50 px-5 py-3.5 text-center text-sm font-medium text-green-800">
            {emailedNotice}
          </p>
        )}
        {loading ? (
          <div className="flex min-h-[30vh] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[#1e6ff1]" />
          </div>
        ) : failed ? (
          <p className="mx-auto max-w-md rounded-xl border border-gray-200 bg-gray-50 px-6 py-10 text-center text-gray-600">
            We could not load the issues just now. Please try again shortly.
          </p>
        ) : issues.length === 0 ? (
          <div className="mx-auto max-w-md rounded-xl border border-gray-200 bg-gray-50 px-6 py-12 text-center">
            <FileText className="mx-auto h-7 w-7 text-gray-400" />
            <h2 className="mt-3 text-lg font-semibold text-[#041c44]">No issues published yet</h2>
            <p className="mt-1.5 text-sm text-gray-600">
              Subscribe below and the first one will land in your inbox.
            </p>
          </div>
        ) : (
          <>
            <h2 className="mb-2 text-2xl font-bold text-[#041c44]">Past issues</h2>
            <p className="mb-8 text-gray-600">
              Free to read. We ask for your email once, to check it is real.
            </p>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {issues.map((issue) => (
                <article
                  key={issue._id}
                  className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-lg"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                    {issue.coverImageUrl ? (
                      <img
                        src={issue.coverImageUrl}
                        alt={`Cover of ${issue.title}`}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[#041c44]">
                        <FileText className="h-10 w-10 text-white/40" />
                      </div>
                    )}
                    <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-[#041c44]">
                      {issue.edition}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="text-lg font-semibold leading-snug text-[#041c44]">{issue.title}</h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-600">{issue.summary}</p>

                    <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                      {issue.publishedAt && (
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(issue.publishedAt).toLocaleDateString('en-GB', {
                            month: 'long', year: 'numeric',
                          })}
                        </span>
                      )}
                      {issue.pageCount ? <span>{issue.pageCount} pages</span> : null}
                      {issue.downloadCount ? <span>{issue.downloadCount} reads</span> : null}
                    </div>

                    <button
                      onClick={() => setWanted(issue)}
                      className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-[#041c44] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#031533]"
                    >
                      <Download className="h-4 w-4" /> Read this issue
                    </button>
                    {/* Said plainly, so the email step is not a surprise after
                        the click — nobody likes discovering a gate. */}
                    <p className="mt-2 inline-flex items-center justify-center gap-1.5 text-[11px] text-gray-500">
                      <Lock className="h-3 w-3" /> Verify your email to open it
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="border-t border-gray-200 bg-gray-50 px-4 py-14">
        <div className="container mx-auto max-w-lg text-center">
          <h2 className="text-2xl font-bold text-[#041c44]">Get the next issue first</h2>
          <p className="mt-2 text-gray-600">
            One email when a new issue is out. Nothing else.
          </p>
          <div className="mt-6 text-left">
            <NewsletterSignup />
          </div>
        </div>
      </section>

      <NewsletterGate open={!!wanted} onClose={() => setWanted(null)} newsletter={wanted} />

      <Footer />
    </div>
  );
}
