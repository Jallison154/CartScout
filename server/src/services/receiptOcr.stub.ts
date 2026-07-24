/**
 * Demo/stub OCR — always returns the same plausible lines regardless of the image.
 * Clients should label this as demo mode until a real OCR provider is wired in.
 */
export type MockReceiptLineInput = {
  raw_text: string;
  canonical_product_id: number | null;
  free_text: string | null;
  quantity: string | null;
  price: number | null;
  confidence_score: number | null;
};

export function getMockReceiptLines(_receiptId: number): MockReceiptLineInput[] {
  void _receiptId;
  return [
    {
      raw_text: 'MILK 1GAL WHOLE',
      canonical_product_id: 1,
      free_text: null,
      quantity: '1',
      price: 3.99,
      confidence_score: 0.91,
    },
    {
      raw_text: 'EGGS LG 12CT',
      canonical_product_id: 2,
      free_text: null,
      quantity: '1',
      price: 4.29,
      confidence_score: 0.88,
    },
    {
      raw_text: 'ORG ROMAINE',
      canonical_product_id: null,
      free_text: 'Organic romaine lettuce',
      quantity: '1',
      price: 2.49,
      confidence_score: 0.72,
    },
    {
      raw_text: 'SUBTOTAL',
      canonical_product_id: null,
      free_text: null,
      quantity: null,
      price: 10.77,
      confidence_score: 0.45,
    },
  ];
}
