import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { receiptConfirmBodySchema } from './receiptConfirm.schema.js';

describe('receiptConfirmBodySchema', () => {
  it('accepts a valid new_list confirm payload', () => {
    const r = receiptConfirmBodySchema.safeParse({
      target: { mode: 'new_list', name: 'Groceries' },
      lines: [
        { receipt_item_id: 1, include: true },
        { receipt_item_id: 2, include: false },
      ],
    });
    assert.equal(r.success, true);
  });

  it('rejects when no line is included', () => {
    const r = receiptConfirmBodySchema.safeParse({
      target: { mode: 'existing_list', list_id: 1 },
      lines: [
        { receipt_item_id: 1, include: false },
        { receipt_item_id: 2, include: false },
      ],
    });
    assert.equal(r.success, false);
  });

  it('rejects duplicate receipt_item_id', () => {
    const r = receiptConfirmBodySchema.safeParse({
      target: { mode: 'new_list', name: 'X' },
      lines: [
        { receipt_item_id: 1, include: true },
        { receipt_item_id: 1, include: false },
      ],
    });
    assert.equal(r.success, false);
  });
});
