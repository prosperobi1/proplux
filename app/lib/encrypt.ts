import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const PREFIX = "ENC:";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("ENCRYPTION_KEY not set in .env");
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("ENCRYPTION_KEY must be 32 bytes (base64-encoded)");
  }
  return key;
}

/**
 * Encrypt a plaintext string. Returns "ENC:<base64>" or the original if already encrypted.
 */
export function encrypt(plaintext: string): string {
  if (!plaintext || plaintext.startsWith(PREFIX)) return plaintext;

  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  const combined = Buffer.concat([iv, tag, encrypted]);
  return PREFIX + combined.toString("base64");
}

/**
 * Decrypt a ciphertext string. Returns the plaintext. If not encrypted, returns as-is.
 */
export function decrypt(ciphertext: string): string {
  if (!ciphertext || !ciphertext.startsWith(PREFIX)) return ciphertext;

  try {
    const key = getKey();
    const combined = Buffer.from(ciphertext.slice(PREFIX.length), "base64");
    const iv = combined.subarray(0, IV_LENGTH);
    const tag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH + TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  } catch {
    // If decryption fails (wrong key, corrupt data), return the raw value
    return ciphertext;
  }
}

/**
 * Encrypt only fields marked hidden in the category's field definitions.
 */
export function encryptHiddenFields(
  metadata: Record<string, any>,
  fieldDefs: Array<{ name: string; visible?: boolean }>
): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(metadata)) {
    const def = fieldDefs.find((f) => f.name === key);
    const isHidden = def ? def.visible === false : true;
    if (isHidden && typeof value === "string") {
      result[key] = encrypt(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Decrypt all fields in metadata (safe to call on any object).
 */
export function decryptAllFields(
  metadata: Record<string, any>
): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (typeof value === "string" && value.startsWith(PREFIX)) {
      result[key] = decrypt(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}
