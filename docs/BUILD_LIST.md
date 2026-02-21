# CartScout build list

Features and capabilities implied by the README, app copy, and docs. Use this to confirm nothing is missing.

---

## Done

| Item | Where |
|------|--------|
| Auth: sign up / sign in / refresh | login, register, auth context |
| Lists: create, list, open detail, delete (long-press), rename (tap name) | Lists tab, list detail |
| List items: add (free text or product), check/uncheck, uncheck all, delete (long-press) | list/[id].tsx |
| Product suggestions when adding item | list detail modal, searchProducts API |
| Settings: store list, favorite stores (checkboxes) | Settings tab, stores API |
| Navigation: tabs (Home, Lists, Meals, Totals, Settings), list detail, Settings button in header | _layout, list/[id] |
| Mock API for testing without server | mockApi.ts, EXPO_PUBLIC_USE_MOCK_API, npm run test:app |
| iOS run instructions | docs/IOS.md |
| Check off items + visible checkbox; Uncheck all | list detail |
| Push: register device token after login | auth (login/register) |
| Per-list store selection | list_stores table, GET/PUT /lists/:id/stores, list detail "Stores for this list" |
| Meal planning | Placeholder tab + screen "Coming soon" |
| Store totals | Placeholder tab + screen "Coming soon" |
| Deep link cartscout://list/:id | _layout DeepLinkHandler, Linking.getInitialURL + addEventListener |
| Offline: cache lists, show cached when API fails | lib/offline, Lists screen setCachedLists/getCachedLists, offline banner |

---

## Optional / later

- Kroger cart (APP_STORE: "optional Kroger cart").
- Full offline: queue mutations when offline, sync when back online.
- Store totals (real): sum prices per store from store_product_prices and price fetching.
- Meal planning (real): plan meals, add ingredients to lists.
