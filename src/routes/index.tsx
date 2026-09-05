import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Fingerprint,
  Layers,
  Link2,
  ListChecks,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import heroImage from "@/assets/hero-studio.jpg";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TikTok Growth AI — اعرف ليه حسابك ينجح وليه يتراجع" },
      {
        name: "description",
        content:
          "اربط حسابك على تيك توك، واحصل على تحليل مبني على أرقام حسابك: نقاط قوة المحتوى، أسباب تراجع المشاهدات، وخطة نمو أسبوعية.",
      },
      { property: "og:title", content: "TikTok Growth AI — تحليل نمو حساب تيك توك" },
      {
        property: "og:description",
        content: "تحليل أداء فيديوهاتك، أنماط المحتوى الرابحة، و5 توصيات مرتبة بالأثر.",
      },
    ],
  }),
  component: Landing,
});

const ANALYZES = [
  { icon: BarChart3, title: "أداء الفيديوهات", detail: "المشاهدات، الوسيط، التفاعل، والفرق بين أفضل وأضعف المقاطع." },
  { icon: Fingerprint, title: "بصمة المحتوى", detail: "أي صيغة تنجح في حسابك تحديداً: مدة المقطع، صياغة الهوك، ونوع الوصف." },
  { icon: TrendingUp, title: "اتجاه النمو", detail: "مقارنة آخر 7 و30 يوم بالفترة السابقة، ومدى اعتمادك على فيديو واحد ناجح." },
  { icon: Layers, title: "الانتظام", detail: "معدل النشر الفعلي، أطول انقطاع، وتأثيره على الوصول." },
];

const STEPS = [
  { icon: Link2, title: "اربط حسابك", detail: "عبر تسجيل دخول TikTok الرسمي، وبأقل صلاحيات ممكنة." },
  { icon: BarChart3, title: "نحلّل الأرقام", detail: "كل المقاييس تُحسب في الكود، لا تقديرات ولا أرقام مخترعة." },
  { icon: ListChecks, title: "خطة قابلة للتنفيذ", detail: "5 توصيات مرتبة + خطة محتوى 7 أيام مبنية على أدائك." },
];

const EXAMPLES = [
  {
    tone: "up" as const,
    text: "المقاطع 12–18 ثانية تحقق وسيط مشاهدات أعلى من بقية المدد في حسابك.",
  },
  {
    tone: "down" as const,
    text: "نسبة كبيرة من إجمالي مشاهداتك تأتي من ثلاثة فيديوهات فقط — نمو هشّ يعتمد على الحظ.",
  },
  {
    tone: "up" as const,
    text: "الهوك الذي يبدأ بمشكلة يحقق وسيط مشاهدات أعلى من المقدمات العامة في حسابك.",
  },
  {
    tone: "down" as const,
    text: "أطول انقطاع في النشر يظهر كأكبر سبب لانخفاض محور الاستمرارية.",
  },
];

function Landing() {
  return (
    <AppShell>
      {/* Hero */}
      <section className="grain-bg relative overflow-hidden border-b border-border/70">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 md:grid-cols-[1.05fr_0.95fr] md:items-center md:py-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5 accent-text" />
              تحليل مبني على أرقام حسابك — بدون تقديرات ديموغرافية
            </span>
            <h1 className="mt-5 text-3xl font-bold leading-[1.25] sm:text-4xl md:text-5xl">
              اعرف ليه حسابك ينجح — <span className="accent-text">وليه يتراجع</span>
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
              اربط حسابك على تيك توك، نحلّل محتواك وأداء فيديوهاتك، ونعطيك خطة نمو أسبوعية
              واضحة: وش تكرره، وش توقفه، وليش.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="h-12 px-6 text-base">
                <Link to="/connect">
                  حلّل حسابي
                  <ArrowLeft className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-6 text-base">
                <Link to="/connect">كيف يعمل الربط؟</Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              التحليل يعمل على حسابك الحقيقي فقط بعد ربط تيك توك — لا أرقام افتراضية ولا حسابات وهمية.
            </p>
          </div>

          <div className="panel overflow-hidden">
            <img
              src={heroImage}
              alt="طلة عباية في استوديو تصوير بإضاءة ذهبية — مثال لمحتوى متجر"
              width={1280}
              height={960}
              className="h-56 w-full object-cover sm:h-72 md:h-80"
            />
            <div className="grid grid-cols-3 divide-x divide-border/70 border-t border-border/70 text-center [direction:ltr]">
              {[
                { label: "درجة الحساب", value: "0–100" },
                { label: "توصيات مرتبة", value: "5" },
                { label: "خطة محتوى", value: "7 أيام" },
              ].map((s) => (
                <div key={s.label} className="px-2 py-4">
                  <p className="text-lg font-semibold accent-text">{s.value}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* What it analyzes */}
      <section className="mx-auto w-full max-w-6xl px-4 py-14">
        <h2 className="text-2xl font-bold sm:text-3xl">وش نحلّل بالضبط؟</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          نستخدم بيانات حسابك وفيديوهاتك فقط. كل رقم تراه محسوب في الكود، والذكاء الاصطناعي
          يشرح النتيجة ولا يخترع الأرقام.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ANALYZES.map((item) => (
            <article key={item.title} className="panel p-5">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary/12 accent-text">
                <item.icon className="size-4.5" />
              </span>
              <h3 className="mt-4 text-base font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.detail}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Example insights */}
      <section className="border-y border-border/70 bg-surface/50">
        <div className="mx-auto w-full max-w-6xl px-4 py-14">
          <h2 className="text-2xl font-bold sm:text-3xl">أمثلة على النتائج</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            هذه صيغ الاستنتاجات التي يخرجها التحليل — والأرقام فيها تُحسب من فيديوهاتك أنت بعد الربط.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {EXAMPLES.map((ex) => (
              <div key={ex.text} className="panel flex gap-3 p-5">
                <span
                  className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${
                    ex.tone === "up" ? "bg-success/12 text-success" : "bg-destructive/12 text-destructive"
                  }`}
                >
                  {ex.tone === "up" ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
                </span>
                <p className="text-sm leading-relaxed">{ex.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto w-full max-w-6xl px-4 py-14">
        <h2 className="text-2xl font-bold sm:text-3xl">كيف يعمل؟</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <article key={step.title} className="panel p-6">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <step.icon className="size-4.5" />
                </span>
                <span className="text-xs text-muted-foreground">الخطوة {i + 1}</span>
              </div>
              <h3 className="mt-4 text-base font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.detail}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="border-t border-border/70">
        <div className="mx-auto w-full max-w-6xl px-4 py-14">
          <div className="panel grid gap-8 p-6 md:grid-cols-[1fr_auto] md:items-center md:p-10">
            <div>
              <h2 className="text-2xl font-bold">ابدأ مجاناً</h2>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                الخطة المجانية تعطيك درجة الحساب و3 نتائج أساسية. خطة Pro تفتح التحليل الكامل،
                خطة الأسبوع، وسجل المقارنة.
              </p>
              <ul className="mt-5 grid gap-2 text-sm sm:grid-cols-2">
                {["درجة الحساب 0–100", "3 نتائج مجانية", "خطة محتوى 7 أيام (Pro)", "سجل مقارنة الدرجات (Pro)"].map(
                  (t) => (
                    <li key={t} className="flex items-center gap-2 text-muted-foreground">
                      <CheckCircle2 className="size-4 accent-text" />
                      {t}
                    </li>
                  ),
                )}
              </ul>
            </div>
            <div className="flex flex-col gap-3">
              <Button asChild size="lg" className="h-12 px-6">
                <Link to="/analyzing">حلّل حسابي الآن</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-6">
                <Link to="/pricing">
                  <CalendarDays className="size-4" />
                  تفاصيل الأسعار
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
