import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { isApiConfigured } from '@/api/config';
import { formatApiErrorMessage } from '@/api/errors';
import { useAuth } from '@/context/AuthContext';

export function RegisterPage() {
  const { user, register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) {
    return <Navigate to="/home" replace />;
  }

  if (!isApiConfigured()) {
    return <Navigate to="/" replace />;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 10) {
      setError('Password must be at least 10 characters.');
      return;
    }
    setBusy(true);
    try {
      await register(email, password);
    } catch (err) {
      setError(formatApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <h1>Create account</h1>
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
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={busy} style={{ width: '100%' }}>
          {busy ? '…' : 'Create account'}
        </button>
      </form>
      <p className="muted small" style={{ marginTop: '1rem' }}>
        <Link to="/login">Already have an account?</Link>
      </p>
    </div>
  );
}
