import { OfferType } from "@prisma/client";

// ─── Types ─────────────────────────────────────────────────
type VariantPriceInfo = {
  isActive: boolean;
  priceOverride: number | null;
};

type VariantStockInfo = {
  isActive: boolean;
  stockOverride: number | null;
};

// ─── Price ─────────────────────────────────────────────────
export function computeEffectivePrice(
  basePrice: number,
  variants?: VariantPriceInfo[] | null,
): { price: number; minPrice: number; maxPrice: number; hasPriceRange: boolean } {
  const active = (variants ?? []).filter((v) => v.isActive);

  if (active.length === 0) {
    return { price: basePrice, minPrice: basePrice, maxPrice: basePrice, hasPriceRange: false };
  }

  const prices = active.map((v) => v.priceOverride ?? basePrice);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  return { price: minPrice, minPrice, maxPrice, hasPriceRange: minPrice !== maxPrice };
}

export function withEffectivePrice<
  T extends { price: number; variants?: VariantPriceInfo[] },
>(product: T): T & { minPrice: number; maxPrice: number; hasPriceRange: boolean } {
  const { price, minPrice, maxPrice, hasPriceRange } = computeEffectivePrice(
    product.price,
    product.variants,
  );
  return { ...product, price, minPrice, maxPrice, hasPriceRange };
}

// ─── Stock ─────────────────────────────────────────────────
export function computeEffectiveStock(
  baseStock: number,
  variants?: VariantStockInfo[] | null,
): number {
  const active = (variants ?? []).filter((v) => v.isActive);
  if (active.length === 0) return baseStock;
  return active.reduce((sum, v) => sum + (v.stockOverride ?? 0), 0);
}

export function withEffectiveStock<
  T extends { stock: number; variants?: VariantStockInfo[] },
>(product: T): T {
  return { ...product, stock: computeEffectiveStock(product.stock, product.variants) };
}

// ─── isNew ─────────────────────────────────────────────────
export const NEW_PRODUCT_WINDOW_DAYS = 30;

export function computeIsNew(createdAt: Date | string): boolean {
  const d = createdAt instanceof Date ? createdAt : new Date(createdAt);
  const ageInDays = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
  return ageInDays <= NEW_PRODUCT_WINDOW_DAYS;
}

export function withComputedIsNew<T extends { createdAt: Date | string }>(
  product: T,
): T & { isNew: boolean } {
  return { ...product, isNew: computeIsNew(product.createdAt) };
}


// ─── Offer resolution ──────────────────────────────────────
// These mirror the methods on OffersService but as pure functions so
// ProductsService and OffersService can share them without DI.

export type ResolveableOffer = {
  id: string;
  title: string;
  offerType: OfferType;
  offerValue: number;
  productIds: Set<string>;
  brandIds: Set<string>;
  categoryIds: Set<string>;
};

export function computeDiscountedPrice(
  price: number,
  offerType: OfferType,
  offerValue: number,
): number {
  const discounted =
    offerType === "PERCENTAGE"
      ? price - (price * offerValue) / 100
      : price - offerValue;
  return Math.max(0.01, Math.round(discounted * 100) / 100);
}

export function resolveBestOfferForProduct(
  offers: ResolveableOffer[],
  product: { id: string; brandId: string; categoryId: string; price: number },
): { offer: ResolveableOffer; discountedPrice: number } | null {
  const matching = offers.filter(
    (o) =>
      o.productIds.has(product.id) ||
      o.brandIds.has(product.brandId) ||
      o.categoryIds.has(product.categoryId),
  );

  if (matching.length === 0) return null;

  let best: { offer: ResolveableOffer; discountedPrice: number } | null = null;
  for (const offer of matching) {
    const discountedPrice = computeDiscountedPrice(
      product.price,
      offer.offerType,
      offer.offerValue,
    );
    if (!best || discountedPrice < best.discountedPrice) {
      best = { offer, discountedPrice };
    }
  }
  return best;
}

/**
 * Attaches the best applicable offer to a product.
 * Overwrites `onSale` / `salePrice` and adds `appliedOffer`.
 * Safe to call on any product that has id, brandId, categoryId, price.
 */
export function attachOfferInfo<
  T extends {
    id: string;
    brandId: string;
    categoryId: string;
    price: number;
    onSale: boolean;
    salePrice: number | null;
  },
>(
  product: T,
  activeOffers: ResolveableOffer[],
): T & { appliedOffer: { id: string; title: string } | null } {
  const resolved = resolveBestOfferForProduct(activeOffers, product);

  if (resolved) {
    return {
      ...product,
      onSale: true,
      salePrice: resolved.discountedPrice,
      appliedOffer: { id: resolved.offer.id, title: resolved.offer.title },
    };
  }

  return {
    ...product,
    appliedOffer: null,
  };
}