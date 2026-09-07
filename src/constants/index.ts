// Frontend app-wide constants
export const APP_NAME = 'MedConnects Overseas';
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export const ROUTES = {
  HOME: '/',
  CONTACT: '/contact',
  ACTIVITIES: '/activities',
  NEWSLETTER: '/newsletter',
  LOGIN: '/login',
  SIGNUP: '/signup',
  DASHBOARD: '/dashboard',
  MARKETPLACE: '/marketplace',
  MY_COURSES: '/my-courses',
  ONBOARDING: '/onboarding',
  ADMIN_LOGIN: '/admin/login',
  ADMIN_DASHBOARD: '/admin/dashboard',
} as const;
