# Implementation Plan — MotoHelm E-Commerce Improvements

This plan outlines the steps to implement the improvements identified in the [analysis report](file:///C:/Users/LAPTOP%20HOUSE/.gemini/antigravity-ide/brain/a9d96135-906d-4d22-b56c-7e09b8d5d78f/analysis_report.md) across three phases: Production Blockers, Core Features, and Polish & Scale.

## User Review Required

We need your review on the following key decisions:
1. **Migrations Deployment**: Since we cannot execute SQL migrations automatically due to permission settings, we will create a migration SQL file under `supabase/migrations/`. You can apply it using your local Supabase CLI (`supabase db push`) or by copy-pasting the script into the Supabase Dashboard SQL editor.
2. **Checkout Auth Policy**: To ensure secure and tracked orders, we will require users to sign in before checkout. The checkout page will redirect users to `/login?redirect=/checkout`.
3. **Mock vs Real Payments**: We will implement a simulated credit card checkout and transaction logging in `payment_transactions` to avoid needing live Stripe credentials.

## Open Questions

- Should we implement automated transactional email triggers (e.g. using Resend, SendGrid, or Supabase edge functions) in Phase 2, or simulate them with local toasts/console logs? We recommend starting with mock logs/toasts and setting up structure for direct provider integration.

---

## Proposed Changes

### Database & Security

#### [NEW] [20260618022147_implement_report.sql](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/supabase/migrations/20260618022147_implement_report.sql)
Create a new migration script containing:
- **Privilege revoking**: Revoke execute on `has_role` from `anon`.
- **Payment Modes**: Add `easypaisa`, `jazzcash`, `nayapay`, and `bank` to the `payment_mode` enum.
- **Sequenced order numbers**: Add sequence `order_number_seq` and configure `orders.number` to use it as a default.
- **New columns**:
  - `products`: `weight` (numeric), `sku` (text), `meta_title` (text), `meta_description` (text)
  - `product_variants`: `is_active` (boolean), `barcode` (text)
  - `profiles`: `points` (integer)
- **New Tables**:
  - `addresses`: Stores customer address entries with RLS policies mapping to `user_id`.
  - `coupons`: Stores discount codes, limits, expiry dates, and usage counts.
  - `wishlists`: Junction table linking `user_id` and `product_id`.
  - `newsletter_subscribers`: Email subscriber log.
  - `order_status_history`: Tracks status change logs with notes for admin/customer audit trails.
  - `payment_transactions`: Logs payment attempts, mode, transaction reference, and status.
- **Aggregator Trigger**: Add trigger `on_review_change` that auto-calculates `products.rating` and `products.reviews_count` when reviews are added/modified/deleted.
- **Trigger adjustment**: Update `handle_new_user` to sync raw phone number to the profiles table.
- **Settings alignment**: Update the settings table to seed PKR/Rs currencies, values, and default payment modes.

#### [MODIFY] [admin.tsx](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/routes/admin.tsx)
- Restrict first-user admin self-promotion so it only works when accessing from `localhost` or `127.0.0.1`.

#### [MODIFY] [.gitignore](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/.gitignore)
- Add `.env` to prevent committing secrets.

---

### Checkout & Ordering Backend

#### [NEW] [order.functions.ts](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/lib/order.functions.ts)
Implement TanStack Start server functions to handle secure checkouts:
- **`createOrder`**:
  - Securely validates price sums, stock availability, and coupon validity.
  - Generates sequence numbers.
  - Decrements variant stock and updates base product stock in a database transaction block (calling database RPCs).
  - Logs status audit trail to `order_status_history`.
  - Inserts transaction details into `payment_transactions`.
- **`validateCoupon`**: Validates min spend, active status, limit counts, and expiry dates on the server.

#### [MODIFY] [checkout.tsx](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/routes/checkout.tsx)
- Check authentication; redirect to `/login?redirect=/checkout` if guest.
- Fetch store settings dynamically (`tax_rate`, `free_shipping_threshold`, `shipping_flat`, `currency_symbol`).
- Fetch and display coupon discount calculations in order summary.
- Update checkout submit handler to call the server function `createOrder`.
- Clear client cart state only after receiving a success response from the server.

---

### Cart & Wishlist Sync

#### [MODIFY] [catalog-queries.ts](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/lib/catalog-queries.ts)
- Add react-query options for:
  - `settingsQuery()` (fetches active singleton store settings)
  - `userOrdersQuery()` (fetches user's orders and items)
  - `userAddressesQuery()` (fetches user's addresses)

#### [MODIFY] [cart.tsx](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/routes/cart.tsx)
- Replace hardcoded currency, tax rates (8%), and free shipping threshold ($200) with settings queried from the database.

#### [MODIFY] [shop.ts](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/store/shop.ts)
- Maintain Zustand local storage for guest carts/wishlists.
- Update `toggleWishlist` action to asynchronously sync item state directly to/from Supabase `wishlists` table when the user is logged in.
- Remove hardcoded mock profiles, addresses, and orders.
- Handle database synchronization on auth state changes.

#### [MODIFY] [__root.tsx](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/routes/__root.tsx)
- In `onAuthStateChange`, fetch and sync the user's database wishlist and profile details directly into Zustand on login, and wipe them on sign out.

---

### Account Dashboard Integration

#### [MODIFY] [DashboardPanel.tsx](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/components/account/DashboardPanel.tsx)
- Display real order count, wishlist count, points, and latest order stats queried dynamically from the database.

#### [MODIFY] [OrdersPanel.tsx](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/components/account/OrdersPanel.tsx)
- Query order details and status timeline directly from Supabase.

#### [MODIFY] [AddressesPanel.tsx](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/components/account/AddressesPanel.tsx)
- Load, edit, insert, set default, and delete addresses directly from/to the Supabase database.

#### [MODIFY] [SettingsPanel.tsx](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/components/account/SettingsPanel.tsx)
- Update profile settings (name, phone) directly in the database.

---

### Admin Dashboard, Variants & Polish

#### [MODIFY] [admin.products.tsx](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/routes/admin.products.tsx)
- Add variant CRUD management in the product edit drawer.

#### [MODIFY] [login.tsx](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/routes/login.tsx)
- Remove hardcoded dot characters from the password password field value.

---

## Verification Plan

### Automated Tests
- Run `npm run build` locally to verify that all TypeScript type mappings, routes, and client/server integrations compile cleanly.

### Manual Verification
1. **Security Testing**: Verify that calling `has_role` as an unauthenticated request returns an error block rather than resolving details.
2. **Checkout & Stock Testing**: Add a helmet to the cart, check out using simulated easy-paisa / cash-on-delivery. Verify that:
   - Order and items records exist in the Supabase backend.
   - The stock column in `product_variants` and `products` has been decremented.
3. **Account Testing**: Update customer details on the profile tab, reload the page, and check if data persists from Supabase.
