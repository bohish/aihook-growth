import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "شروط الاستخدام — TikTok Growth AI" },
      {
        name: "description",
        content:
          "Terms of Service for TikTok Growth AI: acceptable use, TikTok OAuth connection, service limitations, and contact.",
      },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "شروط الاستخدام — TikTok Growth AI" },
      {
        property: "og:description",
        content: "شروط استخدام خدمة تحليل حساب TikTok: الاستخدام المقبول، الربط عبر OAuth، وحدود الخدمة.",
      },
    ],
  }),
  component: TermsPage,
});

function Ar({ children }: { children: React.ReactNode }) {
  return <div dir="rtl" className="space-y-3 text-right">{children}</div>;
}

function En({ children }: { children: React.ReactNode }) {
  return (
    <div dir="ltr" className="space-y-3 rounded-xl border border-border/60 bg-secondary/30 p-4 text-left text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function Section({ title, ar, en }: { title: string; ar: React.ReactNode; en: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <Ar>{ar}</Ar>
      <En>{en}</En>
    </section>
  );
}

function TermsPage() {
  return (
    <AppShell>
      <div className="mx-auto w-full max-w-3xl px-4 py-12">
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-foreground">شروط الاستخدام · Terms of Service</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            آخر تحديث: سبتمبر 2026 · Last updated: September 2026
          </p>
        </header>

        <div className="space-y-10 text-sm leading-7 text-foreground/90">
          <Section
            title="١. الخدمة · The Service"
            ar={
              <p>
                يوفّر TikTok Growth AI (اسم مبدئي) تحليلًا لحساب TikTok الخاص بك بعد ربطه
                بموافقتك، ويقدّم درجات أداء وتوصيات وخطة محتوى أسبوعية لأغراض إرشادية. الخدمة
                غير تابعة لشركة TikTok ولا ترعاها.
              </p>
            }
            en={
              <p>
                TikTok Growth AI (working name) analyzes your own TikTok account after you
                connect it with your consent, and provides performance scores, recommendations,
                and a weekly content plan for advisory purposes. The service is independent and
                is not affiliated with or endorsed by TikTok.
              </p>
            }
          />

          <Section
            title="٢. الأهلية والحساب · Eligibility & Account"
            ar={
              <p>
                يجب أن تكون مالك حساب TikTok الذي تربطه أو مخوّلًا بإدارته. أنت مسؤول عن
                سرية بيانات دخولك إلى الخدمة وعن كل نشاط يتم عبر حسابك.
              </p>
            }
            en={
              <p>
                You must own the TikTok account you connect or be authorized to manage it. You
                are responsible for keeping your sign-in credentials confidential and for all
                activity under your account.
              </p>
            }
          />

          <Section
            title="٣. الربط عبر TikTok OAuth · TikTok OAuth Connection"
            ar={
              <>
                <p>
                  يتم الربط حصريًا عبر شاشة التفويض الرسمية من TikTok وبالصلاحيات التي تعرضها
                  تلك الشاشة (user.info.basic و user.info.stats و video.list). لا نطلب ولا
                  نخزّن كلمة مرور TikTok الخاصة بك.
                </p>
                <p>
                  بإتمامك التفويض تقرّ بموافقتك على جلب البيانات الموضحة في سياسة الخصوصية،
                  ويمكنك سحب الموافقة في أي وقت بفصل الحساب.
                </p>
              </>
            }
            en={
              <p>
                Connection happens exclusively through TikTok's official authorization screen
                with the scopes shown there (user.info.basic, user.info.stats, video.list). We
                never request or store your TikTok password. By completing authorization you
                consent to the data access described in the Privacy Policy, and you may withdraw
                consent at any time by disconnecting.
              </p>
            }
          />

          <Section
            title="٤. الاستخدام المقبول · Acceptable Use"
            ar={
              <p>
                توافق على عدم: إساءة استخدام الخدمة أو محاولة الوصول لبيانات مستخدمين آخرين،
                أو استخدامها بطريقة تخالف شروط TikTok أو الأنظمة المعمول بها، أو إعادة بيع
                التحليلات كخدمة دون إذن كتابي.
              </p>
            }
            en={
              <p>
                You agree not to misuse the service, attempt to access other users' data, use it
                in violation of TikTok's terms or applicable laws, or resell the analytics as a
                service without written permission.
              </p>
            }
          />

          <Section
            title="٥. حدود الخدمة وإخلاء المسؤولية · Limitations & Disclaimer"
            ar={
              <p>
                التحليل مبني فقط على البيانات التي توفرها واجهة TikTok الرسمية، وقد تتغير
                دقة النتائج بتغيّر تلك الواجهة أو صلاحياتها. التوصيات إرشادية ولا نضمن نتائج
                محددة. تُقدَّم الخدمة «كما هي» ضمن الحدود التي يسمح بها النظام.
              </p>
            }
            en={
              <p>
                Analysis relies solely on data provided by the official TikTok API, and accuracy
                may change if that API or its scopes change. Recommendations are advisory and no
                specific outcomes are guaranteed. The service is provided "as is" to the extent
                permitted by law.
              </p>
            }
          />

          <Section
            title="٦. الإنهاء · Termination"
            ar={
              <p>
                يمكنك التوقف عن استخدام الخدمة وفصل حساب TikTok في أي وقت. ويجوز لنا تعليق
                الوصول عند إساءة الاستخدام أو مخالفة هذه الشروط.
              </p>
            }
            en={
              <p>
                You may stop using the service and disconnect your TikTok account at any time. We
                may suspend access in cases of misuse or breach of these terms.
              </p>
            }
          />

          <Section
            title="٧. التواصل · Contact"
            ar={
              <p>
                للاستفسارات حول هذه الشروط:{" "}
                <span dir="ltr" className="text-primary">
                  support@growthpulseai.app
                </span>
              </p>
            }
            en={<p>For questions about these terms: support@growthpulseai.app</p>}
          />
        </div>
      </div>
    </AppShell>
  );
}
