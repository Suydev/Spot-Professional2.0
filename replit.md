# SpotD — Professional Downloader & Streamer

## Overview

pnpm workspace monorepo using TypeScript. Based on [Spot-Professional](https://github.com/Suydev/Spot-Professional) — an enhanced Spotify & YouTube downloader.

## Artifacts

| Artifact | Path | Description |
|----------|------|-------------|
| `artifacts/spotd` | `/` | Web UI — Downloader, Stream, History, Settings |
| `artifacts/api-server` | `/api` | Express REST API (downloads, settings, streaming search) |
| `artifacts/spotd-mobile` | `/mobile` | Expo React Native mobile app |

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM (`lib/db`)
- **Validation**: Zod, `drizzle-zod` (`lib/api-zod`)
- **API codegen**: Orval (from OpenAPI spec at `lib/api-spec/openapi.yaml`)
- **Build**: esbuild (CJS bundle)
- **Mobile**: Expo SDK (React Native)

## Backend Architecture

| Service | Port | Path |
|---------|------|------|
| API Server (Express) | 8080 | `/api` |
| SpotD Web (Vite/React) | dynamic | `/` |
| SpotD Mobile (Expo) | dynamic | `/mobile` |

**Key backend paths:**
- yt-dlp binary: `/home/runner/workspace/.pythonlibs/bin/yt-dlp`
- ffmpeg: `/nix/store/zpa9hwqagqkkagh1ky21l6xf41mfq933-replit-runtime-path/bin`
- Downloads temp dir: `/tmp/spotd-*`

**Search strategy (stream/search endpoint):**
1. Try Invidious API (10 instances, 6s timeout each)
2. On failure → yt-dlp `ytsearch20:query` as fallback (always works)

## Features Implemented

### Web UI (artifacts/spotd)
- **Top banner**: "Made with love for listeners ❤️ by Suyash Prabhu" with beating heart animation
- **Downloader**: 3-tab interface — Spotify, Podcasts, YouTube
  - Spotify: playlists, albums, single tracks (FLAC/MP3 quality options)
  - Podcasts: Spotify show/episode URLs
  - YouTube: single video + playlist downloader (360p → 8K / 4320p)
- **Spot D Stream page** (`/stream`): Spotify-like UI, search for songs/artists/playlists/podcasts via Invidious, embedded YouTube player, "No Ads, Enjoy" branding
- **Settings**: Audio quality (MP3 128–320kbps, FLAC), Video quality (360p → 8K), concurrency, playlist limits

### API (artifacts/api-server)
- `GET/POST /api/downloads` — download management
- `GET /api/downloads/stats` — live stats
- `GET/PUT /api/settings` — quality and engine settings
- `GET /api/stream/search` — search via Invidious API (no ads)
- **yt-dlp backend** with 4K/8K video quality support and playlist downloads
- **Spotify integration**: tracks, albums, playlists, podcast episodes/shows

### Mobile (artifacts/spotd-mobile)
- Expo React Native app with download + streaming tabs
- `eas.json` configured with `preview` profile for APK builds

### CI/CD
- `.github/workflows/build-apk.yml` — two jobs:
  1. **EAS Build** (cloud, requires `EXPO_TOKEN` secret)
  2. **Local Gradle build** (no EAS, self-contained APK)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Lib Packages

| Package | Purpose |
|---------|---------|
| `lib/db` | Drizzle ORM schema — `downloadsTable`, `settingsTable` |
| `lib/api-zod` | Zod validation bodies — `StartDownloadBody`, `UpdateSettingsBody` |
| `lib/api-spec` | OpenAPI spec for Orval codegen |
| `lib/api-client-react` | Generated React Query hooks |

## Important Notes

- `DATABASE_URL` must be set (provisioned via Replit PostgreSQL)
- The Vite dev server runs on `$PORT` (assigned per artifact, no hardcoded ports)
- API base URL is relative — the generated API client calls `/api/...` paths directly, routed by Replit proxy
- `setBaseUrl` should NOT be called in App.tsx (API paths already include `/api`)
