import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { usePageTitle } from '../hooks/usePageTitle';

export default function Login() {    usePageTitle("Sign in");

    const navigate = useNavigate();
    const { signIn } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    async function submit(event: FormEvent) {
        event.preventDefault();

        setLoading(true);
        setMessage('');

        try {
            await signIn(email, password);
            navigate('/dashboard');
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : 'Something went wrong'
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="auth-page">
            <section className="auth-card">
                <p className="eyebrow">CAREERHUB</p>

                <h1>Welcome back</h1>

                <p className="auth-description">
                    Sign in to continue your career journey.
                </p>

                <form onSubmit={submit} className="auth-form">
                    <label>
                        Email
                        <input
                            required
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            placeholder="you@example.com"
                        />
                    </label>

                    <label>
                        Password
                        <input
                            required
                            minLength={12}
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            placeholder="••••••••••••"
                        />
                    </label>

                    <button
                        className="primary-button submit"
                        type="submit"
                        disabled={loading}
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                {message && (
                    <p className="message">{message}</p>
                )}

                <p className="auth-footer">
                    Don't have an account?{' '}
                    <Link to="/register">Create Account</Link>
                </p>
            </section>
        </main>
    );
}
