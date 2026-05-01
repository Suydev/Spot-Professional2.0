import { Router } from "express";

const router = Router();

const INVIDIOUS_INSTANCES = [
  "https://invidious.privacydev.net",
  "https://iv.melmac.space",
  "https://invidious.fdn.fr",
  "https://invidious.nerdvpn.de",
  "https://inv.tux.pizza",
];

async function tryInvidious(path: string): Promise<any> {
  let lastErr: Error | null = null;
  for (const inst of INVIDIOUS_INSTANCES) {
    try {
      const res = await fetch(`${inst}${path}`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      lastErr = e as Error;
    }
  }
  throw lastErr ?? new Error("All Invidious instances failed");
}

router.get("/stream/search", async (req, res) => {
  const q = String(req.query.q || "").trim();
  const type = String(req.query.type || "video");
  if (!q) {
    res.status(400).json({ error: "Missing query" });
    return;
  }

  try {
    let results: any[] = [];

    if (type === "playlist" || type === "channel") {
      const data = await tryInvidious(
        `/api/v1/search?q=${encodeURIComponent(q)}&type=${type}&fields=playlistId,title,author,videoCount,playlistThumbnail,channelHandle`
      );
      results = Array.isArray(data) ? data.slice(0, 20) : [];
    } else {
      const data = await tryInvidious(
        `/api/v1/search?q=${encodeURIComponent(q)}&type=video&fields=videoId,title,author,lengthSeconds,viewCount,videoThumbnails`
      );
      results = Array.isArray(data)
        ? data.slice(0, 20).map((v: any) => ({
            videoId: v.videoId,
            title: v.title,
            author: v.author,
            lengthSeconds: v.lengthSeconds,
            viewCount: v.viewCount,
            thumbnail:
              v.videoThumbnails?.find((t: any) => t.quality === "medium")?.url ||
              `https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`,
          }))
        : [];
    }

    res.json({ results });
  } catch (err: any) {
    res.status(502).json({ error: err.message });
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
      embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&quality=hd1080`,
    });
  } catch (err: any) {
    res.status(502).json({ error: err.message });
  }
});

export default router;
