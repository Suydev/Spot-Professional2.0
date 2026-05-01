import AsyncStorage from "@react-native-async-storage/async-storage";

export interface DownloadRecord {
  id: string;
  kind: "spotify-track" | "spotify-playlist" | "spotify-album" | "youtube-video" | "youtube-playlist" | "youtube-shorts";
  name: string;
  coverUrl: string;
  totalTracks: number;
  completedTracks: number;
  failedTracks: number;
  status: "queued" | "fetching" | "downloading" | "done" | "error" | "cancelled";
  errorMessage?: string;
  localPath?: string;
  createdAt: string;
  completedAt?: string;
  tracks: TrackRecord[];
}

export interface TrackRecord {
  id: string;
  name: string;
  artist: string;
  coverUrl: string;
  status: "queued" | "searching" | "downloading" | "done" | "error";
  localPath?: string;
  error?: string;
}

const DOWNLOADS_KEY = "spotd_downloads_v2";
const SETTINGS_KEY = "spotd_settings_v1";

export async function getDownloads(): Promise<DownloadRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(DOWNLOADS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveDownload(record: DownloadRecord): Promise<void> {
  const all = await getDownloads();
  const idx = all.findIndex((d) => d.id === record.id);
  if (idx >= 0) all[idx] = record;
  else all.unshift(record);
  await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(all));
}

export async function deleteDownload(id: string): Promise<void> {
  const all = await getDownloads();
  await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(all.filter((d) => d.id !== id)));
}

export async function clearAllDownloads(): Promise<void> {
  await AsyncStorage.removeItem(DOWNLOADS_KEY);
}

export interface AppSettings {
  audioQuality: "128" | "192" | "320";
  videoQuality: "360" | "480" | "720" | "1080";
  downloadMode: "audio" | "video";
  saveToGallery: boolean;
  maxConcurrent: number;
}

const DEFAULT_SETTINGS: AppSettings = {
  audioQuality: "320",
  videoQuality: "720",
  downloadMode: "audio",
  saveToGallery: true,
  maxConcurrent: 3,
};

export async function getSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings();
  const updated = { ...current, ...settings };
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  return updated;
}
