import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";

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
  return (
    <AppShell>
      <section className="border-b border-border">
        <div className="mx-auto grid min-h-[calc(100svh-4rem)] w-full max-w-6xl content-center gap-12 px-4 py-16 md:grid-cols-[1.15fr_0.85fr] md:items-center md:gap-20 md:py-20">
          <div aria-hidden="true" className="select-none text-[clamp(7rem,22vw,19rem)] font-bold leading-[0.72] text-foreground [direction:ltr]">
            HOOK
          </div>
          <div className="border-t border-border pt-8 md:border-t-0 md:border-r md:pr-10">
            <p className="text-xs text-muted-foreground">تحليل أول 5 ثوانٍ</p>
            <h1 className="mt-5 text-4xl font-bold leading-[1.3] sm:text-5xl">
              اعرف لماذا يتوقف المشاهد.
            </h1>
            <p className="mt-5 max-w-md text-base leading-8 text-muted-foreground">
              HOOK يحلّل بداية فيديوهاتك ويحوّلها إلى قرار واضح: استمر، عدّل، أو تجنّب.
            </p>
            <Button asChild size="lg" className="mt-8 h-12 px-6 text-base">
              <Link to="/connect">
                حلّل حسابي
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
