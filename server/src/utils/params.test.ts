import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { HttpError } from './errors.js';
import { parseBarcodeParam } from './params.js';

describe('parseBarcodeParam', () => {
  it('trims and accepts alphanumeric', () => {
    assert.equal(parseBarcodeParam('  012345678901  '), '012345678901');
  });

  it('rejects empty', () => {
    assert.throws(
      () => parseBarcodeParam('   '),
      (e: unknown) => e instanceof HttpError && e.code === 'INVALID_BARCODE',
    );
  });

  it('rejects control characters', () => {
    assert.throws(
      () => parseBarcodeParam('12\n34'),
      (e: unknown) => e instanceof HttpError && e.code === 'INVALID_BARCODE',
    );
  });
});
