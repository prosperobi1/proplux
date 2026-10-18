import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { put } from "@vercel/blob";

const MAX_BYTES = { logo: 4 * 1024 * 1024, product: 64 * 1024 * 1024 };
// Vercel serverless functions cap the request body at ~4.5MB, so above that
// the upload must go straight from the browser to Blob. Until that client
// upload exists, big files are refused with a pointer to delivery links.
const VERCEL_BODY_CAP = 4 * 1024 * 1024;

const MIME_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "application/pdf": "pdf",
  "application/zip": "zip",
  "text/plain": "txt",
};

/** Strip everything unsafe from a user-supplied filename. */
function safeName(original: string): { base: string; ext: string } {
  const cleaned = path
    .basename(original)
    .replace(/[^A-Za-z0-9._-]/g, "_")
    .replace(/^\.+/, "");
  const dot = cleaned.lastIndexOf(".");
  const base = (dot > 0 ? cleaned.slice(0, dot) : cleaned).slice(0, 80) || "file";
  const ext =
    dot > 0
      ? cleaned.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 10)
      : "";
  return { base, ext };
}

/**
 * Upload storage: files land in Vercel Blob (pathname brand/... or
 * products/...) when BLOB_READ_WRITE_TOKEN is set, otherwise in ./uploads on
 * local disk. Both are served through /api/files/[seg], which enforces access
 * control for product files.
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    const me = session?.user as { id?: string; role?: string } | undefined;
    if (!me?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return NextResponse.json(
        { error: "Expected multipart/form-data" },
        { status: 400 }
      );
    }

    const kind = form.get("kind");
    const file = form.get("file");
    if (kind !== "logo" && kind !== "product") {
      return NextResponse.json({ error: "Invalid upload kind" }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    if (kind === "logo" && me.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }
    if (kind === "product" && me.role !== "SELLER" && me.role !== "ADMIN") {
      return NextResponse.json({ error: "Seller only" }, { status: 403 });
    }

    const max = MAX_BYTES[kind];
    if (file.size > max) {
      return NextResponse.json(
        { error: `File too large (max ${Math.round(max / 1024 / 1024)}MB)` },
        { status: 413 }
      );
    }

    const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;
    if (useBlob && kind === "product" && file.size > VERCEL_BODY_CAP) {
      return NextResponse.json(
        {
          error:
            "Uploads over 4MB are not accepted here. Use a delivery link for large files.",
        },
        { status: 413 }
      );
    }

    const id = crypto.randomBytes(8).toString("hex");
    const { base, ext } = safeName(file.name);
    const finalExt = ext || MIME_EXT[file.type] || "bin";

    const seg = kind === "logo" ? "brand" : "products";
    const name =
      kind === "logo" ? `${id}.${finalExt}` : `${id}__${base}.${finalExt}`;
    const buf = Buffer.from(await file.arrayBuffer());

    if (useBlob) {
      await put(`${seg}/${name}`, buf, {
        access: "public",
        contentType: file.type || undefined,
        allowOverwrite: false,
      });
    } else {
      const dir = path.join(process.cwd(), "uploads", seg);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, name), buf, { flag: "wx" });
    }

    const url = `/api/files/${seg}/${name}`;
    return NextResponse.json({ url });
  } catch (error) {
    return NextResponse.json(
      { error: "Upload failed", details: String(error) },
      { status: 500 }
    );
  }
}
