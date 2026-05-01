export interface SpotifyTrack {
  id: string;
  name: string;
  artist: string;
  album: string;
  coverUrl: string;
  previewUrl: string;
  durationMs: number;
}

export interface SpotifyCollection {
  name: string;
  kind: "track" | "playlist" | "album";
  coverUrl: string;
  tracks: SpotifyTrack[];
}

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

function extractId(url: string, kind: string): string {
  if (url.includes(`/${kind}/`)) {
    return url.split(`/${kind}/`)[1]?.split(/[?/#]/)[0] ?? "";
  }
  if (url.includes(`spotify:${kind}:`)) {
    return url.split(`spotify:${kind}:`)[1]?.split(/[?/#]/)[0] ?? "";
  }
  return "";
}

async function scrapeEmbed(kind: string, id: string): Promise<any> {
  const embedUrl = `https://embed.spotify.com/?uri=spotify:${kind}:${id}`;
  const res = await fetch(embedUrl, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();

  const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = scriptRegex.exec(html)) !== null) {
    const content = match[1];
    if (!content?.includes("trackList") && !content?.includes("title")) continue;
    try {
      const data = JSON.parse(content);
      const entity = data?.props?.pageProps?.state?.data?.entity;
      if (entity) return entity;
    } catch {}
  }

  const jsonMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  if (jsonMatch) {
    try {
      const data = JSON.parse(jsonMatch[1]);
      const entity = data?.props?.pageProps?.state?.data?.entity;
      if (entity) return entity;
    } catch {}
  }

  throw new Error("Could not parse Spotify embed data. Make sure the URL is public.");
}

export async function fetchSpotifyTrack(url: string): Promise<SpotifyCollection> {
  const id = extractId(url, "track");
  if (!id) throw new Error("Invalid Spotify track URL");

  const entity = await scrapeEmbed("track", id);
  const track = entity?.trackList?.[0] ?? entity;
  const vi = entity?.visualIdentity || {};
  const imgs: any[] = (vi.image || []).sort(
    (a: any, b: any) => (b.maxWidth || 0) - (a.maxWidth || 0)
  );
  const coverUrl = imgs[0]?.url || "";

  return {
    name: track.title || track.name || "Track",
    kind: "track",
    coverUrl,
    tracks: [
      {
        id,
        name: track.title || track.name || "Track",
        artist: track.subtitle || track.artist || "Unknown",
        album: entity.name || "",
        coverUrl,
        previewUrl: track.audioPreview?.url || "",
        durationMs: track.duration || 0,
      },
    ],
  };
}

export async function fetchSpotifyCollection(url: string, kind: "playlist" | "album"): Promise<SpotifyCollection> {
  const id = extractId(url, kind);
  if (!id) throw new Error(`Invalid Spotify ${kind} URL`);

  const entity = await scrapeEmbed(kind, id);
  const name = entity.name || entity.title || kind === "playlist" ? "Playlist" : "Album";

  const vi = entity.visualIdentity || {};
  const imgs: any[] = (vi.image || []).sort(
    (a: any, b: any) => (b.maxWidth || 0) - (a.maxWidth || 0)
  );
  const entityCover = imgs[0]?.url || "";

  const rd = entity.releaseDate || {};
  const year = typeof rd === "object" ? (rd.isoString || "").slice(0, 4) : "";

  const tracks: SpotifyTrack[] = [];
  for (const [idx, t] of (entity.trackList || []).entries()) {
    const title = t.title || "";
    if (!title) continue;
    const uri = t.uri || "";
    const tid = uri.includes(":") ? uri.split(":").pop() ?? String(idx) : String(idx);
    tracks.push({
      id: tid,
      name: title,
      artist: t.subtitle || "Unknown Artist",
      album: kind === "album" ? name : "",
      coverUrl: kind === "album" ? entityCover : "",
      previewUrl: t.audioPreview?.url || "",
      durationMs: t.duration || 0,
    });
  }

  if (tracks.length === 0) throw new Error("No tracks found. Make sure the playlist/album is public.");

  return { name, kind, coverUrl: entityCover, tracks };
}
