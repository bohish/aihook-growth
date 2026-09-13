import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Language = "ar" | "en";

const copy = {
  ar: {
    navHome: "الرئيسية", navAnalysis: "التحليل", navHistory: "السجل", navPricing: "الأسعار",
    signIn: "دخول", signOut: "خروج", analyzeAccount: "حلّل حسابي", menu: "القائمة",
    terms: "شروط الاستخدام", privacy: "سياسة الخصوصية",
    footer: "غير مرتبط بشركة TikTok", footerNote: "التحليل يعتمد على بيانات حسابك فقط، ولا يتضمن أي تقديرات ديموغرافية",
    retry: "إعادة المحاولة", home: "الرئيسية", loading: "جاري التحميل…",
  },
  en: {
    navHome: "Home", navAnalysis: "Analysis", navHistory: "History", navPricing: "Pricing",
    signIn: "Sign in", signOut: "Sign out", analyzeAccount: "Analyze my account", menu: "Menu",
    terms: "Terms of Service", privacy: "Privacy Policy",
    footer: "Not affiliated with TikTok", footerNote: "Analysis uses only your account data and includes no demographic estimates",
    retry: "Try again", home: "Home", loading: "Loading…",
  },
} as const;

type CopyKey = keyof typeof copy.ar;
type LanguageContextValue = {
  language: Language;
  locale: "ar-SA" | "en-US";
  dir: "rtl" | "ltr";
  setLanguage: (language: Language) => void;
  t: (key: CopyKey) => string;
  pick: (ar: string, en: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);
const STORAGE_KEY = "hook.language";

const pageMeta: Record<string, { ar: [string, string]; en: [string, string] }> = {
  "/": {
    ar: ["HOOK — تحليل هوك فيديوهات TikTok", "حلّل أول خمس ثوانٍ من فيديوهات TikTok واعرف ما يجذب الانتباه وما يحتاج إلى تعديل"],
    en: ["HOOK — TikTok Hook Analysis", "Analyze the first five seconds of your TikTok videos and find what earns attention"],
  },
  "/auth": {
    ar: ["الدخول إلى HOOK", "سجّل الدخول لحفظ تحليلاتك ومتابعة تطور حسابك"],
    en: ["Sign in to HOOK", "Sign in to save your analyses and track account progress"],
  },
  "/connect": {
    ar: ["ربط حساب TikTok — HOOK", "اربط حساب TikTok عبر صفحة التفويض الرسمية بصلاحيات واضحة ومحدودة"],
    en: ["Connect TikTok — HOOK", "Connect TikTok through the official authorization flow with clear, limited permissions"],
  },
  "/dashboard": {
    ar: ["لوحة درجة الهوك — HOOK", "درجة الهوك وأداء الحساب والتوصيات وخطة الأسبوع"],
    en: ["Hook Score Dashboard — HOOK", "Your hook score, account performance, recommendations, and weekly plan"],
  },
  "/history": {
    ar: ["سجل التقارير — HOOK", "قارن درجة حسابك ومقاييسه بين التقارير السابقة"],
    en: ["Report History — HOOK", "Compare your account score and metrics across previous reports"],
  },
  "/pricing": {
    ar: ["الأسعار — HOOK", "ابدأ بالخطة المجانية واطّلع على مزايا الخطة الاحترافية"],
    en: ["Pricing — HOOK", "Start with the free plan and explore Pro features"],
  },
  "/privacy": {
    ar: ["سياسة الخصوصية — HOOK", "تعرف على البيانات التي نجمعها وكيف نستخدمها ونحميها"],
    en: ["Privacy Policy — HOOK", "Learn what data we collect and how we use and protect it"],
  },
  "/terms": {
    ar: ["شروط الاستخدام — HOOK", "شروط استخدام HOOK وحدود الخدمة"],
    en: ["Terms of Service — HOOK", "Terms for using HOOK and its service limitations"],
  },
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("ar");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "ar" || saved === "en") setLanguage(saved);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    const meta = pageMeta[window.location.pathname]?.[language];
    if (meta) {
      document.title = meta[0];
      document.querySelector('meta[name="description"]')?.setAttribute("content", meta[1]);
    }
  }, [language]);

  useEffect(() => {
    const clean = (root: Node) => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let node = walker.nextNode();
      while (node) {
        const parent = node.parentElement;
        const text = node.textContent ?? "";
        if (text.includes(".") && !parent?.closest("a, code, pre") && !/\d\.\d/.test(text)) {
          node.textContent = text.replaceAll(".", "");
        }
        node = walker.nextNode();
      }
    };
    clean(document.body);
    const observer = new MutationObserver((entries) => entries.forEach((entry) => clean(entry.target)));
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  const value = useMemo<LanguageContextValue>(() => ({
    language,
    locale: language === "ar" ? "ar-SA" : "en-US",
    dir: language === "ar" ? "rtl" : "ltr",
    setLanguage,
    t: (key) => copy[language][key],
    pick: (ar, en) => language === "ar" ? ar : en,
  }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
}