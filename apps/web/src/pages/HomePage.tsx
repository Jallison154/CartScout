import { Link } from 'react-router-dom';

export function HomePage() {
  return (
    <div className="page">
      <h1>Home</h1>
      <p className="muted">
        Build grocery lists, add catalog products or free-text lines, compare prices across stores,
        and see the cheapest way to shop—including splitting across stores when it saves money.
      </p>
      <div className="card" style={{ marginTop: '1rem' }}>
        <Link to="/lists" className="list-link">
          Your lists →
        </Link>
        <Link to="/settings" className="list-link" style={{ borderBottom: 'none' }}>
          Favorite stores →
        </Link>
      </div>
    </div>
  );
}
