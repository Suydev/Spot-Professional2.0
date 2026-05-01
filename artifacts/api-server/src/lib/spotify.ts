const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
};

export interface SpotifyTrack {
  name: string;
  artist: string;
  album: string;
  spotifyUrl: string;
  trackNumber: number;
  coverUrl: string;
  year: string;
  previewUrl: string;
  isPodcast?: boolean;
}

type SpotifyKind = "playlist" | "album" | "track" | "show" | "episode";

function parseSpotifyUrl(url: string): { kind: SpotifyKind; id: string } {
  const cleaned = url.trim().split("?")[0];
  for (const kind of ["playlist", "album", "track", "show", "episode"] as SpotifyKind[]) {
    if (cleaned.includes(`/${kind}/`)) {
      return { kind, id: cleaned.split(`/${kind}/`)[1].split("/")[0] };
    }
    if (cleaned.includes(`spotify:${kind}:`)) {
      return { kind, id: cleaned.split(`spotify:${kind}:`)[1] };
    }
  }
  throw new Error(
    "Unsupported Spotify URL. Please paste a playlist, album, podcast, or episode link from open.spotify.com."
  );
}

function extractJsonFromScript(html: string): any[] {
  const results: any[] = [];
  const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scriptRegex.exec(html)) !== null) {
    const content = match[1];
    if (!content) continue;
    try {
      const data = JSON.parse(content);
      results.push(data);
    } catch {
      // not valid JSON
    }
  }
  return results;
}

export async function fetchPlaylistTracks(
  playlistUrl: string
): Promise<{ name: string; tracks: SpotifyTrack[]; isPodcast?: boolean }> {
  const { kind, id } = parseSpotifyUrl(playlistUrl);

  if (kind === "episode") {
    return fetchPodcastEpisode(id);
  }

  if (kind === "show") {
    return fetchPodcastShow(id);
  }

  if (kind === "track") {
    return fetchSingleTrack(id);
  }

  if (kind !== "playlist" && kind !== "album") {
    throw new Error("Please paste a Spotify playlist, album, podcast show, or episode URL.");
  }

  const embedUrl = `https://embed.spotify.com/?uri=spotify:${kind}:${id}`;
  const response = await fetch(embedUrl, { headers: BROWSER_HEADERS });
  if (!response.ok) {
    throw new Error(`Failed to fetch Spotify embed page: ${response.statusText}`);
  }

  const html = await response.text();
  const scripts = extractJsonFromScript(html);

  for (const data of scripts) {
    try {
      const entity = data?.props?.pageProps?.state?.data?.entity;
      if (!entity) continue;

      const name = entity.name || entity.title || "Playlist";

      const vi = entity.visualIdentity || {};
      const imgs: any[] = (vi.image || []).sort(
        (a: any, b: any) => (b.maxWidth || 0) - (a.maxWidth || 0)
      );
      const entityArt = imgs[0]?.url || "";

      const rd = entity.releaseDate || {};
      const entityYear =
        typeof rd === "object" ? (rd.isoString || "").slice(0, 4) : "";

      const tracks: SpotifyTrack[] = [];
      for (const [idx, t] of (entity.trackList || []).entries()) {
        const title = t.title || "";
        const subtitle = t.subtitle || "";
        const uri = t.uri || "";
        const tid = uri.includes(":") ? uri.split(":").pop() : "";
        if (!title) continue;

        const ap = t.audioPreview || {};
        const previewUrl = typeof ap === "object" ? ap.url || "" : "";

        tracks.push({
          name: title,
          artist: subtitle,
          album: kind === "album" ? name : "",
          spotifyUrl: tid ? `https://open.spotify.com/track/${tid}` : "",
          trackNumber: idx + 1,
          coverUrl: kind === "album" ? entityArt : "",
          year: kind === "album" ? entityYear : "",
          previewUrl,
        });
      }

      return { name, tracks };
    } catch {
      continue;
    }
  }

  throw new Error(
    "Could not parse track list from the Spotify embed. Make sure the playlist is public and the URL is correct."
  );
}

async function fetchPodcastEpisode(id: string): Promise<{ name: string; tracks: SpotifyTrack[]; isPodcast: true }> {
  const embedUrl = `https://embed.spotify.com/?uri=spotify:episode:${id}`;
  const response = await fetch(embedUrl, { headers: BROWSER_HEADERS });
  if (!response.ok) throw new Error(`Failed to fetch podcast episode: ${response.statusText}`);
  const html = await response.text();
  const scripts = extractJsonFromScript(html);

  for (const data of scripts) {
    try {
      const entity = data?.props?.pageProps?.state?.data?.entity;
      if (!entity) continue;
      const title = entity.name || entity.title || "Podcast Episode";
      const show = entity.podcast?.name || entity.show?.name || "";
      const vi = entity.visualIdentity || entity.coverArt || {};
      const imgs: any[] = (vi.image || vi.sources || []).sort(
        (a: any, b: any) => (b.maxWidth || b.width || 0) - (a.maxWidth || a.width || 0)
      );
      const coverUrl = imgs[0]?.url || "";
      return {
        name: title,
        isPodcast: true,
        tracks: [{
          name: title,
          artist: show,
          album: show,
          spotifyUrl: `https://open.spotify.com/episode/${id}`,
          trackNumber: 1,
          coverUrl,
          year: "",
          previewUrl: entity.audioPreview?.url || "",
          isPodcast: true,
        }],
      };
    } catch {
      continue;
    }
  }

  return {
    name: "Podcast Episode",
    isPodcast: true,
    tracks: [{
      name: "Podcast Episode",
      artist: "Podcast",
      album: "",
      spotifyUrl: `https://open.spotify.com/episode/${id}`,
      trackNumber: 1,
      coverUrl: "",
      year: "",
      previewUrl: "",
      isPodcast: true,
    }],
  };
}

async function fetchPodcastShow(id: string): Promise<{ name: string; tracks: SpotifyTrack[]; isPodcast: true }> {
  const embedUrl = `https://embed.spotify.com/?uri=spotify:show:${id}`;
  const response = await fetch(embedUrl, { headers: BROWSER_HEADERS });
  if (!response.ok) throw new Error(`Failed to fetch podcast show: ${response.statusText}`);
  const html = await response.text();
  const scripts = extractJsonFromScript(html);

  for (const data of scripts) {
    try {
      const entity = data?.props?.pageProps?.state?.data?.entity;
      if (!entity) continue;
      const showName = entity.name || entity.title || "Podcast Show";
      const vi = entity.visualIdentity || entity.coverArt || {};
      const imgs: any[] = (vi.image || vi.sources || []).sort(
        (a: any, b: any) => (b.maxWidth || b.width || 0) - (a.maxWidth || a.width || 0)
      );
      const coverUrl = imgs[0]?.url || "";

      const tracks: SpotifyTrack[] = [];
      for (const [idx, ep] of (entity.episodeList?.items || entity.episodes?.items || entity.trackList || []).entries()) {
        const epTitle = ep.name || ep.title || "";
        if (!epTitle) continue;
        const epId = ep.uri?.split(":").pop() || ep.id || "";
        tracks.push({
          name: epTitle,
          artist: showName,
          album: showName,
          spotifyUrl: epId ? `https://open.spotify.com/episode/${epId}` : "",
          trackNumber: idx + 1,
          coverUrl,
          year: "",
          previewUrl: ep.audioPreview?.url || "",
          isPodcast: true,
        });
      }
      if (tracks.length > 0) return { name: showName, isPodcast: true, tracks };
    } catch {
      continue;
    }
  }
  throw new Error("Could not parse podcast show. Make sure the podcast is public.");
}

async function fetchSingleTrack(id: string): Promise<{ name: string; tracks: SpotifyTrack[] }> {
  const embedUrl = `https://embed.spotify.com/?uri=spotify:track:${id}`;
  const response = await fetch(embedUrl, { headers: BROWSER_HEADERS });
  if (!response.ok) throw new Error(`Failed to fetch track: ${response.statusText}`);
  const html = await response.text();
  const scripts = extractJsonFromScript(html);

  for (const data of scripts) {
    try {
      const entity = data?.props?.pageProps?.state?.data?.entity;
      if (!entity) continue;
      const tl = entity.trackList?.[0];
      const title = tl?.title || entity.name || entity.title || "Track";
      const artist = tl?.subtitle || entity.artists?.[0]?.name || entity.subtitle || "";
      const vi = entity.visualIdentity || {};
      const imgs: any[] = (vi.image || []).sort(
        (a: any, b: any) => (b.maxWidth || 0) - (a.maxWidth || 0)
      );
      const coverUrl = imgs[0]?.url || "";
      return {
        name: title,
        tracks: [{
          name: title,
          artist,
          album: entity.album?.name || "",
          spotifyUrl: `https://open.spotify.com/track/${id}`,
          trackNumber: 1,
          coverUrl,
          year: "",
          previewUrl: tl?.audioPreview?.url || entity.audioPreview?.url || "",
        }],
      };
    } catch {
      continue;
    }
  }
  return {
    name: "Track",
    tracks: [{
      name: "Track",
      artist: "Unknown",
      album: "",
      spotifyUrl: `https://open.spotify.com/track/${id}`,
      trackNumber: 1,
      coverUrl: "",
      year: "",
      previewUrl: "",
    }],
  };
}
