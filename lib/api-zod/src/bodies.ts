import { z } from "zod";

export const StartDownloadBody = z.object({
  url: z.string().url(),
  type: z.enum(["spotify", "youtube"]),
  audioQuality: z.string().optional(),
  videoQuality: z.string().optional(),
});

export type StartDownloadBodyType = z.infer<typeof StartDownloadBody>;

export const UpdateSettingsBody = z.object({
  audioQuality: z.string().optional(),
  videoQuality: z.string().optional(),
  chunkSize: z.number().int().min(1).max(50).optional(),
  maxSongs: z.number().int().min(1).max(500).optional(),
  embedMetadata: z.boolean().optional(),
});

export type UpdateSettingsBodyType = z.infer<typeof UpdateSettingsBody>;
