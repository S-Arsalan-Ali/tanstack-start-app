import { createLazyFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { EntityDrawer, Field, AdminInput, AdminTextarea, PrimaryBtn, GhostBtn } from "@/components/admin/EntityDrawer";
import { slugify, fmtDate } from "@/lib/admin-utils";
import { invalidateCatalog } from "@/lib/catalog-invalidate";
import { toast } from "sonner";
import { useConfirm } from "@/components/admin/ConfirmDialog";

export const Route = createLazyFileRoute("/admin/brands")({ component: Brands });

type Brand = { id: string; name: string; slug: string; description: string | null; logo_url: string | null; position: number; show_in_slider: boolean; created_at: string; };

function Brands() {
  const qc = useQueryClient();
  const [rows, setRows] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Partial<Brand> | null>(null);
  const [original, setOriginal] = useState<Partial<Brand> | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const confirm = useConfirm();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("brands")
      .select("*")
      .order("position", { ascending: true })
      .order("name", { ascending: true });
    setRows((data ?? []) as Brand[]);
    const { data: prods } = await supabase.from("products").select("brand_id");
    const c: Record<string, number> = {};
    (prods ?? []).forEach((p: any) => { if (p.brand_id) c[p.brand_id] = (c[p.brand_id] ?? 0) + 1; });
    setCounts(c);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!edit?.name) return toast.error("Name required");
    const payload = {
      name: edit.name, slug: edit.slug || slugify(edit.name),
      description: edit.description ?? null, logo_url: edit.logo_url ?? null,
      position: edit.position ?? 0,
      show_in_slider: edit.show_in_slider ?? true,
    };
    const { error } = edit.id
      ? await supabase.from("brands").update(payload).eq("id", edit.id)
      : await supabase.from("brands").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setOriginal(null); // Bypass isDirty check on close
    setOpen(false);
    invalidateCatalog(qc);
    load();
  };

  const toggleSlider = async (b: Brand) => {
    const nextVal = !b.show_in_slider;
    // Optimistic update
    setRows(prev => prev.map(r => r.id === b.id ? { ...r, show_in_slider: nextVal } : r));
    const { error } = await supabase.from("brands").update({ show_in_slider: nextVal }).eq("id", b.id);
    if (error) {
      toast.error(error.message);
      // Rollback
      setRows(prev => prev.map(r => r.id === b.id ? { ...r, show_in_slider: b.show_in_slider } : r));
      return;
    }
    toast.success(`${b.name} ${nextVal ? "added to" : "removed from"} slider`);
    invalidateCatalog(qc);
  };

  const remove = async (b: Brand) => {
    if ((counts[b.id] ?? 0) > 0) return toast.error(`Cannot delete — ${counts[b.id]} products use this brand`);
    const ok = await confirm({
      title: "Delete Brand",
      message: `Delete "${b.name}"? This action cannot be undone.`,
      confirmText: "Delete",
      variant: "destructive",
    });
    if (!ok) return;
    const { error } = await supabase.from("brands").delete().eq("id", b.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); invalidateCatalog(qc); load();
  };

  const isDirty = () => {
    if (!edit || !original) return false;
    return (
      edit.name !== original.name ||
      edit.slug !== original.slug ||
      edit.description !== original.description ||
      edit.logo_url !== original.logo_url ||
      edit.position !== original.position ||
      edit.show_in_slider !== original.show_in_slider
    );
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
      <div className="flex justify-between items-center">
        <p className="text-sm text-zinc-500">{rows.length} brands</p>
        <PrimaryBtn onClick={() => {
          const fresh = { name: "", slug: "", position: 0, show_in_slider: true };
          setEdit(fresh);
          setOriginal(fresh);
          setOpen(true);
        }}><Plus className="size-4 inline mr-1" /> New brand</PrimaryBtn>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded overflow-hidden">
        {loading ? <div className="p-12 text-center"><Loader2 className="size-6 animate-spin text-orange-500 mx-auto" /></div>
        : rows.length === 0 ? <div className="p-12 text-center text-zinc-500">No brands yet.</div>
        : (
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-zinc-500 border-b border-zinc-800">
              <tr>
                <th className="text-left p-3 w-16">Logo</th>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Slug</th>
                <th className="text-center p-3 w-24">Slider</th>
                <th className="text-center p-3 w-20">Position</th>
                <th className="text-right p-3">Products</th>
                <th className="text-right p-3">Created</th>
                <th className="text-right p-3 w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                  <td className="p-3">{r.logo_url ? <img src={r.logo_url} alt="" className="size-10 rounded object-contain bg-white p-1" /> : <div className="size-10 rounded bg-zinc-800" />}</td>
                  <td className="p-3 font-medium">{r.name}</td>
                  <td className="p-3 text-xs text-zinc-500 font-mono">{r.slug}</td>
                  <td className="p-3 text-center">
                    <input
                      type="checkbox"
                      checked={r.show_in_slider}
                      onChange={() => toggleSlider(r)}
                      className="size-4 accent-orange-500 rounded border-zinc-700 bg-zinc-900 cursor-pointer"
                    />
                  </td>
                  <td className="p-3 text-center font-mono text-xs">{r.position}</td>
                  <td className="p-3 text-right">{counts[r.id] ?? 0}</td>
                  <td className="p-3 text-right text-xs text-zinc-500">{fmtDate(r.created_at)}</td>
                  <td className="p-3 text-right">
                    <button onClick={() => { setEdit({ ...r }); setOriginal({ ...r }); setOpen(true); }} className="p-1.5 hover:bg-zinc-800 rounded mr-1"><Pencil className="size-4" /></button>
                    <button onClick={() => remove(r)} className="p-1.5 hover:bg-red-500/20 text-red-400 rounded"><Trash2 className="size-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <EntityDrawer
        open={open} onOpenChange={handleClose}
        title={edit?.id ? "Edit brand" : "New brand"}
        footer={<><GhostBtn onClick={() => handleClose(false)}>Cancel</GhostBtn><PrimaryBtn onClick={save}>Save</PrimaryBtn></>}
      >
        {edit && (
          <div className="space-y-4">
            <Field label="Name"><AdminInput value={edit.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value, slug: edit.id ? edit.slug : slugify(e.target.value) })} /></Field>
            <Field label="Slug"><AdminInput value={edit.slug ?? ""} onChange={(e) => setEdit({ ...edit, slug: e.target.value })} /></Field>
            <Field label="Description"><AdminTextarea rows={3} value={edit.description ?? ""} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></Field>
            
            <div className="grid grid-cols-2 gap-4">
              <Field label="Display Position">
                <AdminInput 
                  type="number" 
                  value={edit.position ?? 0} 
                  onChange={(e) => setEdit({ ...edit, position: parseInt(e.target.value) || 0 })} 
                />
              </Field>
              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="show_in_slider"
                  checked={edit.show_in_slider ?? true}
                  onChange={(e) => setEdit({ ...edit, show_in_slider: e.target.checked })}
                  className="size-4 accent-orange-500 rounded border-zinc-700 bg-zinc-900 cursor-pointer"
                />
                <label htmlFor="show_in_slider" className="text-sm font-medium text-zinc-300 cursor-pointer select-none">Show in Slider</label>
              </div>
            </div>

            <ImageUpload bucket="brand-logos" value={edit.logo_url ?? null} onChange={(url) => setEdit({ ...edit, logo_url: url })} label="Logo" />
          </div>
        )}
      </EntityDrawer>
    </div>
  );
}
