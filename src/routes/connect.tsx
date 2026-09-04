import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, Loader2, Lock, Play, ShieldCheck, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { DemoBadge } from "@/components/DemoBadge";
import { Button } from "@/components/ui/button";
import { useConnection } from "@/hooks/useConnection";
import { startTikTokOAuth } from "@/lib/tiktok-oauth.functions";
import { TIKTOK_NOT_REQUESTED_AR, TIKTOK_PERMISSIONS_AR } from "@/services/tiktok";

interface ConnectSearch {
  state?: string;
  reason?: string;
}

export const Route = createFileRoute("/connect")({
  validateSearch: (search: Record<string, unknown>): ConnectSearch => {
    const out: ConnectSearch = {};
    if (typeof search["state"] === "string") out.state = search["state"];
    if (typeof search["reason"] === "string") out.reason = search["reason"];
    return out;
  },
  head: () => ({
    meta: [
      { title: "ربط حساب TikTok — TikTok Growth AI" },
      {
        name: "description",
        content: "اعرف الصلاحيات المطلوبة قبل ربط حسابك على تيك توك، أو جرّب التحليل بالبيانات التجريبية.",
      },
      { property: "og:title", content: "ربط حساب TikTok" },
      { property: "og:description", content: "صلاحيات محدودة وواضحة، والتوكن يُخزّن على الخادم فقط." },
    ],
  }),
  component: ConnectPage,
});

const STATUS_UI = {
  disconnected: { label: "غير مرتبط", icon: XCircle, tone: "text-muted-foreground" },
  connecting: { label: "جاري الربط…", icon: Loader2, tone: "accent-text" },
  connected: { label: "مرتبط", icon: CheckCircle2, tone: "text-success" },
  error: { label: "فشل الربط", icon: AlertTriangle, tone: "text-destructive" },
} as const;

function ConnectPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { connection, setConnection } = useConnection();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (search.state === "connected") {
      setConnection({ status: "connected", isDemo: false });
    } else if (search.state === "error") {
      setConnection({
        status: "error",
        isDemo: true,
        message: search.reason ? `تعذّر إكمال الربط (${search.reason}).` : "تعذّر إكمال الربط.",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.state, search.reason]);

  const connect = async () => {
    setBusy(true);
    setConnection({ status: "connecting", isDemo: connection.isDemo });
    try {
      const result = await startTikTokOAuth();
      if (result.configured && result.authorizationUrl) {
        window.location.href = result.authorizationUrl;
        return;
      }
      setConnection({
        status: "disconnected",
        isDemo: true,
        message: result.reason ?? "الربط الحقيقي غير مهيأ بعد.",
      });
      toast.info("التكامل الرسمي غير مهيأ بعد — سنكمل بالوضع التجريبي.");
      void navigate({ to: "/analyzing" });
    } catch {
      setConnection({ status: "error", isDemo: true, message: "تعذّر بدء الربط." });
      toast.error("تعذّر بدء عملية الربط");
    } finally {
      setBusy(false);
    }
  };

  const status = STATUS_UI[connection.status];

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-3xl px-4 py-12">
        <div className="panel p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-xl font-bold sm:text-2xl">ربط حساب TikTok</h1>
            <span className={`inline-flex items-center gap-2 text-sm ${status.tone}`}>
              <status.icon className={`size-4 ${connection.status === "connecting" ? "animate-spin" : ""}`} />
              {status.label}
            </span>
          </div>

          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            سيتم تحويلك إلى صفحة تسجيل الدخول الرسمية من TikTok. لا نرى كلمة مرورك، ويُخزّن
            التوكن على الخادم فقط ولا يظهر في المتصفح.
          </p>

          {connection.message ? (
            <p className="mt-4 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
              {connection.message}
            </p>
          ) : null}

          <h2 className="mt-8 text-sm font-semibold">الصلاحيات المطلوبة</h2>
          <ul className="mt-3 grid gap-3">
            {TIKTOK_PERMISSIONS_AR.map((p) => (
              <li key={p.title} className="flex gap-3 rounded-xl border border-border bg-surface/60 p-4">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 accent-text" />
                <div>
                  <p className="text-sm font-medium">{p.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{p.detail}</p>
                </div>
              </li>
            ))}
          </ul>

          <h2 className="mt-8 text-sm font-semibold">ما لا نطلبه</h2>
          <ul className="mt-3 grid gap-2">
            {TIKTOK_NOT_REQUESTED_AR.map((t) => (
              <li key={t} className="flex items-center gap-2 text-xs text-muted-foreground">
                <Lock className="size-3.5 shrink-0" />
                {t}
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button className="h-12 flex-1 text-base" disabled={busy} onClick={() => void connect()}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              ربط حساب TikTok
            </Button>
            <Button asChild variant="outline" className="h-12 flex-1 text-base">
              <Link to="/analyzing">
                <Play className="size-4" />
                تجربة بالبيانات التجريبية
              </Link>
            </Button>
          </div>

          <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
            <DemoBadge />
            إلى أن تُضاف بيانات تطبيق TikTok الرسمية، يعمل التحليل على حساب تجريبي خيالي.
          </div>
        </div>
      </div>
    </AppShell>
  );
}
