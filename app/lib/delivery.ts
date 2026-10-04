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
