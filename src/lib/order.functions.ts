import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Zod Input Validators
const ValidateCouponInput = z.object({
  code: z.string().min(1),
  subtotal: z.number().nonnegative(),
});

const CreateOrderInput = z.object({
  customerName: z.string().min(1),
  customerEmail: z.string().email(),
  shippingAddress: z.object({
    email: z.string().email(),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    street: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1),
    zip: z.string().min(1),
    phone: z.string().min(1),
  }),
  paymentMode: z.enum(["easypaisa", "jazzcash", "bank", "cod"]),
  items: z.array(
    z.object({
      id: z.string(), // variant id
      qty: z.number().int().positive(),
      color: z.string(),
      size: z.string(),
    })
  ),
  couponCode: z.string().optional(),
  paymentReference: z.string().optional(),
  paymentReceiptUrl: z.string().optional(),
});

// 1. validateCoupon
export const validateCoupon = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ValidateCouponInput.parse(d))
  .handler(async ({ data }) => {
    const sb = supabaseAdmin;
    const { data: coupon, error } = await sb
      .from("coupons")
      .select("*")
      .eq("code", data.code.trim().toUpperCase())
      .eq("is_active", true)
      .maybeSingle();

    if (error || !coupon) {
      return { valid: false, message: "Invalid promo code" };
    }

    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return { valid: false, message: "Promo code expired" };
    }

    if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
      return { valid: false, message: "Promo code usage limit reached" };
    }

    if (data.subtotal < Number(coupon.min_order_subtotal)) {
      return {
        valid: false,
        message: `Min order subtotal $${coupon.min_order_subtotal} required`,
      };
    }

    return {
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: Number(coupon.discount_value),
        max_discount: coupon.max_discount != null ? Number(coupon.max_discount) : null,
      },
    };
  });

// 2. createOrder
export const createOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateOrderInput.parse(d))
  .handler(async ({ data, context }) => {
    const userId = context.userId; // verified auth user ID
    const sb = supabaseAdmin; // bypasses RLS for stock operations

    // 1. Validate pricing and stock availability
    let subtotal = 0;
    const itemsToInsert = [];

    for (const item of data.items) {
      const { data: variant, error: vErr } = await sb
        .from("product_variants")
        .select("*, products(*)")
        .eq("id", item.id)
        .single();

      if (vErr || !variant) {
        throw new Error(`Variant ${item.id} not found`);
      }

      const product = variant.products;
      if (!product || product.status !== "active") {
        throw new Error(`Product for variant ${item.id} is inactive or not found`);
      }

      // Check stock
      if (variant.stock < item.qty) {
        throw new Error(
          `Insufficient stock for ${product.name} (${item.color} - ${item.size}). Requested: ${item.qty}, Available: ${variant.stock}`
        );
      }

      const unitPrice =
        variant.price_override != null ? Number(variant.price_override) : Number(product.price);
      const lineTotal = unitPrice * item.qty;
      subtotal += lineTotal;

      itemsToInsert.push({
        product_id: product.id,
        variant_id: variant.id,
        name_snapshot: product.name,
        image_snapshot: "", // can be set if needed
        color: item.color,
        size: item.size,
        qty: item.qty,
        unit_price: unitPrice,
        line_total: lineTotal,
      });
    }

    // 2. Load store settings for tax & shipping calculations
    const { data: settings } = await sb.from("settings").select("*").limit(1).single();
    if (!settings) {
      throw new Error("Settings not configured");
    }

    const taxRate = Number(settings.tax_rate) / 100;
    const threshold = Number(settings.free_shipping_threshold);
    const flatShipping = Number(settings.shipping_flat);
    const isFreeShippingEnabled = settings.free_shipping_enabled !== false;

    const shipping = (isFreeShippingEnabled && subtotal >= threshold) ? 0 : flatShipping;
    const tax = subtotal * taxRate;

    // 3. Process coupon discount if applicable
    let discount = 0;
    let couponId = null;
    if (data.couponCode) {
      const vResult = await validateCoupon({
        data: { code: data.couponCode, subtotal },
      });
      if (vResult.valid && vResult.coupon) {
        couponId = vResult.coupon.id;
        if (vResult.coupon.discount_type === "percent") {
          discount = subtotal * (vResult.coupon.discount_value / 100);
          if (vResult.coupon.max_discount && discount > vResult.coupon.max_discount) {
            discount = vResult.coupon.max_discount;
          }
        } else {
          discount = vResult.coupon.discount_value;
        }
      }
    }

    const total = subtotal + shipping + tax - discount;

    // Build shipping/billing address payload
    const addressJSON = {
      line1: data.shippingAddress.street,
      city: data.shippingAddress.city,
      state: data.shippingAddress.state,
      postal_code: data.shippingAddress.zip,
      country: "Pakistan",
      phone: data.shippingAddress.phone,
      first_name: data.shippingAddress.firstName,
      last_name: data.shippingAddress.lastName,
    };

    // 4. Create Order
    const { data: order, error: oErr } = await sb
      .from("orders")
      .insert({
        user_id: userId,
        customer_name: data.customerName,
        customer_email: data.customerEmail,
        status: "pending",
        payment_status: "pending",
        payment_mode: data.paymentMode,
        shipping_status: "pending",
        shipping_address: addressJSON,
        billing_address: addressJSON,
        subtotal,
        shipping,
        tax,
        discount,
        total,
        payment_reference: data.paymentReference || null,
        payment_receipt_url: data.paymentReceiptUrl || null,
      })
      .select()
      .single();

    if (oErr || !order) {
      throw new Error(`Failed to create order: ${oErr?.message}`);
    }

    // 5. Create Order Items
    const orderItems = itemsToInsert.map((it) => ({
      ...it,
      order_id: order.id,
    }));

    const { error: oiErr } = await sb.from("order_items").insert(orderItems);
    if (oiErr) {
      // Rollback order row
      await sb.from("orders").delete().eq("id", order.id);
      throw new Error(`Failed to create order items: ${oiErr.message}`);
    }

    // 6. Decrement stocks and increment coupon usages using secure RPCs
    for (const insertedItem of itemsToInsert) {
      await sb.rpc("decrement_variant_stock", {
        var_id: insertedItem.variant_id,
        qty_to_dec: insertedItem.qty,
      });
      await sb.rpc("sync_product_stock", {
        prod_id: insertedItem.product_id,
      });
    }

    if (couponId) {
      await sb.rpc("increment_coupon_usage", { coupon_id: couponId });
    }

    // 7. Log Order Status History
    await sb.from("order_status_history").insert({
      order_id: order.id,
      status: "pending",
      notes: "Order placed successfully",
      changed_by: userId,
    });

    // 8. Log Payment Transaction details
    await sb.from("payment_transactions").insert({
      order_id: order.id,
      payment_method: data.paymentMode,
      transaction_ref: data.paymentReference || null,
      amount: total,
      status: "pending",
    });

    console.log(`[Order Service] Order ${order.number} created successfully. Simulated confirmation email dispatched.`);

    return {
      orderId: order.id,
      orderNumber: order.number,
      total: order.total,
    };
  });
