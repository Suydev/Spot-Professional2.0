import { Router } from "express";
import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db";
import { UpdateSettingsBody } from "@workspace/api-zod";

const router = Router();

const DEFAULTS = {
  audioQuality: "mp3-320",
  videoQuality: "720p",
  chunkSize: 15,
  maxSongs: 60,
  embedMetadata: true,
};

async function loadSettings() {
  const rows = await db.select().from(settingsTable);
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;
  return {
    audioQuality: map["audioQuality"] ?? DEFAULTS.audioQuality,
    videoQuality: map["videoQuality"] ?? DEFAULTS.videoQuality,
    chunkSize: parseInt(map["chunkSize"] ?? String(DEFAULTS.chunkSize)),
    maxSongs: parseInt(map["maxSongs"] ?? String(DEFAULTS.maxSongs)),
    embedMetadata: (map["embedMetadata"] ?? "true") === "true",
  };
}

async function saveSettings(data: Partial<typeof DEFAULTS>) {
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined) continue;
    const strVal = String(v);
    await db
      .insert(settingsTable)
      .values({ key: k, value: strVal })
      .onConflictDoUpdate({ target: settingsTable.key, set: { value: strVal } });
  }
}

router.get("/settings", async (_req, res) => {
  const settings = await loadSettings();
  res.json(settings);
});

router.put("/settings", async (req, res) => {
  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }
  await saveSettings(parsed.data);
  const updated = await loadSettings();
  res.json(updated);
});

export default router;
