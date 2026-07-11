import { createLazyFileRoute } from "@tanstack/react-router";
import { ShopGrid } from "@/components/shop/ShopGrid";

export const Route = createLazyFileRoute("/shop/")({
  component: ShopPageComponent,
});

function ShopPageComponent() {
  const { badge, sort } = Route.useSearch();

  let title = "ALL HELMETS";
  let kicker = "The Full Catalog";

  if (badge === "BESTSELLER") {
    title = "BESTSELLERS";
    kicker = "Top of the Grid";
  } else if (badge === "NEW") {
    title = "NEW ARRIVALS";
    kicker = "Just Landed";
  } else if (badge === "LIMITED") {
    title = "LIMITED EDITION";
    kicker = "Rare & Exclusive Drops";
  } else if (badge === "SALE") {
    title = "SPECIAL OFFERS";
    kicker = "Sale & Discounts";
  }

  return (
    <ShopGrid
      initialBadge={badge}
      initialSort={sort}
      title={title}
      kicker={kicker}
      key={badge + "-" + sort}
    />
  );
}
