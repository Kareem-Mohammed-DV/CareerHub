import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { register, type Role } from '../api/auth';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { usePageTitle } from '../hooks/usePageTitle';

export default function Register() {
    usePageTitle("Create account");
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('JOB_SEEKER');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setMessage(''); setError('');
    try {
      await register(email, password, role);
      // Sign straight in (through the auth context, which stores the session)
      // so the new user lands on their dashboard without a second form.
      await signIn(email, password);
      navigate('/dashboard');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Registration failed. Please try again.');
    } finally { setLoading(false); }
  }

  return <main className="auth-page"><section className="auth-card">
    <p className="eyebrow"><span className="eyebrow-dot" /> CAREERHUB</p>
    <h1>Create your account</h1><p className="auth-description">Make your next career move with confidence.</p>
    <form onSubmit={submit} className="auth-form">
      <label>Email<input autoComplete="email" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>
      <label>Password<input autoComplete="new-password" required minLength={12} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 12 characters" aria-describedby="password-hint" /></label>
      <small id="password-hint">Use at least 12 characters.</small>
      <label>Account type<select value={role} onChange={(event) => setRole(event.target.value as Role)}><option value="JOB_SEEKER">Job seeker</option><option value="COMPANY">Company</option></select></label>
      <button className="primary-button submit" type="submit" disabled={loading}>{loading ? 'Creating account…' : 'Create account'}</button>
    </form>
    {error && <p className="message error" role="alert">{error}</p>}{message && <p className="message success" role="status">{message}</p>}
    <p className="auth-footer">Already have an account? <Link to="/login">Sign in</Link></p>
  </section></main>;
}
