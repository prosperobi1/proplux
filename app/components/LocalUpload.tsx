"use client";

import { useRef, useState } from "react";
import { minVisible } from "@/lib/ui";
import { Loader2 } from "lucide-react";

type Kind = "logo" | "product";

/**
 * Local-storage upload control: picks a file, POSTs it to /api/uploads
 * (stored under ./uploads and served through /api/files) and hands the
 * resulting URL back to the caller.
 */
export function LocalUpload({
  kind,
  accept,
  onUploaded,
  onError,
  label = "Upload file",
  hint,
  className = "rounded-md bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50",
}: {
  kind: Kind;
  accept?: string;
  onUploaded: (url: string) => void;
  onError?: (msg: string) => void;
  label?: string;
  hint?: string;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErr("");
    const vis = minVisible();
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("kind", kind);
      fd.set("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Upload failed (${res.status})`);
      onUploaded(data.url);
    } catch (e2) {
      const msg = String((e2 as Error)?.message || e2);
      setErr(msg);
      onError?.(msg);
    } finally {
      await vis();
      setBusy(false);
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={onChange}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className={className}
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : label}
      </button>
      {hint && !err && <p className="mt-2 text-xs text-zinc-500">{hint}</p>}
      {err && <p className="mt-2 text-xs text-red-500">{err}</p>}
    </div>
  );
}
