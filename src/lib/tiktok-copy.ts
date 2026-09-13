/**
 * Browser-safe Arabic copy for the TikTok integration.
 * Only describes data the approved scopes actually return.
 */
export const TIKTOK_PERMISSIONS_AR: { title: string; detail: string }[] = [
  {
    title: "معلومات الحساب الأساسية (user.info.basic)",
    detail: "الاسم الظاهر، الصورة، النبذة، ورابط ملفك — لعرض حسابك داخل التطبيق.",
  },
  {
    title: "إحصائيات الحساب (user.info.stats)",
    detail: "عدد المتابعين والمتابَعين والإعجابات وعدد الفيديوهات — لحساب الوصول والتفاعل.",
  },
  {
    title: "قائمة فيديوهاتك ومقاييسها العامة (video.list)",
    detail: "الوصف، المدة، تاريخ النشر، المشاهدات، الإعجابات، التعليقات، والمشاركات لفيديوهاتك أنت فقط.",
  },
];

export const TIKTOK_NOT_REQUESTED_AR = [
  "لا نطلب اسم المستخدم أو كلمة المرور — تسجيل الدخول يتم في موقع تيك توك نفسه.",
  "لا نطلب بيانات المتابعين ولا معلوماتهم الشخصية.",
  "لا نستنتج الجنس أو المنطقة، ولا نعرض أي تقديرات ديموغرافية.",
  "لا تتوفر لنا مدة المشاهدة أو نسبة الإكمال أو مصادر الزيارات عبر هذه الصلاحيات، فلا نعرضها.",
  "لا ننشر ولا نحذف أي محتوى من حسابك.",
];

/** User-facing Arabic label for each connection state. */
export const CONNECTION_LABELS_AR: Record<string, string> = {
  disconnected: "غير مرتبط",
  connecting: "جاري الربط…",
  connected: "مرتبط",
  expired: "انتهت صلاحية الربط",
  missing_credentials: "التكامل غير مهيأ",
  permission_denied: "صلاحية مرفوضة",
  api_error: "خطأ في واجهة تيك توك",
};

export const TIKTOK_PERMISSIONS_EN = [
  { title: "Basic account information (user info basic)", detail: "Display name, image, bio, and profile link to show your account in the app" },
  { title: "Account statistics (user info stats)", detail: "Followers, following, likes, and video count to calculate reach and engagement" },
  { title: "Your video list and public metrics (video list)", detail: "Description, duration, publish date, views, likes, comments, and shares for your videos only" },
];

export const TIKTOK_NOT_REQUESTED_EN = [
  "We never ask for your username or password — sign-in happens on TikTok",
  "We do not request follower data or personal information",
  "We do not infer gender or location, or show demographic estimates",
  "These permissions do not provide watch time, completion rate, or traffic sources, so we do not show them",
  "We do not publish or delete content from your account",
];

export const CONNECTION_LABELS_EN: Record<string, string> = {
  disconnected: "Not connected", connecting: "Connecting…", connected: "Connected", expired: "Connection expired",
  missing_credentials: "Integration not configured", permission_denied: "Permission denied", api_error: "TikTok API error",
};
