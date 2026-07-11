import { createLazyFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Loader2, Plus, Trash2, Edit, MoveUp, MoveDown, Eye, 
  EyeOff, X, Image as ImageIcon, Store, CreditCard, 
  Truck, Phone, Save, Mail, Info, Lock
} from "lucide-react";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { Preloader } from "@/components/layout/Preloader";
import { useConfirm } from "@/components/admin/ConfirmDialog";

export const Route = createLazyFileRoute("/admin/settings")({ component: Settings });

function Settings() {
  const [s, setS] = useState<any>(null);
  const [previewLoader, setPreviewLoader] = useState(false);
  const [saving, setSaving] = useState(false);
  const [slides, setSlides] = useState<any[]>([]);
  const [loadingSlides, setLoadingSlides] = useState(true);
  const [editingSlide, setEditingSlide] = useState<any | null>(null);
  const [originalSlide, setOriginalSlide] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<"storefront" | "payments" | "fulfillment" | "contact" | "faqs" | "security">("storefront");
  const confirm = useConfirm();
  
  const [newPassword, setNewPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingRole, setLoadingRole] = useState(true);

  const loadSlides = async () => {
    setLoadingSlides(true);
    const { data, error } = await supabase
      .from("hero_slides")
      .select("*")
      .order("position", { ascending: true });
    if (error) {
      toast.error("Failed to load slides: " + error.message);
    } else {
      setSlides(data || []);
    }
    setLoadingSlides(false);
  };

  useEffect(() => {
    const checkRoleAndSettings = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
          const roleList = (roles ?? []).map(r => r.role);
          const hasAdmin = roleList.includes("admin");
          setIsAdmin(hasAdmin);
          if (!hasAdmin) {
            setActiveTab("security");
          }
        }
      } catch (err) {
        console.error("Error checking role:", err);
      } finally {
        setLoadingRole(false);
      }

      const { data, error } = await supabase.from("settings").select("*").limit(1).maybeSingle();
      if (error) {
        toast.error("Failed to load settings: " + error.message);
      } else if (!data) {
        // Create default settings if settings table is empty
        const defaultSettings = {
          store_name: "MotoHelm",
          store_email: "hello@motohelm.com",
          store_phone: "",
          store_address: "",
          currency: "PKR",
          currency_symbol: "Rs.",
          tax_rate: 8.5,
          tax_inclusive: false,
          shipping_flat: 150,
          free_shipping_threshold: 20000,
          free_shipping_enabled: true,
          payment_modes_enabled: ["cod", "easypaisa", "jazzcash", "bank"],
          easypaisa_number: "03001234567",
          easypaisa_title: "MotoHelm Store",
          jazzcash_number: "03001234567",
          jazzcash_title: "MotoHelm Store",
          bank_name: "Meezan Bank Ltd",
          bank_title: "MotoHelm Store",
          bank_account_number: "0123-0123456-789",
          bank_iban: "PK36 MEZN 0001 2300 1234 5678",
          logo_url: null,
          easypaisa_qr_url: null,
          jazzcash_qr_url: null,
          bank_qr_url: null,
          easypaisa_logo_url: null,
          jazzcash_logo_url: null,
          bank_logo_url: null,
          cod_logo_url: null,
          hero_headline: "RACE-BRED. STREET-READY.",
          hero_subline: "ECE 22.06 certified helmets engineered for the apex.",
          promo_ticker: ["FREE SHIPPING OVER Rs. 20,000", "ECE 22.06 CERTIFIED", "30-DAY RIDE & RETURN", "FIM HOMOLOGATED RACE GEAR"],
          map_iframe_url: "",
          whatsapp_number: "",
          faqs: [],
          invoice_terms: "1. All sales of ECE/FIM certified helmets are final.\n2. Returns are only accepted within 30 days if items are in brand new, unused condition.\n3. Warranty claims require proof of purchase and original packaging.",
          stamp_url: null,
          theme: { preloader: { enabled: true, theme: "dashboard", behavior: "once_per_session" } }
        };
        const { data: inserted, error: insertErr } = await supabase.from("settings").insert(defaultSettings).select().single();
        if (insertErr) {
          toast.error("Failed to seed default settings: " + insertErr.message);
          setS(defaultSettings);
        } else {
          setS(inserted);
        }
      } else {
        setS(data);
      }
    };
    checkRoleAndSettings();
    loadSlides();
  }, []);

  const save = async () => {
    if (!s) return;
    setSaving(true);
    const { error } = await supabase.from("settings").update({
      store_name: s.store_name,
      store_email: s.store_email,
      store_phone: s.store_phone,
      store_address: s.store_address,
      currency: s.currency,
      currency_symbol: s.currency_symbol,
      tax_rate: s.tax_rate,
      tax_inclusive: s.tax_inclusive,
      shipping_flat: s.shipping_flat,
      free_shipping_threshold: s.free_shipping_threshold,
      free_shipping_enabled: s.free_shipping_enabled,
      payment_modes_enabled: s.payment_modes_enabled,
      email_from: s.email_from,
      easypaisa_number: s.easypaisa_number,
      easypaisa_title: s.easypaisa_title,
      jazzcash_number: s.jazzcash_number,
      jazzcash_title: s.jazzcash_title,
      bank_name: s.bank_name,
      bank_title: s.bank_title,
      bank_account_number: s.bank_account_number,
      bank_iban: s.bank_iban,
      logo_url: s.logo_url,
      promo_ticker: s.promo_ticker,
      map_iframe_url: s.map_iframe_url,
      whatsapp_number: s.whatsapp_number,
      faqs: s.faqs,
      theme: s.theme,
      invoice_terms: s.invoice_terms,
      stamp_url: s.stamp_url,
      easypaisa_qr_url: s.easypaisa_qr_url,
      jazzcash_qr_url: s.jazzcash_qr_url,
      bank_qr_url: s.bank_qr_url,
      easypaisa_logo_url: s.easypaisa_logo_url,
      jazzcash_logo_url: s.jazzcash_logo_url,
      bank_logo_url: s.bank_logo_url,
      cod_logo_url: s.cod_logo_url,
    }).eq("id", s.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Settings saved successfully");
    }
  };

  const saveSlide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlide.image_url) {
      toast.error("Image is required");
      return;
    }
    setSaving(true);
    const payload = {
      image_url: editingSlide.image_url,
      mobile_image_url: editingSlide.mobile_image_url || null,
      kicker: editingSlide.kicker || null,
      title_line1: editingSlide.title_line1 || null,
      title_line2: editingSlide.title_line2 || null,
      subtitle: editingSlide.subtitle || null,
      cta_label: editingSlide.cta_label || null,
      cta_link: editingSlide.cta_link || null,
      alt_cta_label: editingSlide.alt_cta_label || null,
      alt_cta_link: editingSlide.alt_cta_link || null,
      stat_number: editingSlide.stat_number || null,
      stat_label: editingSlide.stat_label || null,
      is_active: editingSlide.is_active !== false,
      position: editingSlide.position !== undefined ? editingSlide.position : (slides.length > 0 ? Math.max(...slides.map(sl => sl.position)) + 1 : 0),
    };

    let error;
    if (editingSlide.id) {
      const res = await supabase.from("hero_slides").update(payload).eq("id", editingSlide.id);
      error = res.error;
    } else {
      const res = await supabase.from("hero_slides").insert(payload);
      error = res.error;
    }

    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Slide saved successfully");
      setOriginalSlide(null); // Bypass isDirty check on close
      setEditingSlide(null);
      loadSlides();
    }
  };

  const isSlideDirty = () => {
    if (!editingSlide || !originalSlide) return false;
    const keys = ["image_url", "mobile_image_url", "kicker", "title_line1", "title_line2", "subtitle", "cta_label", "cta_link", "alt_cta_label", "alt_cta_link", "stat_number", "stat_label", "is_active"];
    return keys.some(k => editingSlide[k] !== originalSlide[k]);
  };

  const cancelEditingSlide = async () => {
    if (isSlideDirty()) {
      const ok = await confirm({
        title: "Discard Changes?",
        message: "You have unsaved changes in this hero slide. Are you sure you want to discard them?",
        confirmText: "Discard",
        cancelText: "Keep Editing",
        variant: "destructive",
      });
      if (!ok) return;
    }
    setEditingSlide(null);
    setOriginalSlide(null);
  };

  const updatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setPasswordLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password updated successfully");
      setNewPassword("");
    }
  };

  const deleteSlide = async (id: string) => {
    const ok = await confirm({
      title: "Delete Slide",
      message: "Are you sure you want to delete this hero slide? This action cannot be undone.",
      confirmText: "Delete",
      variant: "destructive",
    });
    if (!ok) return;
    const { error } = await supabase.from("hero_slides").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Slide deleted");
      loadSlides();
    }
  };

  const toggleSlideActive = async (slide: any) => {
    const { error } = await supabase.from("hero_slides").update({ is_active: !slide.is_active }).eq("id", slide.id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Slide ${!slide.is_active ? "activated" : "deactivated"}`);
      loadSlides();
    }
  };

  const moveSlide = async (index: number, direction: "up" | "down") => {
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= slides.length) return;

    const currentSlide = slides[index];
    const targetSlide = slides[nextIndex];

    const currentPos = currentSlide.position;
    const targetPos = targetSlide.position;

    const newCurrentPos = targetPos === currentPos ? currentPos + 1 : targetPos;
    const newTargetPos = currentPos;

    const { error: err1 } = await supabase.from("hero_slides").update({ position: newCurrentPos }).eq("id", currentSlide.id);
    const { error: err2 } = await supabase.from("hero_slides").update({ position: newTargetPos }).eq("id", targetSlide.id);

    if (err1 || err2) {
      toast.error("Failed to update position");
    }
    loadSlides();
  };

  if (loadingRole || !s) {
    return <div className="p-12 flex justify-center"><Loader2 className="size-6 animate-spin text-orange-500" /></div>;
  }

  const set = (k: string, v: any) => setS({ ...s, [k]: v });
  const togglePay = (mode: string) => {
    const cur: string[] = s.payment_modes_enabled ?? [];
    set("payment_modes_enabled", cur.includes(mode) ? cur.filter((m) => m !== mode) : [...cur, mode]);
  };

  const preloader = s.theme?.preloader ?? { enabled: true, theme: "dashboard", behavior: "once_per_session" };
  const setPreloader = (key: string, val: any) => {
    const theme = s.theme ?? {};
    const pre = theme.preloader ?? { enabled: true, theme: "dashboard", behavior: "once_per_session" };
    set("theme", { ...theme, preloader: { ...pre, [key]: val } });
  };

  const tabs = [
    { id: "storefront", label: "Storefront & Logo", icon: Store, desc: "Store logo, name, and homepage hero banner slides." },
    { id: "payments", label: "Payment Wallets", icon: CreditCard, desc: "Enable checkout payment options and wallet configurations." },
    { id: "fulfillment", label: "Taxes & Shipping", icon: Truck, desc: "Tax rates, currency values, flat rate shipping, and thresholds." },
    { id: "contact", label: "Contact Details", icon: Phone, desc: "General contact settings, phone, physical address, and sender email." },
    { id: "faqs", label: "FAQs Manager", icon: Info, desc: "Set up and manage customer frequently asked questions." },
    { id: "security", label: "Security", icon: Lock, desc: "Change your password and secure your account." },
  ] as const;

  const filteredTabs = tabs.filter(t => isAdmin || t.id === "security");

  return (
    <div className="grid md:grid-cols-[240px_1fr] gap-6 lg:gap-8 pb-20 items-start max-w-5xl">
      {/* Sidebar Navigation */}
      <aside className="flex md:flex-col overflow-x-auto md:overflow-visible gap-1 border-b md:border-b-0 md:border-r border-zinc-800/80 pb-3 md:pb-0 md:pr-4 scrollbar-none shrink-0 sticky top-20 z-10 bg-zinc-950/90 backdrop-blur-md">
        {filteredTabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setEditingSlide(null);
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-md text-xs uppercase tracking-wider font-mono font-bold transition-all text-left whitespace-nowrap md:w-full border ${
                active
                  ? "bg-orange-500/10 border-orange-500/30 text-orange-400 shadow-sm"
                  : "border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
              }`}
            >
              <Icon className={`size-4 shrink-0 ${active ? "text-orange-400 animate-pulse" : "text-zinc-500"}`} />
              {tab.label}
            </button>
          );
        })}
      </aside>

      {/* Main Configurations Panel */}
      <div className="space-y-6">
        {/* Tab Context Banner */}
        <div className="border-b border-zinc-800 pb-4">
          <h2 className="font-display text-xl tracking-wide uppercase text-white">
            {tabs.find((t) => t.id === activeTab)?.label}
          </h2>
          <p className="text-xs text-zinc-500 mt-1 font-mono">
            {tabs.find((t) => t.id === activeTab)?.desc}
          </p>
        </div>

        {activeTab === "storefront" && (
          <div className="space-y-6">
            <Section title="Store Identity & Logo">
              <div className="grid md:grid-cols-2 gap-6 items-start">
                <div className="space-y-4">
                  <Inp label="Store Name" value={s.store_name ?? ""} onChange={(v) => set("store_name", v)} />
                  <p className="text-[10px] text-zinc-500 font-mono leading-relaxed mt-1">
                    This displays at the header, footer, invoices, and browser tab titles of the storefront.
                  </p>
                </div>
                <div>
                  <ImageUpload
                    bucket="store-assets"
                    value={s.logo_url}
                    onChange={(v) => set("logo_url", v)}
                    label="Store Header Logo"
                  />
                  <p className="text-[10px] text-zinc-500 font-mono leading-relaxed mt-2">
                    Highly recommended: Upload a horizontal PNG logo with transparent background. Fails back to default SVG if empty.
                  </p>
                </div>
              </div>
            </Section>

            <Section title="Initial Screen Preloader">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div className="space-y-1">
                    <span className="text-xs font-mono text-zinc-300 font-bold block uppercase">Enable Preloader Screen</span>
                    <span className="text-[10px] text-zinc-500 font-mono leading-relaxed block">
                      Toggle whether a dynamic intro animation plays before loading the storefront home page.
                    </span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={preloader.enabled !== false}
                      onChange={(e) => setPreloader("enabled", e.target.checked)}
                      className="size-4 rounded border-zinc-800 bg-zinc-950 text-orange-500 focus:ring-orange-500"
                    />
                    <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold font-mono">Active</span>
                  </label>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold block mb-1.5 font-mono">Preloader Theme</span>
                    <select
                      value={preloader.theme ?? "dashboard"}
                      onChange={(e) => setPreloader("theme", e.target.value)}
                      className="w-full bg-zinc-950/80 border border-zinc-808 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 rounded-md transition-all font-mono bg-zinc-900 border-zinc-800"
                    >
                      <option value="dashboard">Sportbike Telemetry (Speed/RPM)</option>
                      <option value="ignition">Ignition System Check (Key Turn)</option>
                      <option value="minimalist">Minimalist Logo Trace (Percentage)</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold block mb-1.5 font-mono">Trigger Frequency</span>
                    <select
                      value={preloader.behavior ?? "once_per_session"}
                      onChange={(e) => setPreloader("behavior", e.target.value)}
                      className="w-full bg-zinc-950/80 border border-zinc-808 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 rounded-md transition-all font-mono bg-zinc-900 border-zinc-800"
                    >
                      <option value="once_per_session">Once per tab session (Standard)</option>
                      <option value="every_visit">Every page visit (Development/Testing)</option>
                    </select>
                  </label>
                </div>

                <div className="flex justify-start pt-2">
                  <button
                    type="button"
                    onClick={() => setPreviewLoader(true)}
                    className="border border-zinc-800 hover:border-orange-500 hover:text-orange-400 text-zinc-300 px-4 py-2 text-[10px] uppercase tracking-wider font-mono font-bold rounded flex items-center gap-2 transition-all cursor-pointer bg-zinc-950"
                  >
                    <Eye className="size-4" />
                    Preview Selected Preloader
                  </button>
                </div>
              </div>
            </Section>

            <Section title="Homepage Hero Slides">
              {loadingSlides ? (
                <div className="flex items-center gap-2 text-zinc-400 py-4 font-mono text-xs">
                  <Loader2 className="size-4 animate-spin text-orange-500" />
                  <span>Loading slides...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {editingSlide ? (
                    <div className="bg-zinc-950 border border-zinc-800/80 rounded-lg p-5 space-y-4 shadow-xl">
                      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                        <h4 className="font-display text-xs uppercase tracking-wider text-orange-400">
                          {editingSlide.id ? "Edit Hero Slide" : "Create New Slide"}
                        </h4>
                        <button
                          type="button"
                          onClick={cancelEditingSlide}
                          className="text-zinc-500 hover:text-white transition-colors"
                        >
                          <X className="size-4" />
                        </button>
                      </div>

                      <form onSubmit={saveSlide} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <ImageUpload
                              bucket="store-assets"
                              value={editingSlide.image_url}
                              onChange={(url) => setEditingSlide({ ...editingSlide, image_url: url })}
                              label="Desktop / Landscape Image (required)"
                            />
                            <p className="text-[9px] text-zinc-500 font-mono mt-1.5 leading-relaxed">
                              Shown on screens ≥1024px. Use a wide landscape-oriented image for best results.
                            </p>
                          </div>
                          <div>
                            <ImageUpload
                              bucket="store-assets"
                              value={editingSlide.mobile_image_url}
                              onChange={(url) => setEditingSlide({ ...editingSlide, mobile_image_url: url })}
                              label="Mobile / Portrait Image (optional)"
                            />
                            <p className="text-[9px] text-zinc-500 font-mono mt-1.5 leading-relaxed">
                              Shown on phones &amp; tablets (&lt;1024px). Falls back to desktop image if empty.
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <Inp
                             label="Kicker Text (e.g. APEX RS1 / CARBON SERIES)"
                            value={editingSlide.kicker ?? ""}
                            onChange={(v) => setEditingSlide({ ...editingSlide, kicker: v })}
                          />
                          <label className="flex items-center gap-2 text-sm mt-6 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={editingSlide.is_active !== false}
                              onChange={(e) => setEditingSlide({ ...editingSlide, is_active: e.target.checked })}
                              className="size-4 rounded border-zinc-800 bg-zinc-950 text-orange-500 focus:ring-orange-500 focus:ring-offset-zinc-900 focus:ring-offset-2"
                            />
                            <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold font-mono">Active</span>
                          </label>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <Inp
                            label="Title Line 1 (Solid, e.g. ENGINEERED)"
                            value={editingSlide.title_line1 ?? ""}
                            onChange={(v) => setEditingSlide({ ...editingSlide, title_line1: v })}
                          />
                          <Inp
                            label="Title Line 2 (Outlined, e.g. FOR THE APEX)"
                            value={editingSlide.title_line2 ?? ""}
                            onChange={(v) => setEditingSlide({ ...editingSlide, title_line2: v })}
                          />
                        </div>

                        <label className="block">
                          <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold block mb-1.5">Subtitle</span>
                          <textarea
                            value={editingSlide.subtitle ?? ""}
                            onChange={(e) => setEditingSlide({ ...editingSlide, subtitle: e.target.value })}
                            className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 rounded-md h-20 transition-all font-mono"
                          />
                        </label>

                        <div className="border-t border-zinc-800/80 pt-4">
                          <h5 className="font-mono text-[10px] text-orange-400 font-bold uppercase tracking-wider mb-3">Primary Action Button</h5>
                          <div className="grid grid-cols-2 gap-3">
                            <Inp
                              label="Button Label"
                              value={editingSlide.cta_label ?? ""}
                              onChange={(v) => setEditingSlide({ ...editingSlide, cta_label: v })}
                            />
                            <Inp
                              label="Redirect Path / URL"
                              value={editingSlide.cta_link ?? ""}
                              onChange={(v) => setEditingSlide({ ...editingSlide, cta_link: v })}
                            />
                          </div>
                        </div>

                        <div className="border-t border-zinc-800/80 pt-4">
                          <h5 className="font-mono text-[10px] text-orange-400 font-bold uppercase tracking-wider mb-3">Secondary Action Button</h5>
                          <div className="grid grid-cols-2 gap-3">
                            <Inp
                              label="Button Label"
                              value={editingSlide.alt_cta_label ?? ""}
                              onChange={(v) => setEditingSlide({ ...editingSlide, alt_cta_label: v })}
                            />
                            <Inp
                              label="Redirect Path / URL"
                              value={editingSlide.alt_cta_link ?? ""}
                              onChange={(v) => setEditingSlide({ ...editingSlide, alt_cta_link: v })}
                            />
                          </div>
                        </div>

                        <div className="border-t border-zinc-800/80 pt-4">
                          <h5 className="font-mono text-[10px] text-orange-400 font-bold uppercase tracking-wider mb-3">Stat Badge (Optional Overlay)</h5>
                          <div className="grid grid-cols-2 gap-3">
                            <Inp
                              label="Stat Value (e.g. 1,180g)"
                              value={editingSlide.stat_number ?? ""}
                              onChange={(v) => setEditingSlide({ ...editingSlide, stat_number: v })}
                            />
                            <Inp
                              label="Stat Metric (e.g. Shell Weight)"
                              value={editingSlide.stat_label ?? ""}
                              onChange={(v) => setEditingSlide({ ...editingSlide, stat_label: v })}
                            />
                          </div>
                        </div>

                        <div className="flex gap-2 justify-end border-t border-zinc-800 pt-4">
                          <button
                            type="button"
                            onClick={cancelEditingSlide}
                            className="border border-zinc-800 hover:border-zinc-700 text-zinc-400 px-4 py-2.5 text-[10px] uppercase tracking-wider font-mono font-bold rounded cursor-pointer transition-all"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={saving}
                            className="bg-orange-500 hover:bg-orange-600 text-black px-4 py-2.5 text-[10px] uppercase tracking-wider font-mono font-bold rounded cursor-pointer transition-all flex items-center gap-2"
                          >
                            {saving && <Loader2 className="size-3 animate-spin" />}
                            Save Slide
                          </button>
                        </div>
                      </form>
                    </div>
                  ) : (
                    <>
                      {slides.length === 0 ? (
                        <div className="p-6 bg-zinc-950 border border-zinc-800 border-dashed rounded text-center">
                          <p className="text-zinc-500 text-xs font-mono">No custom hero slides configured. Storefront uses default slides.</p>
                        </div>
                      ) : (
                        <div className="grid gap-3">
                          {slides.map((slide, idx) => (
                            <div key={slide.id} className="flex items-center gap-4 bg-zinc-950 border border-zinc-850 p-4 rounded-lg shadow-sm hover:border-zinc-800 transition-colors">
                              {slide.image_url ? (
                                <img src={slide.image_url} alt="" className="size-16 object-cover rounded-md border border-zinc-800 bg-zinc-900 flex-shrink-0" />
                              ) : (
                                <div className="size-16 rounded-md border border-dashed border-zinc-800 bg-zinc-900 flex items-center justify-center text-zinc-600 flex-shrink-0">
                                  <ImageIcon className="size-5" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-[9px] text-orange-400 uppercase tracking-[0.2em] font-semibold">{slide.kicker || "NO KICKER"}</span>
                                  {!slide.is_active && (
                                    <span className="bg-zinc-800/80 text-zinc-400 text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded font-mono border border-zinc-700/50">Inactive</span>
                                  )}
                                  {slide.mobile_image_url && (
                                    <span className="bg-sky-500/10 text-sky-400 text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded font-mono border border-sky-500/20">Mobile img</span>
                                  )}
                                </div>
                                <h4 className="font-display text-sm truncate uppercase tracking-tight text-white mt-1.5">
                                  {slide.title_line1 || "No"} {slide.title_line2 || "Title"}
                                </h4>
                                <p className="text-[11px] text-zinc-500 truncate font-mono mt-1">{slide.subtitle}</p>
                                
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {slide.cta_label && (
                                    <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[9px] px-2 py-0.5 rounded font-mono font-bold">
                                      Primary: {slide.cta_label}
                                    </span>
                                  )}
                                  {slide.alt_cta_label && (
                                    <span className="bg-zinc-900 text-zinc-400 border border-zinc-800 text-[9px] px-2 py-0.5 rounded font-mono font-bold">
                                      Secondary: {slide.alt_cta_label}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => moveSlide(idx, "up")}
                                  disabled={idx === 0}
                                  className="size-8 rounded-md border border-zinc-800 hover:border-orange-500 hover:text-orange-400 flex items-center justify-center text-zinc-500 disabled:opacity-20 disabled:hover:border-zinc-800 disabled:hover:text-zinc-500 transition-colors"
                                  title="Move Up"
                                >
                                  <MoveUp className="size-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveSlide(idx, "down")}
                                  disabled={idx === slides.length - 1}
                                  className="size-8 rounded-md border border-zinc-800 hover:border-orange-500 hover:text-orange-400 flex items-center justify-center text-zinc-500 disabled:opacity-20 disabled:hover:border-zinc-800 disabled:hover:text-zinc-500 transition-colors"
                                  title="Move Down"
                                >
                                  <MoveDown className="size-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleSlideActive(slide)}
                                  className={`size-8 rounded-md border flex items-center justify-center transition-colors ${slide.is_active ? "border-zinc-800 text-zinc-400 hover:border-orange-500 hover:text-orange-400" : "border-zinc-800 text-zinc-650 hover:border-zinc-700"}`}
                                  title={slide.is_active ? "Deactivate" : "Activate"}
                                >
                                  {slide.is_active ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setEditingSlide({ ...slide }); setOriginalSlide({ ...slide }); }}
                                  className="size-8 rounded-md border border-zinc-800 hover:border-orange-500 hover:text-orange-400 flex items-center justify-center text-zinc-400 transition-colors"
                                  title="Edit Slide"
                                >
                                  <Edit className="size-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteSlide(slide.id)}
                                  className="size-8 rounded-md border border-zinc-800 hover:border-red-500 hover:text-red-400 flex items-center justify-center text-zinc-400 transition-colors"
                                  title="Delete Slide"
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          const fresh = {
                            image_url: "",
                            mobile_image_url: "",
                            kicker: "",
                            title_line1: "",
                            title_line2: "",
                            subtitle: "",
                            cta_label: "",
                            cta_link: "",
                            alt_cta_label: "",
                            alt_cta_link: "",
                            stat_number: "",
                            stat_label: "",
                            is_active: true,
                          };
                          setEditingSlide(fresh);
                          setOriginalSlide(fresh);
                        }}
                        className="w-full border border-dashed border-zinc-800 hover:border-orange-500 hover:text-orange-400 py-3.5 text-[10px] uppercase tracking-wider font-mono font-bold text-zinc-400 flex items-center justify-center gap-2 rounded-lg transition-all cursor-pointer hover:bg-orange-500/5"
                      >
                        <Plus className="size-4" />
                        Add New Banner Slide
                      </button>
                    </>
                  )}
                </div>
              )}
            </Section>

            <Section title="Promotional Ticker Phrases">
              <p className="text-[10px] text-zinc-500 font-mono mb-4 leading-relaxed">
                Add, remove, or reorder the sliding promo phrases that appear under the hero banner on the homepage.
              </p>
              <div className="space-y-2 mb-4">
                {(s.promo_ticker ?? []).map((phrase: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 p-2 rounded">
                    <input
                      type="text"
                      value={phrase}
                      onChange={(e) => {
                        const newTicker = [...(s.promo_ticker ?? [])];
                        newTicker[idx] = e.target.value;
                        set("promo_ticker", newTicker);
                      }}
                      className="flex-1 bg-zinc-900 border border-zinc-850 px-3 py-1.5 text-xs text-white rounded focus:outline-none focus:border-orange-500 font-mono"
                    />
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (idx === 0) return;
                          const newTicker = [...(s.promo_ticker ?? [])];
                          const temp = newTicker[idx];
                          newTicker[idx] = newTicker[idx - 1];
                          newTicker[idx - 1] = temp;
                          set("promo_ticker", newTicker);
                        }}
                        disabled={idx === 0}
                        className="size-7 rounded border border-zinc-850 hover:border-orange-500 hover:text-orange-400 flex items-center justify-center text-zinc-500 disabled:opacity-20 transition-colors"
                        title="Move Up"
                      >
                        <MoveUp className="size-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (idx === (s.promo_ticker ?? []).length - 1) return;
                          const newTicker = [...(s.promo_ticker ?? [])];
                          const temp = newTicker[idx];
                          newTicker[idx] = newTicker[idx + 1];
                          newTicker[idx + 1] = temp;
                          set("promo_ticker", newTicker);
                        }}
                        disabled={idx === (s.promo_ticker ?? []).length - 1}
                        className="size-7 rounded border border-zinc-850 hover:border-orange-500 hover:text-orange-400 flex items-center justify-center text-zinc-500 disabled:opacity-20 transition-colors"
                        title="Move Down"
                      >
                        <MoveDown className="size-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const newTicker = (s.promo_ticker ?? []).filter((_: any, i: number) => i !== idx);
                          set("promo_ticker", newTicker);
                        }}
                        className="size-7 rounded border border-zinc-850 hover:border-red-500 hover:text-red-400 flex items-center justify-center text-zinc-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  const newTicker = [...(s.promo_ticker ?? []), "NEW PROMO PHRASE"];
                  set("promo_ticker", newTicker);
                }}
                className="w-full border border-dashed border-zinc-800 hover:border-orange-500 hover:text-orange-400 py-3.5 text-[10px] uppercase tracking-wider font-mono font-bold text-zinc-400 flex items-center justify-center gap-2 rounded-lg transition-all cursor-pointer hover:bg-orange-500/5"
              >
                <Plus className="size-4" />
                Add New Promo Phrase
              </button>
            </Section>
          </div>
        )}

        {activeTab === "payments" && (
          <div className="space-y-6">
            <Section title="Active Store Payment Methods">
              <p className="text-[10px] text-zinc-500 font-mono mb-4 leading-relaxed">
                Check the payment gateways available to customers during storefront checkout steps.
              </p>
              <div className="flex flex-wrap gap-3">
                {[
                  { id: "cod", label: "Cash on Delivery" },
                  { id: "easypaisa", label: "EasyPaisa Mobile Wallet" },
                  { id: "jazzcash", label: "JazzCash Mobile Wallet" },
                  { id: "bank", label: "Bank Account Transfer" },
                ].map((m) => (
                  <label key={m.id} className={`flex items-center gap-3 border px-4 py-3 rounded-lg cursor-pointer transition-all ${
                    (s.payment_modes_enabled ?? []).includes(m.id)
                      ? "border-orange-500/40 bg-orange-500/5 text-orange-400"
                      : "border-zinc-800 bg-zinc-950/20 text-zinc-400 hover:border-zinc-700"
                  }`}>
                    <input 
                      type="checkbox" 
                      checked={(s.payment_modes_enabled ?? []).includes(m.id)} 
                      onChange={() => togglePay(m.id)} 
                      className="size-4 rounded border-zinc-800 text-orange-500 bg-zinc-950 focus:ring-orange-500 focus:ring-offset-zinc-900"
                    />
                    <span className="uppercase tracking-wider font-mono font-bold text-xs">{m.label}</span>
                  </label>
                ))}
              </div>
            </Section>

            <Section title="Manual Payment Credentials">
              <div className="space-y-6">
                <div className="bg-zinc-950/40 border border-zinc-850 p-4 rounded-lg space-y-4">
                  <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
                    <span className="size-2 rounded-full bg-orange-500 animate-pulse" />
                    <h4 className="font-mono text-xs text-orange-400 font-bold uppercase tracking-wider">EasyPaisa Account Settings</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Inp label="Account Wallet Number" value={s.easypaisa_number ?? ""} onChange={(v) => set("easypaisa_number", v)} />
                    <Inp label="Account Registered Title" value={s.easypaisa_title ?? ""} onChange={(v) => set("easypaisa_title", v)} />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4 border-t border-zinc-800/60 pt-3">
                    <ImageUpload
                      bucket="store-assets"
                      value={s.easypaisa_logo_url}
                      onChange={(v) => set("easypaisa_logo_url", v)}
                      label="EasyPaisa Wallet Logo"
                    />
                    <ImageUpload
                      bucket="store-assets"
                      value={s.easypaisa_qr_url}
                      onChange={(v) => set("easypaisa_qr_url", v)}
                      label="EasyPaisa QR Code"
                    />
                  </div>
                </div>

                <div className="bg-zinc-950/40 border border-zinc-850 p-4 rounded-lg space-y-4">
                  <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
                    <span className="size-2 rounded-full bg-orange-500 animate-pulse" />
                    <h4 className="font-mono text-xs text-orange-400 font-bold uppercase tracking-wider">JazzCash Account Settings</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Inp label="Account Wallet Number" value={s.jazzcash_number ?? ""} onChange={(v) => set("jazzcash_number", v)} />
                    <Inp label="Account Registered Title" value={s.jazzcash_title ?? ""} onChange={(v) => set("jazzcash_title", v)} />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4 border-t border-zinc-800/60 pt-3">
                    <ImageUpload
                      bucket="store-assets"
                      value={s.jazzcash_logo_url}
                      onChange={(v) => set("jazzcash_logo_url", v)}
                      label="JazzCash Wallet Logo"
                    />
                    <ImageUpload
                      bucket="store-assets"
                      value={s.jazzcash_qr_url}
                      onChange={(v) => set("jazzcash_qr_url", v)}
                      label="JazzCash QR Code"
                    />
                  </div>
                </div>

                <div className="bg-zinc-950/40 border border-zinc-850 p-4 rounded-lg space-y-4">
                  <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
                    <span className="size-2 rounded-full bg-orange-500 animate-pulse" />
                    <h4 className="font-mono text-xs text-orange-400 font-bold uppercase tracking-wider">Bank Transfer Details</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <Inp label="Bank Name" value={s.bank_name ?? ""} onChange={(v) => set("bank_name", v)} />
                    <Inp label="Account Registered Title" value={s.bank_title ?? ""} onChange={(v) => set("bank_title", v)} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Inp label="Account Number" value={s.bank_account_number ?? ""} onChange={(v) => set("bank_account_number", v)} />
                    <Inp label="International IBAN Code" value={s.bank_iban ?? ""} onChange={(v) => set("bank_iban", v)} />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4 border-t border-zinc-800/60 pt-3">
                    <ImageUpload
                      bucket="store-assets"
                      value={s.bank_logo_url}
                      onChange={(v) => set("bank_logo_url", v)}
                      label="Bank Logo"
                    />
                    <ImageUpload
                      bucket="store-assets"
                      value={s.bank_qr_url}
                      onChange={(v) => set("bank_qr_url", v)}
                      label="Bank QR Code"
                    />
                  </div>
                </div>

                <div className="bg-zinc-950/40 border border-zinc-850 p-4 rounded-lg space-y-4">
                  <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
                    <span className="size-2 rounded-full bg-orange-500 animate-pulse" />
                    <h4 className="font-mono text-xs text-orange-400 font-bold uppercase tracking-wider">Cash on Delivery Settings</h4>
                  </div>
                  <div className="pt-1">
                    <ImageUpload
                      bucket="store-assets"
                      value={s.cod_logo_url}
                      onChange={(v) => set("cod_logo_url", v)}
                      label="Cash on Delivery Logo"
                    />
                  </div>
                </div>
              </div>
            </Section>
          </div>
        )}

        {activeTab === "fulfillment" && (
          <div className="space-y-6">
            <Section title="Store Currency Configuration">
              <div className="grid grid-cols-2 gap-4">
                <Inp label="Currency Code (e.g. PKR)" value={s.currency} onChange={(v) => set("currency", v)} />
                <Inp label="Symbol Prefix (e.g. Rs.)" value={s.currency_symbol} onChange={(v) => set("currency_symbol", v)} />
              </div>
            </Section>

            <Section title="Tax Rules">
              <div className="grid md:grid-cols-2 gap-6 items-center">
                <Inp label="Applied Tax Rate %" type="number" value={String(s.tax_rate)} onChange={(v) => set("tax_rate", Number(v))} />
                <label className="flex items-center gap-3 text-sm cursor-pointer select-none mt-4 md:mt-0">
                  <input 
                    type="checkbox" 
                    checked={s.tax_inclusive} 
                    onChange={(e) => set("tax_inclusive", e.target.checked)} 
                    className="size-4 rounded border-zinc-800 text-orange-500 bg-zinc-950 focus:ring-orange-500 focus:ring-offset-zinc-900"
                  />
                  <div className="font-mono">
                    <span className="text-xs uppercase tracking-wider text-zinc-300 font-bold block">Tax Inclusive Prices</span>
                    <span className="text-[10px] text-zinc-500 mt-0.5 block leading-tight">If checked, item prices on product pages include taxes.</span>
                  </div>
                </label>
              </div>
            </Section>

            <Section title="Shipping Tariffs">
              <div className="grid grid-cols-2 gap-4">
                <Inp label="Flat Shipping Rate" type="number" value={String(s.shipping_flat)} onChange={(v) => set("shipping_flat", Number(v))} />
                <Inp 
                  label="Free Shipping Threshold (Amount)" 
                  type="number" 
                  value={String(s.free_shipping_threshold)} 
                  onChange={(v) => set("free_shipping_threshold", Number(v))} 
                  disabled={!s.free_shipping_enabled}
                />
              </div>
              <div className="mt-4">
                <label className="flex items-center gap-3 text-sm cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={s.free_shipping_enabled} 
                    onChange={(e) => set("free_shipping_enabled", e.target.checked)} 
                    className="size-4 rounded border-zinc-800 text-orange-500 bg-zinc-950 focus:ring-orange-500 focus:ring-offset-zinc-900"
                  />
                  <div className="font-mono">
                    <span className="text-xs uppercase tracking-wider text-zinc-300 font-bold block">Enable Free Shipping</span>
                    <span className="text-[10px] text-zinc-500 mt-0.5 block leading-tight">If checked, orders above the threshold will qualify for free shipping.</span>
                  </div>
                </label>
              </div>
            </Section>

            <Section title="City-Wise Shipping Rates">
              <p className="text-[10px] text-zinc-500 font-mono mb-4 leading-relaxed">
                Add specific shipping rates for different cities. If a customer's city matches, this rate overrides the Flat Shipping Rate.
              </p>
              
              <div className="space-y-2 mb-4">
                {((s.shipping_rates_city as any[]) || []).map((rate: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 p-2 rounded">
                    <input
                      type="text"
                      placeholder="City Name"
                      value={rate.city ?? ""}
                      onChange={(e) => {
                        const newRates = [...((s.shipping_rates_city as any[]) || [])];
                        newRates[idx] = { ...newRates[idx], city: e.target.value };
                        set("shipping_rates_city", newRates as any);
                      }}
                      className="flex-1 bg-zinc-900 border border-zinc-850 px-3 py-1.5 text-xs text-white rounded focus:outline-none focus:border-orange-500 font-mono"
                    />
                    <input
                      type="number"
                      placeholder="Rate"
                      value={rate.rate ?? ""}
                      onChange={(e) => {
                        const newRates = [...((s.shipping_rates_city as any[]) || [])];
                        newRates[idx] = { ...newRates[idx], rate: Number(e.target.value) };
                        set("shipping_rates_city", newRates as any);
                      }}
                      className="w-24 bg-zinc-900 border border-zinc-850 px-3 py-1.5 text-xs text-white rounded focus:outline-none focus:border-orange-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newRates = ((s.shipping_rates_city as any[]) || []).filter((_: any, i: number) => i !== idx);
                        set("shipping_rates_city", newRates as any);
                      }}
                      className="size-7 rounded border border-zinc-850 hover:border-red-500 hover:text-red-400 flex items-center justify-center text-zinc-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  const newRates = [...((s.shipping_rates_city as any[]) || []), { city: "", rate: 0 }];
                  set("shipping_rates_city", newRates as any);
                }}
                className="w-full border border-dashed border-zinc-800 hover:border-orange-500 hover:text-orange-400 py-3.5 text-[10px] uppercase tracking-wider font-mono font-bold text-zinc-400 flex items-center justify-center gap-2 rounded-lg transition-all cursor-pointer hover:bg-orange-500/5"
              >
                <Plus className="size-4" />
                Add City Rate
              </button>
            </Section>

            <Section title="Invoice Settings">
              <div className="grid md:grid-cols-2 gap-6 items-start">
                <div className="space-y-4">
                  <label className="block">
                    <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold block mb-1.5 font-mono">Invoice Terms & Conditions</span>
                    <textarea
                      value={s.invoice_terms ?? ""}
                      onChange={(e) => set("invoice_terms", e.target.value)}
                      rows={6}
                      placeholder="Enter terms and conditions that will appear at the bottom of customer invoices..."
                      className="w-full bg-zinc-950/80 border border-zinc-800 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 rounded-md transition-all font-mono resize-y min-h-[120px]"
                    />
                  </label>
                </div>
                <div>
                  <ImageUpload
                    bucket="store-assets"
                    value={s.stamp_url}
                    onChange={(v) => set("stamp_url", v)}
                    label="Official Store Stamp"
                  />
                  <p className="text-[10px] text-zinc-500 font-mono leading-relaxed mt-2">
                    Upload a circular or rectangular stamp image (transparent PNG recommended) to display at the bottom of customer invoices.
                  </p>
                </div>
              </div>
            </Section>
          </div>
        )}

        {activeTab === "contact" && (
          <div className="space-y-6">
            <Section title="General Contact Info">
              <div className="grid grid-cols-2 gap-4">
                <Inp label="Store Support Phone Number" value={s.store_phone ?? ""} onChange={(v) => set("store_phone", v)} />
                <Inp label="Store Support Email Address" value={s.store_email ?? ""} onChange={(v) => set("store_email", v)} />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <Inp label="Store Physical Address" value={s.store_address ?? ""} onChange={(v) => set("store_address", v)} />
                <Inp label="WhatsApp Support Number (e.g. +923000102026)" value={s.whatsapp_number ?? ""} onChange={(v) => set("whatsapp_number", v)} />
              </div>
              <div className="mt-4">
                <Inp label="Map Embed Iframe URL" value={s.map_iframe_url ?? ""} onChange={(v) => set("map_iframe_url", v)} />
              </div>
            </Section>

            <Section title="SMTP / Mailing Settings">
              <Inp label="SMTP Sender Address (Email From)" value={s.email_from ?? ""} onChange={(v) => set("email_from", v)} />
              <p className="text-[10px] text-zinc-500 font-mono leading-relaxed mt-2">
                All order invoice summaries and transactional notification mailings are dispatched from this address.
              </p>
            </Section>
          </div>
        )}

        {activeTab === "faqs" && (
          <div className="space-y-6">
            <Section title="Manage Storefront FAQs">
              <p className="text-[10px] text-zinc-500 font-mono mb-4 leading-relaxed">
                Add, edit, or reorder frequently asked questions displayed on the storefront contact page.
              </p>
              
              <div className="space-y-4 mb-4">
                {(s.faqs ?? []).map((faq: any, idx: number) => (
                  <div key={idx} className="bg-zinc-950 border border-zinc-800 p-4 rounded-lg space-y-3 relative">
                    <div className="flex justify-between items-center border-b border-zinc-850 pb-2">
                      <span className="text-[10px] font-mono text-orange-400 font-bold uppercase tracking-wider">FAQ #{idx + 1}</span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (idx === 0) return;
                            const newFaqs = [...(s.faqs ?? [])];
                            const temp = newFaqs[idx];
                            newFaqs[idx] = newFaqs[idx - 1];
                            newFaqs[idx - 1] = temp;
                            set("faqs", newFaqs);
                          }}
                          disabled={idx === 0}
                          className="size-7 rounded border border-zinc-850 hover:border-orange-500 hover:text-orange-400 flex items-center justify-center text-zinc-500 disabled:opacity-20 transition-colors"
                          title="Move Up"
                        >
                          <MoveUp className="size-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (idx === (s.faqs ?? []).length - 1) return;
                            const newFaqs = [...(s.faqs ?? [])];
                            const temp = newFaqs[idx];
                            newFaqs[idx] = newFaqs[idx + 1];
                            newFaqs[idx + 1] = temp;
                            set("faqs", newFaqs);
                          }}
                          disabled={idx === (s.faqs ?? []).length - 1}
                          className="size-7 rounded border border-zinc-850 hover:border-orange-500 hover:text-orange-400 flex items-center justify-center text-zinc-500 disabled:opacity-20 transition-colors"
                          title="Move Down"
                        >
                          <MoveDown className="size-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const newFaqs = (s.faqs ?? []).filter((_: any, i: number) => i !== idx);
                            set("faqs", newFaqs);
                          }}
                          className="size-7 rounded border border-zinc-850 hover:border-red-500 hover:text-red-400 flex items-center justify-center text-zinc-400 transition-colors"
                          title="Delete FAQ"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                    </div>

                    <Inp
                      label="Question"
                      value={faq.q ?? ""}
                      onChange={(v) => {
                        const newFaqs = [...(s.faqs ?? [])];
                        newFaqs[idx] = { ...newFaqs[idx], q: v };
                        set("faqs", newFaqs);
                      }}
                    />

                    <label className="block">
                      <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold block mb-1.5 font-mono">Answer</span>
                      <textarea
                        value={faq.a ?? ""}
                        onChange={(e) => {
                          const newFaqs = [...(s.faqs ?? [])];
                          newFaqs[idx] = { ...newFaqs[idx], a: e.target.value };
                          set("faqs", newFaqs);
                        }}
                        rows={3}
                        className="w-full bg-zinc-950/80 border border-zinc-800 px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 rounded-md transition-all font-mono resize-none"
                      />
                    </label>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  const newFaqs = [...(s.faqs ?? []), { q: "New Question?", a: "New Answer text." }];
                  set("faqs", newFaqs);
                }}
                className="w-full border border-dashed border-zinc-800 hover:border-orange-500 hover:text-orange-400 py-3.5 text-[10px] uppercase tracking-wider font-mono font-bold text-zinc-400 flex items-center justify-center gap-2 rounded-lg transition-all cursor-pointer hover:bg-orange-500/5"
              >
                <Plus className="size-4" />
                Add New FAQ Entry
              </button>
            </Section>
          </div>
        )}

        {activeTab === "security" && (
          <div className="space-y-6">
            <Section title="Account Security">
              <p className="text-[10px] text-zinc-500 font-mono mb-4 leading-relaxed">
                Update your account password. This action will log out other active sessions.
              </p>
              <form onSubmit={updatePassword} className="space-y-4 max-w-sm">
                <Inp 
                  label="New Password" 
                  type="password" 
                  value={newPassword} 
                  onChange={setNewPassword} 
                />
                <button
                  type="submit"
                  disabled={passwordLoading || newPassword.length < 6}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-black px-4 py-2.5 text-[10px] uppercase tracking-wider font-mono font-bold rounded cursor-pointer transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {passwordLoading ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
                  Update Password
                </button>
              </form>
            </Section>
          </div>
        )}

        {isAdmin && (
          <div className="flex justify-end pt-4">
            <button
              onClick={save}
              disabled={saving}
              className="bg-orange-500 hover:bg-orange-600 text-black px-6 py-3 text-xs uppercase tracking-wider font-bold font-mono rounded-md flex items-center gap-2 cursor-pointer transition-all shadow-md active:scale-[0.98] disabled:opacity-60"
            >
              {saving ? <Loader2 className="size-4 animate-spin text-black" /> : <Save className="size-4" />}
              Save {activeTab === "storefront" ? "General Identity" : tabs.find((t) => t.id === activeTab)?.label}
            </button>
          </div>
        )}
        {previewLoader && (
          <Preloader
            configOverride={{
              enabled: true,
              theme: preloader.theme ?? "dashboard",
              behavior: "every_visit",
            }}
            onComplete={() => setPreviewLoader(false)}
          />
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 rounded-lg p-5 space-y-4">
      <h3 className="font-display text-xs uppercase tracking-wider text-orange-400 border-b border-zinc-850 pb-2">{title}</h3>
      <div>{children}</div>
    </div>
  );
}

function Inp({ label, value, onChange, type = "text", disabled = false }: { label: string; value: string; onChange: (v: string) => void; type?: string; disabled?: boolean }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold block mb-1.5 font-mono">{label}</span>
      <input 
        type={type} 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        disabled={disabled}
        className="w-full bg-zinc-950/80 border border-zinc-800 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 rounded-md transition-all font-mono disabled:opacity-50 disabled:cursor-not-allowed" 
      />
    </label>
  );
}
