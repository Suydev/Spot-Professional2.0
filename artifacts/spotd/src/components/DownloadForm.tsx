import { useState } from "react";
import { useStartDownload, getListDownloadsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { SiSpotify, SiYoutube } from "react-icons/si";
import { DownloadCloud, Loader2, Mic2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { AudioQuality, VideoQuality } from "@workspace/api-client-react/src/generated/api.schemas";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Tab = "spotify" | "youtube" | "podcast";

function detectUrlType(url: string): Tab {
  if (url.includes("spotify.com/episode") || url.includes("spotify.com/show") || url.includes("spotify:episode:") || url.includes("spotify:show:")) {
    return "podcast";
  }
  if (url.includes("spotify.com") || url.includes("spotify:")) {
    return "spotify";
  }
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    return "youtube";
  }
  return "spotify";
}

function isYouTubePlaylist(url: string) {
  return url.includes("list=") || url.includes("/playlist");
}

export function DownloadForm() {
  const [tab, setTab] = useState<Tab>("spotify");
  const [url, setUrl] = useState("");
  const [audioQuality, setAudioQuality] = useState<AudioQuality>("mp3-320");
  const [videoQuality, setVideoQuality] = useState<VideoQuality>("1080p");

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const startDownload = useStartDownload({
    mutation: {
      onSuccess: () => {
        setUrl("");
        queryClient.invalidateQueries({ queryKey: getListDownloadsQueryKey() });
        toast({ title: "Download started", description: "Your download has been queued." });
      },
      onError: (error) => {
        toast({
          title: "Failed to start download",
          description: (error.error as any)?.message || (error.error as any)?.error || "Unknown error occurred",
          variant: "destructive",
        });
      },
    },
  });

  const handleUrlChange = (val: string) => {
    setUrl(val);
    if (val.trim()) {
      const detected = detectUrlType(val);
      setTab(detected);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    const apiType = tab === "podcast" ? "spotify" : tab;
    startDownload.mutate({
      data: {
        url: url.trim(),
        type: apiType as "spotify" | "youtube",
        audioQuality,
        ...(tab === "youtube" ? { videoQuality } : {}),
      },
    });
  };

  const isYtPlaylist = tab === "youtube" && isYouTubePlaylist(url);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden mb-8 shadow-sm">
      <div className="flex border-b border-border">
        <button
          onClick={() => setTab("spotify")}
          className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors ${
            tab === "spotify"
              ? "bg-background text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <SiSpotify size={18} />
          Spotify
        </button>
        <button
          onClick={() => setTab("podcast")}
          className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors ${
            tab === "podcast"
              ? "bg-background text-orange-400 border-b-2 border-orange-400"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <Mic2 size={18} />
          Podcasts
        </button>
        <button
          onClick={() => setTab("youtube")}
          className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors ${
            tab === "youtube"
              ? "bg-background text-red-500 border-b-2 border-red-500"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <SiYoutube size={18} />
          YouTube
        </button>
      </div>

      <div className="p-6 bg-background">
        <form onSubmit={handleSubmit} className="flex gap-4 items-start">
          <div className="flex-1 space-y-4">
            <Input
              placeholder={
                tab === "spotify"
                  ? "Paste Spotify playlist, album or track URL..."
                  : tab === "podcast"
                  ? "Paste Spotify podcast show or episode URL..."
                  : isYtPlaylist
                  ? "YouTube Playlist detected — will download all videos"
                  : "Paste YouTube video or playlist URL..."
              }
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              className="h-12 bg-card border-border text-base"
            />

            {isYtPlaylist && (
              <p className="text-xs text-amber-500 flex items-center gap-1">
                📋 YouTube playlist detected — all videos will be downloaded
              </p>
            )}

            <div className="flex flex-wrap gap-4">
              {/* Spotify / Podcast audio quality */}
              {(tab === "spotify" || tab === "podcast") && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Audio Quality
                  </label>
                  <Select value={audioQuality} onValueChange={(v) => setAudioQuality(v as AudioQuality)}>
                    <SelectTrigger className="w-[200px] bg-card">
                      <SelectValue placeholder="Audio Quality" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mp3-128">MP3 128kbps — Compact</SelectItem>
                      <SelectItem value="mp3-192">MP3 192kbps — Standard</SelectItem>
                      <SelectItem value="mp3-320">MP3 320kbps — High Quality</SelectItem>
                      <SelectItem value="flac">FLAC — Lossless HQ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* YouTube audio quality */}
              {tab === "youtube" && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Audio
                  </label>
                  <Select value={audioQuality} onValueChange={(v) => setAudioQuality(v as AudioQuality)}>
                    <SelectTrigger className="w-[180px] bg-card">
                      <SelectValue placeholder="Audio Quality" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mp3-128">MP3 128kbps</SelectItem>
                      <SelectItem value="mp3-192">MP3 192kbps</SelectItem>
                      <SelectItem value="mp3-320">MP3 320kbps</SelectItem>
                      <SelectItem value="flac">FLAC Lossless</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* YouTube video quality */}
              {tab === "youtube" && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Video Quality
                  </label>
                  <Select value={videoQuality} onValueChange={(v) => setVideoQuality(v as VideoQuality)}>
                    <SelectTrigger className="w-[200px] bg-card">
                      <SelectValue placeholder="Video Quality" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="360p">360p — Mobile</SelectItem>
                      <SelectItem value="480p">480p — SD</SelectItem>
                      <SelectItem value="720p">720p — HD</SelectItem>
                      <SelectItem value="1080p">1080p — Full HD</SelectItem>
                      <SelectItem value="1440p">1440p — 2K</SelectItem>
                      <SelectItem value="2160p">2160p — 4K Ultra HD</SelectItem>
                      <SelectItem value="4320p">4320p — 8K Ultra HD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          <Button
            type="submit"
            disabled={!url.trim() || startDownload.isPending}
            className={`h-12 px-8 text-base font-semibold ${
              tab === "youtube"
                ? "bg-red-600 hover:bg-red-700 text-white"
                : tab === "podcast"
                ? "bg-orange-500 hover:bg-orange-600 text-white"
                : ""
            }`}
          >
            {startDownload.isPending ? (
              <Loader2 className="animate-spin mr-2" size={20} />
            ) : (
              <DownloadCloud className="mr-2" size={20} />
            )}
            {tab === "podcast" ? "Download Podcast" : isYtPlaylist ? "Download Playlist" : "Download"}
          </Button>
        </form>
      </div>
    </div>
  );
}
