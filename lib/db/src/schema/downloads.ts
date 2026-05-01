import { pgTable, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const downloadsTable = pgTable("downloads", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  status: text("status").notNull().default("queued"),
  url: text("url").notNull(),
  playlistName: text("playlist_name"),
  totalTracks: integer("total_tracks").notNull().default(0),
  completedTracks: integer("completed_tracks").notNull().default(0),
  errorMessage: text("error_message"),
  audioQuality: text("audio_quality"),
  videoQuality: text("video_quality"),
  tracks: text("tracks").notNull().default("[]"),
  zipPath: text("zip_path"),
  zipReady: boolean("zip_ready").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  expiresAt: timestamp("expires_at"),
});
