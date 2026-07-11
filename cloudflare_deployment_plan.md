# MotoHelm — Cloudflare Deployment & R2 Migration Plan

This plan details the step-by-step process to deploy the TanStack Start application to Cloudflare Workers and migrate all file storage (images, receipts) from Supabase Storage to Cloudflare R2.

As requested, we will perform a **fresh start on R2**. Existing images in Supabase will not be migrated.

---

## 🏗️ Part 1: Infrastructure Setup (Cloudflare Dashboard)

Before changing code, we need to provision the necessary infrastructure on Cloudflare.

1. **Create an R2 Bucket**
   - Go to Cloudflare Dashboard → R2
   - Create a new bucket named: `motohelm-assets`
   - Enable **Public Access** for this bucket (either via `r2.dev` subdomain or by attaching a custom domain like `assets.motohelm.com`). This is required so images can be rendered in `<img>` tags on the storefront without authentication.

2. **Retrieve API Credentials (If running deployments locally)**
   - Create an API Token in Cloudflare with `Workers Scripts: Edit` and `R2: Edit` permissions.
   - Note down the `CLOUDFLARE_ACCOUNT_ID` from the dashboard URL.

---

## 🛠️ Part 2: Project Configuration

We need to configure `wrangler`, Cloudflare's CLI tool, to connect the local project to the Cloudflare environment.

### [MODIFY] `wrangler.jsonc`
Update the wrangler configuration to bind the newly created R2 bucket to the worker.

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "motohelm-store",
  "compatibility_date": "2025-09-24",
  "compatibility_flags": ["nodejs_compat"],
  "main": "src/server.ts",
  
  // Add R2 Binding
  "r2_buckets": [
    {
      "binding": "STORAGE",
      "bucket_name": "motohelm-assets",
      "preview_bucket_name": "motohelm-assets-dev" // Optional: for local dev
    }
  ]
}
```

### Configure Environment Variables
Instead of a `.env` file, Cloudflare uses secret bindings. We need to upload the Supabase keys securely.
*Note: Run these commands locally before deploying.*

```bash
wrangler secret put VITE_SUPABASE_URL
wrangler secret put VITE_SUPABASE_ANON_KEY
```

---

## 💻 Part 3: Code Refactoring (Replacing Supabase Storage)

Currently, the app uploads files directly from the browser to Supabase. With R2, we must route uploads through our own server API endpoint because the browser cannot securely hold R2 write credentials.

### 1. Create a Server Upload API
We will create a new TanStack Start server function (e.g., `src/lib/storage.functions.ts`) to handle uploads.

#### [NEW] `src/lib/storage.functions.ts`
```typescript
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-attacher";

export const uploadToR2 = createServerFn("POST", async (formData: FormData, ctx) => {
  // 1. Authenticate user (requireSupabaseAuth middleware)
  // 2. Validate file type (png/jpeg/webp)
  // 3. Extract env.STORAGE from Cloudflare context
  // 4. await env.STORAGE.put(filename, fileBuffer)
  // 5. Return public URL
});
```

### 2. Refactor Upload Components
Update the frontend components to use the new server function instead of `supabase.storage.from()`.

#### [MODIFY] `src/components/admin/ImageUpload.tsx`
- Remove `supabase.storage` calls.
- Use `useMutation` with the new `uploadToR2` server function.
- Change how the public URL is constructed (it will now point to your R2 public domain).

#### [MODIFY] `src/routes/checkout.lazy.tsx` (Payment Receipts)
- Update the manual payment receipt uploader (`uploadReceipt`) to use the new server function.
- Ensure the R2 public URL is saved to the `payment_receipt_url` column in the database.

#### [MODIFY] `src/routes/admin.products.lazy.tsx` (Product Images)
- Update the product variant image uploader to use the new R2 pipeline.

---

## 🚀 Part 4: Build & Deployment

Once the code is updated, we will deploy it to Cloudflare Workers.

### Step-by-Step Deployment Commands

```bash
# 1. Install dependencies
npm install

# 2. Build the TanStack Start application for the Cloudflare environment
# (The @cloudflare/vite-plugin handles compiling to a worker bundle)
npm run build

# 3. Deploy to Cloudflare Edge
npx wrangler deploy
```

### Post-Deployment Verification
1. Open the deployed Cloudflare `*.workers.dev` URL.
2. Navigate to Checkout, select Manual Payment, and upload a test receipt.
3. Verify the receipt image loads correctly from the R2 public URL.
4. Go to the Admin Panel and add a new slide/product image to verify admin uploads work.

---

## Open Questions

1. **Custom Domain for Assets**: Do you want to use the default `r2.dev` subdomain provided by Cloudflare for serving images, or do you want to attach a custom domain (like `assets.motohelm.com`) for better branding?
2. **Local Development**: Do you want to test R2 uploads locally using Wrangler's local proxy, or are you comfortable testing uploads directly against the production R2 bucket during development?
