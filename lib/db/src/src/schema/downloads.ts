import { pgTable, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const downloadsTable = pgTable("downloads", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  status: text("status").notNull().default("queued"),
  url: text("url").notNull(),
  playlistName: text("playlist_name"),
  totalTracks: integer("total_tracks").notNull().default(0),
  completedTracks: integer("completed_tracks").notNull().default(0),
  errorMessage: text("error_message"),
  audioQuality: text("audio_quality").default("mp3-320"),
  videoQuality: text("video_quality").default("720p"),
  tracks: text("tracks").default("[]"),
  zipPath: text("zip_path"),
  zipReady: boolean("zip_ready").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  expiresAt: timestamp("expires_at"),
});

export const insertDownloadSchema = createInsertSchema(downloadsTable).omit({
  createdAt: true,
  completedAt: true,
  expiresAt: true,
});

export type InsertDownload = z.infer<typeof insertDownloadSchema>;
export type Download = typeof downloadsTable.$inferSelect;

export const settingsTable = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export type Setting = typeof settingsTable.$inferSelect;
