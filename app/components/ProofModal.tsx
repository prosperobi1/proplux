"use client";

import { useState } from "react";
import { X } from "lucide-react";



export function ProofModal({
  urls,
  onClose,
}: {
  urls: string[];
  onClose: () => void;
}) {
  const [fullSize, setFullSize] = useState<string | null>(null);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">
            Proof Images · {urls.length}
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {urls.length === 0 ? (
          <p className="text-sm text-zinc-500">No proof images.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {urls.map((url, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setFullSize(url)}
                className="group relative aspect-square overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 hover:border-red-500"
              >
                <img
                  src={url}
                  alt={`Proof ${i + 1}`}
                  className="h-full w-full object-cover transition group-hover:scale-105"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect fill='%2318181b' width='100' height='100'/><text x='50' y='55' font-size='12' fill='%2371717a' text-anchor='middle'>Broken</text></svg>";
                  }}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {fullSize && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/95 p-4"
          onClick={(e) => {
            e.stopPropagation();
            setFullSize(null);
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setFullSize(null);
            }}
            className="absolute right-4 top-4 rounded p-2 text-white hover:bg-zinc-800"
            aria-label="Close full size"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={fullSize}
            alt="Proof full size"
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
