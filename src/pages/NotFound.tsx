import { Link, useLocation } from 'react-router-dom';
import { Home, Calendar, Mail } from 'lucide-react';
import Navbar from '../components/landing/navbar';
import Footer from '../components/landing/footer';

/**
 * What a mistyped or outdated URL lands on.
 *
 * Previously there was no catch-all route at all, so React Router matched
 * nothing and rendered nothing — a white screen with no navigation and no way
 * back. Keeping the real navbar and footer here matters more than the message
 * does: whatever brought someone to a dead URL, they can carry on from it.
 */

export default function NotFound() {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4 py-20 sm:py-28">
        <div className="text-center max-w-lg">
          <p className="text-[#1e6ff1] font-semibold tracking-wide">404</p>

          <h1 className="mt-3 text-3xl sm:text-4xl font-bold text-[#041c44]">
            We couldn&rsquo;t find that page
          </h1>

          <p className="mt-4 text-gray-600 leading-relaxed">
            There&rsquo;s nothing at{' '}
            <span className="font-mono text-sm bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded break-all">
              {pathname}
            </span>
            . The link may be out of date, or the address may have a typo in it.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-xl bg-[#041c44] px-6 py-3 font-medium text-white transition-colors hover:bg-[#031533]"
            >
              <Home className="h-4 w-4" /> Go to the home page
            </Link>
            <Link
              to="/events"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-6 py-3 font-medium text-[#041c44] transition-colors hover:border-[#041c44]"
            >
              <Calendar className="h-4 w-4" /> See upcoming events
            </Link>
          </div>

          <p className="mt-8 text-sm text-gray-500">
            Think this page should exist?{' '}
            <a
              href="mailto:info@medconnectsoverseas.com"
              className="inline-flex items-center gap-1 font-medium text-[#1e6ff1] hover:underline"
            >
              <Mail className="h-3.5 w-3.5" /> Let us know
            </a>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
