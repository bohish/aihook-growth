import { FlaskConical } from "lucide-react";

/** Always shown when the data is not a real, token-backed TikTok account. */
export function DemoBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-warning/40 bg-warning/10 px-2.5 py-1 text-[11px] font-medium text-warning ${className}`}
    >
      <FlaskConical className="size-3" />
      بيانات تجريبية
    </span>
  );
}
