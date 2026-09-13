import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Minus } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";

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

function Pricing() {
  const { pick } = useLanguage();
  const plans = [
    { name: pick("مجاني", "Free"), price: "0", note: pick("للتجربة والتقييم السريع", "For a quick evaluation"), features: [[pick("درجة الحساب 0–100", "Account score 0–100"), true], [pick("محاور الأداء الأربعة", "Four performance dimensions"), true], [pick("3 توصيات", "3 recommendations"), true], [pick("خطة محتوى 7 أيام", "7-day content plan"), false], [pick("سجل ومقارنة التقارير", "Report history and comparison"), false]] as const, cta: pick("ابدأ الآن", "Start now"), to: "/connect" as const, highlight: false },
    { name: "Pro", price: pick("قريباً", "Coming soon"), note: pick("للحسابات والمتاجر الجادة في النمو", "For creators and businesses serious about growth"), features: [[pick("التحليل الكامل لكل الفيديوهات", "Full analysis for every video"), true], [pick("بصمة المحتوى بالتفصيل", "Detailed content DNA"), true], [pick("5 توصيات مع الدليل والإجراء", "5 evidence-based recommendations"), true], [pick("خطة محتوى 7 أيام", "7-day content plan"), true], [pick("سجل ومقارنة التقارير", "Report history and comparison"), true]] as const, cta: pick("إنشاء حساب", "Create account"), to: "/auth" as const, highlight: true },
  ];
  return (
    <AppShell>
      <div className="mx-auto w-full max-w-4xl px-4 py-12">
        <h1 className="text-2xl font-bold sm:text-3xl">{pick("الأسعار", "Pricing")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {pick("الدفع غير مفعّل حالياً — الخطة الاحترافية تُفتح عند إطلاق الاشتراكات", "Payments are not active yet — Pro will open when subscriptions launch")}
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`panel p-6 ${plan.highlight ? "border-primary/45" : ""}`}
            >
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">{plan.name}</h2>
                {plan.highlight ? <Badge className="bg-primary text-primary-foreground">{pick("الأكثر قيمة", "Best value")}</Badge> : null}
              </div>
              <p className="mt-3 text-3xl font-bold accent-text">{plan.price}</p>
              <p className="mt-1 text-xs text-muted-foreground">{plan.note}</p>

              <ul className="mt-5 grid gap-2 text-sm">
                {plan.features.map((f) => (
                  <li
                    key={f[0]}
                    className={`flex items-center gap-2 ${f[1] ? "" : "text-muted-foreground/70"}`}
                  >
                    {f[1] ? (
                      <Check className="size-4 accent-text" />
                    ) : (
                      <Minus className="size-4 text-muted-foreground" />
                    )}
                    {f[0]}
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
