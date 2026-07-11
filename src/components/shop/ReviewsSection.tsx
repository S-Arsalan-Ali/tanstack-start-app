import { useMemo, useState, useEffect } from "react";
import { useSuspenseQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Star, CheckCircle2, ThumbsUp, X, MessageSquare, Shield, Info, Loader2 } from "lucide-react";
import { reviewsQuery } from "@/lib/catalog-queries";
import type { CatalogReview } from "@/types/catalog";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/store/shop";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type SortKey = "recent" | "highest" | "lowest" | "helpful";
type FilterKey = "all" | "5" | "4" | "verified";
type LocalReview = CatalogReview & { _local?: boolean };

export function ReviewsSection({ slug, productId }: { slug: string; productId: string }) {
  const queryClient = useQueryClient();
  const isAuthed = useShop((s) => s.isAuthed);
  const profile = useShop((s) => s.profile);

  const { data: seed } = useSuspenseQuery(reviewsQuery(slug));
  const [extra, setExtra] = useState<LocalReview[]>([]);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sort, setSort] = useState<SortKey>("recent");
  const [visible, setVisible] = useState(4);
  const [helpfulIds, setHelpfulIds] = useState<Set<string>>(new Set());
  const [writing, setWriting] = useState(false);
  const [form, setForm] = useState({ name: "", title: "", body: "", rating: 5, helmet_size: "" });
  const [showThankYou, setShowThankYou] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id || null);
    });
  }, [isAuthed]);

  // Query to check if the user is allowed to write a review and fetch their purchased sizes
  const { data: reviewStatus, isLoading: checkingStatus, refetch: refetchStatus } = useQuery({
    queryKey: ["review-permission", productId, isAuthed],
    enabled: isAuthed,
    queryFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;
      if (!userId) return { canReview: false, reason: "login" };

      // Check if they purchased and it's delivered
      const { data: orders, error: orderError } = await supabase
        .from("orders")
        .select("id, status, order_items!inner(product_id, size)")
        .eq("user_id", userId)
        .eq("status", "delivered")
        .eq("order_items.product_id", productId);

      if (orderError) {
        console.error("Error checking orders:", orderError);
        return { canReview: false, reason: "error" };
      }

      if (!orders || orders.length === 0) {
        return { canReview: false, reason: "not_purchased_or_delivered" };
      }

      // Collect purchased sizes
      const sizes = Array.from(new Set(orders.flatMap(o => o.order_items.map(oi => oi.size).filter(Boolean))));

      // Check if they already reviewed
      const { data: existingReview, error: reviewError } = await supabase
        .from("product_reviews")
        .select("id")
        .eq("user_id", userId)
        .eq("product_id", productId)
        .limit(1)
        .maybeSingle();

      if (reviewError) {
        console.error("Error checking review:", reviewError);
        return { canReview: false, reason: "error" };
      }

      if (existingReview) {
        return { canReview: false, reason: "already_reviewed", sizes };
      }

      return { canReview: true, sizes };
    }
  });

  const submitMutation = useMutation({
    mutationFn: async (payload: {
      product_id: string;
      user_id: string;
      author_name: string;
      rating: number;
      title: string;
      body: string;
      verified: boolean;
      helmet_size: string | null;
    }) => {
      const { data, error } = await supabase
        .from("product_reviews")
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate queries to refresh reviews list and product rating aggregates
      queryClient.invalidateQueries({ queryKey: ["catalog", "reviews", slug] });
      queryClient.invalidateQueries({ queryKey: ["catalog", "product", slug] });
      // Re-fetch eligibility
      refetchStatus();
      setForm({ name: profile.name || "", title: "", body: "", rating: 5, helmet_size: "" });
      setWriting(false);
      setShowThankYou(true);
    },
    onError: (error: any) => {
      console.error("Error submitting review:", error);
      toast.error(error.message || "Failed to submit review. Please try again.");
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: {
      id: string;
      author_name: string;
      rating: number;
      title: string;
      body: string;
      helmet_size: string | null;
    }) => {
      const { data, error } = await supabase
        .from("product_reviews")
        .update({
          author_name: payload.author_name,
          rating: payload.rating,
          title: payload.title,
          body: payload.body,
          helmet_size: payload.helmet_size,
        })
        .eq("id", payload.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Review updated successfully!");
      // Invalidate queries to refresh reviews list and product rating aggregates
      queryClient.invalidateQueries({ queryKey: ["catalog", "reviews", slug] });
      queryClient.invalidateQueries({ queryKey: ["catalog", "product", slug] });
      refetchStatus();
      setForm({ name: profile.name || "", title: "", body: "", rating: 5, helmet_size: "" });
      setWriting(false);
      setEditingId(null);
    },
    onError: (error: any) => {
      console.error("Error updating review:", error);
      toast.error(error.message || "Failed to update review. Please try again.");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      const { error } = await supabase
        .from("product_reviews")
        .delete()
        .eq("id", reviewId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Review deleted successfully.");
      // Invalidate queries to refresh reviews list and product rating aggregates
      queryClient.invalidateQueries({ queryKey: ["catalog", "reviews", slug] });
      queryClient.invalidateQueries({ queryKey: ["catalog", "product", slug] });
      refetchStatus();
    },
    onError: (error: any) => {
      console.error("Error deleting review:", error);
      toast.error(error.message || "Failed to delete review. Please try again.");
    }
  });

  const all: LocalReview[] = useMemo(() => [...extra, ...seed], [extra, seed]);
  const stats = useMemo(() => {
    const total = all.length;
    const avg = total ? all.reduce((a, r) => a + r.rating, 0) / total : 0;
    const dist = [5, 4, 3, 2, 1].map((n) => all.filter((r) => Math.round(r.rating) === n).length);
    return { avg, total, dist };
  }, [all]);

  const filtered = useMemo(() => {
    let list = [...all];
    if (filter === "5") list = list.filter((r) => Math.round(r.rating) === 5);
    if (filter === "4") list = list.filter((r) => Math.round(r.rating) === 4);
    if (filter === "verified") list = list.filter((r) => r.verified);
    if (sort === "recent") list.sort((a, b) => b.created_at.localeCompare(a.created_at));
    if (sort === "highest") list.sort((a, b) => b.rating - a.rating);
    if (sort === "lowest") list.sort((a, b) => a.rating - b.rating);
    if (sort === "helpful")
      list.sort((a, b) => b.helpful + (helpfulIds.has(b.id) ? 1 : 0) - (a.helpful + (helpfulIds.has(a.id) ? 1 : 0)));
    return list;
  }, [all, filter, sort, helpfulIds]);

  const toggleHelpful = (id: string) =>
    setHelpfulIds((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.body.trim()) {
      toast.error("Please fill in both your name and review feedback.");
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;
    if (!userId) {
      toast.error("You must be logged in to modify reviews.");
      return;
    }

    const defaultSize = reviewStatus?.sizes && reviewStatus.sizes.length > 0
      ? reviewStatus.sizes[0]
      : null;

    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        author_name: form.name.trim(),
        rating: form.rating,
        title: form.title.trim() || "Verified Rider",
        body: form.body.trim(),
        helmet_size: form.helmet_size || defaultSize,
      });
    } else {
      submitMutation.mutate({
        product_id: productId,
        user_id: userId,
        author_name: form.name.trim(),
        rating: form.rating,
        title: form.title.trim() || "Verified Rider",
        body: form.body.trim(),
        verified: true, // User RLS restricts to verified purchasers
        helmet_size: form.helmet_size || defaultSize,
      });
    }
  };

  const filters: { id: FilterKey; label: string }[] = [
    { id: "all", label: "All" },
    { id: "5", label: "5★" },
    { id: "4", label: "4★" },
    { id: "verified", label: "Verified" },
  ];

  return (
    <section id="reviews" className="scroll-mt-24 py-20 border-t border-border">
      <div className="mx-auto max-w-[1600px] px-4 md:px-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="size-2 bg-primary" />
          <span className="font-mono text-xs tracking-[0.3em] text-primary uppercase">Rider Feedback</span>
        </div>
        <h2 className="font-display text-4xl md:text-6xl tracking-tight mb-12">REVIEWS · {stats.total}</h2>

        <div className="grid lg:grid-cols-[360px_1fr] gap-12">
          
          {/* Dashboard Summary Sidebar */}
          <aside className="lg:sticky lg:top-28 lg:self-start space-y-6">
            <div className="border border-border/80 p-6 bg-surface/30 backdrop-blur-md relative overflow-hidden shadow-fire">
              {/* Neon Orange Corner Accents */}
              <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-primary" />
              <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 border-primary" />
              <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 border-primary" />
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 border-primary" />

              <div className="flex items-end gap-3 pb-6 border-b border-border/40">
                <span className="font-display text-7xl text-primary leading-none filter drop-shadow-[0_0_8px_rgba(255,87,34,0.3)]">
                  {stats.avg.toFixed(1)}
                </span>
                <div className="pb-1">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`size-4 ${i < Math.round(stats.avg) ? "fill-primary text-primary" : "text-zinc-700"}`} />
                    ))}
                  </div>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mt-1.5">
                    Based on {stats.total} reviews
                  </p>
                </div>
              </div>

              {/* Segmented rating bars */}
              <div className="mt-6 space-y-2.5">
                {[5, 4, 3, 2, 1].map((n, idx) => {
                  const count = stats.dist[idx];
                  const pct = stats.total ? (count / stats.total) * 100 : 0;
                  return (
                    <div key={n} className="flex items-center gap-3">
                      <span className="font-mono text-xs w-4 text-muted-foreground">{n}★</span>
                      <div className="flex-1 h-2 bg-zinc-950 overflow-hidden border border-border/20">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${pct}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.8, delay: idx * 0.05, ease: [0.22, 1, 0.36, 1] }}
                          className="h-full bg-gradient-to-r from-primary via-primary-glow to-fire"
                        />
                      </div>
                      <span className="font-mono text-xs w-8 text-right text-muted-foreground">{count}</span>
                    </div>
                  );
                })}
              </div>

              {/* Rider Telemetry Breakdown */}
              <div className="mt-6 pt-6 border-t border-border/40 grid grid-cols-2 gap-3 text-center font-mono">
                <div className="p-3 bg-zinc-950/80 border border-border/30">
                  <p className="text-[8px] text-muted-foreground uppercase tracking-widest">FITMENT</p>
                  <p className="text-[11px] font-bold mt-1 text-primary">TRUE TO SIZE</p>
                </div>
                <div className="p-3 bg-zinc-950/80 border border-border/30">
                  <p className="text-[8px] text-muted-foreground uppercase tracking-widest">RECOMMEND</p>
                  <p className="text-[11px] font-bold mt-1 text-emerald-400">96% OF RIDERS</p>
                </div>
              </div>

              {!isAuthed ? (
                <div className="mt-6 p-4 border border-zinc-800 bg-zinc-950/80 text-center font-mono">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-3">Sign in to write a review</p>
                  <Link
                    to="/login"
                    search={{ redirect: `/product/${slug}` }}
                    className="inline-block w-full bg-zinc-900 border border-zinc-700 hover:border-primary text-foreground hover:text-primary py-2.5 text-xs uppercase tracking-widest font-bold transition-all duration-300"
                  >
                    Sign In / Register
                  </Link>
                </div>
              ) : checkingStatus ? (
                <button
                  disabled
                  className="w-full mt-6 bg-zinc-900 border border-zinc-800 text-muted-foreground py-3.5 font-mono text-xs uppercase tracking-[0.2em] font-bold flex items-center justify-center gap-2"
                >
                  <Loader2 className="size-4 animate-spin text-primary" /> Checking Eligibility...
                </button>
              ) : reviewStatus?.canReview ? (
                <button
                  onClick={() => {
                    setForm({
                      name: profile.name || "",
                      title: "",
                      body: "",
                      rating: 5,
                      helmet_size: reviewStatus.sizes && reviewStatus.sizes.length > 0 ? reviewStatus.sizes[0] : ""
                    });
                    setWriting(true);
                  }}
                  className="w-full mt-6 bg-primary text-primary-foreground py-3.5 font-mono text-xs uppercase tracking-[0.2em] font-bold hover:bg-primary-glow transition-colors shadow-fire"
                >
                  Write a Review
                </button>
              ) : reviewStatus?.reason === "already_reviewed" ? (
                <div className="mt-6 p-4 border border-emerald-500/20 bg-emerald-500/5 text-center font-mono space-y-3">
                  <div>
                    <p className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold">You've reviewed this gear</p>
                    <p className="text-[9px] text-muted-foreground mt-1">Thank you for sharing your feedback!</p>
                  </div>
                  {(() => {
                    const myReview = all.find((r) => r.user_id === currentUserId);
                    if (!myReview) return null;
                    return (
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => {
                            setEditingId(myReview.id);
                            setForm({
                              name: myReview.author_name,
                              title: myReview.title || "",
                              body: myReview.body || "",
                              rating: myReview.rating,
                              helmet_size: myReview.helmet_size || ""
                            });
                            setWriting(true);
                          }}
                          className="flex-1 bg-zinc-900 border border-zinc-800 hover:border-primary text-foreground hover:text-primary py-2 font-mono text-[9px] uppercase tracking-wider font-bold transition-all duration-300"
                        >
                          Edit Review
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("Are you sure you want to delete your review?")) {
                              deleteMutation.mutate(myReview.id);
                            }
                          }}
                          className="flex-1 bg-zinc-900 border border-zinc-800 hover:border-destructive text-foreground hover:text-destructive py-2 font-mono text-[9px] uppercase tracking-wider font-bold transition-all duration-300"
                        >
                          Delete Review
                        </button>
                      </div>
                    );
                  })()}
                </div>
              ) : reviewStatus?.reason === "not_purchased_or_delivered" ? (
                <div className="mt-6 p-4 border border-zinc-800 bg-zinc-950/40 text-center font-mono">
                  <p className="text-[10px] text-amber-500/80 uppercase tracking-widest font-bold">Review Restricted</p>
                  <p className="text-[9px] text-muted-foreground mt-2 leading-relaxed">
                    Only verified buyers with a delivered order for this product can write a review.
                  </p>
                </div>
              ) : (
                <div className="mt-6 p-4 border border-destructive/20 bg-destructive/5 text-center font-mono">
                  <p className="text-[10px] text-destructive uppercase tracking-widest font-bold">Check Failed</p>
                  <button onClick={() => refetchStatus()} className="text-[9px] text-primary hover:underline mt-1">Retry check</button>
                </div>
              )}
            </div>
          </aside>

          {/* Reviews List & Controls */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div className="flex gap-2 flex-wrap">
                {filters.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => { setFilter(f.id); setVisible(4); }}
                    className={`px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] border transition-colors ${
                      filter === f.id ? "border-primary text-primary bg-primary/5" : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="bg-background border border-border px-3 py-2.5 font-mono text-xs uppercase tracking-wider focus:outline-none focus:border-primary cursor-pointer hover:border-zinc-700 transition-colors"
              >
                <option value="recent">Most Recent</option>
                <option value="highest">Highest Rated</option>
                <option value="lowest">Lowest Rated</option>
                <option value="helpful">Most Helpful</option>
              </select>
            </div>

            {/* Write Review Form */}
            <AnimatePresence>
              {writing && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={submit}
                  className="overflow-hidden border border-primary bg-surface/30 backdrop-blur-md mb-8 relative p-6 shadow-fire"
                >
                  <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-primary" />
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 border-primary" />

                  <div className="space-y-5">
                    <div className="flex items-center justify-between pb-3 border-b border-border/40">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="size-5 text-primary animate-pulse" />
                        <h3 className="font-display text-2xl tracking-wide uppercase">
                          {editingId ? "Edit Your Review" : "Share Your Ride"}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setWriting(false);
                          setEditingId(null);
                        }}
                        className="size-8 grid place-items-center hover:bg-surface border border-border/40 hover:border-primary transition-colors text-muted-foreground hover:text-primary"
                      >
                        <X className="size-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Select Rating</span>
                      <div className="flex gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <motion.button
                            key={i}
                            type="button"
                            whileHover={{ scale: 1.2 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setForm({ ...form, rating: i + 1 })}
                            className="p-1.5 transition-colors"
                          >
                            <Star className={`size-6 ${i < form.rating ? "fill-primary text-primary filter drop-shadow-[0_0_4px_rgba(255,87,34,0.6)]" : "text-zinc-600 hover:text-zinc-400"}`} />
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Rider Name</label>
                        <input 
                          placeholder="e.g. Alex R." 
                          value={form.name} 
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          className="bg-zinc-950/80 border border-border px-4 py-3 font-mono text-sm focus:outline-none focus:border-primary transition-colors" 
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Review Headline</label>
                        <input 
                          placeholder="e.g. Race-grade comfort" 
                          value={form.title} 
                          onChange={(e) => setForm({ ...form, title: e.target.value })}
                          className="bg-zinc-950/80 border border-border px-4 py-3 font-mono text-sm focus:outline-none focus:border-primary transition-colors" 
                        />
                      </div>
                    </div>

                    {reviewStatus?.sizes && reviewStatus.sizes.length > 0 && (
                      <div className="flex flex-col gap-1.5">
                        <label className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Verified Purchased Size</label>
                        {reviewStatus.sizes.length === 1 ? (
                          <div className="bg-zinc-900 border border-zinc-800/80 px-4 py-3 font-mono text-xs text-emerald-400 flex items-center gap-2 select-none">
                            <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                            Size: {reviewStatus.sizes[0]} (Verified Purchase)
                          </div>
                        ) : (
                          <select
                            value={form.helmet_size || reviewStatus.sizes[0]}
                            onChange={(e) => setForm({ ...form, helmet_size: e.target.value })}
                            className="bg-zinc-950/80 border border-border px-4 py-3 font-mono text-xs focus:outline-none focus:border-primary transition-colors cursor-pointer text-emerald-400"
                          >
                            {reviewStatus.sizes.map((sz) => (
                              <option key={sz} value={sz}>Size: {sz} (Verified Purchase)</option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}

                    <div className="flex flex-col gap-1.5">
                      <label className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Detailed Feedback</label>
                      <textarea 
                        placeholder="How does it feel at speed? Noise, fitment, vents..." 
                        rows={4} 
                        value={form.body} 
                        onChange={(e) => setForm({ ...form, body: e.target.value })}
                        className="w-full bg-zinc-950/80 border border-border px-4 py-3 font-mono text-sm focus:outline-none focus:border-primary transition-colors resize-none" 
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitMutation.isPending || updateMutation.isPending}
                      className="bg-primary text-primary-foreground px-8 py-3.5 font-mono text-xs uppercase tracking-[0.2em] font-bold hover:bg-primary-glow transition-colors shadow-fire w-full sm:w-auto flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitMutation.isPending || updateMutation.isPending ? (
                        <>
                          <Loader2 className="size-3.5 animate-spin" /> {editingId ? "Updating Review..." : "Submitting Review..."}
                        </>
                      ) : (
                        editingId ? "Update Rider Review" : "Submit Rider Review"
                      )}
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            {/* Reviews List */}
            <div className="space-y-4">
              <AnimatePresence initial={false}>
                {filtered.slice(0, visible).map((r) => {
                  const liked = helpfulIds.has(r.id);
                  return (
                    <motion.article
                      key={r.id}
                      layout
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="border border-border/60 p-6 bg-surface/10 hover:bg-surface/20 hover:border-primary/50 transition-all duration-300 relative group shadow-md"
                    >
                      {/* Glow line top indicator on hover */}
                      <div className="absolute top-0 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-500" />
                      
                      {/* Corner orange notch design */}
                      <div className="absolute top-0 right-0 w-0 h-0 border-t-[8px] border-r-[8px] border-t-primary border-r-primary opacity-40 group-hover:opacity-100 transition-opacity" />

                      <div className="flex flex-col sm:flex-row items-start gap-5">
                        
                        {/* Circle Avatar badge */}
                        <div className="size-12 rounded-full border border-border/60 bg-gradient-to-br from-surface to-background flex items-center justify-center font-display text-xl text-primary font-bold shadow-md shrink-0 relative overflow-hidden group-hover:border-primary transition-colors">
                          {r.author_name[0].toUpperCase()}
                          <div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/10 transition-colors" />
                        </div>

                        <div className="flex-1 min-w-0 w-full">
                          
                          {/* Metadata telemetry line */}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs font-mono">
                            <span className="font-semibold text-foreground tracking-wide text-sm">{r.author_name}</span>
                            
                            {r.verified && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 text-[9px] uppercase tracking-widest font-bold border border-emerald-500/20">
                                <CheckCircle2 className="size-3" /> VERIFIED BUYER
                              </span>
                            )}

                            {r.helmet_size && (
                              <span className="px-1.5 py-0.5 bg-zinc-800 text-zinc-400 text-[9px] uppercase tracking-widest font-semibold border border-zinc-700/30">
                                SIZE {r.helmet_size}
                              </span>
                            )}

                            <span className="text-[10px] text-muted-foreground uppercase ml-auto">
                              {new Date(r.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                            </span>
                          </div>

                          {/* Star Rating Icons */}
                          <div className="flex gap-0.5 mt-2.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className={`size-3.5 ${i < r.rating ? "fill-primary text-primary filter drop-shadow-[0_0_2px_rgba(255,87,34,0.4)]" : "text-zinc-700"}`} />
                            ))}
                          </div>

                          {/* Review Headline & Description */}
                          {r.title && (
                            <h4 className="font-display text-xl mt-4 leading-tight tracking-wide text-foreground group-hover:text-primary transition-colors">
                              {r.title}
                            </h4>
                          )}
                          {r.body && (
                            <p className="text-sm text-muted-foreground leading-relaxed mt-2 font-sans">
                              {r.body}
                            </p>
                          )}

                          {/* Helpful Interactions bar */}
                          <div className="mt-5 pt-4 border-t border-border/20 flex items-center justify-between gap-4">
                            <button
                              onClick={() => toggleHelpful(r.id)}
                              className={`inline-flex items-center gap-2 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.2em] border transition-all duration-300 ${
                                liked 
                                  ? "border-primary text-primary bg-primary/5 shadow-[0_0_8px_rgba(255,87,34,0.15)]" 
                                  : "border-border text-muted-foreground hover:text-foreground hover:border-zinc-700"
                              }`}
                            >
                              <ThumbsUp className={`size-3 ${liked ? "fill-current" : ""}`} />
                              Riders Found Helpful ({r.helpful + (liked ? 1 : 0)})
                            </button>

                            {r.user_id && currentUserId && r.user_id === currentUserId && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    setEditingId(r.id);
                                    setForm({
                                      name: r.author_name,
                                      title: r.title || "",
                                      body: r.body || "",
                                      rating: r.rating,
                                      helmet_size: r.helmet_size || ""
                                    });
                                    setWriting(true);
                                    document.getElementById("reviews")?.scrollIntoView({ behavior: "smooth", block: "start" });
                                  }}
                                  className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-primary text-foreground hover:text-primary font-mono text-[9px] uppercase tracking-wider font-bold transition-all duration-300"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm("Are you sure you want to delete your review?")) {
                                      deleteMutation.mutate(r.id);
                                    }
                                  }}
                                  className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-destructive text-foreground hover:text-destructive font-mono text-[9px] uppercase tracking-wider font-bold transition-all duration-300"
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                      </div>
                    </motion.article>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Load More Trigger */}
            {filtered.length > visible && (
              <div className="mt-8 flex justify-center">
                <button
                  onClick={() => setVisible((v) => v + 4)}
                  className="border border-border px-6 py-3.5 font-mono text-xs uppercase tracking-[0.2em] hover:border-primary hover:text-primary transition-colors cursor-pointer"
                >
                  Load More Reviews
                </button>
              </div>
            )}

            {filtered.length === 0 && (
              <div className="text-center py-16 border border-dashed border-border bg-surface/5 flex flex-col items-center justify-center">
                <Info className="size-8 text-zinc-500 mb-3" />
                <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">No reviews match this filter criteria.</p>
              </div>
            )}
          </div>

        </div>
      </div>

      <Dialog open={showThankYou} onOpenChange={setShowThankYou}>
        <DialogContent className="border border-primary bg-zinc-950 p-6 md:p-8 max-w-md rounded-none shadow-fire relative overflow-hidden">
          {/* Orange Corner Accents */}
          <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-primary" />
          <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 border-primary" />
          <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 border-primary" />
          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 border-primary" />

          <div className="flex flex-col items-center text-center space-y-4 pt-4">
            <div className="size-16 rounded-full bg-primary/10 border border-primary flex items-center justify-center text-primary filter drop-shadow-[0_0_8px_rgba(255,87,34,0.3)] animate-pulse">
              <CheckCircle2 className="size-10" />
            </div>

            <DialogHeader className="space-y-2">
              <DialogTitle className="font-display text-3xl tracking-tight text-foreground uppercase">
                Review Submitted
              </DialogTitle>
              <DialogDescription className="font-mono text-[10px] text-primary uppercase tracking-[0.2em] text-center">
                Podium Finish · Feedback Logged
              </DialogDescription>
            </DialogHeader>

            <p className="text-sm text-muted-foreground leading-relaxed font-sans max-w-xs">
              Thank you for sharing your ride experience! Your detailed feedback helps other riders choose the perfect gear.
            </p>

            <button
              onClick={() => setShowThankYou(false)}
              className="mt-4 bg-primary text-primary-foreground px-8 py-3 font-mono text-xs uppercase tracking-[0.2em] font-bold hover:bg-primary-glow transition-all duration-300 w-full shadow-fire"
            >
              Back to Pit Lane
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
