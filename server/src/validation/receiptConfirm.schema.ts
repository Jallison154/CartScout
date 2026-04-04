import { z } from 'zod';

const receiptConfirmLineSchema = z.object({
  receipt_item_id: z.number().int().positive(),
  include: z.boolean(),
  canonical_product_id: z.number().int().positive().nullable().optional(),
  free_text: z.string().max(500).nullable().optional(),
  quantity: z.string().trim().max(64).nullable().optional(),
  unit_price: z.number().finite().nonnegative().nullable().optional(),
});

export const receiptConfirmBodySchema = z
  .object({
    target: z.discriminatedUnion('mode', [
      z.object({
        mode: z.literal('new_list'),
        name: z.string().trim().min(1, 'Name is required').max(200),
      }),
      z.object({
        mode: z.literal('existing_list'),
        list_id: z.number().int().positive(),
      }),
    ]),
    lines: z.array(receiptConfirmLineSchema).min(1),
  })
  .refine((b) => b.lines.some((l) => l.include), {
    message: 'At least one line must have include: true',
    path: ['lines'],
  })
  .refine(
    (b) => {
      const ids = b.lines.map((l) => l.receipt_item_id);
      return new Set(ids).size === ids.length;
    },
    { message: 'Duplicate receipt_item_id', path: ['lines'] },
  );

export type ReceiptConfirmBody = z.infer<typeof receiptConfirmBodySchema>;
