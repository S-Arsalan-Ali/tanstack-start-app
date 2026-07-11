import { createLazyFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ImageUpload } from "@/components/admin/ImageUpload";
import {
  EntityDrawer,
  Field,
  AdminInput,
  AdminTextarea,
  PrimaryBtn,
  GhostBtn,
} from "@/components/admin/EntityDrawer";
import { slugify, fmtDate } from "@/lib/admin-utils";
import { invalidateCatalog } from "@/lib/catalog-invalidate";
import { toast } from "sonner";
import { useConfirm } from "@/components/admin/ConfirmDialog";

export const Route = createLazyFileRoute("/admin/categories")({ component: Categories });

type Cat = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  parent_id: string | null;
  position: number;
  created_at: string;
};

function Categories() {
  const qc = useQueryClient();
  const [rows, setRows] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Partial<Cat> | null>(null);
  const [original, setOriginal] = useState<Partial<Cat> | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const confirm = useConfirm();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("categories")
      .select("*")
      .order("position", { ascending: true })
      .order("name", { ascending: true });
    setRows((data ?? []) as Cat[]);
    const { data: prods } = await supabase.from("products").select("category_id");
    const c: Record<string, number> = {};
    (prods ?? []).forEach((p: any) => {
      if (p.category_id) c[p.category_id] = (c[p.category_id] ?? 0) + 1;
    });
    setCounts(c);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const startNew = () => {
    const fresh = { name: "", slug: "", description: "", image_url: null, position: 0 };
    setEdit(fresh);
    setOriginal(fresh);
    setOpen(true);
  };
  const startEdit = (c: Cat) => {
    setEdit({ ...c });
    setOriginal({ ...c });
    setOpen(true);
  };

  const save = async () => {
    if (!edit?.name) {
      toast.error("Name required");
      return;
    }
    const payload = {
      name: edit.name,
      slug: edit.slug || slugify(edit.name),
      description: edit.description ?? null,
      image_url: edit.image_url ?? null,
      position: edit.position ?? 0,
    };
    const { error } = edit.id
      ? await supabase.from("categories").update(payload).eq("id", edit.id)
      : await supabase.from("categories").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setOriginal(null); // Bypass isDirty check on close
    setOpen(false);
    invalidateCatalog(qc);
    load();
  };

  const remove = async (c: Cat) => {
    if ((counts[c.id] ?? 0) > 0)
      return toast.error(`Cannot delete — ${counts[c.id]} products use this category`);
    const ok = await confirm({
      title: "Delete Category",
      message: `Delete "${c.name}"? This action cannot be undone.`,
      confirmText: "Delete",
      variant: "destructive",
    });
    if (!ok) return;
    const { error } = await supabase.from("categories").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    invalidateCatalog(qc);
    load();
  };

  const isDirty = () => {
    if (!edit || !original) return false;
    return (
      edit.name !== original.name ||
      edit.slug !== original.slug ||
      edit.description !== original.description ||
      edit.image_url !== original.image_url ||
      edit.position !== original.position
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
        <p className="text-sm text-zinc-500">{rows.length} categories</p>
        <PrimaryBtn onClick={startNew}>
          <Plus className="size-4 inline mr-1" /> New category
        </PrimaryBtn>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="size-6 animate-spin text-orange-500 mx-auto" />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">
            No categories yet. Create your first one.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-zinc-500 border-b border-zinc-800 bg-zinc-900">
              <tr>
                <th className="text-left p-3 w-16">Image</th>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Slug</th>
                <th className="text-center p-3 w-20">Position</th>
                <th className="text-right p-3">Products</th>
                <th className="text-right p-3">Created</th>
                <th className="text-right p-3 w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                  <td className="p-3">
                    {r.image_url ? (
                      <img src={r.image_url} alt="" className="size-10 rounded object-cover" />
                    ) : (
                      <div className="size-10 rounded bg-zinc-800" />
                    )}
                  </td>
                  <td className="p-3 font-medium">{r.name}</td>
                  <td className="p-3 text-xs text-zinc-500 font-mono">{r.slug}</td>
                  <td className="p-3 text-center font-mono text-xs">{r.position}</td>
                  <td className="p-3 text-right">{counts[r.id] ?? 0}</td>
                  <td className="p-3 text-right text-xs text-zinc-500">{fmtDate(r.created_at)}</td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => startEdit(r)}
                      className="p-1.5 hover:bg-zinc-800 rounded mr-1"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      onClick={() => remove(r)}
                      className="p-1.5 hover:bg-red-500/20 text-red-400 rounded"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <EntityDrawer
        open={open}
        onOpenChange={handleClose}
        title={edit?.id ? "Edit category" : "New category"}
        footer={
          <>
            <GhostBtn onClick={() => handleClose(false)}>Cancel</GhostBtn>
            <PrimaryBtn onClick={save}>Save</PrimaryBtn>
          </>
        }
      >
        {edit && (
          <div className="space-y-4">
            <Field label="Name">
              <AdminInput
                value={edit.name ?? ""}
                onChange={(e) =>
                  setEdit({
                    ...edit,
                    name: e.target.value,
                    slug: edit.id ? edit.slug : slugify(e.target.value),
                  })
                }
              />
            </Field>
            <Field label="Slug">
              <AdminInput
                value={edit.slug ?? ""}
                onChange={(e) => setEdit({ ...edit, slug: e.target.value })}
              />
            </Field>
            <Field label="Display Position">
              <AdminInput
                type="number"
                value={edit.position ?? 0}
                onChange={(e) => setEdit({ ...edit, position: parseInt(e.target.value) || 0 })}
              />
            </Field>
            <Field label="Description">
              <AdminTextarea
                rows={3}
                value={edit.description ?? ""}
                onChange={(e) => setEdit({ ...edit, description: e.target.value })}
              />
            </Field>
            <ImageUpload
              bucket="category-images"
              value={edit.image_url ?? null}
              onChange={(url) => setEdit({ ...edit, image_url: url })}
              label="Cover image"
            />
          </div>
        )}
      </EntityDrawer>
    </div>
  );
}
