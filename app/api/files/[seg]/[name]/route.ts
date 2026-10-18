import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createReadStream, promises as fsp } from "fs";
import { Readable } from "stream";
import path from "path";
import { get } from "@vercel/blob";

const NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,180}$/;

const TYPES: Record<string, string> = {
  zip: "application/zip",
  rar: "application/vnd.rar",
  "7z": "application/x-7z-compressed",
  pdf: "application/pdf",
  txt: "text/plain; charset=utf-8",
  csv: "text/csv; charset=utf-8",
  json: "application/json",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
};

/**
 * Serves stored uploads (Vercel Blob when configured, ./uploads on disk
 * otherwise). The brand logo is public; product files are the paid
 * deliverable and follow the same rule as /api/products/[id]: only the
 * listing's seller, an admin, or a buyer who purchased the product.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ seg: string; name: string }> }
) {
  try {
    const { seg, name } = await params;
    if (
      (seg !== "brand" && seg !== "products") ||
      !NAME_RE.test(name) ||
      name.includes("..")
    ) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (seg === "products") {
      const session = await auth();
      const me = session?.user as { id?: string; role?: string } | undefined;
      if (!me?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const product = await prisma.product.findFirst({
        where: { fileUrl: `/api/files/products/${name}` },
        select: { id: true, sellerId: true },
      });
      if (!product) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      const canDownload =
        me.role === "ADMIN" ||
        product.sellerId === me.id ||
        (await prisma.order.findFirst({
          where: { productId: product.id, buyerId: me.id },
          select: { id: true },
        })) !== null;
      if (!canDownload) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const ext = name.includes(".") ? name.split(".").pop()!.toLowerCase() : "";
    const type = TYPES[ext] || "application/octet-stream";

    // Original filename is preserved after the random id prefix.
    const m = /^[a-f0-9]+__(.+)$/.exec(name);
    const original = m ? m[1] : name;

    const disposition =
      seg === "brand"
        ? `inline; filename="${original}"`
        : `attachment; filename="${original}"`;
    const cache = seg === "brand" ? "public, max-age=3600" : "private, no-store";

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      let result;
      try {
        result = await get(`${seg}/${name}`, { access: "public" });
      } catch {
        result = null;
      }
      if (!result || result.statusCode !== 200 || !result.stream) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return new Response(result.stream, {
        headers: {
          "Content-Type": type,
          "Content-Length": String(result.blob.size),
          "Content-Disposition": disposition,
          "Cache-Control": cache,
        },
      });
    }

    const dir = path.join(process.cwd(), "uploads", seg);
    const filePath = path.resolve(dir, name);
    if (!filePath.startsWith(dir + path.sep)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    let stat;
    try {
      stat = await fsp.stat(filePath);
    } catch {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!stat.isFile()) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const stream = Readable.toWeb(
      createReadStream(filePath)
    ) as unknown as ReadableStream;
    return new Response(stream, {
      headers: {
        "Content-Type": type,
        "Content-Length": String(stat.size),
        "Content-Disposition": disposition,
        "Cache-Control": cache,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Server error", details: String(error) },
      { status: 500 }
    );
  }
}
