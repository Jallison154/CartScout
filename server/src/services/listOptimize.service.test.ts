import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { computeListOptimization, roundMoney } from './listOptimize.service.js';

describe('roundMoney', () => {
  it('rounds to cents', () => {
    assert.equal(roundMoney(1.005), 1.01);
    assert.equal(roundMoney(10.999), 11);
  });
});

describe('computeListOptimization', () => {
  it('computes split cheaper than best single store when items invert by store', () => {
    const r = computeListOptimization({
      list_id: 1,
      stores: [
        { id: 1, name: 'A', chain: null },
        { id: 2, name: 'B', chain: null },
      ],
      lines: [
        { list_item_id: 10, canonical_product_id: 100, product_display_name: 'X' },
        { list_item_id: 11, canonical_product_id: 101, product_display_name: 'Y' },
      ],
      prices: [
        { canonical_product_id: 100, store_id: 1, price: 10 },
        { canonical_product_id: 100, store_id: 2, price: 1 },
        { canonical_product_id: 101, store_id: 1, price: 1 },
        { canonical_product_id: 101, store_id: 2, price: 10 },
      ],
    });

    assert.equal(r.best_single_store?.total, 11);
    assert.equal(r.split_total, 2);
    assert.equal(r.savings, 9);
    assert.equal(r.split_plan.length, 2);
  });

  it('returns null best_single_store when no store prices every line', () => {
    const r = computeListOptimization({
      list_id: 1,
      stores: [
        { id: 1, name: 'OnlyA', chain: null },
        { id: 2, name: 'OnlyB', chain: null },
      ],
      lines: [
        { list_item_id: 1, canonical_product_id: 1, product_display_name: 'Milk' },
        { list_item_id: 2, canonical_product_id: 2, product_display_name: 'Eggs' },
      ],
      prices: [
        { canonical_product_id: 1, store_id: 1, price: 3 },
        { canonical_product_id: 2, store_id: 2, price: 4 },
      ],
    });

    assert.equal(r.best_single_store, null);
    assert.equal(r.savings, null);
    assert.equal(r.split_total, 7);
    assert.equal(r.cheapest_per_item[0]?.cheapest?.price, 3);
    assert.equal(r.cheapest_per_item[1]?.cheapest?.price, 4);
  });

  it('breaks ties on cheapest store by lower store id', () => {
    const r = computeListOptimization({
      list_id: 1,
      stores: [
        { id: 2, name: 'B', chain: null },
        { id: 1, name: 'A', chain: null },
      ],
      lines: [{ list_item_id: 1, canonical_product_id: 1, product_display_name: 'Z' }],
      prices: [
        { canonical_product_id: 1, store_id: 1, price: 5 },
        { canonical_product_id: 1, store_id: 2, price: 5 },
      ],
    });

    assert.equal(r.cheapest_per_item[0]?.cheapest?.store.id, 1);
  });

  it('handles duplicate lines for same product as separate priced rows', () => {
    const r = computeListOptimization({
      list_id: 1,
      stores: [{ id: 1, name: 'S', chain: null }],
      lines: [
        { list_item_id: 1, canonical_product_id: 1, product_display_name: 'Milk' },
        { list_item_id: 2, canonical_product_id: 1, product_display_name: 'Milk' },
      ],
      prices: [{ canonical_product_id: 1, store_id: 1, price: 2 }],
    });

    assert.equal(r.best_single_store?.total, 4);
    assert.equal(r.split_total, 4);
    assert.equal(r.savings, 0);
  });

  it('vacuous complete when there are no optimizable lines', () => {
    const r = computeListOptimization({
      list_id: 1,
      stores: [{ id: 1, name: 'S', chain: null }],
      lines: [],
      prices: [],
    });

    assert.equal(r.optimizable_line_count, 0);
    assert.ok(r.totals_by_store[0]?.is_complete);
    assert.equal(r.totals_by_store[0]?.total, 0);
    assert.equal(r.best_single_store?.total, 0);
    assert.equal(r.split_total, 0);
    assert.equal(r.savings, 0);
  });
});
