import { Link } from 'react-router-dom';
import { isApiConfigured } from '@/api/config';

export function LandingPage() {
  const ok = isApiConfigured();

  return (
    <div className="landing">
      <h1 className="landing-mark">CartScout</h1>
      <p className="landing-tagline">Find the cheapest way to shop your list.</p>
      {!ok ? (
        <div className="banner-error" role="alert">
          Set <code>VITE_API_URL</code> in <code>apps/web/.env</code> (e.g.{' '}
          <code>http://192.168.x.x:4000</code>), then restart <code>npm run web</code>.
        </div>
      ) : null}
      <div className="stack">
        <Link to="/register" className="btn btn-primary">
          Create account
        </Link>
        <Link to="/login" className="btn btn-outline">
          Log in
        </Link>
      </div>
    </div>
  );
}
