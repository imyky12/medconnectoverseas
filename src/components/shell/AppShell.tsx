import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Menu, X, ChevronUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * One shell for both sides of the product.
 *
 * The admin panel and the student portal used to look like two different
 * applications — a white sidebar on one, navy on the other. They are the same
 * product, so they share a shell and are told apart by the context line under
 * the wordmark, not by a different colour scheme.
 *
 * The active nav item is marked with the same status spine used throughout the
 * app rather than a filled pill, so the vocabulary stays consistent.
 */

export interface NavItem {
  name: string;
  path: string;
  icon: LucideIcon;
  end?: boolean;
  /** Small count shown on the right — used for work waiting on you. */
  badge?: number;
}

export interface NavGroup {
  /** Sentence case. Omit for an ungrouped list. */
  label?: string;
  items: NavItem[];
}

interface AppShellProps {
  /** Line under the wordmark: which side of the product you are on. */
  context: string;
  groups: NavGroup[];
  accountName: string;
  accountMeta: string;
  onSignOut: () => void;
  children: React.ReactNode;
}

export default function AppShell({
  context,
  groups,
  accountName,
  accountMeta,
  onSignOut,
  children,
}: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Close the mobile drawer whenever the route changes, or nav feels stuck.
  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setDrawerOpen(false); setAccountOpen(false); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false);
    }
    if (accountOpen) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [accountOpen]);

  const initials =
    accountName.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

  const nav = (
    <div className="flex h-full flex-col">
      {/* Wordmark */}
      <div className="flex h-14 shrink-0 items-center gap-3 px-6">
        <img src="/images/logo.png" alt="" className="h-8 w-8 rounded-md bg-white object-contain p-0.5" />
        <div className="min-w-0">
          <p className="font-display text-[15px] font-600 leading-none text-white">MedConnects</p>
          <p className="mt-1 text-[11px] leading-none text-white/45">{context}</p>
        </div>
      </div>

      <div className="mx-6 h-px bg-white/10" />

      <nav className="nav-scroll flex-1 overflow-y-auto px-3 py-2.5">
        {groups.map((group, gi) => (
          <div key={gi} className={gi > 0 ? 'mt-4' : ''}>
            {group.label && (
              <p className="mb-1 px-3 text-[11px] font-medium uppercase tracking-wide text-white/35">{group.label}</p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.end}
                    className={({ isActive }) =>
                      [
                        'group relative flex items-center gap-3 rounded-md py-2 pl-4 pr-3 text-[14px] transition-colors',
                        isActive
                          ? 'bg-white/10 font-medium text-white'
                          : 'text-white/60 hover:bg-white/[0.06] hover:text-white',
                      ].join(' ')
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {/* the status spine, reused as the active marker */}
                        <span
                          aria-hidden
                          className={[
                            'absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full transition-colors',
                            isActive ? 'bg-signal' : 'bg-transparent',
                          ].join(' ')}
                        />
                        <item.icon className="h-[17px] w-[17px] shrink-0" strokeWidth={1.75} />
                        <span className="flex-1 truncate">{item.name}</span>
                        {item.badge ? (
                          <span className="tabular rounded-full bg-holding px-1.5 py-0.5 text-[11px] font-600 leading-none text-white">
                            {item.badge}
                          </span>
                        ) : null}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Account */}
      <div className="relative shrink-0 border-t border-white/10 px-3 py-2.5" ref={accountRef}>
        {accountOpen && (
          <div className="absolute bottom-full left-3 right-3 mb-2 overflow-hidden rounded-lg border border-rule bg-surface shadow-lg">
            <div className="border-b border-rule-soft px-4 py-3">
              <p className="truncate text-[13px] font-medium text-ink">{accountName}</p>
              <p className="mt-0.5 truncate text-[12px] text-faint">{accountMeta}</p>
            </div>
            <button
              onClick={() => { setAccountOpen(false); onSignOut(); }}
              className="flex w-full items-center gap-2.5 px-4 py-3 text-[13px] font-medium text-declined transition-colors hover:bg-declined-wash"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.75} />
              Sign out
            </button>
          </div>
        )}
        <button
          onClick={() => setAccountOpen((v) => !v)}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-white/[0.06]"
        >
          <span className="tabular flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-[12px] font-600 text-white">
            {initials}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium text-white">{accountName}</span>
            <span className="block truncate text-[12px] text-white/45">{accountMeta}</span>
          </span>
          <ChevronUp className={`h-4 w-4 shrink-0 text-white/40 transition-transform ${accountOpen ? '' : 'rotate-180'}`} />
        </button>
      </div>
    </div>
  );

  /**
   * The name of the section currently open, for the header.
   *
   * Derived from the nav rather than passed in by every page, so a new screen
   * gets a correct header by existing in the sidebar and nothing else.
   */
  const current =
    groups
      .flatMap((g) => g.items)
      .filter((i) => location.pathname === i.path || location.pathname.startsWith(i.path + '/'))
      // Longest match wins, so /admin/events/new resolves to Events rather than
      // to a shorter path that happens to be a prefix.
      .sort((a, b) => b.path.length - a.path.length)[0]?.name ?? context;

  return (
    /**
     * A fixed-height application layout, not a tall document.
     *
     * It used to be `min-h-screen` with a `fixed` sidebar, which meant the whole
     * page scrolled: the browser's own scrollbar ran the full height, the page
     * heading disappeared upward, and because the sidebar was `fixed` at full
     * height its nav list grew a *second* scrollbar of its own. Two scrollbars,
     * and nothing reliably in view.
     *
     * Now the shell fills the viewport exactly and only the content column
     * scrolls, so the sidebar and header are always where you left them.
     */
    <div className="flex h-screen overflow-hidden bg-paper">
      {/* Desktop sidebar — in the flow, so it cannot be scrolled past */}
      <aside className="hidden w-[248px] shrink-0 bg-ink lg:block">{nav}</aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-ink/50 lg:hidden"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw] bg-ink lg:hidden">
            <button
              onClick={() => setDrawerOpen(false)}
              aria-label="Close menu"
              className="absolute right-3 top-4 rounded-md p-2 text-white/60 hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" strokeWidth={1.75} />
            </button>
            {nav}
          </aside>
        </>
      )}

      {/* Content column. `min-w-0` matters: without it a wide table inside
          stretches the flex item instead of scrolling within it. */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Always visible on every page — it sits outside the scrolling area
            rather than being `sticky` inside it, so it cannot drift. */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-rule bg-surface px-4 sm:px-6">
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="-ml-1 rounded-md p-2 text-muted hover:bg-paper hover:text-ink lg:hidden"
          >
            <Menu className="h-5 w-5" strokeWidth={1.75} />
          </button>

          <p className="min-w-0 flex-1 truncate font-display text-[15px] font-600 text-ink">
            <span className="lg:hidden">MedConnects</span>
            <span className="hidden lg:inline">{current}</span>
          </p>

          <button
            onClick={() => navigate('/')}
            className="shrink-0 rounded-md px-3 py-1.5 text-[13px] font-medium text-muted transition-colors hover:bg-paper hover:text-ink"
          >
            View site
          </button>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1180px] px-5 py-8 sm:px-8 lg:py-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
