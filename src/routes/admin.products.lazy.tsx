import { createLazyFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef } from "react";
import { Plus, Pencil, Trash2, Loader2, Search } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MultiImageUpload } from "@/components/admin/ImageUpload";
import { EntityDrawer, Field, AdminInput, AdminTextarea, AdminSelect, PrimaryBtn, GhostBtn } from "@/components/admin/EntityDrawer";
import { slugify, fmtMoney, statusColor, logActivity } from "@/lib/admin-utils";
import { invalidateCatalog } from "@/lib/catalog-invalidate";
import { toast } from "sonner";
import { useConfirm } from "@/components/admin/ConfirmDialog";

export const Route = createLazyFileRoute("/admin/products")({ component: Products });

type ProductRow = {
  id: string; name: string; slug: string; description: string | null;
  brand_id: string | null; category_id: string | null;
  price: number; compare_price: number | null; stock: number; status: string;
  featured: boolean; badge: string | null;
  specs: { label: string; value: string }[] | null;
  certifications: string[] | null;
};

type EditState = ProductRow & { images: string[]; variants: any[] };

function VariantImageUpload({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handle = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file);
    if (error) { toast.error(error.message); setUploading(false); return; }
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    onChange(data.publicUrl);
    setUploading(false);
  };

  return (
    <div className="relative size-8 rounded border border-zinc-700 bg-zinc-900 overflow-hidden flex-shrink-0 cursor-pointer group" onClick={() => !value && ref.current?.click()}>
      {value ? (
        <>
           <img src={value} className="size-full object-cover" />
           <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity" onClick={(e) => { e.stopPropagation(); onChange(null); }}>
             <span className="text-white text-[8px] font-bold">X</span>
           </div>
        </>
      ) : uploading ? (
        <Loader2 className="size-3 animate-spin m-auto mt-2 text-zinc-500" />
      ) : (
        <span className="text-zinc-500 text-xs block text-center mt-1 group-hover:text-orange-400">+</span>
      )}
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => { if(e.target.files?.[0]) handle(e.target.files[0]); e.target.value = ""; }} />
    </div>
  );
}

function Products() {
  const qc = useQueryClient();
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [imagesByProduct, setImagesByProduct] = useState<Record<string, string[]>>({});
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);
  const [cats, setCats] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Partial<EditState> | null>(null);
  const [original, setOriginal] = useState<Partial<EditState> | null>(null);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const confirm = useConfirm();

  const load = async () => {
    setLoading(true);
    const [{ data: p }, { data: b }, { data: c }, { data: imgs }, { data: sess }] = await Promise.all([
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      supabase.from("brands").select("id, name").order("name"),
      supabase.from("categories").select("id, name").order("name"),
      supabase.from("product_images").select("product_id, url, position").order("position"),
      supabase.auth.getSession(),
    ]);
    setRows((p ?? []) as ProductRow[]);
    setBrands((b ?? []) as any);
    setCats((c ?? []) as any);
    const map: Record<string, string[]> = {};
    (imgs ?? []).forEach((i: any) => { (map[i.product_id] ??= []).push(i.url); });
    setImagesByProduct(map);
    
    const uid = sess.session?.user.id;
    if (uid) {
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", uid);
      const roleList = (roles ?? []).map(r => r.role);
      setIsAdmin(roleList.includes("admin"));
    }
    
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() =>
    rows.filter((r) => (!q || r.name.toLowerCase().includes(q.toLowerCase())) && (!statusFilter || r.status === statusFilter)),
    [rows, q, statusFilter]);

  const startNew = () => {
    const fresh = {
      name: "", slug: "", description: "", price: 0, compare_price: null,
      stock: 0, status: "draft", featured: false, brand_id: null, category_id: null,
      badge: null, specs: [], certifications: [], images: [], variants: [],
    };
    setEdit(fresh);
    setOriginal(fresh);
    setOpen(true);
  };

  const startEdit = async (r: ProductRow) => {
    setOpen(true);
    setLoadingVariants(true);
    const initialEdit = { ...r, images: imagesByProduct[r.id] ?? [], variants: [] };
    setEdit(initialEdit);
    setOriginal(initialEdit);
    try {
      const { data: vars } = await supabase.from("product_variants").select("*").eq("product_id", r.id);
      const withVars = { ...r, images: imagesByProduct[r.id] ?? [], variants: vars ?? [] };
      setEdit(withVars);
      setOriginal(withVars);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load variants");
    } finally {
      setLoadingVariants(false);
    }
  };

  const save = async () => {
    if (!edit?.name) return toast.error("Name required");
    setSaving(true);
    try {
    const cleanSpecs = (edit.specs ?? []).filter((s: any) => s.label?.trim() || s.value?.trim());
    const cleanCerts = (edit.certifications ?? []).filter((c: string) => c.trim());
    const payload: any = {
      name: edit.name, slug: edit.slug || slugify(edit.name),
      description: edit.description ?? null,
      brand_id: edit.brand_id || null, category_id: edit.category_id || null,
      price: Number(edit.price) || 0,
      compare_price: edit.compare_price ? Number(edit.compare_price) : null,
      status: edit.status ?? "draft",
      featured: !!edit.featured,
      badge: edit.badge || null,
      specs: cleanSpecs.length > 0 ? cleanSpecs : null,
      certifications: cleanCerts.length > 0 ? cleanCerts : null,
    };
    
    let productId = edit.id;
    if (productId) {
      const { error } = await supabase.from("products").update(payload).eq("id", productId);
      if (error) return toast.error(error.message);
    } else {
      const { data, error } = await supabase.from("products").insert(payload).select("id").single();
      if (error) return toast.error(error.message);
      productId = data!.id;
    }

    // Sync images: delete all, re-insert
    await supabase.from("product_images").delete().eq("product_id", productId);
    const imgs = edit.images ?? [];
    if (imgs.length) {
      await supabase.from("product_images").insert(imgs.map((url, i) => ({ product_id: productId!, url, position: i })));
    }

    // Sync variants: delete missing, insert/update active
    const editedVars = edit.variants ?? [];
    const { data: dbVars } = await supabase.from("product_variants").select("id").eq("product_id", productId);
    const dbVarIds = (dbVars ?? []).map((v) => v.id);
    const editedVarIds = editedVars.filter((v: any) => v.id).map((v: any) => v.id);
    
    const toDelete = dbVarIds.filter((id) => !editedVarIds.includes(id));
    if (toDelete.length) {
      await supabase.from("product_variants").delete().in("id", toDelete);
    }

    for (const v of editedVars) {
      // Support comma-separated sizes: expand "S,M,L" into 3 separate variant rows
      const sizes = (v.size || "").split(",").map((s: string) => s.trim()).filter(Boolean);
      if (sizes.length === 0) sizes.push("");

      if (v.id && sizes.length === 1) {
        // Existing row with a single size — just update
        const payloadVar = {
          product_id: productId,
          color: v.color || null,
          color_hex: v.color_hex || null,
          size: sizes[0] || null,
          sku: v.sku || null,
          stock: Number(v.stock) || 0,
          price_override: v.price_override != null ? Number(v.price_override) : null,
          is_active: v.is_active !== false,
          barcode: v.barcode || null,
          image_url: v.image_url || null,
        };
        await supabase.from("product_variants").update(payloadVar).eq("id", v.id);
      } else {
        // Delete old row if it existed (we're expanding it)
        if (v.id) {
          await supabase.from("product_variants").delete().eq("id", v.id);
        }
        // Insert one row per size
        for (const sz of sizes) {
          const payloadVar = {
            product_id: productId,
            color: v.color || null,
            color_hex: v.color_hex || null,
            size: sz || null,
            sku: v.sku ? `${v.sku}-${sz}` : null,
            stock: Number(v.stock) || 0,
            price_override: v.price_override != null ? Number(v.price_override) : null,
            is_active: v.is_active !== false,
            barcode: v.barcode || null,
            image_url: v.image_url || null,
          };
          await supabase.from("product_variants").insert(payloadVar);
        }
      }
    }

    // Sync base product total stock using helper RPC
    await supabase.rpc("sync_product_stock", { prod_id: productId });

    toast.success("Saved successfully");
    logActivity("SAVE_PRODUCT", productId, { name: edit.name, new: !edit.id });
    setOriginal(null); // Bypass isDirty check on close
    setOpen(false);
    invalidateCatalog(qc);
    load();
    } catch (err: any) {
      toast.error(err?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (r: ProductRow) => {
    const ok = await confirm({
      title: "Delete Product",
      message: `Delete "${r.name}"? This will delete all variants, reviews, and related data. This action cannot be undone.`,
      confirmText: "Delete",
      variant: "destructive",
    });
    if (!ok) return;
    await supabase.from("product_images").delete().eq("product_id", r.id);
    await supabase.from("product_variants").delete().eq("product_id", r.id);
    const { error } = await supabase.from("products").delete().eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    logActivity("DELETE_PRODUCT", r.id, { name: r.name });
    invalidateCatalog(qc);
    load();
  };

  const isDirty = () => {
    if (!edit || !original) return false;
    // Compare basic fields
    const keys = ["name", "slug", "description", "brand_id", "category_id", "price", "compare_price", "status", "featured", "badge"] as const;
    for (const key of keys) {
      if (edit[key] !== original[key]) return true;
    }
    // Compare arrays
    if (JSON.stringify(edit.specs) !== JSON.stringify(original.specs)) return true;
    if (JSON.stringify(edit.certifications) !== JSON.stringify(original.certifications)) return true;
    if (JSON.stringify(edit.images) !== JSON.stringify(original.images)) return true;
    if (JSON.stringify(edit.variants) !== JSON.stringify(original.variants)) return true;
    return false;
  };

  const handleClose = async (newOpen: boolean) => {
    if (!newOpen) {
      if (isDirty()) {
        const ok = await confirm({
          title: "Discard Changes?",
          message: "You have unsaved changes. Are you sure you want to discard them?",
          confirmText: "Discard",
          cancelText: "Keep Editing",
          variant: "destructive",
        });
        if (!ok) return;
      }
      setOpen(false);
      setEdit(null);
      setOriginal(null);
    } else {
      setOpen(true);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 flex-1 min-w-0">
          <div className="relative flex-1 max-w-xs">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <AdminInput placeholder="Search products..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <AdminSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="max-w-[140px]">
            <option value="">All status</option><option value="active">Active</option><option value="draft">Draft</option><option value="archived">Archived</option>
          </AdminSelect>
        </div>
        <PrimaryBtn onClick={startNew}><Plus className="size-4 inline mr-1" /> New product</PrimaryBtn>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded overflow-hidden">
        {loading ? <div className="p-12 text-center"><Loader2 className="size-6 animate-spin text-orange-500 mx-auto" /></div>
        : filtered.length === 0 ? <div className="p-12 text-center text-zinc-500">No products.</div>
        : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="text-xs uppercase text-zinc-500 border-b border-zinc-800">
                <tr>
                  <th className="text-left p-3 w-16"></th>
                  <th className="text-left p-3">Name</th>
                  <th className="text-left p-3">Brand</th>
                  <th className="text-left p-3">Category</th>
                  <th className="text-right p-3">Price</th>
                  <th className="text-right p-3">Stock</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-right p-3 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const img = imagesByProduct[r.id]?.[0];
                  const brand = brands.find((b) => b.id === r.brand_id)?.name;
                  const cat = cats.find((c) => c.id === r.category_id)?.name;
                  return (
                    <tr key={r.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                       <td className="p-3" onClick={() => startEdit(r)}>{img ? <img src={img} className="size-10 rounded object-cover" /> : <div className="size-10 rounded bg-zinc-800" />}</td>
                      <td className="p-3 font-medium" onClick={() => startEdit(r)}>{r.name}</td>
                      <td className="p-3 text-zinc-400" onClick={() => startEdit(r)}>{brand ?? "—"}</td>
                      <td className="p-3 text-zinc-400" onClick={() => startEdit(r)}>{cat ?? "—"}</td>
                      <td className="p-3 text-right" onClick={() => startEdit(r)}>{fmtMoney(r.price)}</td>
                      <td className={`p-3 text-right ${r.stock < 5 ? "text-amber-400 font-bold" : ""}`} onClick={() => startEdit(r)}>{r.stock}</td>
                      <td className="p-3" onClick={() => startEdit(r)}><span className={`inline-block px-2 py-0.5 rounded text-[10px] uppercase border ${statusColor(r.status)}`}>{r.status}</span></td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <button onClick={() => startEdit(r)} className="p-1.5 hover:bg-zinc-800 rounded mr-1"><Pencil className="size-4" /></button>
                        {isAdmin && (
                          <button onClick={() => remove(r)} className="p-1.5 hover:bg-red-500/20 text-red-400 rounded"><Trash2 className="size-4" /></button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <EntityDrawer
        open={open} onOpenChange={handleClose}
        title={edit?.id ? "Edit product" : "New product"}
        width="md:max-w-3xl"
        footer={<><GhostBtn onClick={() => handleClose(false)} disabled={saving}>Cancel</GhostBtn><PrimaryBtn onClick={save} disabled={saving}>{saving ? <><Loader2 className="size-4 animate-spin inline mr-1" />Saving...</> : "Save"}</PrimaryBtn></>}
      >
        {edit && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name"><AdminInput value={edit.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value, slug: edit.id ? edit.slug : slugify(e.target.value) })} /></Field>
              <Field label="Slug"><AdminInput value={edit.slug ?? ""} onChange={(e) => setEdit({ ...edit, slug: e.target.value })} /></Field>
            </div>
            <Field label="Description"><AdminTextarea rows={4} value={edit.description ?? ""} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Brand">
                <AdminSelect value={edit.brand_id ?? ""} onChange={(e) => setEdit({ ...edit, brand_id: e.target.value || null })}>
                  <option value="">— none —</option>
                  {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </AdminSelect>
              </Field>
              <Field label="Category">
                <AdminSelect value={edit.category_id ?? ""} onChange={(e) => setEdit({ ...edit, category_id: e.target.value || null })}>
                  <option value="">— none —</option>
                  {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </AdminSelect>
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Base Price"><AdminInput type="number" step="0.01" value={String(edit.price ?? 0)} onChange={(e) => setEdit({ ...edit, price: Number(e.target.value) })} /></Field>
              <Field label="Compare at"><AdminInput type="number" step="0.01" value={String(edit.compare_price ?? "")} onChange={(e) => setEdit({ ...edit, compare_price: e.target.value ? Number(e.target.value) : null })} /></Field>
              <Field label="Total Stock (Auto-synced)"><AdminInput type="number" value={String(edit.stock ?? 0)} disabled className="opacity-60 bg-zinc-950 font-bold" /></Field>
            </div>
            <div className="grid grid-cols-3 gap-3 items-end">
              <Field label="Status">
                <AdminSelect value={edit.status ?? "draft"} onChange={(e) => setEdit({ ...edit, status: e.target.value })}>
                  <option value="draft">Draft</option><option value="active">Active</option><option value="archived">Archived</option>
                </AdminSelect>
              </Field>
              <Field label="Badge">
                <AdminSelect value={edit.badge ?? ""} onChange={(e) => setEdit({ ...edit, badge: e.target.value || null })}>
                  <option value="">— none —</option><option value="NEW">NEW</option><option value="BESTSELLER">BESTSELLER</option><option value="LIMITED">LIMITED</option><option value="SALE">SALE</option>
                </AdminSelect>
              </Field>
              <label className="flex items-center gap-2 text-sm h-9">
                <input type="checkbox" checked={!!edit.featured} onChange={(e) => setEdit({ ...edit, featured: e.target.checked })} />
                Featured
              </label>
            </div>
            
            <MultiImageUpload bucket="product-images" values={edit.images ?? []} onChange={(images) => setEdit({ ...edit, images })} />

            {/* PRODUCT SPECIFICATIONS SECTION */}
            <div className="border-t border-zinc-800 pt-5 mt-5">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-[11px] uppercase tracking-wider text-orange-400 font-mono font-bold">Product Specifications</h4>
                <button
                  type="button"
                  onClick={() => setEdit({ ...edit, specs: [...(edit.specs ?? []), { label: "", value: "" }] })}
                  className="text-[10px] text-orange-400 hover:text-orange-300 font-mono uppercase tracking-wider border border-orange-500/30 px-2 py-1 rounded"
                >
                  + Add Spec
                </button>
              </div>
              <div className="space-y-2">
                {(edit.specs ?? []).map((spec: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={spec.label ?? ""}
                      placeholder="Label (e.g. Weight)"
                      onChange={(e) => {
                        const next = [...(edit.specs ?? [])];
                        next[idx] = { ...next[idx], label: e.target.value };
                        setEdit({ ...edit, specs: next });
                      }}
                      className="flex-1 bg-zinc-900 border border-zinc-800 px-2 py-1.5 rounded text-zinc-200 text-xs font-mono"
                    />
                    <input
                      type="text"
                      value={spec.value ?? ""}
                      placeholder="Value (e.g. 1.5 kg)"
                      onChange={(e) => {
                        const next = [...(edit.specs ?? [])];
                        next[idx] = { ...next[idx], value: e.target.value };
                        setEdit({ ...edit, specs: next });
                      }}
                      className="flex-1 bg-zinc-900 border border-zinc-800 px-2 py-1.5 rounded text-zinc-200 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const next = (edit.specs ?? []).filter((_: any, i: number) => i !== idx);
                        setEdit({ ...edit, specs: next });
                      }}
                      className="text-red-400 hover:text-red-300 font-bold font-mono text-sm leading-none px-1"
                    >
                      &times;
                    </button>
                  </div>
                ))}
                {(edit.specs ?? []).length === 0 && (
                  <p className="text-center text-zinc-500 py-3 font-mono text-[10px]">No specifications added.</p>
                )}
              </div>
            </div>

            {/* CERTIFICATIONS SECTION */}
            <div className="border-t border-zinc-800 pt-5 mt-5">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-[11px] uppercase tracking-wider text-orange-400 font-mono font-bold">Certifications</h4>
                <button
                  type="button"
                  onClick={() => setEdit({ ...edit, certifications: [...(edit.certifications ?? []), ""] })}
                  className="text-[10px] text-orange-400 hover:text-orange-300 font-mono uppercase tracking-wider border border-orange-500/30 px-2 py-1 rounded"
                >
                  + Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(edit.certifications ?? []).map((cert: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1">
                    <input
                      type="text"
                      value={cert}
                      placeholder="e.g. DOT"
                      onChange={(e) => {
                        const next = [...(edit.certifications ?? [])];
                        next[idx] = e.target.value;
                        setEdit({ ...edit, certifications: next });
                      }}
                      className="bg-transparent text-zinc-200 text-xs font-mono w-20 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const next = (edit.certifications ?? []).filter((_: string, i: number) => i !== idx);
                        setEdit({ ...edit, certifications: next });
                      }}
                      className="text-red-400 hover:text-red-300 font-bold text-sm leading-none"
                    >
                      &times;
                    </button>
                  </div>
                ))}
                {(edit.certifications ?? []).length === 0 && (
                  <p className="text-zinc-500 font-mono text-[10px]">No certifications added.</p>
                )}
              </div>
            </div>

            {/* PRODUCT VARIANTS MANAGEMENT SECTION */}
            <div className="border-t border-zinc-800 pt-5 mt-5">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-[11px] uppercase tracking-wider text-orange-400 font-mono font-bold">Product Variants</h4>
                <button
                  type="button"
                  onClick={() => {
                    const current = edit.variants ?? [];
                    setEdit({
                      ...edit,
                      variants: [
                        ...current,
                        { id: "", color: "Stealth", color_hex: "#0a0a0a", size: "M", sku: `${edit.slug?.toUpperCase()}-NEW-${Date.now().toString().slice(-4)}`, stock: 10, price_override: null, is_active: true, barcode: "", image_url: null }
                      ]
                    });
                  }}
                  className="text-[10px] text-orange-400 hover:text-orange-300 font-mono uppercase tracking-wider border border-orange-500/30 px-2 py-1 rounded"
                >
                  + Add Variant
                </button>
              </div>

              {loadingVariants ? (
                <div className="flex items-center justify-center py-6"><Loader2 className="size-5 animate-spin text-orange-500" /></div>
              ) : (
                <div className="bg-zinc-950 border border-zinc-850 rounded overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-zinc-900 border-b border-zinc-850 text-zinc-400 uppercase text-[9px] tracking-wider">
                      <tr>
                        <th className="p-2.5 w-10">Img</th>
                        <th className="p-2.5">Colorway</th>
                        <th className="p-2.5 w-24">Color Hex</th>
                        <th className="p-2.5 w-16">Size</th>
                        <th className="p-2.5">SKU</th>
                        <th className="p-2.5 w-20">Stock</th>
                        <th className="p-2.5 w-24">Price Over.</th>
                        <th className="p-2.5 w-16 text-center">Active</th>
                        <th className="p-2.5 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(edit.variants ?? []).map((v: any, index: number) => {
                        const updateVar = (key: string, val: any) => {
                          const next = (edit.variants ?? []).map((item: any, i: number) =>
                            i === index ? { ...item, [key]: val } : item
                          );
                          setEdit({ ...edit, variants: next });
                        };
                        return (
                          <tr key={index} className="border-b border-zinc-900 last:border-0 hover:bg-zinc-900/30">
                            <td className="p-1">
                              <VariantImageUpload value={v.image_url ?? null} onChange={(url) => updateVar("image_url", url)} />
                            </td>
                            <td className="p-1">
                              <input
                                type="text"
                                value={v.color ?? ""}
                                onChange={(e) => updateVar("color", e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1.5 rounded text-zinc-200 text-xs"
                              />
                            </td>
                            <td className="p-1">
                              <div className="flex items-center gap-1">
                                <input
                                  type="color"
                                  value={v.color_hex ?? "#000000"}
                                  onChange={(e) => updateVar("color_hex", e.target.value)}
                                  className="size-6 border-0 bg-transparent p-0 cursor-pointer shrink-0"
                                />
                                <input
                                  type="text"
                                  value={v.color_hex ?? ""}
                                  onChange={(e) => updateVar("color_hex", e.target.value)}
                                  className="w-16 bg-zinc-900 border border-zinc-800 px-1 py-1 rounded text-zinc-300 font-mono text-[10px]"
                                />
                              </div>
                            </td>
                            <td className="p-1">
                              <input
                                type="text"
                                value={v.size ?? ""}
                                placeholder="S,M,L,XL"
                                title="Enter multiple sizes separated by commas (e.g. S,M,L,XL) — each size will create a separate variant row on save"
                                onChange={(e) => updateVar("size", e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 px-1 py-1.5 rounded text-zinc-200 text-center font-mono text-xs font-bold"
                              />
                            </td>
                            <td className="p-1">
                              <input
                                type="text"
                                value={v.sku ?? ""}
                                placeholder="SKU"
                                onChange={(e) => updateVar("sku", e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1.5 rounded text-zinc-200 font-mono text-xs"
                              />
                            </td>
                            <td className="p-1">
                              <input
                                type="number"
                                value={String(v.stock ?? 0)}
                                onChange={(e) => updateVar("stock", Number(e.target.value))}
                                className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1.5 rounded text-zinc-200 font-mono text-right text-xs"
                              />
                            </td>
                            <td className="p-1">
                              <input
                                type="number"
                                step="0.01"
                                value={v.price_override != null ? String(v.price_override) : ""}
                                placeholder="None"
                                onChange={(e) => updateVar("price_override", e.target.value ? Number(e.target.value) : null)}
                                className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1.5 rounded text-zinc-200 font-mono text-right text-xs"
                              />
                            </td>
                            <td className="p-1 text-center">
                              <input
                                type="checkbox"
                                checked={v.is_active !== false}
                                onChange={(e) => updateVar("is_active", e.target.checked)}
                                className="accent-orange-500"
                              />
                            </td>
                            <td className="p-1 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  const next = (edit.variants ?? []).filter((_: any, i: number) => i !== index);
                                  setEdit({ ...edit, variants: next });
                                }}
                                className="text-red-400 hover:text-red-300 font-bold font-mono text-sm leading-none"
                              >
                                ×
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {(edit.variants ?? []).length === 0 && (
                    <p className="text-center text-zinc-500 py-3 font-mono text-[10px]">No variants. Product price will fall back to base price.</p>
                  )}
                </div>
              )}
            </div>

          </div>
        )}
      </EntityDrawer>
    </div>
  );
}
