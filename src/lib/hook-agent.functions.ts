/** Server boundary for the internal HookAnalyzerAgent lab. */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type HookAgentResult = {
  status: "complete" | "partial" | "analysis_unavailable";
  video_id: string;
  video: { share_url: string; cover_image_url: string | null; title: string; duration: number };
  spoken_text: string | null;
  detected_language: string | null;
  onscreen_text: string | null;
  visual_opening: string | null;
  main_subject: string | null;
  visual_changes: string | null;
  hook_summary: string | null;
  confidence: number;
  frames: string[];
  error_code?: string;
};

export const analyzeLatestVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<HookAgentResult> => {
    const api = await import("./tiktok-api.server");
    const store = await import("./tiktok-connection.server");
    const { getRequest } = await import("@tanstack/react-start/server");
    const session = getRequest()?.headers.get("authorization")?.replace(/^Bearer\\s+/, "");
    if (!session) throw new Error("Unauthorized: missing session token.");
    const video = (await api.fetchVideos(await store.getValidAccessToken(store.userDb(session), context.userId), 1))[0];
    if (!video?.shareUrl) throw new Error("latest_video_has_no_share_url");
    const url = process.env.HOOK_PROCESSOR_URL;
    const secret = process.env.HOOK_PROCESSOR_SHARED_SECRET;
    if (!url || !secret) throw new Error("hook_processor_not_configured");
    const response = await fetch(`${url.replace(/\/$/, "")}/analyze`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${secret}` },
      body: JSON.stringify({ video_id: video.id, share_url: video.shareUrl }),
      signal: AbortSignal.timeout(90_000),
    });
    if (!response.ok) throw new Error("hook_processor_request_failed");
    const result = await response.json() as Omit<HookAgentResult, "video_id" | "video">;
    return { ...result, video_id: video.id, video: { share_url: video.shareUrl, cover_image_url: video.thumbnailUrl, title: video.caption, duration: video.durationSeconds } };
  });
