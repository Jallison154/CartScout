import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatApiErrorMessage } from '@/api/errors';
import * as listsApi from '@/api/lists';
import type { GroceryList } from '@/types/lists';

export function ListsPage() {
  const [lists, setLists] = useState<GroceryList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await listsApi.fetchLists();
      setLists(data);
    } catch (e) {
      setError(formatApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    const n = name.trim();
    if (!n) {
      return;
    }
    setCreating(true);
    try {
      const list = await listsApi.createList(n);
      setName('');
      setLists((prev) => [list, ...prev]);
    } catch (e) {
      setError(formatApiErrorMessage(e));
    } finally {
      setCreating(false);
    }
  }

  async function removeList(id: number, listName: string) {
    if (!window.confirm(`Delete list “${listName}”?`)) {
      return;
    }
    try {
      await listsApi.deleteList(id);
      setLists((prev) => prev.filter((l) => l.id !== id));
    } catch (e) {
      setError(formatApiErrorMessage(e));
    }
  }

  return (
    <div className="page">
      <h1>Lists</h1>
      {error ? (
        <div className="banner-error" role="alert">
          {error}{' '}
          <button type="button" className="btn btn-ghost" onClick={() => void load()}>
            Retry
          </button>
        </div>
      ) : null}

      <div className="card stack">
        <div className="flex-actions">
          <input
            type="text"
            placeholder="New list name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void create()}
            style={{ flex: 1, minWidth: '12rem' }}
          />
          <button type="button" className="btn btn-primary" disabled={creating || !name.trim()} onClick={() => void create()}>
            Create
          </button>
        </div>
      </div>

      {loading ? (
        <p className="muted">Loading lists…</p>
      ) : lists.length === 0 ? (
        <p className="muted">No lists yet. Add a name above to create one.</p>
      ) : (
        <div className="card">
          {lists.map((l) => (
            <div key={l.id} className="row">
              <Link to={`/lists/${l.id}`} className="list-link" style={{ border: 'none', padding: 0, flex: 1 }}>
                {l.name}
              </Link>
              <button type="button" className="btn btn-danger" onClick={() => void removeList(l.id, l.name)}>
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
