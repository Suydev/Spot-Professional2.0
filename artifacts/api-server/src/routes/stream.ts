import { Router } from "express";
import { spawn } from "child_process";
import path from "path";

const router = Router();

const YTDLP_PATH =
  process.env.YTDLP_PATH ||
  "/home/runner/workspace/.pythonlibs/bin/yt-dlp";

const INVIDIOUS_INSTANCES = [
  "https://invidious.privacydev.net",
  "https://iv.melmac.space",
  "https://invidious.fdn.fr",
  "https://invidious.nerdvpn.de",
  "https://inv.tux.pizza",
  "https://yt.cdaut.de",
  "https://invidious.lunar.icu",
  "https://invidious.incogniweb.net",
  "https://invidious.flokinet.to",
  "https://invidious.protokolla.fi",
];

async function tryInvidious(urlPath: string): Promise<any> {
  let lastErr: Error | null = null;
  for (const inst of INVIDIOUS_INSTANCES) {
    try {
      const res = await fetch(`${inst}${urlPath}`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      lastErr = e as Error;
    }
  }
  throw lastErr ?? new Error("All Invidious instances failed");
}

function ytdlpSearch(query: string, limit = 20): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const args = [
      `ytsearch${limit}:${query}`,
      "--flat-playlist",
      "--print",
      "%(id)s\t%(title)s\t%(uploader)s\t%(duration)s",
      "--no-warnings",
      "--quiet",
    ];
    const proc = spawn(YTDLP_PATH, args);
    let out = "";
    let err = "";
    proc.stdout.on("data", (d: Buffer) => { out += d.toString(); });
    proc.stderr.on("data", (d: Buffer) => { err += d.toString(); });
    proc.on("close", (code) => {
      if (code !== 0 && !out) {
        reject(new Error(err.slice(0, 200) || `yt-dlp search failed`));
        return;
      }
      const results: any[] = [];
      for (const line of out.trim().split("\n")) {
        const parts = line.split("\t");
        if (parts.length < 2) continue;
        const [id, title, uploader, dur] = parts;
        if (!id || !title) continue;
        results.push({
          videoId: id.trim(),
          title: title.trim(),
          author: (uploader || "").trim(),
          lengthSeconds: parseInt(dur || "0") || 0,
          thumbnail: `https://i.ytimg.com/vi/${id.trim()}/mqdefault.jpg`,
        });
      }
      resolve(results);
    });
    proc.on("error", reject);
  });
}

router.get("/stream/search", async (req, res) => {
  const q = String(req.query.q || "").trim();
  const type = String(req.query.type || "video");

  if (!q) {
    res.status(400).json({ error: "Missing query parameter 'q'" });
    return;
  }

  try {
    let results: any[] = [];

    if (type === "playlist" || type === "channel") {
      const data = await tryInvidious(
        `/api/v1/search?q=${encodeURIComponent(q)}&type=${type}&fields=playlistId,title,author,videoCount,playlistThumbnail,channelHandle`
      ).catch(() => null);
      results = Array.isArray(data) ? data.slice(0, 20) : [];
    } else {
      let invidiousOk = false;
      try {
        const data = await tryInvidious(
          `/api/v1/search?q=${encodeURIComponent(q)}&type=video&fields=videoId,title,author,lengthSeconds,viewCount,videoThumbnails`
        );
        if (Array.isArray(data) && data.length > 0) {
          invidiousOk = true;
          results = data.slice(0, 20).map((v: any) => ({
            videoId: v.videoId,
            title: v.title,
            author: v.author,
            lengthSeconds: v.lengthSeconds || 0,
            viewCount: v.viewCount || 0,
            thumbnail:
              v.videoThumbnails?.find((t: any) => t.quality === "medium")?.url ||
              `https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`,
          }));
        }
      } catch (_) {}

      if (!invidiousOk) {
        results = await ytdlpSearch(q, 20);
      }
    }

    res.json({ results, source: results.length > 0 ? "ok" : "empty" });
  } catch (err: any) {
    res.status(502).json({ error: err?.message || "Search failed" });
  }
});

router.get("/stream/info/:videoId", async (req, res) => {
  const { videoId } = req.params;
  try {
    const data = await tryInvidious(
      `/api/v1/videos/${videoId}?fields=videoId,title,author,lengthSeconds,description,videoThumbnails`
    );
    const thumb =
      data.videoThumbnails?.find((t: any) => t.quality === "medium")?.url ||
      `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
    res.json({
      videoId: data.videoId,
      title: data.title,
      author: data.author,
      lengthSeconds: data.lengthSeconds,
      description: data.description,
      thumbnail: thumb,
    });
  } catch (err: any) {
    res.status(502).json({ error: err?.message });
  }
});

export default router;
