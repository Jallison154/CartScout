import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatApiErrorMessage } from '@/api/errors';
import * as listsApi from '@/api/lists';
import { useAuth } from '@/context/AuthContext';
import type { GroceryList } from '@/types/lists';

export function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [lists, setLists] = useState<GroceryList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      setLists(await listsApi.fetchLists());
    } catch (e) {
      setError(formatApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const firstName = user?.email?.split('@')[0] ?? '';
  const recent = lists.slice(0, 5);

  async function startNewList() {
    setCreating(true);
    try {
      const d = new Date();
      const name = `List ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
      const list = await listsApi.createList(name);
      navigate(`/lists/${list.id}`);
    } catch (e) {
      setError(formatApiErrorMessage(e));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="page">
      <h1>CartScout</h1>
      <p className="home-greeting">
        {firstName ? `Hi, ${firstName}` : 'Ready to shop smarter'}
      </p>

      {error ? (
        <div className="banner-error" role="alert">
          {error}{' '}
          <button type="button" className="btn btn-ghost" onClick={() => void load()}>
            Retry
          </button>
        </div>
      ) : null}

      <div className="home-actions">
        <button
          type="button"
          className="btn btn-primary"
          disabled={creating}
          onClick={() => void startNewList()}
        >
          {creating ? 'Creating…' : 'New list'}
        </button>
        <Link to="/lists" className="btn btn-outline">
          All lists
        </Link>
        <Link to="/settings" className="btn btn-ghost">
          Favorite stores
        </Link>
      </div>

      <p className="section-label">Recent lists</p>
      {loading ? (
        <p className="muted">Loading…</p>
      ) : recent.length === 0 ? (
        <div className="card">
          <strong>No lists yet</strong>
          <p className="muted" style={{ margin: '0.5rem 0 0' }}>
            Create a list, match items to the catalog, then open Store savings to compare one-stop
            vs split shopping.
          </p>
        </div>
      ) : (
        <div className="card">
          {recent.map((list, i) => (
            <Link
              key={list.id}
              to={`/lists/${list.id}`}
              className="list-link"
              style={i === recent.length - 1 ? { borderBottom: 'none' } : undefined}
            >
              {list.name}
            </Link>
          ))}
        </div>
      )}

      <div className="home-tip">
        <span aria-hidden="true">★</span>
        <span>
          Tip: set favorite stores in Settings so savings compare the places you actually shop.
        </span>
      </div>
    </div>
  );
}
