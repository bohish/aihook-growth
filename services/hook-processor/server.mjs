import { createServer } from "node:http";
import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const port = Number(process.env.PORT || 3000);
const timeoutMs = 45_000;
const json = (res, code, body) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(body)); };
const run = (command, args) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { stdio: "ignore" });
  const timer = setTimeout(() => { child.kill("SIGKILL"); reject(new Error("processor_timeout")); }, timeoutMs);
  child.on("error", reject); child.on("close", (code) => { clearTimeout(timer); code === 0 ? resolve() : reject(new Error(`ffmpeg_exit_${code}`)); });
});

async function resolveMedia(input) {
  const endpoint = process.env.MEDIA_RESOLVER_URL;
  if (!endpoint) throw new Error("media_resolver_not_configured");
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 12_000);
      const response = await fetch(endpoint, { method: "POST", signal: controller.signal, headers: { "content-type": "application/json", authorization: `Bearer ${process.env.MEDIA_RESOLVER_API_KEY || ""}` }, body: JSON.stringify({ video_id: input.video_id, share_url: input.share_url }) });
      clearTimeout(timer);
      const data = await response.json();
      if (response.ok && typeof data.media_url === "string" && data.media_url.startsWith("https://")) return data.media_url;
      throw new Error("media_resolver_invalid_response");
    } catch (error) { if (attempt === 1) throw error; }
  }
}

async function openAiTranscribe(audioPath) {
  const form = new FormData(); form.append("model", "gpt-4o-mini-transcribe"); form.append("file", new Blob([await readFile(audioPath)]), "hook.mp3");
  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", { method: "POST", headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body: form });
  if (!response.ok) throw new Error("stt_failed");
  const data = await response.json(); return { spoken_text: data.text || null, detected_language: data.language || null, transcription_confidence: data.text ? 0.8 : 0 };
}

async function main(input) {
  if (!process.env.OPENAI_API_KEY) throw new Error("openai_not_configured");
  const dir = await mkdtemp(join(tmpdir(), "aihook-"));
  try {
    const mediaUrl = await resolveMedia(input);
    const clip = join(dir, "hook.mp4"), audio = join(dir, "hook.mp3");
    await run("ffmpeg", ["-y", "-ss", "0", "-t", "5", "-i", mediaUrl, "-map", "0:v:0?", "-map", "0:a:0?", "-c:v", "libx264", "-c:a", "libmp3lame", clip]);
    await run("ffmpeg", ["-y", "-i", clip, "-vn", "-ac", "1", "-ar", "16000", audio]);
    const transcription = await openAiTranscribe(audio).catch(() => ({ spoken_text: null, detected_language: null, transcription_confidence: 0 }));
    // Vision/OCR is deliberately a separate next adapter: frames stay local and are never persisted.
    return { status: "partial", media_resolver_status: "resolved", processed_seconds: 5, ...transcription, error_code: "vision_adapter_not_configured" };
  } finally { await rm(dir, { recursive: true, force: true }); }
}

createServer(async (req, res) => {
  if (req.url === "/health") return json(res, 200, { ok: true, ffmpeg: true });
  if (req.method !== "POST" || req.url !== "/analyze") return json(res, 404, { error: "not_found" });
  if (!process.env.PROCESSOR_SHARED_SECRET || req.headers.authorization !== `Bearer ${process.env.PROCESSOR_SHARED_SECRET}`) return json(res, 401, { error: "unauthorized" });
  let raw = ""; for await (const chunk of req) raw += chunk;
  try { const input = JSON.parse(raw); if (!input?.video_id || !input?.share_url) return json(res, 400, { error: "invalid_input" }); return json(res, 200, await main(input)); }
  catch (error) { return json(res, 200, { status: "analysis_unavailable", media_resolver_status: "failed", error_code: error instanceof Error ? error.message : "processor_failed" }); }
}).listen(port);
