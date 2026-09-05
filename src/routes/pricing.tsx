import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Minus } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "الأسعار — TikTok Growth AI" },
      { name: "description", content: "خطة مجانية للدرجة و3 نتائج، وخطة Pro للتحليل الكامل وخطة الأسبوع والسجل." },
      { property: "og:title", content: "أسعار TikTok Growth AI" },
      { property: "og:description", content: "ابدأ مجاناً، وارفع للخطة الاحترافية عند الحاجة." },
    ],
  }),
  component: Pricing,
});

const PLANS = [
  {
    name: "مجاني",
    price: "0",
    note: "للتجربة والتقييم السريع",
    features: [
      { label: "درجة الحساب 0–100", on: true },
      { label: "محاور الأداء الأربعة", on: true },
      { label: "3 توصيات", on: true },
      { label: "خطة محتوى 7 أيام", on: false },
      { label: "سجل ومقارنة التقارير", on: false },
    ],
    cta: "ابدأ الآن",
    to: "/connect" as const,
    highlight: false,
  },
  {
    name: "Pro",
    price: "قريباً",
    note: "للحسابات والمتاجر الجدية في النمو",
    features: [
      { label: "التحليل الكامل لكل الفيديوهات", on: true },
      { label: "بصمة المحتوى بالتفصيل", on: true },
      { label: "5 توصيات مع الدليل والإجراء", on: true },
      { label: "خطة محتوى 7 أيام", on: true },
      { label: "سجل ومقارنة التقارير", on: true },
    ],
    cta: "إنشاء حساب",
    to: "/auth" as const,
    highlight: true,
  },
];

function Pricing() {
  return (
    <AppShell>
      <div className="mx-auto w-full max-w-4xl px-4 py-12">
        <h1 className="text-2xl font-bold sm:text-3xl">الأسعار</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          الدفع غير مفعّل حالياً — الخطة الاحترافية تُفتح عند إطلاق الاشتراكات.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {PLANS.map((plan) => (
            <article
              key={plan.name}
              className={`panel p-6 ${plan.highlight ? "border-primary/45" : ""}`}
            >
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">{plan.name}</h2>
                {plan.highlight ? <Badge className="bg-primary text-primary-foreground">الأكثر قيمة</Badge> : null}
              </div>
              <p className="mt-3 text-3xl font-bold accent-text">{plan.price}</p>
              <p className="mt-1 text-xs text-muted-foreground">{plan.note}</p>

              <ul className="mt-5 grid gap-2 text-sm">
                {plan.features.map((f) => (
                  <li
                    key={f.label}
                    className={`flex items-center gap-2 ${f.on ? "" : "text-muted-foreground/70"}`}
                  >
                    {f.on ? (
                      <Check className="size-4 accent-text" />
                    ) : (
                      <Minus className="size-4 text-muted-foreground" />
                    )}
                    {f.label}
                  </li>
                ))}
              </ul>

              <Button asChild className="mt-6 h-11 w-full" variant={plan.highlight ? "default" : "outline"}>
                <Link to={plan.to}>{plan.cta}</Link>
              </Button>
            </article>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
