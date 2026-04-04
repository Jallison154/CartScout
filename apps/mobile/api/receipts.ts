import { authGetJson, authPostFormData } from '@/api/authorized';
import type { ReceiptItemPublic, ReceiptPublic } from '@/types/receipts';

type Data<T> = { data: T };

export async function uploadReceiptImage(args: {
  uri: string;
  mimeType: string;
  fileName: string;
}): Promise<{ receipt: ReceiptPublic; items: ReceiptItemPublic[] }> {
  const { uri, mimeType, fileName } = args;
  const res = await authPostFormData<Data<{ receipt: ReceiptPublic; items: ReceiptItemPublic[] }>>(
    '/api/v1/receipts/upload',
    () => {
      const formData = new FormData();
      formData.append('file', {
        uri,
        name: fileName,
        type: mimeType,
      } as unknown as Blob);
      return formData;
    },
  );
  return res.data;
}

export async function fetchReceipt(
  receiptId: number,
): Promise<{ receipt: ReceiptPublic; items: ReceiptItemPublic[] }> {
  const res = await authGetJson<Data<{ receipt: ReceiptPublic; items: ReceiptItemPublic[] }>>(
    `/api/v1/receipts/${receiptId}`,
  );
  return res.data;
}
