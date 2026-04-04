import { authGetJson } from '@/api/authorized';
import type { StoreProductPrice } from '@/types/productPrices';
import type { CanonicalProduct } from '@/types/products';

type Data<T> = { data: T };

export async function searchProducts(q: string): Promise<CanonicalProduct[]> {
  const path = `/api/v1/products/search?q=${encodeURIComponent(q)}`;
  const res = await authGetJson<Data<{ products: CanonicalProduct[] }>>(path);
  return res.data.products;
}

export async function fetchProductStorePrices(
  productId: number,
): Promise<StoreProductPrice[]> {
  const res = await authGetJson<Data<{ prices: StoreProductPrice[] }>>(
    `/api/v1/products/${productId}/prices`,
  );
  return res.data.prices;
}

export async function fetchProductByBarcode(code: string): Promise<CanonicalProduct> {
  const path = `/api/v1/products/barcode/${encodeURIComponent(code)}`;
  const res = await authGetJson<Data<{ product: CanonicalProduct }>>(path);
  return res.data.product;
}
