import { authJson } from '@/api/client';
import type { StoreProductPrice } from '@/types/productPrices';
import type { CanonicalProduct } from '@/types/products';

type Data<T> = { data: T };

export async function searchProducts(q: string): Promise<CanonicalProduct[]> {
  const path = `/api/v1/products/search?q=${encodeURIComponent(q)}`;
  const res = await authJson<Data<{ products: CanonicalProduct[] }>>(path);
  return res.data.products;
}

export async function fetchProductStorePrices(productId: number): Promise<StoreProductPrice[]> {
  const res = await authJson<Data<{ prices: StoreProductPrice[] }>>(
    `/api/v1/products/${productId}/prices`,
  );
  return res.data.prices;
}
