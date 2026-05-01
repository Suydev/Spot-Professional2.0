import fs from "fs";
import os from "os";
import path from "path";
import archiver from "archiver";
import { db } from "@workspace/db";
import { downloadsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";
import { fetchPlaylistTracks } from "./spotify";
import { downloadAudio, downloadVideo, getYoutubePlaylistItems } from "./ytdlp";

export interface TrackStatus {
  name: string;
  artist: string;
  album: string;
  coverUrl: string;
  status: "queued" | "downloading" | "done" | "error";
  error?: string;
}

export interface DownloadSession {
  id: string;
  type: "spotify" | "youtube";
  status:
    | "queued"
    | "fetching_playlist"
    | "downloading"
    | "zipping"
    | "done"
    | "error"
    | "cancelled";
  url: string;
  playlistName?: string;
  totalTracks: number;
  completedTracks: number;
  errorMessage?: string;
  audioQuality?: string;
  videoQuality?: string;
  tracks: TrackStatus[];
  zipReady: boolean;
  zipPath?: string;
  createdAt: Date;
  completedAt?: Date;
  expiresAt?: Date;
}

const sessions = new Map<string, DownloadSession>();

function generateId(): string {
  return `dl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function updateDb(session: DownloadSession) {
  try {
    await db
      .update(downloadsTable)
      .set({
        status: session.status,
        playlistName: session.playlistName,
        totalTracks: session.totalTracks,
        completedTracks: session.completedTracks,
        errorMessage: session.errorMessage,
        tracks: JSON.stringify(session.tracks),
        zipPath: session.zipPath,
        zipReady: session.zipReady,
        completedAt: session.completedAt,
        expiresAt: session.expiresAt,
      })
      .where(eq(downloadsTable.id, session.id));
  } catch (err) {
    logger.error({ err }, "Failed to update download in DB");
  }
}

async function createZip(
  session: DownloadSession,
  files: string[]
): Promise<string> {
  const zipDir = fs.mkdtempSync(path.join(os.tmpdir(), "spotd-zip-"));
  const zipPath = path.join(zipDir, `${session.playlistName || "download"}.zip`);
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 6 } });
    output.on("close", () => resolve(zipPath));
    archive.on("error", reject);
    archive.pipe(output);
    for (const f of files) {
      if (fs.existsSync(f)) {
        archive.file(f, { name: path.basename(f) });
      }
    }
    archive.finalize();
  });
}

async function runSpotifyDownload(session: DownloadSession) {
  try {
    session.status = "fetching_playlist";
    await updateDb(session);

    const { name, tracks, isPodcast } = await fetchPlaylistTracks(session.url);
    session.playlistName = name;
    session.totalTracks = tracks.length;
    session.tracks = tracks.map((t) => ({
      name: t.name,
      artist: t.artist,
      album: t.album,
      coverUrl: t.coverUrl,
      status: "queued" as const,
    }));
    session.status = "downloading";
    await updateDb(session);

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "spotd-"));
    const downloadedFiles: string[] = [];

    for (let i = 0; i < tracks.length; i++) {
      if ((session.status as string) === "cancelled") break;
      const track = tracks[i];
      session.tracks[i].status = "downloading";
      await updateDb(session);

      try {
        const query = isPodcast
          ? `${track.artist} ${track.name} podcast`
          : `${track.artist} ${track.name}`;
        const filePath = await downloadAudio(query, {
          audioQuality: session.audioQuality || "mp3-320",
          outputDir: tmpDir,
        });
        if (filePath) downloadedFiles.push(filePath);
        session.tracks[i].status = "done";
      } catch (err: any) {
        session.tracks[i].status = "error";
        session.tracks[i].error = err.message?.slice(0, 100);
        logger.error({ err, track: track.name }, "Track download failed");
      }
      session.completedTracks = i + 1;
      await updateDb(session);
    }

    if ((session.status as string) === "cancelled") return;

    session.status = "zipping";
    await updateDb(session);

    const zipPath = await createZip(session, downloadedFiles);
    session.zipPath = zipPath;
    session.zipReady = true;
    session.status = "done";
    session.completedAt = new Date();
    session.expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await updateDb(session);

    try { fs.rmSync(tmpDir, { recursive: true }); } catch {}
  } catch (err: any) {
    session.status = "error";
    session.errorMessage = err.message;
    await updateDb(session);
    logger.error({ err }, "Spotify download failed");
  }
}

async function runYoutubeDownload(session: DownloadSession) {
  try {
    const url = session.url;
    const isPlaylist = url.includes("list=") || url.includes("/playlist");

    if (isPlaylist) {
      await runYoutubePlaylistDownload(session);
    } else {
      await runYoutubeSingleDownload(session);
    }
  } catch (err: any) {
    session.status = "error";
    session.errorMessage = err.message;
    if (session.tracks[0]) session.tracks[0].status = "error";
    await updateDb(session);
    logger.error({ err }, "YouTube download failed");
  }
}

async function runYoutubeSingleDownload(session: DownloadSession) {
  session.status = "downloading";
  session.totalTracks = 1;
  session.tracks = [{ name: session.url, artist: "YouTube", album: "", coverUrl: "", status: "downloading" }];
  await updateDb(session);

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "spotd-yt-"));

  const filePath = await downloadVideo(session.url, {
    videoQuality: session.videoQuality || "720p",
    audioQuality: session.audioQuality,
    outputDir: tmpDir,
  });

  session.tracks[0].status = "done";
  session.tracks[0].name = path.basename(filePath || "video");
  session.completedTracks = 1;
  session.playlistName = path.basename(filePath || "video", path.extname(filePath || ""));
  session.status = "zipping";
  await updateDb(session);

  const zipPath = await createZip(session, [filePath].filter(Boolean));
  session.zipPath = zipPath;
  session.zipReady = true;
  session.status = "done";
  session.completedAt = new Date();
  session.expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await updateDb(session);

  try { fs.rmSync(tmpDir, { recursive: true }); } catch {}
}

async function runYoutubePlaylistDownload(session: DownloadSession) {
  session.status = "fetching_playlist";
  await updateDb(session);

  const { title, items } = await getYoutubePlaylistItems(session.url);
  session.playlistName = title;
  session.totalTracks = items.length;
  session.tracks = items.map((item) => ({
    name: item.title,
    artist: "YouTube",
    album: title,
    coverUrl: "",
    status: "queued" as const,
  }));
  session.status = "downloading";
  await updateDb(session);

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "spotd-ytpl-"));
  const downloadedFiles: string[] = [];

  for (let i = 0; i < items.length; i++) {
    if ((session.status as string) === "cancelled") break;
    session.tracks[i].status = "downloading";
    await updateDb(session);

    try {
      const filePath = await downloadVideo(items[i].url, {
        videoQuality: session.videoQuality || "720p",
        audioQuality: session.audioQuality,
        outputDir: tmpDir,
      });
      if (filePath) downloadedFiles.push(filePath);
      session.tracks[i].status = "done";
    } catch (err: any) {
      session.tracks[i].status = "error";
      session.tracks[i].error = err.message?.slice(0, 100);
      logger.error({ err, track: items[i].title }, "YouTube playlist item download failed");
    }
    session.completedTracks = i + 1;
    await updateDb(session);
  }

  if ((session.status as string) === "cancelled") return;

  session.status = "zipping";
  await updateDb(session);

  const zipPath = await createZip(session, downloadedFiles);
  session.zipPath = zipPath;
  session.zipReady = true;
  session.status = "done";
  session.completedAt = new Date();
  session.expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await updateDb(session);

  try { fs.rmSync(tmpDir, { recursive: true }); } catch {}
}

export async function createDownload(opts: {
  url: string;
  type: "spotify" | "youtube";
  audioQuality?: string;
  videoQuality?: string;
}): Promise<DownloadSession> {
  const id = generateId();
  const session: DownloadSession = {
    id,
    type: opts.type,
    status: "queued",
    url: opts.url,
    totalTracks: 0,
    completedTracks: 0,
    audioQuality: opts.audioQuality,
    videoQuality: opts.videoQuality,
    tracks: [],
    zipReady: false,
    createdAt: new Date(),
  };

  sessions.set(id, session);

  await db.insert(downloadsTable).values({
    id,
    type: opts.type,
    status: "queued",
    url: opts.url,
    totalTracks: 0,
    completedTracks: 0,
    audioQuality: opts.audioQuality,
    videoQuality: opts.videoQuality,
    tracks: "[]",
    zipReady: false,
  });

  if (opts.type === "spotify") {
    runSpotifyDownload(session).catch((err) =>
      logger.error({ err }, "Unhandled spotify download error")
    );
  } else {
    runYoutubeDownload(session).catch((err) =>
      logger.error({ err }, "Unhandled youtube download error")
    );
  }

  return session;
}

export function getDownload(id: string): DownloadSession | undefined {
  return sessions.get(id);
}

export function getAllDownloads(): DownloadSession[] {
  return Array.from(sessions.values()).sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );
}

export async function cancelDownload(id: string): Promise<void> {
  const session = sessions.get(id);
  if (session) {
    session.status = "cancelled";
    sessions.delete(id);
    await updateDb(session);
  }
}

export async function loadSessionsFromDb(): Promise<void> {
  try {
    const rows = await db.select().from(downloadsTable);
    for (const row of rows) {
      const s: DownloadSession = {
        id: row.id,
        type: row.type as "spotify" | "youtube",
        status: row.status as DownloadSession["status"],
        url: row.url,
        playlistName: row.playlistName || undefined,
        totalTracks: row.totalTracks,
        completedTracks: row.completedTracks,
        errorMessage: row.errorMessage || undefined,
        audioQuality: row.audioQuality || undefined,
        videoQuality: row.videoQuality || undefined,
        tracks: JSON.parse(row.tracks || "[]"),
        zipPath: row.zipPath || undefined,
        zipReady: row.zipReady,
        createdAt: row.createdAt,
        completedAt: row.completedAt || undefined,
        expiresAt: row.expiresAt || undefined,
      };
      if (!sessions.has(row.id)) {
        sessions.set(row.id, s);
      }
    }
  } catch (err) {
    logger.error({ err }, "Failed to load sessions from DB");
  }
}
