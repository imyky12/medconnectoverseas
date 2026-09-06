import { useEffect, useCallback, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardList, CalendarDays, BookOpen, Tag, Users, Wallet,
} from 'lucide-react';
import { api } from '../../services/api';
import AppShell, { type NavGroup } from '../shell/AppShell';

function isTokenExpired(token: string): boolean {
  try {
    return JSON.parse(atob(token.split('.')[1])).exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState<number>(0);

  const redirectToLogin = useCallback(() => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    navigate('/admin/login', { replace: true });
  }, [navigate]);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token || isTokenExpired(token)) { redirectToLogin(); return; }
    api.setUnauthorizedHandler(redirectToLogin);
    return () => api.clearUnauthorizedHandler();
  }, [redirectToLogin]);

  // The number of payments waiting on a decision is the one thing an admin
  // needs to see from anywhere, so it rides in the nav rather than only on
  // the dashboard.
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;
    let cancelled = false;
    api
      .get<any>('/admin/orders?status=pending', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => { if (!cancelled) setPendingCount(res?.data?.length ?? 0); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const admin = (() => {
    try { return JSON.parse(localStorage.getItem('adminUser') || '{}'); } catch { return {}; }
  })();

  // Grouped by the job, not by database table.
  const groups: NavGroup[] = [
    {
      items: [{ name: 'Overview', path: '/admin/dashboard', icon: LayoutDashboard }],
    },
    {
      label: 'Money',
      items: [
        { name: 'Payments', path: '/admin/orders', icon: ClipboardList, badge: pendingCount || undefined },
        { name: 'Coupons', path: '/admin/coupons', icon: Tag },
        { name: 'Payment details', path: '/admin/payment-settings', icon: Wallet },
      ],
    },
    {
      label: 'Catalogue',
      items: [
        { name: 'Events', path: '/admin/events', icon: CalendarDays },
        { name: 'Courses', path: '/admin/courses', icon: BookOpen },
      ],
    },
    {
      label: 'People',
      items: [{ name: 'Students', path: '/admin/users', icon: Users }],
    },
  ];

  return (
    <AppShell
      context="Admin"
      groups={groups}
      accountName={admin?.fullName || 'Administrator'}
      accountMeta={admin?.email || 'admin'}
      onSignOut={redirectToLogin}
    >
      <Outlet />
    </AppShell>
  );
}
