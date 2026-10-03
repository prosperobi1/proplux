import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

const MAX_BYTES = { logo: 4 * 1024 * 1024, product: 64 * 1024 * 1024 };

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
 * Local upload storage: files land in ./uploads (brand/ for the admin logo,
 * products/ for seller deliverables) and are served through /api/files/[seg],
 * which enforces access control for product files.
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

    const id = crypto.randomBytes(8).toString("hex");
    const { base, ext } = safeName(file.name);
    const finalExt = ext || MIME_EXT[file.type] || "bin";

    const dir = path.join(
      process.cwd(),
      "uploads",
      kind === "logo" ? "brand" : "products"
    );
    await fs.mkdir(dir, { recursive: true });

    const name =
      kind === "logo" ? `${id}.${finalExt}` : `${id}__${base}.${finalExt}`;
    const buf = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(path.join(dir, name), buf, { flag: "wx" });

    const url = `/api/files/${kind === "logo" ? "brand" : "products"}/${name}`;
    return NextResponse.json({ url });
  } catch (error) {
    return NextResponse.json(
      { error: "Upload failed", details: String(error) },
      { status: 500 }
    );
  }
}
