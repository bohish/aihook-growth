import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const NAV = [
  { to: "/", label: "الرئيسية" },
  { to: "/dashboard", label: "التحليل" },
  { to: "/history", label: "السجل" },
  { to: "/pricing", label: "الأسعار" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { user, signOut } = useAuth();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4">
          <Link to="/" className="text-xl font-bold leading-none [direction:ltr]">
            HOOK
          </Link>

          <nav className="mr-auto hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="border-b border-transparent px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
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
              className="p-2 text-muted-foreground transition-colors hover:text-foreground md:hidden"
            >
              <Menu className="size-5" />
            </button>
          </div>
        </div>

        {open ? (
          <nav className="grid gap-1 border-t border-border px-4 py-3 md:hidden">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="border-b border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
            {!user ? (
               <Link to="/auth" onClick={() => setOpen(false)} className="border-b border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
                دخول / إنشاء حساب
              </Link>
            ) : null}
          </nav>
        ) : null}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} HOOK — غير مرتبط بشركة TikTok.</p>
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
