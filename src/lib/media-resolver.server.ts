/**
 * Optional, isolated media-resolution layer.
 * Only used when MEDIA_RESOLVER_URL (+ optional MEDIA_RESOLVER_API_KEY) are set
 * and the hook processor needs a direct media URL. Never invents data.
 */
export type ResolvedMedia = { media_url: string } | null;

export async function resolveMedia(input: {
  videoId?: string | undefined;
  shareUrl?: string | undefined;
}): Promise<ResolvedMedia> {
  const url = process.env["MEDIA_RESOLVER_URL"];
  if (!url) return null;
  const apiKey = process.env["MEDIA_RESOLVER_API_KEY"];
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(apiKey ? { "x-api-key": apiKey } : {}),
      },
      body: JSON.stringify({ video_id: input.videoId, share_url: input.shareUrl }),
    });
    if (!response.ok) return null;
    const json = (await response.json()) as { media_url?: unknown };
    return typeof json.media_url === "string" && json.media_url ? { media_url: json.media_url } : null;
  } catch {
    return null;
  }
}
