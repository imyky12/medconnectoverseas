import "./App.css";
import { Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

// Public Pages
import Home from "./pages/Home";
import PublicEventsPage from "./pages/PublicEvents";
import ContactPage from "./pages/contact";
import ActivitiesPage from "./pages/activities";
import NewsletterPage from "./pages/newsletter";
import OnboardingPage from "./pages/onboarding";
import Dashboard from "./pages/dashboard";
import Marketplace from "./pages/dashboard/marketplace";
import UserOrders from "./pages/dashboard/orders";
import Profile from "./pages/dashboard/profile";
import CourseOverview from "./pages/dashboard/course-overview";
import EventsPage from "./pages/dashboard/events";
import EventDetail from "./pages/dashboard/event-detail";
import NotFound from "./pages/NotFound";

// Admin Pages
import AdminLogin from "./pages/admin/login";
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/dashboard";
import AdminUsers from "./pages/admin/users";
import AdminCourses from "./pages/admin/courses";
import AdminAddCourse from "./pages/admin/add-course";
import AdminCoupons from "./pages/admin/coupons";
import AdminOrders from "./pages/admin/orders";
import AdminPaymentSettings from "./pages/admin/payment-settings";
import AdminEvents from "./pages/admin/events";
import AdminAddEvent from "./pages/admin/add-event";
import AdminEventRegistrations from "./pages/admin/event-registrations";
import AdminPolicies from "./pages/admin/policies";
import AdminActivity from "./pages/admin/activity";
import AdminNewsletters from "./pages/admin/newsletters";
import PolicyPage from "./pages/PolicyPage";

import UserLayout from "./components/dashboard/UserLayout";

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* User Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/events" element={<PublicEventsPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/activities" element={<ActivitiesPage />} />
        <Route path="/newsletter" element={<NewsletterPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        {/* LMS Dashboard Routes */}
        <Route path="/dashboard" element={<UserLayout />}>
           <Route index element={<Dashboard />} />
           <Route path="marketplace" element={<Marketplace />} />
           <Route path="course/:courseCode" element={<CourseOverview />} />
           <Route path="orders" element={<UserOrders />} />
           <Route path="profile" element={<Profile />} />
           <Route path="events" element={<EventsPage />} />
           <Route path="events/:eventCode" element={<EventDetail />} />
        </Route>

        {/* Legal documents. The text comes from the database so an admin can
            change it without a deploy — see /admin/policies. */}
        <Route path="/terms" element={<PolicyPage slug="terms" fallbackTitle="Terms & Conditions" />} />
        <Route path="/privacy" element={<PolicyPage slug="privacy" fallbackTitle="Privacy Policy" />} />

        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminLayout />}>
           <Route path="dashboard" element={<AdminDashboard />} />
           <Route path="orders" element={<AdminOrders />} />
           <Route path="users" element={<AdminUsers />} />
           <Route path="courses" element={<AdminCourses />} />
           <Route path="add-course" element={<AdminAddCourse />} />
           <Route path="coupons" element={<AdminCoupons />} />
           <Route path="payment-settings" element={<AdminPaymentSettings />} />
           <Route path="events" element={<AdminEvents />} />
           <Route path="events/new" element={<AdminAddEvent />} />
           <Route path="events/:id/edit" element={<AdminAddEvent />} />
           <Route path="events/:id/registrations" element={<AdminEventRegistrations />} />
           <Route path="newsletters" element={<AdminNewsletters />} />
           <Route path="policies" element={<AdminPolicies />} />
           <Route path="activity" element={<AdminActivity />} />
        </Route>

        {/* Anything that matched nothing above. Without this, an unknown URL
            rendered a blank white page with no way back. */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
