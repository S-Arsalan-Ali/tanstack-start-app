export type Review = {
  id: string;
  productSlug: string;
  author: string;
  rating: number;
  date: string; // ISO
  title: string;
  body: string;
  verified: boolean;
  helpful: number;
  helmetSize?: string;
};

const seed: Omit<Review, "id" | "productSlug">[] = [
  {
    author: "Marco V.",
    rating: 5,
    date: "2026-03-14",
    title: "Track-ready out of the box",
    body: "Did three sessions at Mugello — visor stayed clear, ventilation is on another level. The shell weight is noticeable after the third stint, you feel less neck fatigue.",
    verified: true,
    helpful: 42,
    helmetSize: "L",
  },
  {
    author: "Sara K.",
    rating: 5,
    date: "2026-02-28",
    title: "Quietest lid I've owned",
    body: "Commute 60km/day on the autostrada. Wind noise is dramatically lower than my previous helmet. Pinlock visor is a must for early mornings.",
    verified: true,
    helpful: 31,
    helmetSize: "M",
  },
  {
    author: "Dan R.",
    rating: 4,
    date: "2026-02-10",
    title: "Great helmet, snug cheek pads",
    body: "Fit is true to size but the cheek pads break in over the first week. After that, perfect. Comms cavity worked great with my Cardo unit.",
    verified: true,
    helpful: 18,
    helmetSize: "L",
  },
  {
    author: "Yuki T.",
    rating: 5,
    date: "2026-01-22",
    title: "Worth every cent",
    body: "Build quality is on another tier. Carbon weave looks even better in person. Shipped fast, packaging was premium.",
    verified: true,
    helpful: 27,
    helmetSize: "S",
  },
  {
    author: "Alex P.",
    rating: 4,
    date: "2025-12-30",
    title: "Solid all-rounder",
    body: "Switched from a polycarbonate budget lid. Night and day in terms of fit, finish and noise. Visor mechanism feels tank-like.",
    verified: false,
    helpful: 9,
    helmetSize: "M",
  },
  {
    author: "Priya N.",
    rating: 5,
    date: "2025-12-04",
    title: "Beautiful & safe",
    body: "Looks aggressive without being loud. ECE 22.06 + DOT was a must for me. Couldn't be happier with the purchase.",
    verified: true,
    helpful: 22,
    helmetSize: "XS",
  },
];

const reviews: Review[] = [];
let counter = 0;
// Generate per-product reviews varying the seed
const authorsExtra = ["Luca M.", "Eva R.", "Noah B.", "Mia D.", "Theo G.", "Aisha L."];
function buildFor(slug: string, count: number, offset: number) {
  for (let i = 0; i < count; i++) {
    const s = seed[(i + offset) % seed.length];
    reviews.push({
      ...s,
      id: `r${++counter}`,
      productSlug: slug,
      author: i > 3 ? authorsExtra[(i + offset) % authorsExtra.length] : s.author,
      rating: Math.min(5, Math.max(3, s.rating - (i % 3 === 0 ? 0 : i % 2))),
      helpful: Math.max(0, s.helpful - i * 2),
    });
  }
}

const productSlugs = [
  "apex-rs1-carbon", "shadow-pro-matte", "carbon-zero", "circuit-gp",
  "flux-modular-silver", "transit-flip", "raid-adv-white", "rampage-mx",
  "heritage-cafe", "vector-urban", "checker-racer", "summit-touring",
];

productSlugs.forEach((slug, idx) => buildFor(slug, 5 + (idx % 3), idx));

export const allReviews = reviews;

export const getProductReviews = (slug: string) =>
  reviews.filter((r) => r.productSlug === slug);

export const getReviewStats = (slug: string) => {
  const list = getProductReviews(slug);
  if (list.length === 0) return { avg: 0, total: 0, dist: [0, 0, 0, 0, 0] };
  const total = list.length;
  const avg = list.reduce((a, r) => a + r.rating, 0) / total;
  const dist = [5, 4, 3, 2, 1].map(
    (n) => list.filter((r) => Math.round(r.rating) === n).length
  );
  return { avg, total, dist };
};
