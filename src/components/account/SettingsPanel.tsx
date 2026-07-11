import { useState } from "react";
import { useShop } from "@/store/shop";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function SettingsPanel() {
  const profile = useShop((s) => s.profile);
  const update = useShop((s) => s.updateProfile);
  const [form, setForm] = useState(profile);
  const [saved, setSaved] = useState(false);
  const [notifs, setNotifs] = useState({ drops: true, orders: true, news: false });

  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) return;

      const { error } = await supabase
        .from("profiles")
        .update({
          name: form.name,
          phone: form.phone,
          user_id: userId,
        })
        .eq("user_id", userId);

      if (error) throw error;

      update(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      toast.success("Profile saved");
    } catch (err: any) {
      toast.error("Failed to save profile", { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <h2 className="font-display text-4xl md:text-5xl tracking-tight">SETTINGS</h2>

      <form onSubmit={save} className="border border-border bg-surface/30 p-6 space-y-5">
        <div className="flex items-center gap-4">
          <div className="size-16 bg-fire grid place-items-center font-display text-3xl text-primary-foreground">
            {form.name[0]}
          </div>
          <div>
            <p className="font-display text-2xl">{form.name}</p>
            <p className="font-mono text-xs text-muted-foreground">
              Member since {new Date(form.memberSince + "-01").toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Full Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <Field label="Email" value={form.email} type="email" onChange={(v) => setForm({ ...form, email: v })} />
          <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="bg-primary text-primary-foreground px-6 py-3 font-mono text-xs uppercase tracking-[0.2em] font-bold"
          >
            Save Changes
          </button>
          {saved && (
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
              Saved ✓
            </span>
          )}
        </div>
      </form>

      <div className="border border-border bg-surface/30 p-6">
        <h3 className="font-display text-2xl mb-4">NOTIFICATIONS</h3>
        <div className="space-y-3">
          {[
            { key: "drops", label: "New drops & limited editions" },
            { key: "orders", label: "Order status updates" },
            { key: "news", label: "MotoHelm Journal & news" },
          ].map((n) => {
            const k = n.key as keyof typeof notifs;
            return (
              <label key={n.key} className="flex items-center justify-between gap-4 py-2 border-b border-border last:border-0">
                <span className="text-sm">{n.label}</span>
                <button
                  type="button"
                  onClick={() => setNotifs({ ...notifs, [k]: !notifs[k] })}
                  className={`relative w-12 h-6 transition-colors ${notifs[k] ? "bg-primary" : "bg-surface-3"}`}
                >
                  <span
                    className={`absolute top-0.5 size-5 bg-background transition-transform ${
                      notifs[k] ? "translate-x-6" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </label>
            );
          })}
        </div>
      </div>

      <div className="border border-border bg-surface/30 p-6">
        <h3 className="font-display text-2xl mb-4">PASSWORD</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Current Password" type="password" value="" onChange={() => {}} />
          <Field label="New Password" type="password" value="" onChange={() => {}} />
        </div>
        <button className="mt-4 border border-border px-6 py-3 font-mono text-xs uppercase tracking-[0.2em] hover:border-primary hover:text-primary">
          Update Password
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground block mb-1.5">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-background border border-border px-3 py-2.5 font-mono text-sm focus:outline-none focus:border-primary"
      />
    </label>
  );
}
