const INSTANCES = [
  "https://invidious.privacydev.net",
  "https://iv.melmac.space",
  "https://invidious.fdn.fr",
  "https://invidious.nerdvpn.de",
  "https://inv.tux.pizza",
];

export interface InvidiousVideo {
  videoId: string;
  title: string;
  author: string;
  lengthSeconds: number;
  viewCount: number;
  thumbnail: string;
}

export interface YoutubeInfo {
  videoId: string;
  title: string;
  uploader: string;
  durationSec: number;
  thumbnail: string;
}

async function tryInstance(instance: string, path: string): Promise<any> {
  const res = await fetch(`${instance}${path}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function tryAll(path: string): Promise<any> {
  let lastError: Error | null = null;
  for (const inst of INSTANCES) {
    try {
      return await tryInstance(inst, path);
    } catch (e) {
      lastError = e as Error;
    }
  }
  throw lastError ?? new Error("All Invidious instances failed");
}

export async function searchYouTube(query: string): Promise<InvidiousVideo[]> {
  const q = encodeURIComponent(query);
  const data = await tryAll(`/api/v1/search?q=${q}&type=video&fields=videoId,title,author,lengthSeconds,viewCount`);
  if (!Array.isArray(data)) return [];
  return data.slice(0, 5).map((v: any) => ({
    videoId: v.videoId,
    title: v.title,
    author: v.author,
    lengthSeconds: v.lengthSeconds,
    viewCount: v.viewCount,
    thumbnail: `https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`,
  }));
}

export async function getYouTubeVideoInfo(videoId: string): Promise<YoutubeInfo> {
  const data = await tryAll(`/api/v1/videos/${videoId}?fields=videoId,title,author,lengthSeconds,videoThumbnails`);
  const thumb = data.videoThumbnails?.find((t: any) => t.quality === "medium")?.url
    ?? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
  return {
    videoId: data.videoId,
    title: data.title,
    uploader: data.author,
    durationSec: data.lengthSeconds,
    thumbnail: thumb,
  };
}

export async function getYouTubePlaylist(playlistId: string): Promise<{ title: string; videos: InvidiousVideo[] }> {
  const data = await tryAll(`/api/v1/playlists/${playlistId}`);
  const videos: InvidiousVideo[] = (data.videos || []).map((v: any) => ({
    videoId: v.videoId,
    title: v.title,
    author: v.author || data.author,
    lengthSeconds: v.lengthSeconds,
    viewCount: 0,
    thumbnail: `https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`,
  }));
  return { title: data.title || "Playlist", videos };
}

export function buildYouTubeUrl(videoId: string) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}
