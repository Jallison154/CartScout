export type PriceSource = 'manual' | 'estimate' | 'receipt';

export type StoreProductPrice = {
  id: number;
  store: {
    id: number;
    name: string;
    chain: string | null;
  };
  price: number;
  source: PriceSource;
  confidence_score: number | null;
  updated_at: string;
  created_at: string;
};
