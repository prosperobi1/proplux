import { Check, X } from "lucide-react";

export type CheckStatus = "idle" | "loading" | "ok" | "fail";

/**
 * Uniform check result for the buyer and seller tables: a bold
 * "✓ Working" / "✗ Not working" headline with a single small supporting
 * line (the reason it failed, or the delivery hint on success).
 */
export function CheckResult({
  status,
  detail,
}: {
  status?: CheckStatus;
  detail?: string;
}) {
  if (status === "ok") {
    return (
      <div className="flex flex-col gap-0.5">
        <p className="flex items-center gap-1 text-[11px] font-semibold text-green-500">
          <Check className="h-3 w-3" /> Working
        </p>
        {detail && <p className="text-[10px] text-zinc-500">{detail}</p>}
      </div>
    );
  }
  if (status === "fail") {
    return (
      <div className="flex flex-col gap-0.5">
        <p className="flex items-center gap-1 text-[11px] font-semibold text-red-400">
          <X className="h-3 w-3" /> Not working
        </p>
        {detail && <p className="text-[10px] text-zinc-500">{detail}</p>}
      </div>
    );
  }
  return null;
}
