import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { isApiConfigured } from '@/api/config';
import { formatApiErrorMessage } from '@/api/errors';
import { useAuth } from '@/context/AuthContext';

export function LoginPage() {
  const { user, login } = useAuth();
  const loc = useLocation();
  const from = (loc.state as { from?: string } | null)?.from ?? '/home';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) {
    return <Navigate to={from} replace />;
  }

  if (!isApiConfigured()) {
    return <Navigate to="/" replace />;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter email and password.');
      return;
    }
    setBusy(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(formatApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <h1>Log in</h1>
      {error ? (
        <div className="banner-error" role="alert">
          {error}
        </div>
      ) : null}
      <form onSubmit={(e) => void onSubmit(e)}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={busy} style={{ width: '100%' }}>
          {busy ? '…' : 'Continue'}
        </button>
      </form>
      <p className="muted small" style={{ marginTop: '1rem' }}>
        <Link to="/register">Create an account</Link>
      </p>
    </div>
  );
}
