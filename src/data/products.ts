import p1 from "@/assets/products/p1.jpg";
import p2 from "@/assets/products/p2.jpg";
import p3 from "@/assets/products/p3.jpg";
import p4 from "@/assets/products/p4.jpg";
import p5 from "@/assets/products/p5.jpg";
import p6 from "@/assets/products/p6.jpg";
import p7 from "@/assets/products/p7.jpg";
import p8 from "@/assets/products/p8.jpg";
import p9 from "@/assets/products/p9.jpg";
import p10 from "@/assets/products/p10.jpg";
import p11 from "@/assets/products/p11.jpg";
import p12 from "@/assets/products/p12.jpg";
import a1 from "@/assets/products/a1.jpg";
import a2 from "@/assets/products/a2.jpg";
import a3 from "@/assets/products/a3.jpg";
import a4 from "@/assets/products/a4.jpg";
import a5 from "@/assets/products/a5.jpg";
import a6 from "@/assets/products/a6.jpg";

export type HelmetCategory =
  | "full-face"
  | "modular"
  | "off-road"
  | "urban"
  | "parts"
  | "bike-mounting"
  | "accessories";

export type Product = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: HelmetCategory;
  price: number;
  compareAt?: number;
  rating: number;
  reviews: number;
  image: string;
  images: string[];
  colors: { name: string; hex: string }[];
  sizes: string[];
  badge?: "NEW" | "BESTSELLER" | "LIMITED" | "SALE";
  certification: string[];
  description: string;
  specs: { label: string; value: string }[];
};

export const products: Product[] = [
  {
    id: "1",
    slug: "apex-rs1-carbon",
    name: "Apex RS1 Carbon",
    brand: "MotoHelm",
    category: "full-face",
    price: 649,
    compareAt: 749,
    rating: 4.9,
    reviews: 312,
    image: p1,
    images: [p1, p3, p2],
    colors: [
      { name: "Inferno", hex: "#ff3b00" },
      { name: "Stealth", hex: "#0a0a0a" },
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    badge: "BESTSELLER",
    certification: ["ECE 22.06", "DOT", "SHARP 5★"],
    description:
      "Race-bred shell with iridium visor and aerodynamic spoiler. Built for the apex, certified for the street.",
    specs: [
      { label: "Shell", value: "12K Carbon Composite" },
      { label: "Weight", value: "1,250 g" },
      { label: "Visor", value: "Iridium Anti-Fog" },
      { label: "Ventilation", value: "8 intake / 6 exhaust" },
    ],
  },
  {
    id: "2",
    slug: "shadow-pro-matte",
    name: "Shadow Pro Matte",
    brand: "MotoHelm",
    category: "full-face",
    price: 389,
    rating: 4.7,
    reviews: 184,
    image: p2,
    images: [p2, p1],
    colors: [{ name: "Matte Black", hex: "#1a1a1a" }],
    sizes: ["S", "M", "L", "XL"],
    badge: "NEW",
    certification: ["ECE 22.06", "DOT"],
    description: "Murdered-out daily rider with internal sun visor and Bluetooth-ready cavity.",
    specs: [
      { label: "Shell", value: "Polycarbonate" },
      { label: "Weight", value: "1,520 g" },
      { label: "Visor", value: "Smoke + Clear" },
      { label: "Ventilation", value: "4 intake / 2 exhaust" },
    ],
  },
  {
    id: "3",
    slug: "carbon-zero",
    name: "Carbon Zero",
    brand: "Velocita",
    category: "full-face",
    price: 899,
    rating: 5.0,
    reviews: 98,
    image: p3,
    images: [p3, p1],
    colors: [{ name: "Raw Carbon", hex: "#2a2a2a" }],
    sizes: ["S", "M", "L", "XL"],
    badge: "LIMITED",
    certification: ["FIM Homologated", "ECE 22.06"],
    description: "FIM-homologated race shell. The lightest in our lineup. Built for podium finishes.",
    specs: [
      { label: "Shell", value: "Aerospace Carbon" },
      { label: "Weight", value: "1,180 g" },
      { label: "Visor", value: "Pinlock 70 Ready" },
      { label: "Ventilation", value: "10 intake / 8 exhaust" },
    ],
  },
  {
    id: "4",
    slug: "circuit-gp",
    name: "Circuit GP",
    brand: "Velocita",
    category: "full-face",
    price: 459,
    compareAt: 519,
    rating: 4.6,
    reviews: 221,
    image: p4,
    images: [p4],
    colors: [
      { name: "Inferno", hex: "#ff3b00" },
      { name: "Arctic", hex: "#f5f5f5" },
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    badge: "SALE",
    certification: ["ECE 22.06", "DOT"],
    description: "Track-day weapon with bold liveries. Aero spoiler reduces drag at speed.",
    specs: [
      { label: "Shell", value: "Fiberglass Composite" },
      { label: "Weight", value: "1,420 g" },
      { label: "Visor", value: "Iridium Red" },
      { label: "Ventilation", value: "6 intake / 4 exhaust" },
    ],
  },
  {
    id: "5",
    slug: "flux-modular-silver",
    name: "Flux Modular",
    brand: "MotoHelm",
    category: "modular",
    price: 429,
    rating: 4.5,
    reviews: 156,
    image: p5,
    images: [p5],
    colors: [
      { name: "Titanium", hex: "#c0c0c0" },
      { name: "Onyx", hex: "#1a1a1a" },
    ],
    sizes: ["S", "M", "L", "XL"],
    certification: ["ECE 22.06 P/J", "DOT"],
    description: "Dual-certified P/J flip-up. Open it at lights, close it at speed.",
    specs: [
      { label: "Shell", value: "Polycarbonate" },
      { label: "Weight", value: "1,680 g" },
      { label: "Visor", value: "Drop-down Sun Shield" },
      { label: "Ventilation", value: "5 intake / 3 exhaust" },
    ],
  },
  {
    id: "6",
    slug: "transit-flip",
    name: "Transit Flip",
    brand: "Velocita",
    category: "modular",
    price: 549,
    rating: 4.8,
    reviews: 203,
    image: p6,
    images: [p6],
    colors: [{ name: "Onyx", hex: "#0a0a0a" }],
    sizes: ["S", "M", "L", "XL"],
    badge: "BESTSELLER",
    certification: ["ECE 22.06 P/J", "DOT"],
    description: "Tour-ready modular with built-in comms cavity and dual visor system.",
    specs: [
      { label: "Shell", value: "Composite Fiber" },
      { label: "Weight", value: "1,640 g" },
      { label: "Visor", value: "Pinlock + Sun Shield" },
      { label: "Ventilation", value: "6 intake / 4 exhaust" },
    ],
  },
  {
    id: "7",
    slug: "raid-adv-white",
    name: "Raid ADV",
    brand: "Trailborn",
    category: "off-road",
    price: 519,
    rating: 4.7,
    reviews: 142,
    image: p7,
    images: [p7],
    colors: [
      { name: "Arctic", hex: "#f5f5f5" },
      { name: "Tactical", hex: "#3a3a30" },
    ],
    sizes: ["S", "M", "L", "XL"],
    badge: "NEW",
    certification: ["ECE 22.06", "DOT"],
    description: "Adventure-ready with peak visor, goggle channel, and ADV ventilation.",
    specs: [
      { label: "Shell", value: "Composite Fiber" },
      { label: "Weight", value: "1,580 g" },
      { label: "Visor", value: "Removable Peak" },
      { label: "Ventilation", value: "12 intake / 6 exhaust" },
    ],
  },
  {
    id: "8",
    slug: "rampage-mx",
    name: "Rampage MX",
    brand: "Trailborn",
    category: "off-road",
    price: 289,
    rating: 4.5,
    reviews: 87,
    image: p8,
    images: [p8],
    colors: [
      { name: "Hi-Vis", hex: "#ffe000" },
      { name: "Stealth", hex: "#0a0a0a" },
    ],
    sizes: ["S", "M", "L", "XL"],
    certification: ["ECE 22.06"],
    description: "Pure motocross. Wide goggle aperture, maximum airflow, minimum weight.",
    specs: [
      { label: "Shell", value: "Polycarbonate" },
      { label: "Weight", value: "1,290 g" },
      { label: "Visor", value: "MX Peak (Adjustable)" },
      { label: "Ventilation", value: "14 intake / 8 exhaust" },
    ],
  },
  {
    id: "9",
    slug: "heritage-cafe",
    name: "Heritage Café",
    brand: "Atelier",
    category: "urban",
    price: 329,
    rating: 4.8,
    reviews: 64,
    image: p9,
    images: [p9],
    colors: [
      { name: "Bone", hex: "#f0e6d2" },
      { name: "Espresso", hex: "#3a2418" },
    ],
    sizes: ["S", "M", "L", "XL"],
    badge: "LIMITED",
    certification: ["ECE 22.06"],
    description: "Hand-finished open-face with Italian leather trim. Slow rides, fast hearts.",
    specs: [
      { label: "Shell", value: "Fiberglass" },
      { label: "Weight", value: "950 g" },
      { label: "Trim", value: "Full-grain leather" },
      { label: "Visor", value: "3-snap removable bubble" },
    ],
  },
  {
    id: "10",
    slug: "vector-urban",
    name: "Vector Urban",
    brand: "MotoHelm",
    category: "urban",
    price: 199,
    rating: 4.4,
    reviews: 312,
    image: p10,
    images: [p10],
    colors: [
      { name: "Matte Black", hex: "#1a1a1a" },
      { name: "Cement", hex: "#7a7a7a" },
    ],
    sizes: ["XS", "S", "M", "L"],
    badge: "BESTSELLER",
    certification: ["ECE 22.06", "DOT"],
    description: "Compact open-face with clear bubble visor. Engineered for the city grid.",
    specs: [
      { label: "Shell", value: "ABS" },
      { label: "Weight", value: "900 g" },
      { label: "Visor", value: "Clear Bubble" },
      { label: "Ventilation", value: "2 intake / 2 exhaust" },
    ],
  },
  {
    id: "11",
    slug: "checker-racer",
    name: "Checker Racer",
    brand: "Atelier",
    category: "urban",
    price: 379,
    rating: 4.6,
    reviews: 41,
    image: p11,
    images: [p11],
    colors: [{ name: "Race Red", hex: "#e83b2f" }],
    sizes: ["S", "M", "L", "XL"],
    badge: "NEW",
    certification: ["ECE 22.06"],
    description: "Retro race livery, modern certification. The grandstand favorite.",
    specs: [
      { label: "Shell", value: "Fiberglass" },
      { label: "Weight", value: "1,020 g" },
      { label: "Visor", value: "Bubble + Drop Shield" },
      { label: "Ventilation", value: "3 intake / 2 exhaust" },
    ],
  },
  {
    id: "12",
    slug: "summit-touring",
    name: "Summit Touring",
    brand: "Trailborn",
    category: "off-road",
    price: 459,
    rating: 4.7,
    reviews: 89,
    image: p12,
    images: [p12],
    colors: [{ name: "Cobalt", hex: "#1d4ed8" }],
    sizes: ["S", "M", "L", "XL"],
    certification: ["ECE 22.06", "DOT"],
    description: "Long-distance adventure lid with integrated sun shield and quiet aero shell.",
    specs: [
      { label: "Shell", value: "Composite Fiber" },
      { label: "Weight", value: "1,610 g" },
      { label: "Visor", value: "Pinlock + Internal Sun" },
      { label: "Ventilation", value: "8 intake / 4 exhaust" },
    ],
  },

  // ===== PARTS =====
  {
    id: "13",
    slug: "apex-race-gloves",
    name: "Apex Race Gloves",
    brand: "MotoHelm",
    category: "parts",
    price: 149,
    rating: 4.8,
    reviews: 76,
    image: a1,
    images: [a1],
    colors: [{ name: "Inferno", hex: "#ff3b00" }],
    sizes: ["S", "M", "L", "XL"],
    badge: "NEW",
    certification: ["CE Level 2"],
    description: "Carbon-knuckle race gloves with kangaroo palm. Pre-curved for the tuck.",
    specs: [
      { label: "Material", value: "Kangaroo / Carbon" },
      { label: "Closure", value: "Velcro + Wrist Strap" },
      { label: "Protection", value: "CE KP Level 2" },
      { label: "Lining", value: "Moisture-wicking" },
    ],
  },
  {
    id: "14",
    slug: "iridium-replacement-visor",
    name: "Iridium Replacement Visor",
    brand: "MotoHelm",
    category: "parts",
    price: 89,
    rating: 4.7,
    reviews: 132,
    image: a2,
    images: [a2],
    colors: [{ name: "Iridium Red", hex: "#e83b2f" }],
    sizes: ["Universal"],
    certification: ["Anti-Fog Coated"],
    description: "Drop-in iridium visor for Apex and Shadow series. Tool-free swap.",
    specs: [
      { label: "Fit", value: "Apex RS1 / Shadow Pro" },
      { label: "Treatment", value: "Anti-Fog + Anti-Scratch" },
      { label: "UV", value: "100% UV400" },
      { label: "Install", value: "Tool-free QuickRelease" },
    ],
  },
  {
    id: "15",
    slug: "pinlock-70-insert",
    name: "Pinlock 70 Insert",
    brand: "Velocita",
    category: "parts",
    price: 34,
    rating: 4.9,
    reviews: 268,
    image: a2,
    images: [a2],
    colors: [{ name: "Clear", hex: "#f5f5f5" }],
    sizes: ["Universal"],
    badge: "BESTSELLER",
    certification: [],
    description: "Anti-fog Pinlock 70 insert. Cold-weather essential.",
    specs: [
      { label: "Type", value: "Pinlock 70" },
      { label: "Tint", value: "Clear" },
      { label: "Fit", value: "Universal Pinlock Ready" },
      { label: "Lifespan", value: "2+ seasons" },
    ],
  },

  // ===== BIKE MOUNTING =====
  {
    id: "16",
    slug: "alloy-phone-mount",
    name: "Alloy Phone Mount",
    brand: "GridTech",
    category: "bike-mounting",
    price: 59,
    rating: 4.6,
    reviews: 412,
    image: a4,
    images: [a4],
    colors: [{ name: "Anodized Black", hex: "#1a1a1a" }],
    sizes: ["22-32mm"],
    badge: "BESTSELLER",
    certification: ["IP65 Vibration Tested"],
    description: "CNC aluminum phone clamp with vibration-damping silicone. Fits any bar.",
    specs: [
      { label: "Material", value: "6061 Aluminum" },
      { label: "Clamp", value: "22–32 mm bars" },
      { label: "Phone Size", value: "4.5″ – 7.2″" },
      { label: "Mount", value: "Ball + Tool-free Knob" },
    ],
  },
  {
    id: "17",
    slug: "gopro-helmet-mount",
    name: "GoPro Helmet Mount",
    brand: "GridTech",
    category: "bike-mounting",
    price: 29,
    rating: 4.5,
    reviews: 198,
    image: a4,
    images: [a4],
    colors: [{ name: "Black", hex: "#0a0a0a" }],
    sizes: ["Universal"],
    certification: [],
    description: "Chin-mount for action cameras. 3M VHB adhesive + safety tether.",
    specs: [
      { label: "Compatibility", value: "GoPro / Insta360" },
      { label: "Adhesive", value: "3M VHB" },
      { label: "Tether", value: "Steel safety wire" },
      { label: "Weight", value: "42 g" },
    ],
  },
  {
    id: "18",
    slug: "tank-bag-pro",
    name: "Tank Bag Pro 18L",
    brand: "Trailborn",
    category: "bike-mounting",
    price: 179,
    rating: 4.7,
    reviews: 87,
    image: a5,
    images: [a5],
    colors: [{ name: "Tactical Black", hex: "#1a1a1a" }],
    sizes: ["18L"],
    badge: "NEW",
    certification: ["Waterproof IPX5"],
    description: "Magnetic + strap-mount tank bag with map window and rain cover.",
    specs: [
      { label: "Volume", value: "18 L expandable" },
      { label: "Mount", value: "Magnetic + Strap" },
      { label: "Material", value: "1680D Ballistic Nylon" },
      { label: "Rain Cover", value: "Included" },
    ],
  },

  // ===== ACCESSORIES =====
  {
    id: "19",
    slug: "comms-pro-bluetooth",
    name: "Comms Pro Bluetooth",
    brand: "MotoHelm",
    category: "accessories",
    price: 249,
    rating: 4.8,
    reviews: 156,
    image: a3,
    images: [a3],
    colors: [{ name: "Black", hex: "#0a0a0a" }],
    sizes: ["Universal"],
    badge: "BESTSELLER",
    certification: ["Bluetooth 5.2", "IP67"],
    description: "Mesh intercom with 8-rider conferencing, 1.6 km range, HD audio.",
    specs: [
      { label: "Range", value: "1.6 km" },
      { label: "Battery", value: "13 hr talk" },
      { label: "Bluetooth", value: "5.2 + Mesh 2.0" },
      { label: "Waterproof", value: "IP67" },
    ],
  },
  {
    id: "20",
    slug: "trail-goggles-fire",
    name: "Trail Goggles Fire",
    brand: "Trailborn",
    category: "accessories",
    price: 79,
    rating: 4.6,
    reviews: 92,
    image: a6,
    images: [a6],
    colors: [{ name: "Inferno", hex: "#ff3b00" }],
    sizes: ["Universal"],
    certification: ["Anti-Fog"],
    description: "Wide-aperture goggles with mirrored fire lens. Triple-layer foam seal.",
    specs: [
      { label: "Lens", value: "Mirrored Fire Iridium" },
      { label: "Foam", value: "Triple-layer fleece" },
      { label: "Tear-offs", value: "Compatible" },
      { label: "Strap", value: "Silicone-backed" },
    ],
  },
  {
    id: "21",
    slug: "carbon-key-fob",
    name: "Carbon Key Fob",
    brand: "Atelier",
    category: "accessories",
    price: 39,
    rating: 4.5,
    reviews: 48,
    image: a1,
    images: [a1],
    colors: [{ name: "Raw Carbon", hex: "#2a2a2a" }],
    sizes: ["One Size"],
    badge: "LIMITED",
    certification: [],
    description: "Real carbon-fiber key fob with leather strap. Track-day talisman.",
    specs: [
      { label: "Material", value: "3K Carbon Weave" },
      { label: "Strap", value: "Full-grain Leather" },
      { label: "Hardware", value: "Brushed Steel Ring" },
      { label: "Weight", value: "22 g" },
    ],
  },
];

// Ensure every product has a rich gallery (4 images) by padding with
// contextual images from the same category, then fallbacks.
const _pool = [p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, p11, p12, a1, a2, a3, a4, a5, a6];
for (const prod of products) {
  const sameCat = products
    .filter((p) => p.category === prod.category && p.id !== prod.id)
    .map((p) => p.image);
  const extras = [...sameCat, ..._pool].filter((img) => img !== prod.image);
  const gallery = [prod.image];
  for (const img of extras) {
    if (gallery.length >= 4) break;
    if (!gallery.includes(img)) gallery.push(img);
  }
  prod.images = gallery;
}

export const categories = [
  { slug: "full-face", name: "Full-Face", desc: "Track-bred protection" },
  { slug: "modular", name: "Modular", desc: "Flip-up versatility" },
  { slug: "off-road", name: "Off-Road / ADV", desc: "Built for dirt & distance" },
  { slug: "urban", name: "Urban / Open-Face", desc: "City-ready style" },
  { slug: "parts", name: "Parts", desc: "Visors, gloves & spares" },
  { slug: "bike-mounting", name: "Bike Mounting", desc: "Mounts, bags & rigs" },
  { slug: "accessories", name: "Accessories", desc: "Comms, goggles & extras" },
] as const;

export const helmetCategories = categories.filter((c) =>
  ["full-face", "modular", "off-road", "urban"].includes(c.slug)
);

export const getProduct = (slug: string) => products.find((p) => p.slug === slug);
export const getByCategory = (cat: string) => products.filter((p) => p.category === cat);
