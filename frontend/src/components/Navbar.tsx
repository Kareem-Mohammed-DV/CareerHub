import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api/client';
import Logo from './Logo';

type NotificationCount = { readAt: string | null };

export default function Navbar() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  useEffect(() => {
    if (!user) { setUnreadCount(0); return; }
    api<NotificationCount[]>('/notifications').then((items) => setUnreadCount(items.filter((item) => !item.readAt).length)).catch(() => setUnreadCount(0));
  }, [user?.id]);
  const links = user?.role === 'ADMIN'
    ? [['Admin overview','/admin'],['Users','/admin/users'],['Companies','/admin/companies'],['Jobs','/admin/jobs'],['Applications','/admin/applications'],['Featured jobs','/jobs/featured']]
    : user?.role === 'COMPANY'
      ? [['Dashboard','/company/dashboard'],['Jobs','/company/jobs'],['Applicants','/company/applicants'],['Analytics','/company/analytics'],['Billing','/company/billing'],['Messages','/messages'],['Notifications','/notifications'],['Company profile','/company/profile'],['Featured jobs','/jobs/featured'],['Companies','/companies']]        : user
          ? [['Jobs','/jobs'],['Companies','/companies'],['Featured','/jobs/featured'],['Dashboard','/job-seeker/dashboard'],['Applications','/applications'],['Saved jobs','/saved-jobs'],['Job alerts','/job-alerts'],['Messages','/messages'],['Notifications','/notifications'],['Profile','/profile']]
          : [['Jobs','/jobs'],['Companies','/companies'],['Featured','/jobs/featured'],['Pricing','/pricing']];

  async function logout() {
    await signOut().catch(() => undefined);
    setOpen(false);
    navigate('/');
  }

  return <header className="navbar"><div className="navbar-container">
    <Link to="/" className="navbar-logo" aria-label="CareerHub home"><Logo size={30} /><span>CAREER<b>HUB</b></span></Link>
    <button className="nav-toggle" type="button" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen((value) => !value)}><span /><span /><span /></button>
    <nav className={`navbar-links${open ? ' is-open' : ''}`} aria-label="Main navigation">
      {links.map(([label, path]) => <NavLink key={label} to={path} end={path === '/admin'} onClick={() => setOpen(false)} className={({ isActive }) => isActive ? 'active' : ''}>{label}{label==='Notifications'&&unreadCount>0&&<span className="nav-unread-count">{unreadCount>9?'9+':unreadCount}</span>}</NavLink>)}
      {!user ? <><Link to="/login" onClick={() => setOpen(false)}>Sign in</Link><Link to="/register" className="navbar-button" onClick={() => setOpen(false)}>Create account</Link></> : <><Link to="/settings" onClick={() => setOpen(false)} className="nav-account">{user.email}</Link><button type="button" className="nav-logout" onClick={logout}>Sign out</button></>}
    </nav>
  </div></header>;
}
