import { useEffect, useCallback } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { BookOpen, ShoppingBag, CalendarDays, Receipt, User, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import AppShell, { type NavGroup } from '../shell/AppShell';

export default function UserLayout() {
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleUnauthorized = useCallback(() => {
    logout();
    navigate('/onboarding', { replace: true });
  }, [logout, navigate]);

  useEffect(() => {
    if (isLoading) return;
    // Someone signed out has no onboarding to finish — sending them there only
    // to be bounced again to the home page is a redirect for nothing.
    if (!isAuthenticated) navigate('/', { replace: true });
    else if (!user?.isOnboardingComplete) navigate('/onboarding', { replace: true });
  }, [isAuthenticated, isLoading, user, navigate]);

  useEffect(() => {
    if (isAuthenticated) {
      api.setUnauthorizedHandler(handleUnauthorized);
      return () => api.clearUnauthorizedHandler();
    }
  }, [isAuthenticated, handleUnauthorized]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-signal" />
          <p className="text-[13px] text-muted">Loading your portal</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user?.isOnboardingComplete) return null;

  // Grouped by what the student is doing: learning, or attending something.
  const groups: NavGroup[] = [
    {
      label: 'Learning',
      items: [
        { name: 'My courses', path: '/dashboard', icon: BookOpen, end: true },
        { name: 'Browse courses', path: '/dashboard/marketplace', icon: ShoppingBag },
      ],
    },
    {
      label: 'Events',
      items: [{ name: 'Events', path: '/dashboard/events', icon: CalendarDays }],
    },
    {
      label: 'Account',
      items: [
        { name: 'Payments', path: '/dashboard/orders', icon: Receipt },
        { name: 'Profile & referrals', path: '/dashboard/profile', icon: User },
      ],
    },
  ];

  const name = user?.firstName ? `${user.firstName} ${user.lastName ?? ''}`.trim() : 'My account';

  return (
    <AppShell
      context="Student portal"
      groups={groups}
      accountName={name}
      accountMeta={user?.email ?? ''}
      onSignOut={() => { logout(); navigate('/'); }}
    >
      <Outlet />
    </AppShell>
  );
}
