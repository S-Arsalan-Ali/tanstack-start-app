import { createLazyFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, MapPin, Phone, Clock, MessageCircle, Instagram, Youtube, Twitter, Facebook, Send } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { settingsQuery } from "@/lib/catalog-queries";
import { supabase } from "@/integrations/supabase/client";

export const Route = createLazyFileRoute("/contact")({
  component: ContactPage,
});

function ContactPage() {
  const [sending, setSending] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const { data: settings } = useQuery(settingsQuery());

  const threshold = settings?.free_shipping_threshold ?? 20000;
  const symbol = settings?.currency_symbol ?? "Rs.";
  const isFreeShippingEnabled = settings?.free_shipping_enabled !== false;
  const shippingFlat = settings?.shipping_flat ?? 150;

  const defaultFaqs = [
    { q: "What's your return policy?", a: "30-day no-questions-returns on unused helmets in original packaging. Worn helmets can be exchanged within 14 days." },
    { q: "How do I know what size to order?", a: "Use our sizing guide and measure around the largest part of your head (about 1\" above your eyebrows). When between sizes, size up." },
    { 
      q: "Do you ship internationally?", 
      a: isFreeShippingEnabled
        ? `Yes — we ship to 40+ countries. Free express ground over ${symbol}${Number(threshold).toLocaleString()}. Customs and duties calculated at checkout.`
        : `Yes — we ship to 40+ countries. Flat rate shipping of ${symbol}${shippingFlat} on all orders. Customs and duties calculated at checkout.`
    },
    { q: "Are local payment methods supported?", a: "Yes — EasyPaisa, JazzCash, NayaPay, bank transfer, card, and Cash on Delivery are all available at checkout." },
  ];

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSending(true);
    const form = e.currentTarget;
    const fd = new FormData(form);
    
    const name = String(fd.get("name") || "");
    const email = String(fd.get("email") || "");
    const phone = String(fd.get("phone") || "");
    const topic = String(fd.get("topic") || "");
    const message = String(fd.get("message") || "");

    const { error } = await supabase.from("contact_messages").insert({
      name,
      email,
      phone: phone || null,
      topic,
      message,
    });

    setSending(false);

    if (error) {
      toast.error("Failed to send message: " + error.message);
    } else {
      toast.success("Message received", { description: "We'll reply within 24 hours." });
      form.reset();
    }
  };

  const emailVal = settings?.store_email || "hello@motohelm.co";
  const phoneVal = settings?.store_phone || "+92 300 010 2026";
  const waVal = settings?.whatsapp_number || settings?.store_phone || "+92 300 010 2026";
  const addressVal = settings?.store_address || "MotoHelm HQ, Clifton Block 5, Karachi, Pakistan";
  const mapUrl = settings?.map_iframe_url || "https://www.openstreetmap.org/export/embed.html?bbox=67.027%2C24.806%2C67.047%2C24.826&layer=mapnik&marker=24.8162%2C67.0371";

  const dynamicFaqs = settings?.faqs && (settings.faqs as any[]).length > 0
    ? (settings.faqs as { q: string; a: string }[])
    : defaultFaqs;

  const contactsInfo = [
    { icon: Mail, label: "Email", value: emailVal, sub: "Reply within 24 hours", href: `mailto:${emailVal}` },
    { icon: Phone, label: "Phone", value: phoneVal, sub: "Mon–Sat · 10am – 8pm PKT", href: `tel:${phoneVal.replace(/\s+/g, "")}` },
    { icon: MessageCircle, label: "WhatsApp", value: waVal, sub: "Fastest sizing help", href: `https://wa.me/${waVal.replace(/[^0-9]/g, "")}` },
    { icon: MapPin, label: "Flagship Store", value: addressVal, sub: "Visit us in person" },
    { icon: Clock, label: "Hours", value: "Mon – Sat · 10:00 – 20:00", sub: "Closed Sundays" },
  ];

  return (
    <>
      {/* Hero strip */}
      <section className="pt-24 md:pt-28 pb-12 mx-auto max-w-[1600px] px-4 md:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="inline-flex items-center gap-3 mb-4">
            <span className="size-2 bg-primary animate-pulse-glow" />
            <span className="font-mono text-xs tracking-[0.3em] text-primary uppercase">Pit Wall</span>
          </div>
          <h1 className="font-display text-6xl md:text-8xl lg:text-9xl leading-[0.9] tracking-tight">
            TALK TO <span className="text-primary">THE CREW</span>
          </h1>
          <p className="mt-6 max-w-xl text-muted-foreground">
            Sizing, warranty, press, or just want to talk gear? The pit crew responds within 24 hours, every day.
          </p>
        </motion.div>
      </section>

      <section className="mx-auto max-w-[1600px] px-4 md:px-8 pb-24">
        <div className="grid lg:grid-cols-[1.3fr_1fr] gap-10">
          {/* Form */}
          <form onSubmit={submit} className="border border-border bg-surface/30 p-6 md:p-8 space-y-5">
            <h2 className="font-display text-3xl">SEND A MESSAGE</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field name="name" label="Name" required />
              <Field name="email" label="Email" type="email" required />
            </div>
            <Field name="phone" label="Phone (optional)" type="tel" />
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground block mb-2">Topic</span>
              <select name="topic" className="w-full bg-background border border-border px-4 py-3 font-mono text-sm focus:outline-none focus:border-primary">
                <option>General inquiry</option>
                <option>Sizing help</option>
                <option>Order support</option>
                <option>Warranty claim</option>
                <option>Press / Wholesale</option>
              </select>
            </label>
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground block mb-2">Message</span>
              <textarea name="message" rows={6} required className="w-full bg-background border border-border px-4 py-3 font-mono text-sm focus:outline-none focus:border-primary resize-none" />
            </label>
            <button type="submit" disabled={sending}
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground font-mono text-xs uppercase tracking-[0.2em] font-bold hover:bg-primary-glow transition-colors disabled:opacity-60">
              <Send className="size-4" /> {sending ? "Sending..." : "Send Message"}
            </button>
          </form>

          {/* Info */}
          <aside className="space-y-4">
            {contactsInfo.map((c) => {
              const inner = (
                <>
                  <div className="size-10 bg-fire grid place-items-center text-primary-foreground shrink-0">
                    <c.icon className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{c.label}</p>
                    <p className="font-display text-lg mt-0.5 truncate">{c.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{c.sub}</p>
                  </div>
                </>
              );
              
              if (c.href) {
                return (
                  <a key={c.label} href={c.href} target={c.label === "WhatsApp" ? "_blank" : undefined} rel="noopener noreferrer" className="border border-border bg-surface/30 p-5 flex gap-4 hover:border-primary/40 transition-colors">
                    {inner}
                  </a>
                );
              }
              return (
                <div key={c.label} className="border border-border bg-surface/30 p-5 flex gap-4 hover:border-primary/40 transition-colors">
                  {inner}
                </div>
              );
            })}

            <div className="border border-border bg-surface/30 p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">Follow the pit</p>
              <div className="flex gap-2">
                {[Instagram, Youtube, Twitter, Facebook].map((Icon, i) => (
                  <a key={i} href="#" className="size-10 border border-border grid place-items-center hover:border-primary hover:text-primary transition-colors" aria-label="social">
                    <Icon className="size-4" />
                  </a>
                ))}
              </div>
            </div>
          </aside>
        </div>

        {/* Map */}
        <div className="mt-12 border border-border overflow-hidden">
          <iframe
            title="MotoHelm HQ on map"
            src={mapUrl}
            className="w-full h-[360px] md:h-[420px] grayscale-[40%] contrast-110"
            loading="lazy"
          />
        </div>

        {/* FAQ */}
        <div className="mt-20">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">Quick Answers</p>
          <h2 className="font-display text-4xl md:text-5xl tracking-tight mt-2 mb-8">FAQ</h2>
          <div className="border-t border-border">
            {dynamicFaqs.map((f, i) => {
              const open = openFaq === i;
              return (
                <div key={i} className="border-b border-border">
                  <button onClick={() => setOpenFaq(open ? null : i)} className="w-full py-5 flex items-center justify-between text-left">
                    <span className="font-display text-xl md:text-2xl pr-4">{f.q}</span>
                    <span className={`size-8 grid place-items-center border border-border text-primary font-mono text-lg shrink-0 transition-transform ${open ? "rotate-45" : ""}`}>+</span>
                  </button>
                  {open && <p className="pb-6 text-muted-foreground leading-relaxed pr-12">{f.a}</p>}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground block mb-2">{label}</span>
      <input {...props} className="w-full bg-background border border-border px-4 py-3 font-mono text-sm focus:outline-none focus:border-primary" />
    </label>
  );
}
