/**
 * Single source of default store list. Used when API returns none (e.g. fresh DB), in list-detail store picker, and by mock API.
 */
import type { Store } from "@cartscout/types";

export const DEFAULT_STORES: Store[] = [
  { id: "store-kroger-1", external_id: "kroger-1", name: "Kroger", chain: "Kroger", source: "kroger" },
  { id: "store-walmart-1", external_id: "walmart-1", name: "Walmart", chain: "Walmart", source: "walmart" },
  { id: "store-target-1", external_id: "target-1", name: "Target", chain: "Target", source: "target" },
  { id: "store-wholefoods-1", external_id: "wholefoods-1", name: "Whole Foods", chain: "Whole Foods", source: "wholefoods" },
  { id: "store-publix-1", external_id: "publix-1", name: "Publix", chain: "Publix", source: "publix" },
];
