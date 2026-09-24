import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { usePageTitle } from '../hooks/usePageTitle';

export default function Settings() {
    usePageTitle("Settings");
  const { user, signOut } = useAuth(); const navigate = useNavigate();
  async function logout() { await signOut().catch(() => undefined); navigate('/'); }
  return <main className="jobs-page"><section className="jobs-container settings-container"><header className="applications-top"><div><span className="applications-label">PREFERENCES</span><h1>Account settings</h1><p>Manage your CareerHub session and account details.</p></div></header><section className="settings-card"><p className="eyebrow">ACCOUNT</p><dl><div><dt>Email address</dt><dd>{user?.email}</dd></div><div><dt>Account type</dt><dd>{user?.role?.replace('_',' ')}</dd></div><div><dt>Notifications</dt><dd>Application and message updates</dd></div></dl><Link to="/notifications" className="secondary-button">View notifications</Link><button type="button" className="danger-button" onClick={logout}>Sign out of CareerHub</button></section></section></main>;
}
