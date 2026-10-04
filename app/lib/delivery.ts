/**
 * A product's fileUrl is either a file we store and serve ourselves
 * (/api/files/products/...) or an externally hosted link the seller pasted
 * (MEGA / Drive / ...). Anything else — especially javascript: URLs — is
 * rejected. Shared by the seller/bulk/admin product APIs and the tool forms.
 */
export function isValidFileUrl(u: unknown): u is string {
  if (typeof u !== "string" || u.length === 0 || u.length > 2048) return false;
  if (/^https?:\/\/\S+$/i.test(u)) return true;
  return /^\/api\/files\/products\/[A-Za-z0-9][A-Za-z0-9._-]*$/.test(u);
}

/** Text List delivery content: non-empty, capped (bigger payloads should use file delivery). */
export const MAX_TEXT_CONTENT = 1_000_000; // characters

export function isValidTextContent(u: unknown): u is string {
  if (typeof u !== "string") return false;
  return u.trim().length > 0 && u.length <= MAX_TEXT_CONTENT;
}

/**
 * Purchase-time snapshot of a product's delivery data, stored on the order.
 * Buyers always receive what they paid for, even if the seller edits the
 * listing afterwards. `metadata` keeps the product's encrypted-at-rest shape.
 */
export type DeliverySnapshot = {
  deliveryType: string;
  fileUrl: string | null;
  textContent: string | null;
  metadata: Record<string, unknown> | null;
};

export function buildDeliverySnapshot(product: {
  deliveryType?: string | null;
  fileUrl?: string | null;
  textContent?: string | null;
  metadata?: string | null;
}): string {
  let metadata: Record<string, unknown> | null = null;
  if (product.metadata) {
    try {
      const parsed = JSON.parse(product.metadata);
      if (parsed && typeof parsed === "object") metadata = parsed;
    } catch {}
  }
  return JSON.stringify({
    deliveryType: product.deliveryType || "credentials",
    fileUrl: product.fileUrl ?? null,
    textContent: product.textContent ?? null,
    metadata,
  } satisfies DeliverySnapshot);
}

export function readDeliverySnapshot(order: {
  delivery?: string | null;
}): DeliverySnapshot | null {
  if (!order.delivery) return null;
  try {
    const s = JSON.parse(order.delivery);
    if (s && typeof s === "object" && typeof s.deliveryType === "string") {
      return s as DeliverySnapshot;
    }
    return null;
  } catch {
    return null;
  }
}
