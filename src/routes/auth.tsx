import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, Mail, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "الدخول إلى TikTok Growth AI" },
      { name: "description", content: "أنشئ حساباً أو سجّل الدخول لحفظ تحليلاتك ومتابعة تطور حسابك." },
      { property: "og:title", content: "الدخول إلى TikTok Growth AI" },
      { property: "og:description", content: "سجّل الدخول لحفظ تقاريرك ومقارنة الدرجات عبر الوقت." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) void navigate({ to: "/connect" });
  }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/connect` },
        });
        if (error) throw error;
        toast.success("تم إنشاء الحساب. تأكد من بريدك إذا طُلب التفعيل.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("تم الدخول بنجاح");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر إكمال العملية");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("تعذّر الدخول عبر Google");
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    void navigate({ to: "/connect" });
  };

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-md px-4 py-12">
        <div className="panel p-6">
          <h1 className="text-xl font-bold">{mode === "signin" ? "تسجيل الدخول" : "إنشاء حساب"}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            حسابك يُستخدم لحفظ التقارير ومقارنة درجة حسابك عبر الوقت.
          </p>

          <form onSubmit={submit} className="mt-6 grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                required
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={busy} className="h-11">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
              {mode === "signin" ? "دخول" : "إنشاء الحساب"}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            أو
            <span className="h-px flex-1 bg-border" />
          </div>

          <Button variant="outline" className="h-11 w-full" onClick={() => void google()} disabled={busy}>
            المتابعة عبر Google
          </Button>

          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="mt-5 w-full text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {mode === "signin" ? "ما عندك حساب؟ أنشئ واحداً" : "عندك حساب؟ سجّل الدخول"}
          </button>
        </div>

        <div className="panel mt-4 flex gap-3 p-5">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 accent-text" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            تجربة التحليل متاحة بدون حساب باستخدام البيانات التجريبية. الحساب مطلوب فقط لحفظ
            السجل ومقارنة النتائج.
          </p>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          تريد التجربة أولاً؟{" "}
          <Link to="/analyzing" className="accent-text underline-offset-4 hover:underline">
            حلّل حساباً تجريبياً
          </Link>
        </p>
      </div>
    </AppShell>
  );
}
