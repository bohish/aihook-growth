import { Link } from "@tanstack/react-router";
import { Menu, Sparkles } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const NAV = [
  { to: "/", label: "الرئيسية" },
  { to: "/dashboard", label: "لوحة التحليل" },
  { to: "/history", label: "السجل" },
  { to: "/pricing", label: "الأسعار" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { user, signOut } = useAuth();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="size-4" />
            </span>
            <span className="text-sm font-semibold leading-tight">
              TikTok Growth AI
              <span className="block text-[11px] font-normal text-muted-foreground">تحليل نمو الحساب</span>
            </span>
          </Link>

          <nav className="mr-auto hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                activeProps={{ className: "bg-secondary text-foreground" }}
                activeOptions={{ exact: item.to === "/" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mr-auto flex items-center gap-2 md:mr-0">
            {user ? (
              <Button variant="ghost" size="sm" onClick={() => void signOut()}>
                خروج
              </Button>
            ) : (
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link to="/auth">دخول</Link>
              </Button>
            )}
            <Button asChild size="sm">
              <Link to="/connect">حلّل حسابي</Link>
            </Button>
            <button
              type="button"
              aria-label="القائمة"
              onClick={() => setOpen((v) => !v)}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary md:hidden"
            >
              <Menu className="size-5" />
            </button>
          </div>
        </div>

        {open ? (
          <nav className="grid gap-1 border-t border-border/70 px-4 py-3 md:hidden">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
            {!user ? (
              <Link to="/auth" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-secondary">
                دخول / إنشاء حساب
              </Link>
            ) : null}
          </nav>
        ) : null}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border/70 py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} TikTok Growth AI — اسم مبدئي. غير مرتبط بشركة TikTok.</p>
          <nav className="flex items-center gap-4">
            <Link to="/terms" className="transition-colors hover:text-foreground">
              شروط الاستخدام
            </Link>
            <Link to="/privacy" className="transition-colors hover:text-foreground">
              سياسة الخصوصية
            </Link>
          </nav>
          <p className="sm:mr-auto">
            التحليل يعتمد على بيانات حسابك فقط، ولا يتضمن أي تقديرات ديموغرافية.
          </p>
        </div>
      </footer>
    </div>
  );
}
