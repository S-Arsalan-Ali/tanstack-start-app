import { createLazyFileRoute, Link } from "@tanstack/react-router";

export const Route = createLazyFileRoute("/about")({
  component: AboutPage,
});

function AboutPage() {
  return (
    <>
      <section className="pt-24 md:pt-28 pb-20 mx-auto max-w-[1400px] px-4 md:px-8">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">Our Story</p>
        <h1 className="font-display text-6xl md:text-8xl lg:text-9xl leading-[0.88] tracking-tight mt-4">
          BUILT BY<br /><span className="text-stroke-primary">RIDERS.</span> TESTED ON<br />THE EDGE.
        </h1>
        <p className="mt-8 max-w-2xl text-lg text-muted-foreground leading-relaxed">
          MotoHelm started in a back-of-the-garage workshop in 2018 — three racers tired of choosing between weight, safety, and price. Today we ship to 40+ countries, but the obsession hasn't changed: build the helmet we'd want to wear at 240km/h.
        </p>
      </section>

      <section className="py-20 bg-surface/30 border-y border-border">
        <div className="mx-auto max-w-[1400px] px-4 md:px-8 grid md:grid-cols-3 gap-8">
          {[
            { num: "01", title: "Engineered", desc: "Wind-tunnel sculpted, lab-impacted, FIM-graded. Every spec is earned in testing." },
            { num: "02", title: "Certified", desc: "ECE 22.06, DOT, SHARP 5★, FIM. We meet the standards above the standards." },
            { num: "03", title: "Built to Last", desc: "Aerospace carbon shells, multi-density EPS liners, 2-year warranty as standard." },
          ].map((c) => (
            <div key={c.num} className="border-l-2 border-primary pl-6">
              <p className="font-mono text-xs text-primary uppercase tracking-[0.3em]">{c.num}</p>
              <h3 className="font-display text-3xl mt-2">{c.title.toUpperCase()}</h3>
              <p className="text-muted-foreground mt-3 leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-20 mx-auto max-w-[1400px] px-4 md:px-8 text-center">
        <h2 className="font-display text-4xl md:text-6xl">READY TO RIDE?</h2>
        <Link to="/shop" className="mt-8 inline-flex px-8 py-4 bg-primary text-primary-foreground font-mono text-xs uppercase tracking-[0.2em] font-bold">Shop the Lineup</Link>
      </section>
    </>
  );
}
