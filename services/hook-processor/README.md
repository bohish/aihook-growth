# AiHook Hook Processor

This private Railway service receives an authenticated request from AiHook, resolves a TikTok media URL through the configured resolver, processes only seconds 0–5 with FFmpeg, and deletes its temporary directory in all cases.

Required Railway variables:

- `PROCESSOR_SHARED_SECRET` — long random value, matching `HOOK_PROCESSOR_SHARED_SECRET` in AiHook.
- `MEDIA_RESOLVER_URL` — trusted resolver endpoint. It receives `{ video_id, share_url }` and returns `{ media_url }`.
- `MEDIA_RESOLVER_API_KEY` — resolver credential, never returned to AiHook.
- `OPENAI_API_KEY` — used only for speech transcription and Vision/OCR.

The service does not scrape TikTok. Use a resolver that you are entitled to use and that complies with TikTok's terms.
