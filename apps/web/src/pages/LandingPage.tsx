import { Link } from 'react-router-dom';
import { isApiConfigured } from '@/api/config';

export function LandingPage() {
  const ok = isApiConfigured();

  return (
    <div className="page">
      <h1>CartScout</h1>
      <p className="muted">Grocery lists, store prices, and a smarter shopping plan.</p>
      {!ok ? (
        <div className="banner-error" role="alert">
          Set <code>VITE_API_URL</code> in <code>apps/web/.env</code> (e.g. your Proxmox API{' '}
          <code>http://192.168.x.x:4000</code>), then restart <code>npm run dev</code>.
        </div>
      ) : null}
      <div className="stack" style={{ marginTop: '1.5rem' }}>
        <Link to="/register" className="btn btn-primary" style={{ textAlign: 'center' }}>
          Create account
        </Link>
        <Link to="/login" className="btn btn-ghost" style={{ textAlign: 'center' }}>
          Log in
        </Link>
      </div>
    </div>
  );
}
