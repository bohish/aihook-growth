import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/lib/i18n";

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const nav = [
    { to: "/" as const, label: t("navHome") },
    { to: "/dashboard" as const, label: t("navAnalysis") },
    { to: "/history" as const, label: t("navHistory") },
    { to: "/pricing" as const, label: t("navPricing") },
  ];

  return (
    <div className="flex min-h-screen min-w-0 flex-col overflow-x-hidden">
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4">
          <Link to="/" className="text-xl font-bold leading-none [direction:ltr]">
            HOOK
          </Link>

          <nav className="ms-auto hidden items-center gap-1 md:flex">
            {nav.map((item) => (
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

          <div className="ms-auto flex items-center gap-2 md:ms-0">
            {user ? (
              <Button variant="ghost" size="sm" onClick={() => void signOut()}>
                {t("signOut")}
              </Button>
            ) : (
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link to="/auth">{t("signIn")}</Link>
              </Button>
            )}
            <Button asChild size="sm">
              <Link to="/connect">{t("analyzeAccount")}</Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setLanguage(language === "ar" ? "en" : "ar")} aria-label={language === "ar" ? "English" : "العربية"}>
              {language === "ar" ? "EN" : "AR"}
            </Button>
            <button
              type="button"
              aria-label={t("menu")}
              onClick={() => setOpen((v) => !v)}
              className="p-2 text-muted-foreground transition-colors hover:text-foreground md:hidden"
            >
              <Menu className="size-5" />
            </button>
          </div>
        </div>

        {open ? (
          <nav className="grid gap-1 border-t border-border px-4 py-3 md:hidden">
            {nav.map((item) => (
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
                {language === "ar" ? "دخول / إنشاء حساب" : "Sign in / Create account"}
              </Link>
            ) : null}
          </nav>
        ) : null}
      </header>

      <main className="min-w-0 flex-1">{children}</main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} HOOK — {t("footer")}</p>
          <nav className="flex items-center gap-4">
            <Link to="/terms" className="transition-colors hover:text-foreground">
              {t("terms")}
            </Link>
            <Link to="/privacy" className="transition-colors hover:text-foreground">
              {t("privacy")}
            </Link>
          </nav>
          <p className="sm:ms-auto">
            {t("footerNote")}
          </p>
        </div>
      </footer>
    </div>
  );
}
