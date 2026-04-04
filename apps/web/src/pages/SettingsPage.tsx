import { useCallback, useEffect, useState } from 'react';
import { formatApiErrorMessage } from '@/api/errors';
import * as storesApi from '@/api/stores';
import type { Store } from '@/types/stores';

export function SettingsPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(() => new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [all, favs] = await Promise.all([storesApi.fetchStores(), storesApi.fetchFavoriteStores()]);
      setStores(all);
      setFavoriteIds(new Set(favs.map((s) => s.id)));
    } catch (e) {
      setError(formatApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleFavorite(storeId: number, next: boolean) {
    setFavoriteIds((prev) => {
      const n = new Set(prev);
      if (next) {
        n.add(storeId);
      } else {
        n.delete(storeId);
      }
      return n;
    });
    setBusyId(storeId);
    try {
      if (next) {
        await storesApi.addFavoriteStore(storeId);
      } else {
        await storesApi.removeFavoriteStore(storeId);
      }
    } catch (e) {
      setFavoriteIds((prev) => {
        const n = new Set(prev);
        if (next) {
          n.delete(storeId);
        } else {
          n.add(storeId);
        }
        return n;
      });
      alert(formatApiErrorMessage(e));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="page">
      <h1>Settings</h1>
      <h2>Favorite stores</h2>
      <p className="muted small">Used when comparing prices and building your shopping plan.</p>

      {error ? (
        <div className="banner-error" role="alert">
          {error}{' '}
          <button type="button" className="btn btn-ghost" onClick={() => void load()}>
            Retry
          </button>
        </div>
      ) : null}

      {loading ? (
        <p className="muted">Loading stores…</p>
      ) : (
        <div className="card stack">
          {stores.map((s) => (
            <label key={s.id} className="row" style={{ cursor: 'pointer', margin: 0 }}>
              <div>
                <strong>{s.name}</strong>
                {s.chain && s.chain !== s.name ? (
                  <div className="muted small">{s.chain}</div>
                ) : null}
              </div>
              <input
                type="checkbox"
                checked={favoriteIds.has(s.id)}
                disabled={busyId !== null}
                onChange={(e) => void toggleFavorite(s.id, e.target.checked)}
              />
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
