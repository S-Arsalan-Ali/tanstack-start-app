import { createLazyFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Check, ChevronRight, ShieldCheck, CreditCard, Building2, Wallet, Smartphone, Banknote, Loader2, Copy } from "lucide-react";
import { toast } from "sonner";
import { useShop } from "@/store/shop";
import { useQuery } from "@tanstack/react-query";
import { settingsQuery } from "@/lib/catalog-queries";
import { validateCoupon, createOrder } from "@/lib/order.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createLazyFileRoute("/checkout")({
  component: CheckoutPage,
});

const steps = ["Shipping", "Review", "Payment"] as const;

type PayMethod = "bank" | "easypaisa" | "jazzcash" | "cod";

const payMethods: { id: PayMethod; label: string; sub: string; icon: any; accent: string }[] = [
  { id: "easypaisa", label: "EasyPaisa", sub: "Mobile wallet payment", icon: Smartphone, accent: "text-[#3fae29]" },
  { id: "jazzcash", label: "JazzCash", sub: "Mobile wallet payment", icon: Wallet, accent: "text-[#c8102e]" },
  { id: "bank", label: "Bank Transfer", sub: "Direct IBAN deposit", icon: Building2, accent: "text-foreground" },
  { id: "cod", label: "Cash on Delivery", sub: "Pay when it arrives (Karachi only)", icon: Banknote, accent: "text-foreground" },
];

function CheckoutPage() {
  const isAuthed = useShop((s) => s.isAuthed);
  const profile = useShop((s) => s.profile);
  const cart = useShop((s) => s.cart);
  const clear = useShop((s) => s.clearCart);
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  
  // Shipping Address State
  const [shippingAddress, setShippingAddress] = useState<any>(null);
  
  // Coupon State
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState("");
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  // Manual payment state
  const [referenceId, setReferenceId] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  // Order placing state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");

  // Load Settings
  const { data: settings } = useQuery(settingsQuery());
  const symbol = settings?.currency_symbol ?? "Rs.";
  const taxRate = settings?.tax_rate ? settings.tax_rate / 100 : 0.08;
  const threshold = settings?.free_shipping_threshold ?? 20000;
  const flatShipping = settings?.shipping_flat ?? 150;
  const isFreeShippingEnabled = settings?.free_shipping_enabled !== false;

  const getWalletLogo = (id: PayMethod) => {
    switch (id) {
      case "easypaisa": return settings?.easypaisa_logo_url;
      case "jazzcash": return settings?.jazzcash_logo_url;
      case "bank": return settings?.bank_logo_url;
      case "cod": return settings?.cod_logo_url;
      default: return null;
    }
  };
  const enabledModes = settings?.payment_modes_enabled ?? ["cod", "easypaisa", "jazzcash", "bank"];

  // Filter and default payment method
  const activeMethods = payMethods.filter((m) => {
    const isEnabled = enabledModes.map((x) => x.toLowerCase()).includes(m.id.toLowerCase());
    if (!isEnabled) return false;
    if (m.id === "cod") {
      // COD only available for Karachi (case-insensitive check)
      return shippingAddress?.city?.trim().toLowerCase() === "karachi";
    }
    return true;
  });
  const [pay, setPay] = useState<PayMethod>("easypaisa");

  useEffect(() => {
    if (activeMethods.length && !activeMethods.some((m) => m.id === pay)) {
      setPay(activeMethods[0].id);
    }
  }, [settings, activeMethods]);

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large", { description: "Receipt images must be under 5MB." });
      return;
    }

    setUploadingReceipt(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `receipts/${Math.random().toString(36).substring(2, 9)}_${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("payment-receipts")
        .upload(path, file, { cacheControl: "3600", upsert: true });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from("payment-receipts")
        .getPublicUrl(path);

      setReceiptUrl(publicUrl);
      toast.success("Receipt uploaded successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error("Upload failed", { description: err.message || "Failed to upload file." });
    } finally {
      setUploadingReceipt(false);
    }
  };

  // Auth gate
  useEffect(() => {
    if (!isAuthed) {
      toast.error("Sign in required", { description: "Please sign in to complete your checkout." });
      navigate({ to: "/login", search: { redirect: "/checkout" } });
    }
  }, [isAuthed, navigate]);

  if (!isAuthed) return null;

  const subtotal = cart.reduce((a, c) => a + c.price * c.qty, 0);
  
  let currentShippingRate = flatShipping;
  if (shippingAddress?.city && settings?.shipping_rates_city) {
    const cityRates = settings.shipping_rates_city as any[];
    const match = cityRates.find((r: any) => r.city?.trim().toLowerCase() === shippingAddress.city.trim().toLowerCase());
    if (match) {
      currentShippingRate = match.rate;
    }
  }
  
  const shipping = (isFreeShippingEnabled && subtotal >= threshold) ? 0 : currentShippingRate;
  const tax = subtotal * taxRate;
  
  // Coupon Discount
  let discount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discount_type === "percent") {
      discount = subtotal * (appliedCoupon.discount_value / 100);
      if (appliedCoupon.max_discount && discount > appliedCoupon.max_discount) {
        discount = appliedCoupon.max_discount;
      }
    } else {
      discount = appliedCoupon.discount_value;
    }
  }
  
  const total = subtotal + shipping + tax - discount;

  if (done) {
    return (
      <section className="pt-24 md:pt-28 pb-24 mx-auto max-w-2xl px-4 md:px-8 text-center animate-fade-in">
        <div className="size-20 mx-auto bg-primary text-primary-foreground grid place-items-center mb-6">
          <Check className="size-10" />
        </div>
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">Order Confirmed</p>
        <h1 className="font-display text-5xl md:text-7xl mt-2">YOU'RE GEARED UP.</h1>
        
        <div className="mt-6 border border-border bg-surface/30 p-6 space-y-4 rounded-none max-w-xl mx-auto text-left">
          <h3 className="font-display text-xl text-primary border-b border-border pb-2 uppercase tracking-wide">
            Order Locked In: <span className="font-mono text-foreground font-bold">{orderNumber}</span>
          </h3>
          {pay === "cod" ? (
            <p className="text-sm text-muted-foreground font-sans leading-relaxed">
              Thank you for riding with MotoHelm! Cash on Delivery is available for Karachi shipments. 
              Please have the exact amount of <span className="text-foreground font-bold font-mono">{symbol}{total.toFixed(0)}</span> ready for the courier when they arrive at your shipping address.
              You can monitor courier dispatch details and shipment tracking logs in real-time inside your account profile.
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground font-sans leading-relaxed">
                Thank you for your purchase! We have received your order and payment details.
              </p>
              <div className="bg-background border border-border p-3 font-mono text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-zinc-500">PAYMENT METHOD:</span>
                  <span className="text-foreground uppercase">{pay}</span>
                </div>
                {referenceId && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">TRANSACTION REFERENCE:</span>
                    <span className="text-foreground">{referenceId}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-zinc-500">PAYMENT STATUS:</span>
                  <span className="text-orange-400 font-bold">PENDING VERIFICATION</span>
                </div>
              </div>
              <p className="text-xs text-zinc-500 font-sans leading-relaxed italic pt-1 border-t border-border/50">
                Our verification team is cross-checking the transfer against your submitted details. 
                Once confirmed (usually within 15–30 minutes), we will start packing your helmet and send you a confirmation message via **Email** and **WhatsApp**.
                You can track the verification progress, status change logs, and direct updates from our team under the **Orders** section of your profile.
              </p>
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link to="/account" className="inline-flex px-6 py-3 border border-border text-zinc-300 font-mono text-xs uppercase tracking-[0.2em] font-bold hover:bg-surface/50 active:scale-[0.99] transition-all">
            View Order In Profile
          </Link>
          <Link to="/shop" className="inline-flex px-6 py-3 bg-primary text-primary-foreground font-mono text-xs uppercase tracking-[0.2em] font-bold hover:brightness-110 active:scale-[0.99] transition-all animate-pulse-glow">
            Keep Shopping
          </Link>
        </div>
      </section>
    );
  }

  if (cart.length === 0) {
    return (
      <section className="pt-24 md:pt-28 pb-24 mx-auto max-w-xl px-4 md:px-8 text-center">
        <h1 className="font-display text-4xl">NOTHING TO CHECKOUT</h1>
        <p className="text-muted-foreground mt-2">Add a helmet first.</p>
        <Link to="/shop" className="mt-6 inline-flex px-6 py-3 bg-primary text-primary-foreground font-mono text-xs uppercase tracking-[0.2em]">Shop Helmets</Link>
      </section>
    );
  }

  const handleShippingSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setShippingAddress({
      email: String(fd.get("email")),
      firstName: String(fd.get("firstName")),
      lastName: String(fd.get("lastName")),
      streetAddress: String(fd.get("streetAddress")),
      city: String(fd.get("city")),
      state: String(fd.get("state")),
      zip: String(fd.get("zip")),
      phone: String(fd.get("phone")),
    });
    setStep(1);
    toast.success("Shipping address saved");
  };

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    setValidatingCoupon(true);
    setCouponError("");
    try {
      const res = await validateCoupon({ data: { code: couponCode, subtotal } });
      if (res.valid && res.coupon) {
        setAppliedCoupon(res.coupon);
        setCouponCode("");
        toast.success("Promo code applied!");
      } else {
        setCouponError(res.message || "Invalid coupon");
      }
    } catch (err) {
      setCouponError("Failed to apply promo code");
    } finally {
      setValidatingCoupon(false);
    }
  };

  const placeRealOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shippingAddress) {
      toast.error("Shipping details missing");
      setStep(0);
      return;
    }

    if ((pay === "easypaisa" || pay === "jazzcash" || pay === "bank") && !referenceId.trim()) {
      toast.error("Transaction Reference ID required", { description: "Please enter your transfer Reference / ID to confirm." });
      setStep(2);
      return;
    }
    if ((pay === "easypaisa" || pay === "jazzcash" || pay === "bank") && !receiptUrl) {
      toast.error("Receipt screenshot required", { description: "Please upload your transfer screenshot to confirm." });
      setStep(2);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createOrder({
        data: {
          customerName: `${shippingAddress.firstName} ${shippingAddress.lastName}`,
          customerEmail: shippingAddress.email,
          shippingAddress: {
            email: shippingAddress.email,
            firstName: shippingAddress.firstName,
            lastName: shippingAddress.lastName,
            street: shippingAddress.streetAddress,
            city: shippingAddress.city,
            state: shippingAddress.state,
            zip: shippingAddress.zip,
            phone: shippingAddress.phone,
          },
          paymentMode: pay,
          items: cart.map((c) => ({
            id: c.id, // actual variant ID
            qty: c.qty,
            color: c.color,
            size: c.size,
          })),
          couponCode: appliedCoupon?.code,
          paymentReference: referenceId || undefined,
          paymentReceiptUrl: receiptUrl || undefined,
        },
      });

      setOrderNumber(res.orderNumber);
      clear();
      setDone(true);
      toast.success("Order placed successfully!", { description: `Order #${res.orderNumber}` });
    } catch (err: any) {
      console.error(err);
      toast.error("Checkout failed", { description: err.message || "Failed to submit order." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const [first, last] = profile.name.split(" ");

  return (
    <section className="pt-24 md:pt-28 pb-24 mx-auto max-w-[1400px] px-4 md:px-8">
      <h1 className="font-display text-4xl md:text-6xl tracking-tight">SECURE CHECKOUT</h1>

      {/* Progress Steps */}
      <div className="flex items-center gap-2 md:gap-6 mt-8 mb-12 overflow-x-auto">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2 md:gap-6 shrink-0">
            <div className={`flex items-center gap-3 ${i === step ? "text-foreground" : i < step ? "text-primary" : "text-muted-foreground"}`}>
              <span className={`size-8 grid place-items-center font-mono text-sm font-bold border ${i <= step ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
                {i < step ? <Check className="size-4" /> : i + 1}
              </span>
              <span className="font-mono text-xs uppercase tracking-[0.2em] whitespace-nowrap">{s}</span>
            </div>
            {i < steps.length - 1 && <ChevronRight className="size-4 text-muted-foreground" />}
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1fr_400px] gap-12">
        <div className="space-y-6">
          {/* STEP 0: Shipping Address */}
          {step === 0 && (
            <form onSubmit={handleShippingSubmit} className="space-y-6">
              <Block title="Shipping Address">
                <Field name="email" label="Email" type="email" defaultValue={shippingAddress?.email || profile.email} required />
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field name="firstName" label="First Name" defaultValue={shippingAddress?.firstName || first || ""} required />
                  <Field name="lastName" label="Last Name" defaultValue={shippingAddress?.lastName || last || ""} required />
                </div>
                <Field name="streetAddress" label="Street Address" defaultValue={shippingAddress?.streetAddress || ""} required />
                <div className="grid sm:grid-cols-3 gap-4">
                  <Field name="city" label="City" defaultValue={shippingAddress?.city || ""} required />
                  <Field name="state" label="State" defaultValue={shippingAddress?.state || ""} required />
                  <Field name="zip" label="Postal Code" defaultValue={shippingAddress?.zip || ""} required />
                </div>
                <Field name="phone" label="Phone" type="tel" defaultValue={shippingAddress?.phone || ""} required />
              </Block>
              <button type="submit" className="w-full bg-primary text-primary-foreground py-4 font-mono text-xs uppercase tracking-[0.2em] font-bold hover:bg-primary-glow">
                Continue to Review
              </button>
            </form>
          )}

          {/* STEP 2: Payment Method */}
          {step === 2 && (
            <form onSubmit={placeRealOrder} className="space-y-6">
              <Block title="Payment Method">
                <div className="space-y-2">
                  {activeMethods.map((m) => {
                    const active = pay === m.id;
                    const logo = getWalletLogo(m.id);
                    return (
                      <button
                        key={m.id} type="button" onClick={() => setPay(m.id)}
                        className={`w-full flex items-center justify-between border px-4 py-3.5 transition-all text-left ${
                          active ? "border-primary bg-surface/30" : "border-border hover:border-foreground/30"
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          {/* Radio Dot Indicator */}
                          <span className={`size-4.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                            active ? "border-primary" : "border-border"
                          }`}>
                            {active && <span className="size-2 rounded-full bg-primary" />}
                          </span>

                          {/* Dynamic Logo or Lucide Icon fallback */}
                          <div className="shrink-0 flex items-center justify-center size-8 bg-zinc-900 border border-zinc-800 p-1.5 rounded-sm">
                            {logo ? (
                              <img
                                src={logo || undefined}
                                alt=""
                                className="size-full object-contain"
                              />
                            ) : (
                              <m.icon className={`size-4 ${active ? "text-primary" : m.accent}`} />
                            )}
                          </div>

                          {/* Payment Label & Subtitle (on Mobile) */}
                          <div className="min-w-0">
                            <span className="font-display text-sm md:text-base tracking-wide uppercase font-bold text-foreground">
                              {m.label}
                            </span>
                            <p className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground mt-0.5 sm:hidden truncate">
                              {m.sub}
                            </p>
                          </div>
                        </div>

                        {/* Subtitle (on Desktop) */}
                        <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground hidden sm:inline shrink-0 ml-4">
                          {m.sub}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="pt-4 mt-4 border-t border-border space-y-4">
                  {(pay === "easypaisa" || pay === "jazzcash") && (
                    <div className="space-y-4 animate-fade-in">
                      <div className={((pay === "easypaisa" && settings?.easypaisa_qr_url) || (pay === "jazzcash" && settings?.jazzcash_qr_url)) ? "grid md:grid-cols-2 gap-4" : "space-y-4"}>
                        <div className="bg-surface/50 border border-border p-4 space-y-2 font-mono text-sm flex flex-col justify-center">
                          <div className="flex justify-between items-center gap-3">
                            <span className="text-muted-foreground text-xs uppercase tracking-wider">Method</span>
                            <span className="text-foreground uppercase font-bold">{pay}</span>
                          </div>
                          <div className="flex justify-between items-center gap-3">
                            <span className="text-muted-foreground text-xs uppercase tracking-wider">Account Title</span>
                            <div className="flex items-center">
                              <span className="text-foreground">{pay === "easypaisa" ? settings?.easypaisa_title : settings?.jazzcash_title}</span>
                              <CopyToClipboard text={pay === "easypaisa" ? settings?.easypaisa_title ?? "" : settings?.jazzcash_title ?? ""} />
                            </div>
                          </div>
                          <div className="flex justify-between items-center gap-3">
                            <span className="text-muted-foreground text-xs uppercase tracking-wider">Account Number</span>
                            <div className="flex items-center">
                              <span className="text-foreground font-bold">{pay === "easypaisa" ? settings?.easypaisa_number : settings?.jazzcash_number}</span>
                              <CopyToClipboard text={pay === "easypaisa" ? settings?.easypaisa_number ?? "" : settings?.jazzcash_number ?? ""} />
                            </div>
                          </div>
                          <div className="flex justify-between items-center gap-3 pt-1 border-t border-border/50">
                            <span className="text-muted-foreground text-xs uppercase tracking-wider">Payable Amount</span>
                            <div className="flex items-center">
                              <span className="text-primary font-bold">{symbol}{total.toFixed(0)}</span>
                              <CopyToClipboard text={total.toFixed(0)} />
                            </div>
                          </div>
                        </div>

                        {((pay === "easypaisa" && settings?.easypaisa_qr_url) || (pay === "jazzcash" && settings?.jazzcash_qr_url)) && (
                          <div className="flex flex-col items-center justify-center p-6 bg-zinc-950/40 border border-border space-y-3 rounded-none">
                            <p className="font-mono text-xs uppercase tracking-wider text-primary font-bold text-center">
                              Scan QR Code to Pay
                            </p>
                            <div className="relative size-40 p-2 bg-white border border-border flex items-center justify-center">
                              <img
                                src={(pay === "easypaisa" ? settings.easypaisa_qr_url : settings.jazzcash_qr_url) || undefined}
                                alt={`${pay === "easypaisa" ? "EasyPaisa" : "JazzCash"} QR Code`}
                                className="size-full object-contain"
                              />
                            </div>
                            <p className="text-[10px] text-zinc-400 font-mono text-center max-w-[200px] leading-tight">
                              Scan this QR using your {pay === "easypaisa" ? "EasyPaisa" : "JazzCash"} app to transfer the amount.
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="space-y-4 bg-zinc-950/20 border border-zinc-800 p-4 rounded-none">
                        <h4 className="font-mono text-xs uppercase tracking-wider text-primary font-bold">Step-by-Step Payment Instructions</h4>
                        <ol className="list-decimal list-inside font-sans text-xs text-muted-foreground space-y-2 leading-relaxed">
                          <li>Open your <span className="text-foreground capitalize">{pay}</span> App.</li>
                          <li>Send <span className="text-foreground font-bold">{symbol}{total.toFixed(0)}</span> to the account number copied above.</li>
                          <li>Copy the **Transaction ID / Reference ID** from your receipt and paste it below.</li>
                          <li>Take a screenshot of the transaction receipt and upload it below.</li>
                        </ol>
                      </div>

                      <Field 
                        label="Transaction Reference / ID" 
                        placeholder="e.g. 12345678901" 
                        value={referenceId} 
                        onChange={(e) => setReferenceId(e.target.value)} 
                        required 
                      />

                      {/* Receipt Image Uploader */}
                      <div className="space-y-2">
                        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground block mb-2 font-bold">Upload Payment Receipt Screenshot</span>
                        {receiptUrl ? (
                          <div className="relative border border-dashed border-primary/45 bg-primary/5 p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <img src={receiptUrl} alt="Receipt Preview" className="size-16 object-cover bg-background border border-border" />
                              <div>
                                <p className="text-xs text-primary font-mono font-bold">Screenshot Uploaded</p>
                                <button
                                  type="button"
                                  onClick={() => setReceiptUrl("")}
                                  className="text-[10px] font-mono text-zinc-500 hover:text-destructive underline mt-1 cursor-pointer"
                                >
                                  Remove Receipt
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="relative border border-dashed border-border hover:border-primary/50 p-6 text-center transition-all bg-zinc-950/20">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleReceiptUpload}
                              disabled={uploadingReceipt}
                              className="absolute inset-0 size-full opacity-0 cursor-pointer"
                            />
                            {uploadingReceipt ? (
                              <div className="flex flex-col items-center justify-center gap-2">
                                <Loader2 className="size-6 animate-spin text-primary" />
                                <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider">Uploading Screenshot...</p>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <p className="font-mono text-xs uppercase tracking-wider text-primary">Click or drag screenshot here</p>
                                <p className="text-[10px] text-zinc-500 font-mono">PNG, JPG, or WEBP up to 5MB</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {pay === "bank" && (
                    <div className="space-y-4 animate-fade-in">
                      <div className={settings?.bank_qr_url ? "grid md:grid-cols-2 gap-4" : "space-y-4"}>
                        <div className="bg-surface/50 border border-border p-4 space-y-2 font-mono text-sm flex flex-col justify-center">
                          <div className="flex justify-between items-center gap-3">
                            <span className="text-muted-foreground text-xs uppercase tracking-wider">Bank Name</span>
                            <span className="text-foreground">{settings?.bank_name}</span>
                          </div>
                          <div className="flex justify-between items-center gap-3">
                            <span className="text-muted-foreground text-xs uppercase tracking-wider">Account Title</span>
                            <div className="flex items-center">
                              <span className="text-foreground">{settings?.bank_title}</span>
                              <CopyToClipboard text={settings?.bank_title ?? ""} />
                            </div>
                          </div>
                          <div className="flex justify-between items-center gap-3">
                            <span className="text-muted-foreground text-xs uppercase tracking-wider">Account #</span>
                            <div className="flex items-center">
                              <span className="text-foreground font-bold">{settings?.bank_account_number}</span>
                              <CopyToClipboard text={settings?.bank_account_number ?? ""} />
                            </div>
                          </div>
                          <div className="flex justify-between items-center gap-3">
                            <span className="text-muted-foreground text-xs uppercase tracking-wider">IBAN</span>
                            <div className="flex items-center">
                              <span className="text-foreground font-mono text-xs">{settings?.bank_iban}</span>
                              <CopyToClipboard text={settings?.bank_iban ?? ""} />
                            </div>
                          </div>
                          <div className="flex justify-between items-center gap-3 pt-1 border-t border-border/50">
                            <span className="text-muted-foreground text-xs uppercase tracking-wider">Payable Amount</span>
                            <div className="flex items-center">
                              <span className="text-primary font-bold">{symbol}{total.toFixed(0)}</span>
                              <CopyToClipboard text={total.toFixed(0)} />
                            </div>
                          </div>
                        </div>

                        {settings?.bank_qr_url && (
                          <div className="flex flex-col items-center justify-center p-6 bg-zinc-950/40 border border-border space-y-3 rounded-none">
                            <p className="font-mono text-xs uppercase tracking-wider text-primary font-bold text-center">
                              Scan QR Code to Pay
                            </p>
                            <div className="relative size-40 p-2 bg-white border border-border flex items-center justify-center">
                              <img
                                src={settings.bank_qr_url || undefined}
                                alt="Bank QR Code"
                                className="size-full object-contain"
                              />
                            </div>
                            <p className="text-[10px] text-zinc-400 font-mono text-center max-w-[200px] leading-tight">
                              Scan this QR using your mobile banking app to transfer the amount.
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="space-y-4 bg-zinc-950/20 border border-zinc-800 p-4 rounded-none">
                        <h4 className="font-mono text-xs uppercase tracking-wider text-primary font-bold">Step-by-Step Payment Instructions</h4>
                        <ol className="list-decimal list-inside font-sans text-xs text-muted-foreground space-y-2 leading-relaxed">
                          <li>Open your banking app or visit a branch.</li>
                          <li>Transfer <span className="text-foreground font-bold">{symbol}{total.toFixed(0)}</span> to the bank details copied above.</li>
                          <li>Copy the **Transaction ID / Reference ID** from your receipt and paste it below.</li>
                          <li>Take a screenshot of the transaction receipt and upload it below.</li>
                        </ol>
                      </div>

                      <Field 
                        label="Transaction Reference / ID" 
                        placeholder="e.g. 123456789012" 
                        value={referenceId} 
                        onChange={(e) => setReferenceId(e.target.value)} 
                        required 
                      />

                      {/* Receipt Image Uploader */}
                      <div className="space-y-2">
                        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground block mb-2 font-bold">Upload Payment Receipt Screenshot</span>
                        {receiptUrl ? (
                          <div className="relative border border-dashed border-primary/45 bg-primary/5 p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <img src={receiptUrl} alt="Receipt Preview" className="size-16 object-cover bg-background border border-border" />
                              <div>
                                <p className="text-xs text-primary font-mono font-bold">Screenshot Uploaded</p>
                                <button
                                  type="button"
                                  onClick={() => setReceiptUrl("")}
                                  className="text-[10px] font-mono text-zinc-500 hover:text-destructive underline mt-1 cursor-pointer"
                                >
                                  Remove Receipt
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="relative border border-dashed border-border hover:border-primary/50 p-6 text-center transition-all bg-zinc-950/20">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleReceiptUpload}
                              disabled={uploadingReceipt}
                              className="absolute inset-0 size-full opacity-0 cursor-pointer"
                            />
                            {uploadingReceipt ? (
                              <div className="flex flex-col items-center justify-center gap-2">
                                <Loader2 className="size-6 animate-spin text-primary" />
                                <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider">Uploading Screenshot...</p>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <p className="font-mono text-xs uppercase tracking-wider text-primary">Click or drag screenshot here</p>
                                <p className="text-[10px] text-zinc-500 font-mono">PNG, JPG, or WEBP up to 5MB</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {pay === "cod" && (
                    <div className="bg-surface/50 border border-border p-4">
                      <p className="text-sm">Pay cash to the courier when your order arrives. Available exclusively for addresses inside Karachi. Have exact amount ready.</p>
                    </div>
                  )}
                  <p className="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase tracking-wider pt-2">
                    <ShieldCheck className="size-4 text-primary" /> Verified Secure manual processing
                  </p>
                </div>
              </Block>

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)} className="px-6 py-4 border border-border font-mono text-xs uppercase tracking-[0.2em]">
                  Back
                </button>
                <button type="submit" disabled={isSubmitting} className="flex-1 bg-primary text-primary-foreground py-4 font-mono text-xs uppercase tracking-[0.2em] font-bold hover:bg-primary-glow disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2">
                  {isSubmitting ? (
                    <><Loader2 className="size-4 animate-spin" /> Placing Order...</>
                  ) : (
                    `Place Order · ${symbol}${total.toFixed(0)}`
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 1: Review Order */}
          {step === 1 && (
            <div className="space-y-6">
              <Block title="Review Order">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Shipping Address</h3>
                    <p className="text-sm">{shippingAddress?.firstName} {shippingAddress?.lastName}</p>
                    <p className="text-sm text-zinc-400">{shippingAddress?.streetAddress}, {shippingAddress?.city}, {shippingAddress?.state} {shippingAddress?.zip}</p>
                    <p className="text-xs text-zinc-500 font-mono mt-1">{shippingAddress?.phone}</p>
                  </div>
                  
                  <div className="border-t border-border pt-4">
                    <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">Line items</h3>
                    <div className="space-y-3">
                      {cart.map((c) => (
                        <div key={`${c.id}-${c.color}-${c.size}`} className="flex gap-4 py-3 border-b border-border last:border-0">
                          <img src={c.image} alt={c.name} className="size-16 object-cover bg-surface" />
                          <div className="flex-1 min-w-0">
                            <p className="font-display text-base truncate">{c.name}</p>
                            <p className="font-mono text-xs text-muted-foreground uppercase">{c.color} · {c.size} · Qty {c.qty}</p>
                          </div>
                          <p className="font-mono font-bold">{symbol}{(c.price * c.qty).toFixed(0)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Block>

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(0)} className="px-6 py-4 border border-border font-mono text-xs uppercase tracking-[0.2em]">
                  Back
                </button>
                <button type="button" onClick={() => setStep(2)} className="flex-1 bg-primary text-primary-foreground py-4 font-mono text-xs uppercase tracking-[0.2em] font-bold hover:bg-primary-glow">
                  Continue to Payment
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ORDER SUMMARY */}
        <aside className="lg:sticky lg:top-24 self-start border border-border bg-surface/30 p-6 h-fit">
          <h2 className="font-display text-xl mb-4">ORDER · {cart.length} ITEMS</h2>
          
          <div className="space-y-2 mb-6 max-h-64 overflow-y-auto pr-1">
            {cart.map((c) => (
              <div key={`${c.id}-${c.color}-${c.size}`} className="flex justify-between text-sm">
                <span className="truncate pr-2">{c.qty}× {c.name}</span>
                <span className="font-mono shrink-0">{symbol}{(c.price * c.qty).toFixed(0)}</span>
              </div>
            ))}
          </div>

          {/* Coupon Entry Form */}
          <form onSubmit={handleApplyCoupon} className="border-t border-border pt-4 pb-4 mb-4">
            <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Promo Code</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder="RIDER10"
                disabled={appliedCoupon || validatingCoupon}
                className="flex-1 bg-background border border-border px-3 py-2 text-xs font-mono uppercase focus:outline-none focus:border-primary disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={appliedCoupon || validatingCoupon || !couponCode.trim()}
                className="bg-primary text-primary-foreground px-4 text-xs font-mono uppercase font-bold hover:bg-primary-glow disabled:opacity-50"
              >
                {validatingCoupon ? <Loader2 className="size-3 animate-spin" /> : "Apply"}
              </button>
            </div>
            {couponError && <p className="text-[10px] text-destructive font-mono mt-1">{couponError}</p>}
            {appliedCoupon && (
              <div className="flex justify-between items-center bg-primary/10 border border-primary/20 px-2 py-1.5 mt-2">
                <span className="font-mono text-xs text-primary font-bold uppercase">{appliedCoupon.code} Applied</span>
                <button
                  type="button"
                  onClick={() => setAppliedCoupon(null)}
                  className="text-[10px] font-mono text-muted-foreground hover:text-foreground uppercase underline"
                >
                  Remove
                </button>
              </div>
            )}
          </form>

          {/* Subtotals */}
          <div className="border-t border-border pt-4 space-y-2 text-sm">
            <Sum label="Subtotal" value={`${symbol}${subtotal.toFixed(2)}`} />
            <Sum label="Shipping" value={shipping === 0 ? "FREE" : `${symbol}${shipping.toFixed(2)}`} />
            <Sum label="Tax" value={`${symbol}${tax.toFixed(2)}`} />
            {discount > 0 && <Sum label="Promo Discount" value={`-${symbol}${discount.toFixed(2)}`} />}
            <div className="h-px bg-border my-2" />
            <Sum label="Total" value={`${symbol}${total.toFixed(2)}`} large />
          </div>
        </aside>
      </div>
    </section>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-border p-6 md:p-8">
      <h2 className="font-display text-2xl mb-6">{title.toUpperCase()}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground block mb-2">{label}</span>
      <input {...props} className="w-full bg-background border border-border px-4 py-3 font-mono text-sm focus:outline-none focus:border-primary disabled:opacity-50" />
    </label>
  );
}

function Sum({ label, value, large }: { label: string; value: string; large?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className={large ? "font-mono uppercase tracking-wider" : "text-muted-foreground"}>{large ? "Estimated Total" : label}</span>
      <span className={`font-mono ${large ? "text-xl font-bold text-primary" : ""}`}>{value}</span>
    </div>
  );
}

function CopyToClipboard({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-primary transition-all border border-zinc-800 hover:border-zinc-700 ml-2 rounded shrink-0 cursor-pointer"
      title="Copy to clipboard"
    >
      {copied ? <Check className="size-3.5 text-primary" /> : <Copy className="size-3.5" />}
    </button>
  );
}
