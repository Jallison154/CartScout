import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getMockReceiptLines } from './receiptOcr.stub.js';

describe('getMockReceiptLines', () => {
  it('returns stable mock lines for stub pipeline', () => {
    const lines = getMockReceiptLines(99);
    assert.equal(lines.length, 4);
    assert.equal(lines[0]?.canonical_product_id, 1);
    assert.equal(lines[2]?.canonical_product_id, null);
    assert.ok(lines[0]?.raw_text.length > 0);
  });
});
