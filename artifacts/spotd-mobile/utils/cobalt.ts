// Public Cobalt instances (tried in order, first success wins)
  const COBALT_INSTANCES = [
    "https://cobalt.api.timelessnesses.me",
    "https://cobalt.tools.exozy.me",
    "https://api.cobalt.tools",
  ];

  export type AudioQuality = "128" | "192" | "320";
  export type VideoQuality = "360" | "480" | "720" | "1080";

  export interface CobaltResult {
    url: string;
    filename: string;
  }

  /** AbortSignal.timeout() is not available in React Native Hermes — use a manual controller. */
  function withTimeout(ms: number): { signal: AbortSignal; clear: () => void } {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), ms);
    return { signal: controller.signal, clear: () => clearTimeout(id) };
  }

  async function cobaltFetch(body: object): Promise<CobaltResult> {
    let lastError: Error | null = null;
    for (const base of COBALT_INSTANCES) {
      const { signal, clear } = withTimeout(15000);
      try {
        const res = await fetch(base, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(body),
          signal,
        });
        clear();

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          lastError = new Error(`Cobalt [${base}] HTTP ${res.status}: ${text.slice(0, 120)}`);
          continue;
        }

        const data: any = await res.json().catch(() => null);
        if (!data) {
          lastError = new Error("Cobalt returned invalid JSON");
          continue;
        }

        if (data.status === "error") {
          lastError = new Error(data.error?.code ?? "Cobalt returned an error");
          continue;
        }

        if (data.status === "tunnel" || data.status === "redirect" || data.url) {
          return { url: data.url, filename: data.filename || "audio.mp3" };
        }

        if (Array.isArray(data.picker) && data.picker[0]?.url) {
          return { url: data.picker[0].url, filename: data.filename || "audio.mp3" };
        }

        lastError = new Error("Cobalt did not return a download URL");
      } catch (e: any) {
        clear();
        if (e?.name === "AbortError") {
          lastError = new Error(`Cobalt instance ${base} timed out`);
        } else {
          lastError = e;
        }
      }
    }
    throw lastError ?? new Error("All Cobalt instances failed");
  }

  export async function getCobaltAudioUrl(
    youtubeUrl: string,
    bitrate: AudioQuality = "320"
  ): Promise<CobaltResult> {
    return cobaltFetch({
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
    return cobaltFetch({
      url: youtubeUrl,
      downloadMode: "auto",
      videoQuality: quality,
    });
  }
  