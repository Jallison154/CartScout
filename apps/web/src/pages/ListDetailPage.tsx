import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { formatApiErrorMessage } from '@/api/errors';
import * as listsApi from '@/api/lists';
import * as productsApi from '@/api/products';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { formatUsd } from '@/lib/format';
import type { ListOptimizationResult } from '@/types/listOptimization';
import type { ListItem } from '@/types/lists';
import type { CanonicalProduct } from '@/types/products';
import type { PriceSource, StoreProductPrice } from '@/types/productPrices';

const SEARCH_DEBOUNCE_MS = 320;

const SOURCE_LABEL: Record<PriceSource, string> = {
  manual: 'Manual',
  estimate: 'Estimate',
  receipt: 'Receipt',
};

function itemLabel(item: ListItem): string {
  const p = item.product?.display_name?.trim();
  if (p) {
    return p;
  }
  return item.free_text?.trim() ?? '';
}

type PriceState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; prices: StoreProductPrice[] }
  | { status: 'error'; message: string };

function ItemPrices({ state }: { state: PriceState }) {
  if (state.status === 'idle' || state.status === 'loading') {
    return <p className="muted small">{state.status === 'loading' ? 'Loading prices…' : ''}</p>;
  }
  if (state.status === 'error') {
    return <p className="small" style={{ color: 'var(--red)' }}>{state.message}</p>;
  }
  if (state.prices.length === 0) {
    return <p className="muted small">No store prices yet.</p>;
  }
  return (
    <div style={{ marginTop: '0.35rem' }}>
      {state.prices.map((p) => (
        <div key={p.id} className="price-row">
          <span>
            {p.store.name}
            <span className="price-source"> · {SOURCE_LABEL[p.source]}</span>
          </span>
          <span>{formatUsd(p.price)}</span>
        </div>
      ))}
    </div>
  );
}

function OptimizationSection({
  data,
  error,
  loading,
}: {
  data: ListOptimizationResult | null;
  error: string | null;
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (loading && !data) {
    return (
      <div className="card">
        <p className="muted">Loading store comparison…</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="card banner-error" role="alert">
        {error}
      </div>
    );
  }

  if (!data) {
    return null;
  }

  if (data.optimizable_line_count === 0) {
    return (
      <div className="card">
        <h2>Store savings</h2>
        <p className="muted small">
          Add catalog items (pick from search suggestions) to compare prices and see savings.
        </p>
      </div>
    );
  }

  return (
    <div className="card stack">
      <h2>Store savings</h2>
      <div className="optim-block">
        <div className="optim-label">Cheapest one-stop shop</div>
        <div className="optim-value">
          {data.best_single_store
            ? `${data.best_single_store.store.name} · ${formatUsd(data.best_single_store.total)}`
            : 'No single store prices every item'}
        </div>
      </div>
      <div className="optim-block">
        <div className="optim-label">Multi-store total</div>
        <div className="optim-value">{formatUsd(data.split_total)}</div>
        <p className="muted small" style={{ margin: '0.25rem 0 0' }}>
          If you buy each line at its cheapest store
        </p>
      </div>
      <div className="optim-block">
        <div className="optim-label">You save</div>
        <div className="optim-value" style={{ color: data.savings != null && data.savings > 0 ? 'var(--green)' : undefined }}>
          {data.savings != null ? formatUsd(data.savings) : '—'}
        </div>
      </div>
      {error && data ? <p className="small" style={{ color: 'var(--red)' }}>{error}</p> : null}
      {data.split_plan.length > 0 ? (
        <>
          <button type="button" className="btn btn-ghost" style={{ alignSelf: 'flex-start' }} onClick={() => setOpen((o) => !o)}>
            {open ? 'Hide' : 'Show'} shopping plan
          </button>
          {open ? (
            <div>
              <p className="muted small">Buy each item where it costs least:</p>
              {data.split_plan.map((g, i) => (
                <div key={`${g.store.id}-${i}`} className="plan-store">
                  <h3>{g.store.name}</h3>
                  {g.items.map((line) => (
                    <div key={line.list_item_id} className="price-row">
                      <span>{line.product_display_name}</span>
                      <span>{formatUsd(line.price)}</span>
                    </div>
                  ))}
                  <p className="muted small">Subtotal {formatUsd(g.subtotal)}</p>
                </div>
              ))}
            </div>
          ) : null}
        </>
      ) : (
        <p className="muted small">Shopping plan appears when catalog items have store prices.</p>
      )}
      {loading && data ? <p className="muted small">Updating…</p> : null}
    </div>
  );
}

export function ListDetailPage() {
  const { listId: listIdParam } = useParams<{ listId: string }>();
  const navigate = useNavigate();
  const listId = Number(listIdParam);

  const [listName, setListName] = useState<string | null>(null);
  const [items, setItems] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState('');
  const [suggestions, setSuggestions] = useState<CanonicalProduct[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const [optimize, setOptimize] = useState<ListOptimizationResult | null>(null);
  const [optLoading, setOptLoading] = useState(false);
  const [optError, setOptError] = useState<string | null>(null);

  const [pricesByProduct, setPricesByProduct] = useState<Record<number, PriceState>>({});

  const debouncedDraft = useDebouncedValue(draft, SEARCH_DEBOUNCE_MS);

  const load = useCallback(async () => {
    if (!Number.isInteger(listId) || listId < 1) {
      setError('Invalid list.');
      setLoading(false);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const detail = await listsApi.fetchListDetail(listId);
      setListName(detail.list.name);
      setItems(detail.items);
    } catch (e) {
      setError(formatApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [listId]);

  const refreshOptimization = useCallback(async () => {
    if (!Number.isInteger(listId) || listId < 1) {
      return;
    }
    setOptLoading(true);
    try {
      const o = await listsApi.fetchListOptimization(listId);
      setOptimize(o);
      setOptError(null);
    } catch (e) {
      setOptError(formatApiErrorMessage(e));
    } finally {
      setOptLoading(false);
    }
  }, [listId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void refreshOptimization();
  }, [refreshOptimization, items.length]);

  const productIdsKey = useMemo(() => {
    const ids = new Set<number>();
    for (const i of items) {
      if (i.canonical_product_id != null) {
        ids.add(i.canonical_product_id);
      }
    }
    return [...ids].sort((a, b) => a - b).join(',');
  }, [items]);

  useEffect(() => {
    const q = debouncedDraft.trim();
    if (!q) {
      setSuggestions([]);
      setSearchLoading(false);
      setSearchError(null);
      return;
    }

    let cancelled = false;
    setSearchLoading(true);
    setSearchError(null);
    void (async () => {
      try {
        const products = await productsApi.searchProducts(q);
        if (!cancelled) {
          setSuggestions(products);
        }
      } catch (e) {
        if (!cancelled) {
          setSuggestions([]);
          setSearchError(formatApiErrorMessage(e));
        }
      } finally {
        if (!cancelled) {
          setSearchLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [debouncedDraft]);

  useEffect(() => {
    const ids =
      productIdsKey === ''
        ? []
        : productIdsKey
            .split(',')
            .map((s) => Number(s))
            .filter((n) => Number.isInteger(n) && n > 0);

    if (ids.length === 0) {
      setPricesByProduct({});
      return;
    }

    let cancelled = false;

    setPricesByProduct((prev) => {
      const next: Record<number, PriceState> = {};
      for (const id of ids) {
        next[id] = prev[id]?.status === 'ready' ? prev[id]! : { status: 'loading' };
      }
      return next;
    });

    void Promise.all(
      ids.map(async (pid) => {
        try {
          const prices = await productsApi.fetchProductStorePrices(pid);
          if (cancelled) {
            return;
          }
          setPricesByProduct((p) => ({ ...p, [pid]: { status: 'ready', prices } }));
        } catch (e) {
          if (cancelled) {
            return;
          }
          setPricesByProduct((p) => ({
            ...p,
            [pid]: { status: 'error', message: formatApiErrorMessage(e) },
          }));
        }
      }),
    );

    return () => {
      cancelled = true;
    };
  }, [productIdsKey]);

  async function addFreeText() {
    const text = draft.trim();
    if (!text) {
      return;
    }
    setAdding(true);
    try {
      const item = await listsApi.createListItem(listId, { free_text: text });
      setItems((prev) => [...prev, item]);
      setDraft('');
      setSuggestions([]);
      void refreshOptimization();
    } catch (e) {
      alert(formatApiErrorMessage(e));
    } finally {
      setAdding(false);
    }
  }

  async function addProduct(p: CanonicalProduct) {
    setAdding(true);
    try {
      const item = await listsApi.createListItem(listId, { canonical_product_id: p.id });
      setItems((prev) => [...prev, item]);
      setDraft('');
      setSuggestions([]);
      void refreshOptimization();
    } catch (e) {
      alert(formatApiErrorMessage(e));
    } finally {
      setAdding(false);
    }
  }

  async function toggleItem(item: ListItem) {
    const next = !item.checked;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, checked: next } : i)));
    try {
      await listsApi.patchListItem(listId, item.id, { checked: next });
    } catch {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, checked: item.checked } : i)));
      alert('Could not update item.');
    }
  }

  async function removeItem(item: ListItem) {
    if (!window.confirm(`Remove “${itemLabel(item)}”?`)) {
      return;
    }
    try {
      await listsApi.deleteListItem(listId, item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      void refreshOptimization();
    } catch (e) {
      alert(formatApiErrorMessage(e));
    }
  }

  if (!Number.isInteger(listId) || listId < 1) {
    return (
      <div className="page">
        <p className="muted">Invalid list.</p>
        <Link to="/lists">Back to lists</Link>
      </div>
    );
  }

  if (loading && !listName) {
    return (
      <div className="page">
        <p className="muted">Loading…</p>
      </div>
    );
  }

  if (error && !listName) {
    return (
      <div className="page">
        <div className="banner-error">{error}</div>
        <button type="button" className="btn btn-primary" onClick={() => void load()}>
          Retry
        </button>
        <p>
          <Link to="/lists">Back to lists</Link>
        </p>
      </div>
    );
  }

  const showSuggestions = draft.trim().length > 0 && (searchLoading || suggestions.length > 0);

  return (
    <div className="page">
      <p>
        <Link to="/lists" className="muted small">
          ← Lists
        </Link>
      </p>
      <h1>{listName}</h1>

      <OptimizationSection data={optimize} error={optError} loading={optLoading} />

      <h2>Items</h2>
      {items.length === 0 ? (
        <p className="muted">No items yet. Add something below.</p>
      ) : (
        <div className="card stack">
          {items.map((item) => {
            const pid = item.canonical_product_id;
            const priceState: PriceState =
              pid != null ? (pricesByProduct[pid] ?? { status: 'loading' }) : { status: 'idle' };
            return (
              <div key={item.id} className="row" style={{ alignItems: 'stretch' }}>
                <label className="checkbox-hit">
                  <input type="checkbox" checked={item.checked} onChange={() => void toggleItem(item)} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className={item.checked ? 'item-done' : undefined}>
                      {itemLabel(item)}
                      {item.quantity ? ` · ${item.quantity}` : ''}
                    </div>
                    {pid != null ? <ItemPrices state={priceState} /> : null}
                  </div>
                </label>
                <button type="button" className="btn btn-danger" onClick={() => void removeItem(item)}>
                  Remove
                </button>
              </div>
            );
          })}
        </div>
      )}

      <h2>Add item</h2>
      <div className="card stack">
        {draft.trim() && searchError ? <div className="banner-error">{searchError}</div> : null}
        {showSuggestions ? (
          <div className="suggestions">
            {searchLoading && suggestions.length === 0 ? (
              <p className="muted small" style={{ padding: '0.75rem' }}>
                Searching…
              </p>
            ) : (
              suggestions.map((p) => (
                <button key={p.id} type="button" className="suggestion-row" onClick={() => void addProduct(p)}>
                  <strong>{p.display_name}</strong>
                  {p.brand ? <span className="muted small"> · {p.brand}</span> : null}
                </button>
              ))
            )}
          </div>
        ) : null}
        <input
          type="text"
          placeholder="Type to search products or add free text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void addFreeText()}
        />
        <div className="flex-actions">
          <button type="button" className="btn btn-primary" disabled={adding || !draft.trim()} onClick={() => void addFreeText()}>
            Add as text
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/lists')}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
