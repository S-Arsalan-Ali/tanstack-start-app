import { useState } from "react";
import { Plus, Trash2, Edit3, Star, Loader2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { userAddressesQuery } from "@/lib/catalog-queries";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Address = {
  id: string;
  label: string;
  name: string;
  line1: string;
  line2?: string;
  city: string;
  region: string;
  postal: string;
  country: string;
  phone?: string;
  isDefault?: boolean;
};

const empty: Address = {
  id: "",
  label: "Home",
  name: "",
  line1: "",
  city: "",
  region: "",
  postal: "",
  country: "Pakistan",
  phone: "",
};

export function AddressesPanel() {
  const queryClient = useQueryClient();
  const { data: rawAddresses = [], isLoading } = useQuery(userAddressesQuery());
  const [editing, setEditing] = useState<Address | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Map database addresses to local Address type
  const addresses: Address[] = rawAddresses.map((a: any) => ({
    id: a.id,
    label: a.label,
    name: a.name,
    line1: a.line1,
    line2: a.line2 ?? undefined,
    city: a.city,
    region: a.state,
    postal: a.postal_code,
    country: a.country,
    phone: a.phone ?? undefined,
    isDefault: a.is_default,
  }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) {
        toast.error("Auth session expired. Please sign in again.");
        return;
      }

      const payload = {
        user_id: userId,
        label: editing.label,
        name: editing.name,
        line1: editing.line1,
        line2: editing.line2 || null,
        city: editing.city,
        state: editing.region,
        postal_code: editing.postal,
        country: editing.country,
        phone: editing.phone || null,
        is_default: editing.isDefault ?? false,
      };

      if (editing.isDefault) {
        // Unset any existing defaults
        await supabase.from("addresses").update({ is_default: false }).eq("user_id", userId);
      }

      if (editing.id) {
        const { error } = await supabase.from("addresses").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("Address updated");
      } else {
        // If this is the first address, default it
        if (addresses.length === 0) {
          payload.is_default = true;
        }
        const { error } = await supabase.from("addresses").insert(payload);
        if (error) throw error;
        toast.success("Address created");
      }

      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ["account", "addresses"] });
    } catch (err: any) {
      toast.error("Failed to save address", { description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Are you sure you want to delete this address?")) return;
    try {
      const { error } = await supabase.from("addresses").delete().eq("id", id);
      if (error) throw error;
      toast.success("Address deleted");
      queryClient.invalidateQueries({ queryKey: ["account", "addresses"] });
    } catch (err: any) {
      toast.error("Failed to delete address", { description: err.message });
    }
  };

  const setDefault = async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) return;

      await supabase.from("addresses").update({ is_default: false }).eq("user_id", userId);
      const { error } = await supabase.from("addresses").update({ is_default: true }).eq("id", id);
      if (error) throw error;

      toast.success("Default address updated");
      queryClient.invalidateQueries({ queryKey: ["account", "addresses"] });
    } catch (err: any) {
      toast.error("Failed to set default address", { description: err.message });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-4xl md:text-5xl tracking-tight">ADDRESSES</h2>
        <button
          onClick={() => setEditing(empty)}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 font-mono text-xs uppercase tracking-[0.2em] font-bold hover:bg-primary-glow"
        >
          <Plus className="size-4" /> New
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {addresses.map((a) => (
          <div key={a.id} className="border border-border bg-surface/30 p-5 relative">
            {a.isDefault && (
              <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-0.5 bg-primary text-primary-foreground font-mono text-[9px] uppercase tracking-wider">
                <Star className="size-3 fill-current" /> Default
              </span>
            )}
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary font-bold">
              {a.label}
            </p>
            <p className="font-display text-xl mt-1">{a.name}</p>
            <div className="mt-2 text-sm text-muted-foreground space-y-0.5">
              <p>{a.line1}</p>
              {a.line2 && <p>{a.line2}</p>}
              <p>
                {a.city}, {a.region} {a.postal}
              </p>
              <p>{a.country}</p>
              {a.phone && <p className="font-mono text-xs text-zinc-400 mt-1">{a.phone}</p>}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setEditing(a)}
                className="flex-1 border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.2em] hover:border-primary hover:text-primary inline-flex items-center justify-center gap-1.5"
              >
                <Edit3 className="size-3" /> Edit
              </button>
              {!a.isDefault && (
                <button
                  onClick={() => setDefault(a.id)}
                  className="flex-1 border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.2em] hover:border-primary hover:text-primary"
                >
                  Set Default
                </button>
              )}
              <button
                onClick={() => remove(a.id)}
                className="border border-border px-3 py-2 hover:border-destructive hover:text-destructive"
                aria-label="Remove"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <form
          onSubmit={save}
          className="border border-primary bg-surface/50 p-6 space-y-4 animate-fade-in"
        >
          <h3 className="font-display text-2xl">
            {editing.id ? "EDIT ADDRESS" : "NEW ADDRESS"}
          </h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Label" value={editing.label} onChange={(v) => setEditing({ ...editing, label: v })} required />
            <Field label="Full Name" value={editing.name} onChange={(v) => setEditing({ ...editing, name: v })} required />
            <Field label="Address Line 1" value={editing.line1} onChange={(v) => setEditing({ ...editing, line1: v })} full required />
            <Field label="Address Line 2" value={editing.line2 ?? ""} onChange={(v) => setEditing({ ...editing, line2: v })} full />
            <Field label="City" value={editing.city} onChange={(v) => setEditing({ ...editing, city: v })} required />
            <Field label="State/Region" value={editing.region} onChange={(v) => setEditing({ ...editing, region: v })} required />
            <Field label="Postal" value={editing.postal} onChange={(v) => setEditing({ ...editing, postal: v })} required />
            <Field label="Country" value={editing.country} onChange={(v) => setEditing({ ...editing, country: v })} required />
            <Field label="Phone" value={editing.phone ?? ""} onChange={(v) => setEditing({ ...editing, phone: v })} full />
          </div>
          
          <label className="flex items-center gap-2 text-xs font-mono py-2">
            <input
              type="checkbox"
              checked={!!editing.isDefault}
              onChange={(e) => setEditing({ ...editing, isDefault: e.target.checked })}
              className="accent-primary"
            />
            Set as default address
          </label>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="bg-primary text-primary-foreground px-6 py-3 font-mono text-xs uppercase tracking-[0.2em] font-bold disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {submitting && <Loader2 className="size-3 animate-spin" />}
              Save Address
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="border border-border px-6 py-3 font-mono text-xs uppercase tracking-[0.2em]"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  full,
  ...props
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  full?: boolean;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange">) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground block mb-1.5">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-background border border-border px-3 py-2.5 font-mono text-sm focus:outline-none focus:border-primary"
        {...props}
      />
    </label>
  );
}
