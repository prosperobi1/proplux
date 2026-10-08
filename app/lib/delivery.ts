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

/**
 * Credentials delivery only makes sense when the category defines at least
 * one non-public field (visible !== true) — otherwise the "delivery" is
 * exactly what everyone already sees on the listing. Accepts the category's
 * `fields` JSON string or an already-parsed array.
 */
export function categoryHasHiddenFields(fields: unknown): boolean {
  let defs: unknown = fields;
  if (typeof fields === "string") {
    try {
      defs = JSON.parse(fields);
    } catch {
      return false;
    }
  }
  if (!Array.isArray(defs)) return false;
  return defs.some(
    (f) => !!f && typeof f === "object" && (f as { visible?: unknown }).visible !== true
  );
}

export const CREDENTIALS_NO_HIDDEN_ERROR =
  "This category has no hidden fields, so credentials delivery would send nothing new. Use Text List delivery, or add hidden fields to the category in Admin → Categories.";

/**
 * Names of required category fields that are missing/blank in metadata.
 * `price` is skipped — it lives in its own column and is validated there.
 */
export function missingRequiredFields(
  metadata: Record<string, unknown> | null | undefined,
  fieldDefs: Array<{ name: string; required?: boolean }>
): string[] {
  const meta = metadata || {};
  const missing: string[] = [];
  for (const f of fieldDefs) {
    if (!f.required || f.name === "price") continue;
    const v = meta[f.name];
    if (v === undefined || v === null || String(v).trim() === "") missing.push(f.name);
  }
  return missing;
}
