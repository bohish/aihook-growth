/**
 * TikTok data provider interface.
 *
 * Two implementations:
 *  - `demoProvider`  : deterministic fictional dataset, used whenever there is
 *                      no server-side TikTok token. Always flagged isDemo.
 *  - `realProvider`  : stub that expects a server-side access token obtained by
 *                      the official OAuth flow. It NEVER runs in the browser
 *                      and never sees the client secret — the token exchange
 *                      happens in a server function / server route.
 *
 * Swapping in the real provider requires no UI changes: the app only depends on
 * `TikTokProvider`.
 */
import type { AccountData } from "@/lib/types";
import { buildDemoAccount } from "./demoAccount";

export interface TikTokProvider {
  readonly id: "demo" | "tiktok";
  fetchAccountData(): Promise<AccountData>;
}

export const demoProvider: TikTokProvider = {
  id: "demo",
  async fetchAccountData() {
    return buildDemoAccount();
  },
};

/**
 * Real provider stub. Server-side only.
 * The scopes we intend to request are the minimum needed:
 *   user.info.basic  — handle, display name, avatar
 *   user.info.stats  — follower/like counts
 *   video.list       — the user's own videos and their public metrics
 * We do NOT request, store, or infer demographic data (gender/region).
 */
export function createRealProvider(accessToken: string): TikTokProvider {
  return {
    id: "tiktok",
    async fetchAccountData(): Promise<AccountData> {
      if (!accessToken) throw new Error("TIKTOK_TOKEN_MISSING");
      // Implemented once TikTok app credentials are configured server-side.
      // GET https://open.tiktokapis.com/v2/user/info/
      // POST https://open.tiktokapis.com/v2/video/list/
      throw new Error("TIKTOK_PROVIDER_NOT_CONFIGURED");
    },
  };
}

export const TIKTOK_SCOPES = ["user.info.basic", "user.info.stats", "video.list"] as const;

export const TIKTOK_PERMISSIONS_AR: { title: string; detail: string }[] = [
  {
    title: "معلومات الحساب الأساسية",
    detail: "اسم المستخدم، الاسم الظاهر، والصورة — لعرض حسابك داخل التطبيق.",
  },
  {
    title: "إحصائيات الحساب",
    detail: "عدد المتابعين والإعجابات — لحساب نسب الوصول والتفاعل.",
  },
  {
    title: "قائمة الفيديوهات ومقاييسها العامة",
    detail: "المشاهدات، الإعجابات، التعليقات، والمشاركات لفيديوهاتك أنت فقط.",
  },
];

export const TIKTOK_NOT_REQUESTED_AR = [
  "لا نطلب بيانات المتابعين أو معلوماتهم الشخصية.",
  "لا نستنتج الجنس أو المنطقة، ولا نعرض تقديرات ديموغرافية.",
  "لا ننشر ولا نحذف أي محتوى من حسابك.",
];
