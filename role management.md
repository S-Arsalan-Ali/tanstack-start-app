# Implementation Plan — Password Management, Staff Permissions & Activity Log

We will implement a secure password management system, formalize staff permissions, and introduce an activity audit log so administrators can track staff actions in the dashboard.

## Open Questions for You

> [!IMPORTANT]
> **Password Management Approach**
> Admins cannot directly change another user's password from the client-side due to Supabase security restrictions. To allow admins to change staff passwords, we have two options:
> 1. **Option A (Simpler)**: Admins click "Send Password Reset", which emails the staff member a secure link to reset their own password.
> 2. **Option B (Direct Control)**: We create a secure Supabase Edge Function that uses a Service Role key, allowing the admin to forcefully type in and set a new password for the staff member.
>
> *I have planned for Option A as it is more secure and standard, but please let me know if you strongly prefer Option B.*

## Proposed Changes

### 1. Password Management
- **Admin Password Change**:
  - Add a "Security" section within `/admin/settings`.
  - Provide a form for the currently logged-in user (Admin or Staff) to update their own password using `supabase.auth.updateUser()`.
- **Staff Password Reset Requests**:
  - Staff can click a "Request Password Reset" button if they forgot it (on the login page) which sends a standard reset email.
  - Inside the admin dashboard, create a "Staff Management" tab where the Admin can view all registered staff and click an action to trigger a password reset email for any staff member.

### 2. Staff Permissions Definition
We will enforce specific boundaries for the `staff` role across the application using both UI hiding and Database RLS policies:
- **What Staff CAN Do**:
  - View and process `orders` (update status to shipped, delivered).
  - View and edit `products` (update stock levels and prices).
  - Read and reply to `contact_messages` from customers.
- **What Staff CANNOT Do**:
  - Cannot access or modify global `settings` (Location, FAQs, Site Info).
  - Cannot access the new "Staff Management" or "Activity Logs" panels.
  - Cannot permanently delete products, orders, or customer accounts.
  - Cannot issue custom promo codes.

### 3. Activity Audit Log System
- **Database Schema**:
  - Create a new table `public.activity_logs`:
    - `id` (UUID)
    - `user_id` (UUID, references profiles)
    - `action_type` (TEXT, e.g., 'UPDATE_ORDER', 'UPDATE_STOCK')
    - `entity_id` (UUID, the ID of the order/product modified)
    - `details` (JSONB, containing before/after state or simple descriptions)
    - `created_at` (Timestamp)
  - Enable RLS: Only admins can view logs. Staff can insert logs but cannot read or delete them.
- **Integration**:
  - Create a TypeScript utility function `logActivity(action, entity, details)` in the client application.
  - Inject this function into critical staff workflows (e.g., when an order status is changed, or a product stock is adjusted).
- **Admin View**:
  - Build a new `/admin/activity-logs` route.
  - Display a chronological table of events showing *Who* (Staff Name), *Did What* (Action), *When* (Timestamp), and *To What* (Entity).

## Verification Plan
1. **Manual Verification**:
   - Log in as a Staff user and attempt to access restricted areas (Settings, Activity Logs) to ensure they are blocked.
   - Perform a routine action as Staff (e.g., updating an order status) and verify the action is recorded.
   - Log in as Admin, view the Activity Logs to confirm the staff action appears.
   - Test the "Change Password" form as an Admin to ensure credentials update successfully.
2. **Build Verification**:
   - Run `npm run build` to guarantee zero compilation errors after adding the new routes and tables.
