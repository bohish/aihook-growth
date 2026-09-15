import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Lock,
  RefreshCw,
  ServerCog,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useConnection } from "@/hooks/useConnection";
import { CONNECTION_LABELS_AR, CONNECTION_LABELS_EN, TIKTOK_NOT_REQUESTED_AR, TIKTOK_NOT_REQUESTED_EN, TIKTOK_PERMISSIONS_AR, TIKTOK_PERMISSIONS_EN } from "@/lib/tiktok-copy";
import { useLanguage } from "@/lib/i18n";
import { disconnectTikTok, startTikTokOAuth } from "@/lib/tiktok.functions";
import { startTikTokBusinessOAuth } from "@/lib/tiktok-business.functions";
import type { ConnectionStatus } from "@/lib/types";

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
        content: "اعرف الصلاحيات المطلوبة قبل ربط حسابك على تيك توك عبر تسجيل الدخول الرسمي.",
      },
      { property: "og:title", content: "ربط حساب TikTok" },
      { property: "og:description", content: "صلاحيات محدودة وواضحة، والتوكن يُخزّن مشفّراً على الخادم فقط." },
    ],
  }),
  component: ConnectPage,
});

const TONE: Record<ConnectionStatus, { icon: typeof XCircle; tone: string }> = {
  disconnected: { icon: XCircle, tone: "text-muted-foreground" },
  connecting: { icon: Loader2, tone: "accent-text" },
  connected: { icon: CheckCircle2, tone: "text-success" },
  expired: { icon: RefreshCw, tone: "text-warning" },
  missing_credentials: { icon: ServerCog, tone: "text-warning" },
  permission_denied: { icon: AlertTriangle, tone: "text-destructive" },
  api_error: { icon: AlertTriangle, tone: "text-destructive" },
};

const REASON_AR: Record<string, string> = {
  invalid_state: "فشل التحقق من طلب الربط، ابدأ الربط من جديد",
  missing_code: "لم يُرجع TikTok رمز التفويض، أعد المحاولة",
  permission_denied: "تم رفض الصلاحيات في صفحة TikTok، أعد الربط ووافق على الصلاحيات الثلاث",
  missing_credentials: "بيانات تطبيق TikTok غير مهيأة على الخادم بعد",
  api_error: "تعذّر إكمال الربط بسبب خطأ من واجهة TikTok",
  expired: "انتهت صلاحية طلب الربط، ابدأ من جديد",
};

function ConnectPage() {
  const { language, pick } = useLanguage();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { user } = useAuth();
  const { connection, isLoading, refetch } = useConnection();
  const [busy, setBusy] = useState(false);
  const [override, setOverride] = useState<{ status: ConnectionStatus; message?: string | undefined } | null>(null);

  useEffect(() => {
    if (search.state === "error") {
      const reason = search.reason ?? "api_error";
      const status: ConnectionStatus =
        reason === "permission_denied"
          ? "permission_denied"
          : reason === "missing_credentials"
            ? "missing_credentials"
            : "api_error";
       setOverride({ status, message: REASON_AR[reason] ?? pick("تعذّر إكمال الربط", "Connection could not be completed") });
    }
   }, [search.state, search.reason, pick]);

  const state = override ?? connection;
  const status = state.status;
  const message = "message" in state ? state.message : undefined;
  const ui = TONE[status];

  const connect = async () => {
    if (!user) {
      void navigate({ to: "/auth" });
      return;
    }
    setBusy(true);
    setOverride({ status: "connecting" });
    try {
      const result = await startTikTokOAuth();
      if (result.ok && result.authorizationUrl) {
        window.location.href = result.authorizationUrl;
        return;
      }
      setOverride({ status: result.status, message: result.message });
       toast.error((result.message ?? pick("تعذّر بدء الربط", "Connection could not start")).replaceAll(".", ""));
    } catch {
       setOverride({ status: "api_error", message: pick("تعذّر بدء عملية الربط", "Connection could not start") });
       toast.error(pick("تعذّر بدء عملية الربط", "Connection could not start"));
    } finally {
      setBusy(false);
    }
  };

  const connectBusiness = async () => {
    if (!user) {
      void navigate({ to: "/auth" });
      return;
    }
    setBusy(true);
    try {
      const result = await startTikTokBusinessOAuth();
      if (result.ok && result.authorizationUrl) {
        window.location.href = result.authorizationUrl;
        return;
      }
      toast.error((result.message ?? pick("تعذّر بدء الربط", "Connection could not start")).replaceAll(".", ""));
    } catch {
      toast.error(pick("تعذّر بدء عملية الربط", "Connection could not start"));
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    try {
      await disconnectTikTok();
      setOverride(null);
      await refetch();
       toast.success(pick("تم فصل الحساب", "Account disconnected"));
    } catch {
       toast.error(pick("تعذّر فصل الحساب", "Account could not be disconnected"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-3xl px-4 py-12">
        <div className="panel p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
             <h1 className="text-xl font-bold sm:text-2xl">{pick("ربط حساب TikTok", "Connect TikTok account")}</h1>
            <span className={`inline-flex items-center gap-2 text-sm ${ui.tone}`}>
              <ui.icon
                className={`size-4 ${status === "connecting" || isLoading ? "animate-spin" : ""}`}
              />
               {(language === "ar" ? CONNECTION_LABELS_AR : CONNECTION_LABELS_EN)[status]}
            </span>
          </div>

          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
             {pick("سيتم تحويلك إلى صفحة TikTok الرسمية، ولا نطلب اسم المستخدم أو كلمة المرور، ويُخزّن التوكن مشفّراً على الخادم فقط", "You will be redirected to TikTok's official page, and we never ask for your username or password, while tokens remain encrypted on the server")}
          </p>

          {message ? (
            <p
              className={`mt-4 rounded-lg border px-3 py-2 text-xs ${
                status === "permission_denied" || status === "api_error"
                  ? "border-destructive/40 bg-destructive/10 text-destructive"
                  : "border-warning/40 bg-warning/10 text-warning"
              }`}
            >
              {message}
            </p>
          ) : null}

          {status === "missing_credentials" ? (
            <div className="mt-4 rounded-xl border border-warning/40 bg-warning/8 p-4 text-xs leading-relaxed text-warning">
               {pick("الربط الرسمي يحتاج إضافة", "Official connection requires")} <span dir="ltr">TIKTOK_CLIENT_KEY</span> {pick("و", "and")} <span dir="ltr">TIKTOK_CLIENT_SECRET</span> {pick("في إعدادات المشروع ← الأسرار، والتحليل يعمل على بيانات حقيقية فقط", "in Project Settings → Secrets, and analysis uses real data only")}
            </div>
          ) : null}

           <h2 className="mt-8 text-sm font-semibold">{pick("الصلاحيات المطلوبة", "Required permissions")}</h2>
          <ul className="mt-3 grid gap-3">
             {(language === "ar" ? TIKTOK_PERMISSIONS_AR : TIKTOK_PERMISSIONS_EN).map((p) => (
              <li key={p.title} className="flex gap-3 rounded-xl border border-border bg-surface/60 p-4">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 accent-text" />
                <div>
                  <p className="text-sm font-medium">{p.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{p.detail}</p>
                </div>
              </li>
            ))}
          </ul>

           <h2 className="mt-8 text-sm font-semibold">{pick("ما لا نطلبه ولا نعرضه", "What we do not request or show")}</h2>
          <ul className="mt-3 grid gap-2">
             {(language === "ar" ? TIKTOK_NOT_REQUESTED_AR : TIKTOK_NOT_REQUESTED_EN).map((t) => (
              <li key={t} className="flex items-center gap-2 text-xs text-muted-foreground">
                <Lock className="size-3.5 shrink-0" />
                {t}
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              className="h-12 flex-1 text-base"
              disabled={busy || status === "missing_credentials"}
              onClick={() => void connect()}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
               {status === "connected" || status === "expired" ? pick("إعادة ربط الحساب", "Reconnect account") : pick("ربط حساب TikTok", "Connect TikTok account")}
            </Button>
            <Button
              variant="outline"
              className="h-12 flex-1 text-base"
              disabled={busy}
              onClick={() => void connectBusiness()}
            >
              {pick("ربط TikTok for Business", "Connect TikTok for Business")}
            </Button>
            {status === "connected" ? (
              <>
                <Button asChild variant="outline" className="h-12 flex-1 text-base">
                   <Link to="/analyzing">{pick("تحليل حسابي الآن", "Analyze my account now")}</Link>
                </Button>
                <Button
                  variant="outline"
                  className="h-12 text-base"
                  disabled={busy}
                  onClick={() => void disconnect()}
                >
                   {pick("فصل الحساب", "Disconnect")}
                </Button>
              </>
            ) : null}
          </div>

          {!user ? (
            <p className="mt-6 text-xs text-muted-foreground">
               {pick("يلزم", "You need to")} {" "}
              <Link to="/auth" className="accent-text underline-offset-4 hover:underline">
                 {pick("تسجيل الدخول", "sign in")}
              </Link>{" "}
               {pick("أولاً لربط حساب TikTok وحفظ التحليلات بأمان", "first to connect TikTok and save analyses securely")}
            </p>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
