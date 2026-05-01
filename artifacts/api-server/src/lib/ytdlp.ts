import { spawn } from "child_process";
import path from "path";
import fs from "fs";

const YTDLP_PATH =
  process.env.YTDLP_PATH ||
  "/home/runner/workspace/.pythonlibs/bin/yt-dlp";
const FFMPEG_PATH = "/nix/store/zpa9hwqagqkkagh1ky21l6xf41mfq933-replit-runtime-path/bin";

export interface YtdlpOptions {
  audioQuality?: string;
  videoQuality?: string;
  outputDir: string;
  onProgress?: (line: string) => void;
}

function qualityToAudioArgs(q: string): string[] {
  if (q === "flac") return ["--audio-format", "flac", "--audio-quality", "0"];
  if (q === "mp3-320") return ["--audio-format", "mp3", "--audio-quality", "0"];
  if (q === "mp3-192") return ["--audio-format", "mp3", "--audio-quality", "5"];
  if (q === "mp3-128") return ["--audio-format", "mp3", "--audio-quality", "9"];
  return ["--audio-format", "mp3", "--audio-quality", "0"];
}

function qualityToVideoFormat(q: string): string {
  if (q === "4320p" || q === "8k")
    return "bestvideo[height<=4320]+bestaudio/bestvideo[height<=4320][ext=mp4]+bestaudio[ext=m4a]/best";
  if (q === "2160p" || q === "4k")
    return "bestvideo[height<=2160]+bestaudio/bestvideo[height<=2160][ext=mp4]+bestaudio[ext=m4a]/best";
  if (q === "1440p")
    return "bestvideo[height<=1440][ext=mp4]+bestaudio[ext=m4a]/best[height<=1440][ext=mp4]/best";
  if (q === "1080p")
    return "bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080][ext=mp4]/best";
  if (q === "720p")
    return "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]/best";
  if (q === "480p")
    return "bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/best[height<=480][ext=mp4]/best";
  if (q === "360p")
    return "bestvideo[height<=360][ext=mp4]+bestaudio[ext=m4a]/best[height<=360][ext=mp4]/best";
  return "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best";
}

function spawnYtdlp(args: string[], onProgress?: (l: string) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(YTDLP_PATH, args);
    let output = "";
    let error = "";

    proc.stdout.on("data", (d: Buffer) => {
      const line = d.toString().trim();
      if (line) output += line + "\n";
      onProgress?.(line);
    });
    proc.stderr.on("data", (d: Buffer) => {
      error += d.toString();
    });
    proc.on("close", (code) => {
      if (code === 0) {
        resolve(output.trim());
      } else {
        reject(new Error(error.trim() || `yt-dlp exited with code ${code}`));
      }
    });
    proc.on("error", (err) => reject(err));
  });
}

export function downloadAudio(
  searchQuery: string,
  opts: YtdlpOptions
): Promise<string> {
  const audioArgs = qualityToAudioArgs(opts.audioQuality || "mp3-320");
  const outputTemplate = path.join(opts.outputDir, "%(title)s.%(ext)s");
  const args = [
    "--no-playlist",
    "--extract-audio",
    ...audioArgs,
    "--embed-metadata",
    "--embed-thumbnail",
    "--add-metadata",
    "--ffmpeg-location",
    FFMPEG_PATH,
    "-o",
    outputTemplate,
    "--no-progress",
    "--quiet",
    "--print",
    "after_move:filepath",
    `ytsearch1:${searchQuery}`,
  ];
  return spawnYtdlp(args, opts.onProgress).then((out) => out.split("\n").pop() || "");
}

export function downloadAudioWithMeta(
  searchQuery: string,
  opts: YtdlpOptions & {
    title?: string;
    artist?: string;
    album?: string;
    coverUrl?: string;
    trackNumber?: number;
    year?: string;
  }
): Promise<string> {
  const audioArgs = qualityToAudioArgs(opts.audioQuality || "mp3-320");
  const outputTemplate = path.join(opts.outputDir, "%(title)s.%(ext)s");
  const args = [
    "--no-playlist",
    "--extract-audio",
    ...audioArgs,
    "--embed-metadata",
    "--embed-thumbnail",
    "--add-metadata",
    "--ffmpeg-location",
    FFMPEG_PATH,
  ];

  if (opts.title) args.push("--replace-in-metadata", "title", ".*", opts.title);
  if (opts.artist) args.push("--replace-in-metadata", "artist", ".*", opts.artist);
  if (opts.album) args.push("--replace-in-metadata", "album", ".*", opts.album);

  args.push(
    "-o", outputTemplate,
    "--no-progress",
    "--quiet",
    "--print", "after_move:filepath",
    `ytsearch1:${searchQuery}`,
  );
  return spawnYtdlp(args, opts.onProgress).then((out) => out.split("\n").pop() || "");
}

export function downloadVideo(url: string, opts: YtdlpOptions): Promise<string> {
  const format = qualityToVideoFormat(opts.videoQuality || "720p");
  const outputTemplate = path.join(opts.outputDir, "%(title)s.%(ext)s");
  const args = [
    "--no-playlist",
    "--format",
    format,
    "--merge-output-format",
    "mp4",
    "--embed-metadata",
    "--embed-thumbnail",
    "--ffmpeg-location",
    FFMPEG_PATH,
    "-o",
    outputTemplate,
    "--no-progress",
    "--quiet",
    "--print",
    "after_move:filepath",
    url,
  ];
  return spawnYtdlp(args, opts.onProgress).then((out) => out.split("\n").pop() || "");
}

export interface PlaylistItem {
  title: string;
  url: string;
}

export async function getYoutubePlaylistItems(playlistUrl: string): Promise<{ title: string; items: PlaylistItem[] }> {
  const args = [
    "--flat-playlist",
    "--print",
    "%(title)s\t%(webpage_url)s",
    "--no-warnings",
    "--quiet",
    playlistUrl,
  ];
  const output = await spawnYtdlp(args);
  const items: PlaylistItem[] = [];
  for (const line of output.split("\n")) {
    const [title, url] = line.split("\t");
    if (title && url) items.push({ title: title.trim(), url: url.trim() });
  }

  const titleArgs = ["--print", "playlist_title", "--no-warnings", "--quiet", "--playlist-items", "1", playlistUrl];
  let playlistTitle = "YouTube Playlist";
  try {
    const titleOut = await spawnYtdlp(titleArgs);
    if (titleOut.trim()) playlistTitle = titleOut.trim().split("\n")[0];
  } catch {}

  return { title: playlistTitle, items };
}

export async function downloadVideoFromUrl(url: string, opts: YtdlpOptions): Promise<string> {
  return downloadVideo(url, opts);
}
