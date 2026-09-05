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
