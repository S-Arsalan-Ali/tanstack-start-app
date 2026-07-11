import { createLazyFileRoute, Link } from "@tanstack/react-router";

export const Route = createLazyFileRoute("/blog")({
  component: BlogPage,
});

const posts = [
  { slug: "ece-2206-explained", title: "ECE 22.06 EXPLAINED", date: "May 2026", read: "6 min", excerpt: "What the new certification actually means for your next helmet purchase — and why it matters at speed." },
  { slug: "carbon-vs-composite", title: "CARBON VS COMPOSITE", date: "Apr 2026", read: "4 min", excerpt: "Weight, strength, and price. We break down when carbon is worth the upgrade." },
  { slug: "track-day-checklist", title: "FIRST TRACK DAY KIT", date: "Mar 2026", read: "5 min", excerpt: "The minimum kit you need to stop showing up to your first track day looking like a tourist." },
  { slug: "wind-tunnel-tour", title: "INSIDE THE WIND TUNNEL", date: "Feb 2026", read: "8 min", excerpt: "How we shape every shell in our 220mph aero lab." },
];

function BlogPage() {
  return (
    <section className="pt-32 md:pt-40 pb-24 mx-auto max-w-[1400px] px-4 md:px-8">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">The Journal</p>
      <h1 className="font-display text-5xl md:text-7xl tracking-tight mt-2">RIDING NOTES</h1>

      <div className="mt-12 grid md:grid-cols-2 gap-px bg-border">
        {posts.map((p) => (
          <Link
            to="/blog"
            key={p.slug}
            className="group block p-8 md:p-12 bg-background hover:bg-surface/50 transition-colors"
          >
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">{p.date} · {p.read}</p>
            <h2 className="font-display text-3xl md:text-5xl mt-4 tracking-tight group-hover:text-primary transition-colors">{p.title}</h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">{p.excerpt}</p>
            <span className="mt-6 inline-block font-mono text-xs uppercase tracking-[0.2em] text-foreground border-b border-primary">Read article →</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
