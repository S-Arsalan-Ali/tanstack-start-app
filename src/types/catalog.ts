// Shared catalog DTO types — what server fns return and components consume.

export type CatalogImage = { url: string; alt: string | null; position: number };
export type CatalogVariant = {
  id: string;
  color: string;
  color_hex: string | null;
  size: string;
  sku: string | null;
  stock: number;
  price_override: number | null;
  image_url?: string | null;
};
export type CatalogReview = {
  id: string;
  author_name: string;
  rating: number;
  title: string | null;
  body: string | null;
  verified: boolean;
  helpful: number;
  helmet_size: string | null;
  created_at: string;
  user_id?: string | null;
};

export type CatalogProduct = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price: number;
  compare_price: number | null;
  stock: number;
  featured: boolean;
  badge: string | null;
  rating: number | null;
  reviews_count: number | null;
  specs: Array<{ label: string; value: string }> | null;
  certifications: string[] | null;
  category: { slug: string; name: string } | null;
  brand: { slug: string; name: string } | null;
  images: CatalogImage[];
  /** First image url (resolved). Convenience field. */
  primary_image: string;
};

export type CatalogProductDetail = CatalogProduct & {
  variants: CatalogVariant[];
  /** Unique colors derived from variants (in insertion order). */
  colors: { name: string; hex: string }[];
  /** Unique sizes derived from variants (in insertion order). */
  sizes: string[];
};

export type CatalogCategory = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  image_url: string | null;
  position: number;
};

export type CatalogBrand = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  position: number;
  show_in_slider: boolean;
};
