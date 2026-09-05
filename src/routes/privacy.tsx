import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "سياسة الخصوصية — TikTok Growth AI" },
      {
        name: "description",
        content:
          "Privacy Policy for TikTok Growth AI: what data we collect, how we use the TikTok API, storage and security, account disconnection and deletion, and how to contact us.",
      },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "سياسة الخصوصية — TikTok Growth AI" },
      {
        property: "og:description",
        content:
          "ما البيانات التي نجمعها، وكيف نستخدم TikTok API، وكيف نحمي بياناتك ونحذفها عند الطلب.",
      },
    ],
  }),
  component: PrivacyPage,
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

function PrivacyPage() {
  return (
    <AppShell>
      <div className="mx-auto w-full max-w-3xl px-4 py-12">
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-foreground">سياسة الخصوصية · Privacy Policy</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            آخر تحديث: سبتمبر 2026 · Last updated: September 2026
          </p>
        </header>

        <div className="space-y-10 text-sm leading-7 text-foreground/90">
          <Section
            title="١. البيانات التي نجمعها · Data We Collect"
            ar={
              <>
                <p>عند إنشاء حساب نجمع: عنوان البريد الإلكتروني المستخدم لتسجيل الدخول.</p>
                <p>
                  عند ربط حساب TikTok بموافقتك عبر OAuth نجمع فقط ما توفره الصلاحيات المطلوبة
                  (user.info.basic و user.info.stats و video.list)، ويشمل: الاسم المعروض وصورة
                  الملف الشخصي ورابط الحساب، وإحصاءات الحساب العامة (عدد المتابعين، عدد
                  المتابَعين، إجمالي الإعجابات، عدد الفيديوهات)، وبيانات فيديوهاتك أنت (العنوان
                  والوصف، المدة، تاريخ النشر، صورة الغلاف، وأعداد المشاهدات والإعجابات
                  والتعليقات والمشاركات).
                </p>
                <p>
                  لا نجمع ولا نستنتج: بيانات ديموغرافية عن المتابعين، هويات المتابعين، مدة
                  المشاهدة أو نسب الإكمال، مصادر الزيارات، أو محتوى ملفات الفيديو نفسها.
                </p>
              </>
            }
            en={
              <>
                <p>
                  Account data: the email address used to sign in. With your OAuth consent we
                  collect only what the requested TikTok scopes expose (user.info.basic,
                  user.info.stats, video.list): display name, avatar, profile link, public account
                  statistics (follower, following, likes and video counts), and your own videos'
                  metadata (title/description, duration, publish date, cover image, view/like/
                  comment/share counts).
                </p>
                <p>
                  We do not collect or infer follower demographics or identities, watch time,
                  completion rates, traffic sources, or the raw video/audio content.
                </p>
              </>
            }
          />

          <Section
            title="٢. استخدام TikTok API · Use of the TikTok API"
            ar={
              <>
                <p>
                  نستخدم واجهة TikTok الرسمية بعد موافقتك الصريحة عبر شاشة التفويض الرسمية فقط،
                  ولأغراض تحليل حسابك وتقديم توصيات وخطة محتوى لك وحدك. لا نطلب كلمة مرور
                  TikTok إطلاقًا، ولا ننشر أو نعدّل أي محتوى نيابة عنك.
                </p>
                <p>
                  يمكنك إلغاء الوصول في أي وقت من إعدادات حسابك في TikTok أو من داخل التطبيق
                  عبر خيار «فصل الحساب».
                </p>
              </>
            }
            en={
              <p>
                We use the official TikTok API only after your explicit consent on TikTok's
                authorization screen, solely to analyze your account and produce recommendations
                and a content plan for you. We never ask for your TikTok password and never
                publish or modify content on your behalf. You can revoke access anytime from your
                TikTok settings or via "Disconnect" in the app.
              </p>
            }
          />

          <Section
            title="٣. عدم بيع البيانات · No Sale of Data"
            ar={
              <p>
                لا نبيع بياناتك ولا نؤجرها ولا نشاركها مع أي طرف ثالث لأغراض تسويقية أو
                إعلانية. تُستخدم البيانات فقط لتشغيل الخدمة لك.
              </p>
            }
            en={
              <p>
                We do not sell, rent, or share your data with third parties for marketing or
                advertising purposes. Data is used only to operate the service for you.
              </p>
            }
          />

          <Section
            title="٤. التخزين والحماية · Storage & Security"
            ar={
              <>
                <p>
                  تُخزَّن رموز الوصول (access/refresh tokens) على خوادمنا فقط، مشفّرة بخوارزمية
                  AES-256-GCM، ولا تصل إلى متصفحك أبدًا. تتم المصادقة وتبادل الرموز بالكامل من
                  الخادم، وتُطبَّق سياسات وصول على مستوى الصف بحيث لا يرى أي مستخدم بيانات
                  غيره.
                </p>
                <p>نحتفظ بلقطات تحليلية وتقارير سابقة لعرض تطوّر حسابك ضمن صفحة «السجل».</p>
              </>
            }
            en={
              <p>
                Access and refresh tokens are stored server-side only, encrypted with
                AES-256-GCM, and never reach your browser. Authentication and token exchange are
                performed entirely server-side, and row-level access policies ensure users can
                only see their own data. We retain analysis snapshots and past reports so you can
                track progress in the History page.
              </p>
            }
          />

          <Section
            title="٥. فصل الحساب وحذف البيانات · Disconnection & Deletion"
            ar={
              <p>
                يمكنك فصل حساب TikTok في أي وقت من داخل التطبيق؛ عندها نبطل الرموز المخزنة
                ونتوقف عن جلب أي بيانات جديدة. لحذف بياناتك بالكامل (الحساب، الاتصال،
                اللقطات، والتقارير) راسلنا عبر بريد التواصل أدناه وسننفذ الحذف خلال مدة
                معقولة.
              </p>
            }
            en={
              <p>
                You can disconnect your TikTok account at any time from within the app; stored
                tokens are revoked and no new data is fetched. To delete all your data (account,
                connection, snapshots, and reports), contact us at the email below and we will
                complete deletion within a reasonable timeframe.
              </p>
            }
          />

          <Section
            title="٦. حدود الخدمة · Service Limits"
            ar={
              <p>
                التحليل والتوصيات مبنية فقط على الحقول التي توفرها واجهة TikTok الرسمية
                بالصلاحيات المذكورة أعلاه. أي مقياس لا توفره الواجهة (مثل مدة المشاهدة أو
                مصادر الزيارات أو التركيبة الديموغرافية) لا يُعرض ولا يُقدَّر. النتائج إرشادية
                ولا نضمن تحقيق أرقام نمو محددة.
              </p>
            }
            en={
              <p>
                Analysis and recommendations are based solely on fields provided by the official
                TikTok API under the scopes listed above. Metrics the API does not provide (such
                as watch time, traffic sources, or audience demographics) are neither shown nor
                estimated. Results are advisory; we do not guarantee specific growth outcomes.
              </p>
            }
          />

          <Section
            title="٧. التواصل · Contact"
            ar={
              <p>
                لأي سؤال حول الخصوصية أو طلبات الحذف:{" "}
                <span dir="ltr" className="text-primary">
                  privacy@growthpulseai.app
                </span>
              </p>
            }
            en={
              <p>
                For privacy questions or deletion requests: privacy@growthpulseai.app
              </p>
            }
          />
        </div>
      </div>
    </AppShell>
  );
}
