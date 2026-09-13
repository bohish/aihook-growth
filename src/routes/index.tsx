import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HOOK — تحليل هوك فيديوهات TikTok" },
      {
        name: "description",
        content:
          "حلّل أول خمس ثوانٍ من فيديوهات TikTok واعرف ما يجذب الانتباه وما يحتاج إلى تعديل.",
      },
      { property: "og:title", content: "HOOK — تحليل هوك فيديوهات TikTok" },
      {
        property: "og:description",
        content: "تحليل واضح لأول خمس ثوانٍ من فيديوهاتك مع توصيات عملية.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { language, pick } = useLanguage();
  return (
    <AppShell>
      <section className="border-b border-border">
        <div className="mx-auto grid min-h-[calc(100svh-4rem)] w-full max-w-6xl content-center gap-12 px-4 py-16 md:grid-cols-[1.15fr_0.85fr] md:items-center md:gap-20 md:py-20">
          <div aria-hidden="true" className="select-none text-[clamp(7rem,22vw,19rem)] font-bold leading-[0.72] text-foreground [direction:ltr]">
            HOOK
          </div>
          <div className="border-t border-border pt-8 md:border-t-0 md:border-r md:pr-10">
             <p className="text-xs text-muted-foreground">{pick("تحليل أول 5 ثوانٍ", "First 5 seconds analysis")}</p>
            <h1 className="mt-5 text-4xl font-bold leading-[1.3] sm:text-5xl">
               {pick("اعرف لماذا يتوقف المشاهد", "Know why viewers stop")}
            </h1>
            <p className="mt-5 max-w-md text-base leading-8 text-muted-foreground">
               {pick("HOOK يحلّل بداية فيديوهاتك ويحوّلها إلى قرار واضح: استمر، عدّل، أو تجنّب", "HOOK analyzes the opening of your videos and turns it into a clear decision: continue, improve, or avoid")}
            </p>
            <Button asChild size="lg" className="mt-8 h-12 px-6 text-base">
              <Link to="/connect">
                 {pick("حلّل حسابي", "Analyze my account")}
                 <ArrowLeft className={`size-4 ${language === "en" ? "rotate-180" : ""}`} />
              </Link>
            </Button>
          </div>
        </div>
      </section>

       <section className="border-b border-border">
        <div className="mx-auto w-full max-w-6xl px-4 py-16">
          <h2 className="text-2xl font-bold">HOOK</h2>
          <p className="mt-3 max-w-xl text-base text-muted-foreground">
             {pick("منصة تحليلات TikTok لصنّاع المحتوى والأعمال", "TikTok analytics platform for creators and businesses")}
          </p>

          <div className="mt-12 grid gap-10 md:grid-cols-3">
            <div>
               <h3 className="text-sm font-semibold uppercase tracking-wide">{pick("ماذا يقدم HOOK", "What HOOK does")}</h3>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                 {[pick("تحليل أداء حساب TikTok", "Analyze TikTok account performance"), pick("تحليل أداء الفيديو", "Analyze video performance"), pick("تحديد الهوكات القوية", "Identify strong hooks"), pick("توصيات للمحتوى", "Content recommendations"), pick("خطط تسويق أسبوعية", "Weekly marketing plans")].map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>

            <div>
               <h3 className="text-sm font-semibold uppercase tracking-wide">{pick("كيف يعمل", "How it works")}</h3>
              <ol className="mt-4 space-y-2 text-sm text-muted-foreground">
                 <li>{pick("١ — اربط حساب TikTok", "1 — Connect your TikTok account")}</li>
                 <li>{pick("٢ — نحلل البيانات التي صرّحت بها", "2 — We analyze the data you authorized")}</li>
                 <li>{pick("٣ — استلم الرؤى والتوصيات", "3 — Receive insights and recommendations")}</li>
              </ol>
            </div>

            <div>
               <h3 className="text-sm font-semibold uppercase tracking-wide">{pick("عن HOOK", "About HOOK")}</h3>
              <p className="mt-4 text-sm text-muted-foreground">
                 {pick("HOOK منتج تحليلات رقمي مقره المملكة العربية السعودية", "HOOK is a digital analytics product based in Saudi Arabia")}
              </p>
              <p className="mt-4 text-sm text-muted-foreground">
                 {pick("التواصل", "Contact")}: {" "}
                <a href="mailto:contact@aihook.store" className="text-foreground underline">
                  contact@aihook.store
                </a>
              </p>
              <p className="mt-4 flex gap-4 text-sm">
                <Link to="/privacy" className="text-foreground underline">
                   {pick("سياسة الخصوصية", "Privacy Policy")}
                </Link>
                <Link to="/terms" className="text-foreground underline">
                   {pick("شروط الاستخدام", "Terms of Service")}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
