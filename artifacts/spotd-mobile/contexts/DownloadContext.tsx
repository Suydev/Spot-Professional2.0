import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  DownloadRecord,
  TrackRecord,
  deleteDownload,
  getDownloads,
  saveDownload,
} from "@/utils/storage";
import {
  fetchSpotifyCollection,
  fetchSpotifyTrack,
} from "@/utils/spotify";
import {
  buildYouTubeUrl,
  getYouTubePlaylist,
  getYouTubeVideoInfo,
  searchYouTube,
} from "@/utils/invidious";
import {
  getCobaltAudioUrl,
  getCobaltVideoUrl,
} from "@/utils/cobalt";
import type { ParsedUrl } from "@/utils/urlParser";
import { useSettings } from "./SettingsContext";

interface DownloadCtx {
  downloads: DownloadRecord[];
  startDownload: (parsed: ParsedUrl) => Promise<string>;
  cancelDownload: (id: string) => void;
  removeDownload: (id: string) => void;
  getDownload: (id: string) => DownloadRecord | undefined;
  activeCount: number;
}

const DownloadContext = createContext<DownloadCtx>({
  downloads: [],
  startDownload: async () => "",
  cancelDownload: () => {},
  removeDownload: () => {},
  getDownload: () => undefined,
  activeCount: 0,
});

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function DownloadProvider({ children }: { children: React.ReactNode }) {
  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
  const cancelledRef = useRef<Set<string>>(new Set());
  const { settings } = useSettings();

  useEffect(() => {
    getDownloads().then(setDownloads);
  }, []);

  const updateRecord = useCallback(
    (id: string, patch: Partial<DownloadRecord>) => {
      setDownloads((prev) =>
        prev.map((d) => (d.id === id ? { ...d, ...patch } : d))
      );
    },
    []
  );

  const updateTrack = useCallback(
    (downloadId: string, trackId: string, patch: Partial<TrackRecord>) => {
      setDownloads((prev) =>
        prev.map((d) => {
          if (d.id !== downloadId) return d;
          return {
            ...d,
            tracks: d.tracks.map((t) =>
              t.id === trackId ? { ...t, ...patch } : t
            ),
          };
        })
      );
    },
    []
  );

  const persistRecord = useCallback(
    async (id: string, state: DownloadRecord[]) => {
      const rec = state.find((d) => d.id === id);
      if (rec) await saveDownload(rec);
    },
    []
  );

  const downloadTrackAudio = useCallback(
    async (
      downloadId: string,
      track: TrackRecord,
      setAll: React.Dispatch<React.SetStateAction<DownloadRecord[]>>
    ) => {
      if (cancelledRef.current.has(downloadId)) return;

      const updateT = (patch: Partial<TrackRecord>) => {
        setAll((prev) =>
          prev.map((d) => {
            if (d.id !== downloadId) return d;
            return {
              ...d,
              tracks: d.tracks.map((t) =>
                t.id === track.id ? { ...t, ...patch } : t
              ),
            };
          })
        );
      };

      try {
        updateT({ status: "searching" });

        const query = `${track.artist} ${track.name} audio`;
        const results = await searchYouTube(query);
        if (!results.length) throw new Error("No YouTube results found");
        if (cancelledRef.current.has(downloadId)) return;

        const ytUrl = buildYouTubeUrl(results[0].videoId);
        updateT({ status: "downloading" });

        const cobalt = await getCobaltAudioUrl(ytUrl, settings.audioQuality);
        if (cancelledRef.current.has(downloadId)) return;

        const dir = `${FileSystem.documentDirectory}spotd/`;
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
        const safeName = `${track.name.replace(/[^a-z0-9]/gi, "_")}_${track.id}.mp3`;
        const dest = dir + safeName;

        await FileSystem.downloadAsync(cobalt.url, dest);

        updateT({ status: "done", localPath: dest });

        setAll((prev) => {
          const updated = prev.map((d) => {
            if (d.id !== downloadId) return d;
            return { ...d, completedTracks: d.completedTracks + 1 };
          });
          const rec = updated.find((d) => d.id === downloadId);
          if (rec) saveDownload(rec);
          return updated;
        });
      } catch (e: any) {
        updateT({ status: "error", error: e.message });
        setAll((prev) => {
          const updated = prev.map((d) => {
            if (d.id !== downloadId) return d;
            return { ...d, failedTracks: d.failedTracks + 1 };
          });
          const rec = updated.find((d) => d.id === downloadId);
          if (rec) saveDownload(rec);
          return updated;
        });
      }
    },
    [settings.audioQuality]
  );

  const runDownload = useCallback(
    async (record: DownloadRecord, parsed: ParsedUrl) => {
      const id = record.id;

      const add = (rec: DownloadRecord) => {
        setDownloads((prev) => [rec, ...prev]);
        saveDownload(rec);
      };
      add(record);

      try {
        if (parsed.kind === "spotify-track" || parsed.kind === "spotify-playlist" || parsed.kind === "spotify-album") {
          let collection;
          setDownloads((prev) =>
            prev.map((d) => (d.id === id ? { ...d, status: "fetching" } : d))
          );

          if (parsed.kind === "spotify-track") {
            collection = await fetchSpotifyTrack(parsed.raw);
          } else {
            collection = await fetchSpotifyCollection(
              parsed.raw,
              parsed.kind === "spotify-playlist" ? "playlist" : "album"
            );
          }

          if (cancelledRef.current.has(id)) return;

          const tracks: TrackRecord[] = collection.tracks.map((t) => ({
            id: t.id || makeId(),
            name: t.name,
            artist: t.artist,
            coverUrl: t.coverUrl,
            status: "queued" as const,
          }));

          setDownloads((prev) =>
            prev.map((d) =>
              d.id === id
                ? {
                    ...d,
                    name: collection.name,
                    coverUrl: collection.coverUrl,
                    status: "downloading",
                    totalTracks: tracks.length,
                    tracks,
                  }
                : d
            )
          );

          const concurrency = Math.min(settings.maxConcurrent, tracks.length);
          const queue = [...tracks];

          const worker = async () => {
            while (queue.length > 0) {
              const track = queue.shift()!;
              if (cancelledRef.current.has(id)) return;
              await downloadTrackAudio(id, track, setDownloads);
            }
          };

          await Promise.all(
            Array.from({ length: concurrency }, () => worker())
          );
        } else if (
          parsed.kind === "youtube-video" ||
          parsed.kind === "youtube-shorts"
        ) {
          setDownloads((prev) =>
            prev.map((d) => (d.id === id ? { ...d, status: "fetching" } : d))
          );

          const info = await getYouTubeVideoInfo(parsed.id);
          if (cancelledRef.current.has(id)) return;

          const track: TrackRecord = {
            id: parsed.id,
            name: info.title,
            artist: info.uploader,
            coverUrl: info.thumbnail,
            status: "downloading",
          };

          setDownloads((prev) =>
            prev.map((d) =>
              d.id === id
                ? {
                    ...d,
                    name: info.title,
                    coverUrl: info.thumbnail,
                    status: "downloading",
                    totalTracks: 1,
                    tracks: [track],
                  }
                : d
            )
          );

          const ytUrl = buildYouTubeUrl(parsed.id);

          let cobalt;
          if (settings.downloadMode === "audio") {
            cobalt = await getCobaltAudioUrl(ytUrl, settings.audioQuality);
          } else {
            cobalt = await getCobaltVideoUrl(ytUrl, settings.videoQuality);
          }

          if (cancelledRef.current.has(id)) return;

          const dir = `${FileSystem.documentDirectory}spotd/`;
          await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
          const ext = settings.downloadMode === "video" ? "mp4" : "mp3";
          const safeName = `${info.title.replace(/[^a-z0-9]/gi, "_")}_${parsed.id}.${ext}`;
          const dest = dir + safeName;

          setDownloads((prev) =>
            prev.map((d) =>
              d.id === id
                ? {
                    ...d,
                    tracks: d.tracks.map((t) =>
                      t.id === parsed.id ? { ...t, status: "downloading" as const } : t
                    ),
                  }
                : d
            )
          );

          await FileSystem.downloadAsync(cobalt.url, dest);

          setDownloads((prev) => {
            const updated = prev.map((d) =>
              d.id === id
                ? {
                    ...d,
                    completedTracks: 1,
                    localPath: dest,
                    tracks: d.tracks.map((t) =>
                      t.id === parsed.id
                        ? { ...t, status: "done" as const, localPath: dest }
                        : t
                    ),
                  }
                : d
            );
            const rec = updated.find((d) => d.id === id);
            if (rec) saveDownload(rec);
            return updated;
          });
        } else if (parsed.kind === "youtube-playlist") {
          setDownloads((prev) =>
            prev.map((d) => (d.id === id ? { ...d, status: "fetching" } : d))
          );

          const playlist = await getYouTubePlaylist(parsed.id);
          if (cancelledRef.current.has(id)) return;

          const tracks: TrackRecord[] = playlist.videos.map((v) => ({
            id: v.videoId,
            name: v.title,
            artist: v.author,
            coverUrl: v.thumbnail,
            status: "queued" as const,
          }));

          setDownloads((prev) =>
            prev.map((d) =>
              d.id === id
                ? {
                    ...d,
                    name: playlist.title,
                    status: "downloading",
                    totalTracks: tracks.length,
                    tracks,
                  }
                : d
            )
          );

          const queue = [...tracks];
          const concurrency = Math.min(settings.maxConcurrent, queue.length);

          const worker = async () => {
            while (queue.length > 0) {
              const track = queue.shift()!;
              if (cancelledRef.current.has(id)) return;

              setDownloads((prev) =>
                prev.map((d) =>
                  d.id === id
                    ? {
                        ...d,
                        tracks: d.tracks.map((t) =>
                          t.id === track.id ? { ...t, status: "downloading" as const } : t
                        ),
                      }
                    : d
                )
              );

              try {
                const ytUrl = buildYouTubeUrl(track.id);
                let cobalt;
                if (settings.downloadMode === "audio") {
                  cobalt = await getCobaltAudioUrl(ytUrl, settings.audioQuality);
                } else {
                  cobalt = await getCobaltVideoUrl(ytUrl, settings.videoQuality);
                }

                if (cancelledRef.current.has(id)) return;

                const dir = `${FileSystem.documentDirectory}spotd/`;
                await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
                const ext = settings.downloadMode === "video" ? "mp4" : "mp3";
                const safeName = `${track.name.replace(/[^a-z0-9]/gi, "_")}_${track.id}.${ext}`;
                const dest = dir + safeName;

                await FileSystem.downloadAsync(cobalt.url, dest);

                setDownloads((prev) => {
                  const updated = prev.map((d) =>
                    d.id === id
                      ? {
                          ...d,
                          completedTracks: d.completedTracks + 1,
                          tracks: d.tracks.map((t) =>
                            t.id === track.id ? { ...t, status: "done" as const, localPath: dest } : t
                          ),
                        }
                      : d
                  );
                  const rec = updated.find((d) => d.id === id);
                  if (rec) saveDownload(rec);
                  return updated;
                });
              } catch (e: any) {
                setDownloads((prev) => {
                  const updated = prev.map((d) =>
                    d.id === id
                      ? {
                          ...d,
                          failedTracks: d.failedTracks + 1,
                          tracks: d.tracks.map((t) =>
                            t.id === track.id ? { ...t, status: "error" as const, error: e.message } : t
                          ),
                        }
                      : d
                  );
                  const rec = updated.find((d) => d.id === id);
                  if (rec) saveDownload(rec);
                  return updated;
                });
              }
            }
          };

          await Promise.all(Array.from({ length: concurrency }, () => worker()));
        }

        if (!cancelledRef.current.has(id)) {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setDownloads((prev) => {
            const updated = prev.map((d) =>
              d.id === id
                ? { ...d, status: "done" as const, completedAt: new Date().toISOString() }
                : d
            );
            const rec = updated.find((d) => d.id === id);
            if (rec) saveDownload(rec);
            return updated;
          });
        }
      } catch (e: any) {
        setDownloads((prev) => {
          const updated = prev.map((d) =>
            d.id === id
              ? { ...d, status: "error" as const, errorMessage: e.message }
              : d
          );
          const rec = updated.find((d) => d.id === id);
          if (rec) saveDownload(rec);
          return updated;
        });
      }
    },
    [downloadTrackAudio, settings]
  );

  const startDownload = useCallback(
    async (parsed: ParsedUrl): Promise<string> => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const id = makeId();
      const record: DownloadRecord = {
        id,
        kind: parsed.kind as DownloadRecord["kind"],
        name: parsed.raw,
        coverUrl: "",
        totalTracks: 0,
        completedTracks: 0,
        failedTracks: 0,
        status: "queued",
        createdAt: new Date().toISOString(),
        tracks: [],
      };
      runDownload(record, parsed);
      return id;
    },
    [runDownload]
  );

  const cancelDownload = useCallback((id: string) => {
    cancelledRef.current.add(id);
    setDownloads((prev) => {
      const updated = prev.map((d) =>
        d.id === id ? { ...d, status: "cancelled" as const } : d
      );
      const rec = updated.find((d) => d.id === id);
      if (rec) saveDownload(rec);
      return updated;
    });
  }, []);

  const removeDownload = useCallback((id: string) => {
    setDownloads((prev) => prev.filter((d) => d.id !== id));
    deleteDownload(id);
  }, []);

  const getDownload = useCallback(
    (id: string) => downloads.find((d) => d.id === id),
    [downloads]
  );

  const activeCount = downloads.filter(
    (d) => d.status === "queued" || d.status === "fetching" || d.status === "downloading"
  ).length;

  return (
    <DownloadContext.Provider
      value={{ downloads, startDownload, cancelDownload, removeDownload, getDownload, activeCount }}
    >
      {children}
    </DownloadContext.Provider>
  );
}

export function useDownloads() {
  return useContext(DownloadContext);
}
