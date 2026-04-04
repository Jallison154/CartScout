export type Store = {
  id: number;
  name: string;
  chain: string | null;
  source: string | null;
  created_at: string;
};

/** Matches server seed ids when the store API is unavailable. */
export const FALLBACK_STORES: Store[] = [
  {
    id: 1,
    name: 'Walmart',
    chain: 'Walmart',
    source: null,
    created_at: '',
  },
  {
    id: 2,
    name: 'Costco',
    chain: 'Costco',
    source: null,
    created_at: '',
  },
];
