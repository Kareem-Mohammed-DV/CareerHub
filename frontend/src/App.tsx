import { useEffect, type ReactNode } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Jobs from './pages/jobs';
import Companies from './pages/Companies';
import JobDetails from './pages/JobDetails';
import Applications from './pages/Applications';
import CompanyDashboard from './pages/CompanyDashboard';
import JobSeekerDashboard from './pages/JobSeekerDashboard';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import Navbar from './components/Navbar';
import { AuthProvider, useAuth, type UserRole } from './auth/AuthContext';
import { initCyberEffects } from './utils/cyberEffects';
import Footer from './components/Footer';
import { usePageTitle } from './hooks/usePageTitle';
import Messages from './pages/Messages';
import Applicants from './pages/Applicants';
import CompanyProfile from './pages/CompanyProfile';
import Settings from './pages/Settings';
import AdminPage from './pages/AdminPage';
import NotFound from './pages/NotFound';
import ManageJob from './pages/ManageJob';
import CompanyJobs from './pages/CompanyJobs';
import CompanyAnalytics from './pages/CompanyAnalytics';
import Pricing from './pages/Pricing';
import CompanyBilling from './pages/CompanyBilling';
import SavedJobs from './pages/SavedJobs';
import JobAlerts from './pages/JobAlerts';
import ErrorBoundary from './components/ErrorBoundary';
import './styles.css';

function Access({ roles, children }: { roles: UserRole[]; children: ReactNode }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <main className="route-state"><div className="jobs-loader" /><p>Restoring your session…</p></main>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!roles.includes(user.role)) return <Navigate to="/forbidden" replace />;
  return children;
}

function DashboardRedirect() {
  const { user } = useAuth();
  if (user?.role === 'COMPANY') return <Navigate to="/company/dashboard" replace />;
  if (user?.role === 'ADMIN') return <Navigate to="/admin" replace />;
  return <Navigate to="/job-seeker/dashboard" replace />;
}

function Forbidden() { return <main className="route-state"><p className="eyebrow">403 · ACCESS RESTRICTED</p><h1>This space is for another account type.</h1><p>Sign in with an account that has access, or return to your dashboard.</p><Link className="primary-button" to="/dashboard">Go to dashboard</Link></main>; }

function AppRoutes() {
  useEffect(() => initCyberEffects(), []);
  const location = useLocation();
  usePageTitle(undefined);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [location.pathname]);
  return <>
    <Navbar />
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/jobs" element={<Jobs />} />
      <Route path="/jobs/featured" element={<Jobs />} />
      <Route path="/companies" element={<Companies />} />
      <Route path="/jobs/:id" element={<JobDetails />} />
      <Route path="/company/:slug" element={<CompanyProfile />} />
      <Route path="/dashboard" element={<Access roles={['JOB_SEEKER','COMPANY','ADMIN']}><DashboardRedirect /></Access>} />
      <Route path="/job-seeker/dashboard" element={<Access roles={['JOB_SEEKER']}><JobSeekerDashboard /></Access>} />
      <Route path="/company/dashboard" element={<Access roles={['COMPANY']}><CompanyDashboard /></Access>} />
      <Route path="/profile" element={<Access roles={['JOB_SEEKER']}><Profile /></Access>} />
      <Route path="/company/profile" element={<Access roles={['COMPANY']}><CompanyDashboard /></Access>} />
      <Route path="/company/jobs/new" element={<Access roles={['COMPANY']}><ManageJob /></Access>} />
      <Route path="/company/jobs/:id/edit" element={<Access roles={['COMPANY']}><ManageJob /></Access>} />
      <Route path="/company/jobs" element={<Access roles={['COMPANY']}><CompanyJobs /></Access>} />
      <Route path="/company/applicants" element={<Access roles={['COMPANY']}><Applicants /></Access>} />
      <Route path="/company/analytics" element={<Access roles={['COMPANY','ADMIN']}><CompanyAnalytics /></Access>} />
      <Route path="/company/billing" element={<Access roles={['COMPANY']}><CompanyBilling /></Access>} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/applications" element={<Access roles={['JOB_SEEKER']}><Applications /></Access>} />
      <Route path="/saved-jobs" element={<Access roles={['JOB_SEEKER']}><SavedJobs /></Access>} />
      <Route path="/job-alerts" element={<Access roles={['JOB_SEEKER']}><JobAlerts /></Access>} />
      <Route path="/jobs/:id/applicants" element={<Access roles={['COMPANY','ADMIN']}><Applicants /></Access>} />
      <Route path="/messages" element={<Access roles={['JOB_SEEKER','COMPANY','ADMIN']}><Messages /></Access>} />
      <Route path="/notifications" element={<Access roles={['JOB_SEEKER','COMPANY','ADMIN']}><Notifications /></Access>} />
      <Route path="/settings" element={<Access roles={['JOB_SEEKER','COMPANY','ADMIN']}><Settings /></Access>} />
      <Route path="/admin" element={<Access roles={['ADMIN']}><AdminPage section="dashboard" /></Access>} />
      <Route path="/admin/users" element={<Access roles={['ADMIN']}><AdminPage section="users" /></Access>} />
      <Route path="/admin/companies" element={<Access roles={['ADMIN']}><AdminPage section="companies" /></Access>} />
      <Route path="/admin/jobs" element={<Access roles={['ADMIN']}><AdminPage section="jobs" /></Access>} />
      <Route path="/admin/applications" element={<Access roles={['ADMIN']}><AdminPage section="applications" /></Access>} />
      <Route path="/admin/payments" element={<Access roles={['ADMIN']}><AdminPage section="payments" /></Access>} />
      <Route path="/admin/subscriptions" element={<Access roles={['ADMIN']}><AdminPage section="subscriptions" /></Access>} />
      <Route path="/admin/audit" element={<Access roles={['ADMIN']}><AdminPage section="audit" /></Access>} />
      <Route path="/forbidden" element={<Forbidden />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
    <Footer />
  </>;
}

export default function App() { return <ErrorBoundary><BrowserRouter><AuthProvider><AppRoutes /></AuthProvider></BrowserRouter></ErrorBoundary>; }
