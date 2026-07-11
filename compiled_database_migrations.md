# MotoHelm E-Commerce — Compiled Database Migrations Guide

This guide compiles all database migrations, schema structures, storage policies, database triggers, and RPC helpers used in the MotoHelm application into a single reference. It details how the database handles order sequences, manual payments, branding controls, storefront reviews, and security privileges.

A consolidated setup script has been generated at [supabase_final_master_setup.sql](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/supabase_final_master_setup.sql) in your project root, which you can run directly to recreate the schema.

---

## 📋 Step-by-Step Deployment Guide

You can deploy the consolidated database schema using either the **Supabase Dashboard SQL Editor** or the **Supabase CLI**.

### Option A: Using the Supabase Dashboard (Recommended)

1. **Access the SQL Editor**:
   * Navigate to the [Supabase Dashboard](https://supabase.com/dashboard).
   * Open your project: **MOTO Orange** (Ref: `fsjhbsljlvthdmyzdunh`).
   * Click on the **SQL Editor** tab in the left sidebar menu (marked with a console/terminal icon).

2. **Run the Script**:
   * Click on **New Query** to open an empty SQL query pane.
   * Open [supabase_final_master_setup.sql](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/supabase_final_master_setup.sql) in your editor and copy its entire content.
   * Paste it into the Supabase SQL editor query pane.
   * Click the green **Run** button at the bottom right.
   * Ensure that the console outputs: `Success. Query returned 0 rows.` and the logs output: `Master database setup completed successfully!`.

---

### Option B: Using the Supabase CLI (Local Development)

If you are developing locally with the Supabase CLI:

1. **Format the Migration**:
   Create a new migration file inside your workspace:
   ```bash
   supabase migration new master_schema_setup
   ```
   This will create a new empty `.sql` file inside `supabase/migrations/`.

2. **Copy the Content**:
   * Copy all contents of [supabase_final_master_setup.sql](file:///e:/lovable%20orange/chrome-chrome-main/ecommerce/supabase_final_master_setup.sql) into this newly created migration file.

3. **Apply the Migration**:
   * Push the schema to your remote database:
     ```bash
     supabase db push
     ```

---

## 🛠️ Detailed Schema Explanation

The schema is divided into distinct, logically grouped components:

### 1. Custom Database Enums
To enforce data integrity, the system uses custom PostgreSQL types:
* `public.app_role`: Restricts user permissions to `admin`, `staff`, or `customer`.
* `public.product_status`: Controls storefront product visibility (`draft`, `active`, `archived`).
* `public.order_status`: Tracks customer order fulfillment progress (`pending`, `processing`, `packed`, `shipped`, `delivered`, `cancelled`, `returned`).
* `public.payment_status`: Tracks payment states (`pending`, `paid`, `refunded`, `failed`).
* `public.payment_mode`: Restricts payment types to `card`, `cod`, `easypaisa`, `jazzcash`, `nayapay`, or `bank`.

### 2. User Roles & Profiles
* **`user_roles`**: Links Supabase Auth users to `app_role` permissions. It is governed by a secure function:
  ```sql
  CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
  RETURNS boolean SECURITY DEFINER ...
  ```
* **`profiles`**: Stores customer names, emails, phones, and loyalty points.
* **Auto-creation Trigger (`handle_new_user`)**: Listens to `auth.users` insertions on signups, automatically creating a profile record and assigning the default `'customer'` role.

### 3. Core E-Commerce Entities
* **`brands` & `categories`**: Stores structural tags for helmets and accessories.
* **`products` & `product_images`**: Configured with SEO fields (`meta_title`, `meta_description`), weight metrics (for shipping logic), pricing overrides, and ratings.
* **`product_variants`**: Handles inventory at the specific parameter level (combining color and size). Includes an `image_url` to associate photos with specific variant SKUs.

### 4. Customer Features
* **`addresses`**: Address book with RLS restricting customers to viewing and writing only their own entries, while staff can read them for packing and delivery.
* **`wishlists`**: Backed-up wishlist items, matching `user_id` and `product_id`.
* **`coupons`**: Discount codes (`fixed` amount or `percent` off) with minimum spends, usage counters, expiration dates, and usage limits.

### 5. Orders & Payments Ledger
* **`orders`**: Keeps a record of transactions. Configured with:
  * **Sequenced Order Numbers**: Uses the sequence `order_number_seq` to automatically generate serial human-readable IDs starting at `MH-100001`.
  * **Manual Transfer Audits**: Dedicated fields (`payment_reference`, `payment_receipt_url`) log Transaction IDs and receipt screenshot URLs.
* **`order_items`**: Saves snapshots of item names, prices, colors, sizes, and quantities.
* **`order_status_history`**: Audit trail tracking status logs (e.g. `processing` to `shipped`) along with notes and moderator UUIDs.
* **`payment_transactions`**: Ledger recording transaction statuses and payment mode logs.

### 6. Storefront Settings & Hero Slides
* **`settings`**: Singleton row storing currency, taxes, flat rates, and manual payment credentials (EasyPaisa/JazzCash numbers, Bank IBANs).
* **`hero_slides`**: Houses homepage banner slides (kicker, title lines, subtitles, background images, stats badges, primary/secondary buttons). Governed by RLS policies so anonymous requests can only read active slides, while admins can write/reorder.

---

## 🗄️ Public Storage Buckets & RLS Policies

The application configures 6 Supabase public storage buckets. Each bucket uses Row Level Security (RLS) to enforce safe asset management:

| Bucket ID | Access Control (Public Read) | Access Control (Authenticated Write/Update) |
|---|---|---|
| `product-images` | Yes (Public URL) | Admin / Staff only |
| `brand-logos` | Yes (Public URL) | Admin / Staff only |
| `category-images` | Yes (Public URL) | Admin / Staff only |
| `payment-receipts`| Yes (Public URL) | Authenticated customers (upload proof) |
| `store-assets` | Yes (Public URL) | Admin / Staff only (store logo, banner images) |
| `invoices` | **No** (Secure Read) | Admin / Staff only |

---

## ⚡ Database Triggers & Automations

### 1. Review Aggregator Trigger (`on_review_change`)
Runs after any insert, update, or delete on the `product_reviews` table. It automatically recalculates the product's average rating and reviews count, updating the `rating` and `reviews_count` columns in the `products` table instantly.

### 2. Order Status History Trigger (`trigger_order_status_updates`)
Logs status audit trails to `order_status_history` whenever order status or payment state changes:
* Transitioning payment from `pending` to `paid` automatically sets the order status to `processing` and generates a tracking number (e.g., `MH-TRK-8B9FA120`).
* Any status transitions are logged to provide a chronological history for customer notifications.

---

## 📡 Realtime Sync invalidations

To trigger instant UI updates when administrators modify catalog assets, the schema configures postgres replica identities to `FULL` and adds the tables to the `supabase_realtime` publication:
* `products`, `product_images`, `product_variants`
* `categories`, `brands`
* `hero_slides`
* `settings`

This maps directly to the realtime listener inside the app's root route (`src/routes/__root.tsx`), forcing immediate cache invalidation and UI updates without manual refreshes.
