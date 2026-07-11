# Implementation Plan - Manual Payment Processing & Verification (Updated)

This plan outlines the changes to support manual EasyPaisa, JazzCash, and Bank Transfer payments, allowing customers to enter transaction references and upload receipt screenshots during checkout, and admins to configure account details and verify payments from the dashboard.

## User Review Required

> [!IMPORTANT]
> - **Card & NayaPay Payments Excluded:** Credit/Debit card and NayaPay payments will be removed from checkout and settings entirely.
> - **COD Karachi Only:** Cash on Delivery (COD) will only show as an option in the checkout flow if the shipping address city is set to "Karachi" (case-insensitive).
> - **Manual Verification:** For manual payments (EasyPaisa, JazzCash, and Bank Transfers), orders will be created with `payment_status = 'pending'`. The admin must verify the transaction manually and update the status to `'paid'` in the dashboard to proceed.

## UI/UX & Customer Experience Enhancements (Frictionless Flow)

To make manual transfers as easy and stress-free as possible for customers:
1. **One-Click Copy Buttons:** Add a `Copy` icon next to Account Number, IBAN, Account Title, and the exact Payable Amount, allowing users to copy them instantly to their clipboard.
2. **Clear Step-by-Step Wizard Layout:**
   - **Step 1: Copy Account Details** (visual card containing numbers + copy buttons).
   - **Step 2: Pay Exact Amount** (bold displays of amount).
   - **Step 3: Submit Payment Proof** (fields for Transaction ID and a drag-and-drop receipt uploader).
3. **Instant Image Preview:** After uploading the receipt screenshot, show a thumbnail preview of the image with a "Remove/Replace" option so the user has immediate visual feedback that their file was successfully uploaded.
4. **Friendly Reassurance Notice:** Show a helper alert explaining that orders are checked quickly (e.g., "Verification takes 15-30 mins. We will start packing your helmet as soon as it clears!").

---

## Proposed Changes

### Database Schema

#### [NEW] [20260619101000_add_manual_payment_fields.sql](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/supabase/migrations/20260619101000_add_manual_payment_fields.sql)
- Add columns to `public.orders`:
  - `payment_reference` (TEXT)
  - `payment_receipt_url` (TEXT)
- Add columns to `public.settings`:
  - `easypaisa_number` (TEXT, default: '03001234567')
  - `easypaisa_title` (TEXT, default: 'MotoHelm Store')
  - `jazzcash_number` (TEXT, default: '03001234567')
  - `jazzcash_title` (TEXT, default: 'MotoHelm Store')
  - `bank_name` (TEXT, default: 'Meezan Bank Ltd')
  - `bank_title` (TEXT, default: 'MotoHelm Store')
  - `bank_account_number` (TEXT, default: '0123-0123456-789')
  - `bank_iban` (TEXT, default: 'PK36 MEZN 0001 2300 1234 5678')
- Create Supabase storage bucket `payment-receipts`.
- Configure bucket policies on `storage.objects` for `payment-receipts`:
  - Allow public read (SELECT) for receipt URLs.
  - Allow authenticated users to insert (INSERT) receipt images.
  - Allow admin/staff to delete (DELETE) receipt records.
- Set default `payment_modes_enabled` in `settings` to `ARRAY['cod', 'easypaisa', 'jazzcash', 'bank']` (excluding card and NayaPay).

#### [MODIFY] [supabase_master_setup.sql](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/supabase_master_setup.sql)
- Update the `orders` and `settings` table creation statements to include the new columns.
- Update the default `payment_modes_enabled` array to exclude `card` and `nayapay`.
- Include the `payment-receipts` bucket definition and policies at the bottom.

#### [MODIFY] [types.ts](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/integrations/supabase/types.ts)
- Update auto-generated database TypeScript interfaces to include the new columns in `orders` and `settings`.

---

### Backend & Order Functions

#### [MODIFY] [order.functions.ts](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/lib/order.functions.ts)
- Update `CreateOrderInput` schema to accept optional `paymentReference` and `paymentReceiptUrl` properties.
- Remove `card` and `nayapay` from the `paymentMode` enum validator.
- Modify `createOrder` to:
  - Extract the new fields.
  - Set `payment_status` to `'pending'` on order creation if `paymentMode` is `easypaisa`, `jazzcash`, `bank`, or `cod`.
  - Save `payment_reference` and `payment_receipt_url` values to the `orders` record.
  - Insert transaction record with `status: 'pending'` and reference ID.

---

### Checkout Flow

#### [MODIFY] [checkout.tsx](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/routes/checkout.tsx)
- Retrieve manual payment configuration from settings dynamically.
- Modify `payMethods` array to exclude the `"card"` and `"nayapay"` options.
- Update checkout "Payment" step filters:
  - If `shippingAddress.city` is not "Karachi" (case-insensitive), filter out `cod` from the active payment methods list.
  - Implement a premium UI/UX manual transfer section:
    - Display customized account numbers and titles for EasyPaisa, JazzCash, and Bank Transfers using the details fetched from database settings.
    - Render interactive copy buttons (`Copy` icon) for easy clip-boarding of accounts/amounts.
    - Provide a styled drag-and-drop / click file selector for the receipt uploader.
    - Render a loader while the receipt is uploading, followed by a preview card showing the uploaded screenshot and a delete/replace button.
    - Add text field inputs for Transaction ID/Reference.
  - Supply the transaction ID and receipt URL to the `createOrder` function.

---

### Admin Dashboard - Settings

#### [MODIFY] [admin.settings.tsx](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/routes/admin.settings.tsx)
- Update checkbox list to render the options: `["cod", "easypaisa", "jazzcash", "bank"]` (omitting `card`, `nayapay`, `upi`, `paypal`).
- Render a new section "Manual Payment Details" with text fields to configure:
  - EasyPaisa Number/Title
  - JazzCash Number/Title
  - Bank Name/Title/Account Number/IBAN
- Include these new fields in the settings update payload.

---

### Admin Dashboard - Order Management

#### [MODIFY] [admin.orders.tsx](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/src/routes/admin.orders.tsx)
- Extend `PAY_MODE` list to include `["cod", "easypaisa", "jazzcash", "bank"]` (excluding card and NayaPay).
- In the order details drawer panel, display customer payment details if `payment_reference` exists:
  - Transaction Reference / ID.
  - Clickable thumbnail or button to open the receipt screenshot.
- Keep the existing dropdown functionality so the admin can review the payment in their account and switch `payment_status` to `'paid'` once verified.

---

## Verification Plan

### Automated Tests
- Build test check: `npx tsc --noEmit`

### Manual Verification
1. **Apply Migration:** Run the new migration SQL script.
2. **Configure Settings:** Go to Admin Dashboard > Settings. Enable manual methods and click Save.
3. **Cart Checkout - Outside Karachi:**
   - Enter city "Lahore" in shipping.
   - Verify that Cash on Delivery (COD) **does not show** as a payment method in the Payment step (only EasyPaisa, JazzCash, Bank transfer display).
4. **Cart Checkout - Karachi:**
   - Enter city "Karachi" in shipping.
   - Verify that Cash on Delivery (COD) **is available** as a option in the Payment step.
5. **Verify Clipboard:** Click copy buttons in checkout and confirm values copy to the clipboard correctly.
6. **Verify Uploader:** Upload a receipt and verify the loading spinner and receipt image preview appear.
7. **Verify Placement:** Place an order, verify the transaction ID and uploaded receipt image appear in the order details inside the Admin Dashboard.
8. **Verify Payment:** Transition payment status to `'paid'` in the dashboard, confirming the verified receipt.
