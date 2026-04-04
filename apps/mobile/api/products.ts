import { authGetJson } from '@/api/authorized';
import type { CanonicalProduct } from '@/types/products';

type Data<T> = { data: T };

export async function searchProducts(q: string): Promise<CanonicalProduct[]> {
  const path = `/api/v1/products/search?q=${encodeURIComponent(q)}`;
  const res = await authGetJson<Data<{ products: CanonicalProduct[] }>>(path);
  return res.data.products;
}
