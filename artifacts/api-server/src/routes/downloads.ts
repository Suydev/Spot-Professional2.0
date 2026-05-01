import { Router } from "express";
import fs from "fs";
import path from "path";
import {
  createDownload,
  getDownload,
  getAllDownloads,
  cancelDownload,
} from "../lib/downloadManager";
import { StartDownloadBody } from "@workspace/api-zod";

const router = Router();

function sessionToResponse(s: ReturnType<typeof getDownload>) {
  if (!s) return null;
  return {
    id: s.id,
    type: s.type,
    status: s.status,
    url: s.url,
    playlistName: s.playlistName,
    totalTracks: s.totalTracks,
    completedTracks: s.completedTracks,
    errorMessage: s.errorMessage,
    audioQuality: s.audioQuality,
    videoQuality: s.videoQuality,
    tracks: s.tracks,
    zipReady: s.zipReady,
    createdAt: s.createdAt.toISOString(),
    completedAt: s.completedAt?.toISOString(),
    expiresAt: s.expiresAt?.toISOString(),
  };
}

router.get("/downloads/stats", (_req, res) => {
  const all = getAllDownloads();
  const active = all.filter((d) =>
    ["queued", "fetching_playlist", "downloading", "zipping"].includes(d.status)
  ).length;
  const completed = all.filter((d) => d.status === "done").length;
  const failed = all.filter((d) =>
    ["error", "cancelled"].includes(d.status)
  ).length;
  const totalTracksDownloaded = all.reduce(
    (sum, d) => sum + d.completedTracks,
    0
  );
  res.json({
    total: all.length,
    active,
    completed,
    failed,
    totalTracksDownloaded,
  });
});

router.get("/downloads", (_req, res) => {
  res.json(getAllDownloads().map(sessionToResponse));
});

router.post("/downloads", async (req, res) => {
  const parsed = StartDownloadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }
  const { url, type, audioQuality, videoQuality } = parsed.data;
  const session = await createDownload({
    url,
    type: type as "spotify" | "youtube",
    audioQuality,
    videoQuality,
  });
  res.status(201).json(sessionToResponse(session));
});

router.get("/downloads/:id", (req, res) => {
  const session = getDownload(req.params.id);
  if (!session) {
    res.status(404).json({ error: "not_found", message: "Download not found" });
    return;
  }
  res.json(sessionToResponse(session));
});

router.delete("/downloads/:id", async (req, res) => {
  await cancelDownload(req.params.id);
  res.status(204).send();
});

router.get("/downloads/:id/file", (req, res) => {
  const session = getDownload(req.params.id);
  if (!session || !session.zipReady || !session.zipPath) {
    res.status(404).json({ error: "not_found", message: "File not ready" });
    return;
  }
  const zipPath = session.zipPath;
  if (!fs.existsSync(zipPath)) {
    res.status(404).json({ error: "not_found", message: "File expired or deleted" });
    return;
  }
  const filename = path.basename(zipPath);
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Content-Type", "application/zip");
  fs.createReadStream(zipPath).pipe(res);
});

export default router;
