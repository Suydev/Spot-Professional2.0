// ─── Piped instances — proxied YouTube audio, no auth needed ──────────────────
const PIPED_INSTANCES = [
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.adminforge.de",
  "https://pipedapi.tokhmi.xyz",
  "https://api.piped.yt",
  "https://pipedapi.reallyaweso.me",
];

// ─── Cobalt v9 instances — POST /api/json, no auth on most ────────────────────
const COBALT_V9 = [
  "https://cobalt.api.timelessnesses.me",
  "https://cobalt.tools.exozy.me",
  "https://cobalt.privacydev.net",
  "https://co.wuk.sh",
];

// ─── Cobalt v10 instances — POST /, some don't require auth ───────────────────
const COBALT_V10 = [
  "https://cobalt.canine.tools",
  "https://cobalt.hectabit.org",
  "https://api.cobalt.tools",
];

export type AudioQuality = "128" | "192" | "320";
export type VideoQuality = "360" | "480" | "720" | "1080";

export interface CobaltResult {
  url: string;
  filename: string;
}

/** AbortSignal.timeout() is not in React Native Hermes — use manual controller. */
function withTimeout(ms: number): { signal: AbortSignal; clear: () => void } {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(id) };
}

function extractVideoId(youtubeUrl: string): string {
  const v = youtubeUrl.match(/[?&]v=([^&]+)/);
  if (v) return v[1];
  const short = youtubeUrl.match(/youtu\.be\/([^?&/]+)/);
  return short?.[1] ?? "";
}

// ─── Tier 1: Piped ────────────────────────────────────────────────────────────
async function getFromPiped(videoId: string): Promise<CobaltResult> {
  let lastErr: Error | null = null;
  for (const base of PIPED_INSTANCES) {
    const { signal, clear } = withTimeout(10000);
    try {
      const res = await fetch(`${base}/streams/${videoId}`, { signal });
      clear();
      if (!res.ok) {
        lastErr = new Error(`Piped [${base}] HTTP ${res.status}`);
        continue;
      }
      const data: any = await res.json().catch(() => null);
      if (!data) { lastErr = new Error("Piped invalid JSON"); continue; }

      const all: any[] = (data.audioStreams ?? []).filter((s: any) => !s.videoOnly);

      // Prefer M4A (AAC) — widest Android compatibility
      const m4a = all
        .filter((s) => s.format === "M4A" || (s.mimeType ?? "").includes("audio/mp4"))
        .sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0));

      const webm = all
        .filter((s) => s.format === "WEBM" || (s.mimeType ?? "").includes("audio/webm"))
        .sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0));

      const best = m4a[0] ?? webm[0] ?? all[0];
      if (best?.url) {
        const isWebm = best.format === "WEBM" || (best.mimeType ?? "").includes("webm");
        const ext = isWebm ? "webm" : "m4a";
        const title = ((data.title as string) ?? "audio").replace(/[^a-z0-9]/gi, "_");
        return { url: best.url, filename: `${title}.${ext}` };
      }
      lastErr = new Error("Piped: no audio streams found");
    } catch (e: any) {
      clear();
      lastErr = e?.name === "AbortError" ? new Error(`Piped [${base}] timed out`) : (e as Error);
    }
  }
  throw lastErr ?? new Error("All Piped instances failed");
}

// ─── Tier 2: Cobalt v9 (POST /api/json) ───────────────────────────────────────
async function getFromCobaltV9(
  youtubeUrl: string,
  isAudioOnly: boolean,
  bitrate: string,
  quality: string
): Promise<CobaltResult> {
  let lastErr: Error | null = null;
  for (const base of COBALT_V9) {
    const { signal, clear } = withTimeout(15000);
    try {
      const body: Record<string, any> = { url: youtubeUrl };
      if (isAudioOnly) {
        body.isAudioOnly = true;
        body.aFormat = "mp3";
        body.audioBitrate = bitrate;
      } else {
        body.vCodec = "h264";
        body.vQuality = quality;
      }
      const res = await fetch(`${base}/api/json`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
        signal,
      });
      clear();
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        lastErr = new Error(`CobaltV9 [${base}] HTTP ${res.status}: ${text.slice(0, 80)}`);
        continue;
      }
      const data: any = await res.json().catch(() => null);
      if (!data) { lastErr = new Error("CobaltV9 invalid JSON"); continue; }
      if (data.status === "error") {
        lastErr = new Error(`CobaltV9 [${base}]: ${data.text ?? "error"}`);
        continue;
      }
      if (data.url) {
        return { url: data.url, filename: data.fname ?? `audio.${isAudioOnly ? "mp3" : "mp4"}` };
      }
      if (Array.isArray(data.picker) && data.picker[0]?.url) {
        return { url: data.picker[0].url, filename: `audio.${isAudioOnly ? "mp3" : "mp4"}` };
      }
      lastErr = new Error("CobaltV9: no URL in response");
    } catch (e: any) {
      clear();
      lastErr = e?.name === "AbortError" ? new Error(`CobaltV9 [${base}] timed out`) : (e as Error);
    }
  }
  throw lastErr ?? new Error("All Cobalt v9 instances failed");
}

// ─── Tier 3: Cobalt v10 (POST /) ──────────────────────────────────────────────
async function getFromCobaltV10(body: object): Promise<CobaltResult> {
  let lastErr: Error | null = null;
  for (const base of COBALT_V10) {
    const { signal, clear } = withTimeout(15000);
    try {
      const res = await fetch(base, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
        signal,
      });
      clear();
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        lastErr = new Error(`CobaltV10 [${base}] HTTP ${res.status}: ${text.slice(0, 80)}`);
        continue;
      }
      const data: any = await res.json().catch(() => null);
      if (!data) { lastErr = new Error("CobaltV10 invalid JSON"); continue; }
      if (data.status === "error") {
        lastErr = new Error(`CobaltV10 [${base}]: ${data.error?.code ?? "error"}`);
        continue;
      }
      if (data.url) {
        return { url: data.url, filename: data.filename ?? "audio.mp3" };
      }
      if (Array.isArray(data.picker) && data.picker[0]?.url) {
        return { url: data.picker[0].url, filename: data.filename ?? "audio.mp3" };
      }
      lastErr = new Error("CobaltV10: no URL in response");
    } catch (e: any) {
      clear();
      lastErr = e?.name === "AbortError" ? new Error(`CobaltV10 [${base}] timed out`) : (e as Error);
    }
  }
  throw lastErr ?? new Error("All Cobalt v10 instances failed");
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getCobaltAudioUrl(
  youtubeUrl: string,
  bitrate: AudioQuality = "320"
): Promise<CobaltResult> {
  const videoId = extractVideoId(youtubeUrl);

  // Tier 1 — Piped (proxied YouTube audio, no auth)
  if (videoId) {
    try { return await getFromPiped(videoId); } catch { /* fall through */ }
  }

  // Tier 2 — Cobalt v9 (POST /api/json, legacy format, no auth on most instances)
  try { return await getFromCobaltV9(youtubeUrl, true, bitrate, ""); } catch { /* fall through */ }

  // Tier 3 — Cobalt v10 (POST /, new format)
  return getFromCobaltV10({
    url: youtubeUrl,
    downloadMode: "audio",
    audioFormat: "mp3",
    audioBitrate: bitrate,
  });
}

export async function getCobaltVideoUrl(
  youtubeUrl: string,
  quality: VideoQuality = "720"
): Promise<CobaltResult> {
  // Piped video streams are video-only — skip Piped for video
  // Tier 1 — Cobalt v9
  try { return await getFromCobaltV9(youtubeUrl, false, "", quality); } catch { /* fall through */ }

  // Tier 2 — Cobalt v10
  return getFromCobaltV10({
    url: youtubeUrl,
    downloadMode: "auto",
    videoQuality: quality,
  });
}
