const COBALT_ENDPOINT = "https://api.cobalt.tools";

export type AudioQuality = "128" | "192" | "320";
export type VideoQuality = "360" | "480" | "720" | "1080";

export interface CobaltResult {
  url: string;
  filename: string;
}

export async function getCobaltAudioUrl(
  youtubeUrl: string,
  bitrate: AudioQuality = "320"
): Promise<CobaltResult> {
  const res = await fetch(COBALT_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      url: youtubeUrl,
      downloadMode: "audio",
      audioFormat: "mp3",
      audioBitrate: bitrate,
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Cobalt API error ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();

  if (data.status === "error") {
    throw new Error(data.error?.code || "Cobalt returned an error");
  }

  if (data.status === "tunnel" || data.status === "redirect") {
    return { url: data.url, filename: data.filename || "audio.mp3" };
  }

  if (data.url) {
    return { url: data.url, filename: data.filename || "audio.mp3" };
  }

  throw new Error("Cobalt did not return a download URL");
}

export async function getCobaltVideoUrl(
  youtubeUrl: string,
  quality: VideoQuality = "720"
): Promise<CobaltResult> {
  const res = await fetch(COBALT_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      url: youtubeUrl,
      downloadMode: "auto",
      videoQuality: quality,
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Cobalt API error ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();

  if (data.status === "error") {
    throw new Error(data.error?.code || "Cobalt returned an error");
  }

  if (data.url) {
    return { url: data.url, filename: data.filename || "video.mp4" };
  }

  throw new Error("Cobalt did not return a download URL");
}
