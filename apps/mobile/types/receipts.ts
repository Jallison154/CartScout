export type ReceiptPublic = {
  id: number;
  user_id: number;
  store_id: number | null;
  purchase_date: string | null;
  total: number | null;
  image_url: string | null;
  created_at: string;
};

export type ReceiptItemPublic = {
  id: number;
  receipt_id: number;
  raw_text: string;
  canonical_product_id: number | null;
  free_text: string | null;
  quantity: string | null;
  price: number | null;
  confidence_score: number | null;
  created_at: string;
};
