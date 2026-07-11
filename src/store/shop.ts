import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  id: string;
  slug: string;
  name: string;
  price: number;
  image: string;
  color: string;
  size: string;
  qty: number;
};

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

export type OrderItem = {
  slug: string;
  name: string;
  image: string;
  qty: number;
  price: number;
  color: string;
  size: string;
};

export type Order = {
  id: string;
  number: string;
  date: string;
  status: "Processing" | "Packed" | "Shipped" | "Delivered";
  total: number;
  items: OrderItem[];
  tracking?: string;
  address: string;
};

export type Profile = {
  name: string;
  email: string;
  phone: string;
  memberSince: string;
  points: number;
};

type ShopState = {
  cart: CartItem[];
  wishlist: string[];
  cartOpen: boolean;
  wishlistOpen: boolean;
  searchOpen: boolean;
  searchOrigin: { x: number; y: number } | null;
  recentSearches: string[];
  isAuthed: boolean;
  profile: Profile;
  addresses: Address[];
  orders: Order[];
  addToCart: (item: Omit<CartItem, "qty"> & { qty?: number }) => void;
  removeFromCart: (id: string, color: string, size: string) => void;
  updateQty: (id: string, color: string, size: string, qty: number) => void;
  toggleWishlist: (slug: string) => boolean; // returns new saved state
  setCartOpen: (open: boolean) => void;
  setWishlistOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean, origin?: { x: number; y: number } | null) => void;
  addRecentSearch: (q: string) => void;
  clearRecentSearches: () => void;
  clearCart: () => void;
  signIn: (profile?: Partial<Profile>) => void;
  signOut: () => void;
  updateProfile: (p: Partial<Profile>) => void;
  upsertAddress: (a: Address) => void;
  removeAddress: (id: string) => void;
  setDefaultAddress: (id: string) => void;
};

const keyOf = (i: { id: string; color: string; size: string }) =>
  `${i.id}|${i.color}|${i.size}`;

const defaultProfile: Profile = {
  name: "Guest Rider",
  email: "",
  phone: "",
  memberSince: "",
  points: 0,
};

const defaultAddresses: Address[] = [];

const defaultOrders: Order[] = [];

export const useShop = create<ShopState>()(
  persist(
    (set, get) => ({
      cart: [],
      wishlist: [],
      cartOpen: false,
      wishlistOpen: false,
      searchOpen: false,
      searchOrigin: null,
      recentSearches: [],
      isAuthed: false,
      profile: defaultProfile,
      addresses: defaultAddresses,
      orders: defaultOrders,
      addToCart: (item) =>
        set((s) => {
          const qty = item.qty ?? 1;
          const k = keyOf(item);
          const existing = s.cart.find((c) => keyOf(c) === k);
          if (existing) {
            return {
              cart: s.cart.map((c) => (keyOf(c) === k ? { ...c, qty: c.qty + qty } : c)),
              cartOpen: true,
            };
          }
          return { cart: [...s.cart, { ...item, qty }], cartOpen: true };
        }),
      removeFromCart: (id, color, size) =>
        set((s) => ({ cart: s.cart.filter((c) => keyOf(c) !== keyOf({ id, color, size })) })),
      updateQty: (id, color, size, qty) =>
        set((s) => ({
          cart: s.cart
            .map((c) => (keyOf(c) === keyOf({ id, color, size }) ? { ...c, qty } : c))
            .filter((c) => c.qty > 0),
        })),
      toggleWishlist: (slug) => {
        const existed = get().wishlist.includes(slug);
        set((s) => ({
          wishlist: existed ? s.wishlist.filter((x) => x !== slug) : [...s.wishlist, slug],
        }));

        import("@/integrations/supabase/client").then(({ supabase }) => {
          supabase.auth.getSession().then(async ({ data: { session } }) => {
            const userId = session?.user?.id;
            if (!userId) return;
            try {
              const { data: prod } = await supabase.from("products").select("id").eq("slug", slug).maybeSingle();
              if (!prod) return;
              if (existed) {
                await supabase.from("wishlists").delete().eq("user_id", userId).eq("product_id", prod.id);
              } else {
                await supabase.from("wishlists").insert({ user_id: userId, product_id: prod.id });
              }
            } catch (err) {
              console.error("Failed to sync wishlist update", err);
            }
          });
        });

        return !existed;
      },
      setCartOpen: (cartOpen) => set({ cartOpen }),
      setWishlistOpen: (wishlistOpen) => set({ wishlistOpen }),
      setSearchOpen: (searchOpen, origin) =>
        set((s) => ({ searchOpen, searchOrigin: origin !== undefined ? origin : s.searchOrigin })),
      addRecentSearch: (q) =>
        set((s) => {
          const clean = q.trim();
          if (!clean) return s;
          const next = [clean, ...s.recentSearches.filter((x) => x.toLowerCase() !== clean.toLowerCase())].slice(0, 5);
          return { recentSearches: next };
        }),
      clearRecentSearches: () => set({ recentSearches: [] }),
      clearCart: () => set({ cart: [] }),
      signIn: (profile) =>
        set((s) => ({
          isAuthed: true,
          profile: profile ? { ...s.profile, ...profile } : s.profile,
        })),
      signOut: () => {
        import("@/integrations/supabase/client").then(({ supabase }) => {
          supabase.auth.signOut().then(() => {
            set({ isAuthed: false, cart: [], wishlist: [] });
          });
        });
      },
      updateProfile: (p) => set((s) => ({ profile: { ...s.profile, ...p } })),
      upsertAddress: (a) =>
        set((s) => {
          const exists = s.addresses.some((x) => x.id === a.id);
          const addresses = exists
            ? s.addresses.map((x) => (x.id === a.id ? a : x))
            : [...s.addresses, a];
          return { addresses };
        }),
      removeAddress: (id) =>
        set((s) => ({ addresses: s.addresses.filter((x) => x.id !== id) })),
      setDefaultAddress: (id) =>
        set((s) => ({
          addresses: s.addresses.map((x) => ({ ...x, isDefault: x.id === id })),
        })),
    }),
    {
      name: "motohelm-shop",
      partialize: (state) => ({
        cart: state.cart,
        wishlist: state.wishlist,
        cartOpen: state.cartOpen,
        wishlistOpen: state.wishlistOpen,
        searchOpen: state.searchOpen,
        searchOrigin: state.searchOrigin,
        recentSearches: state.recentSearches,
        isAuthed: state.isAuthed,
      }),
    }
  )
);
