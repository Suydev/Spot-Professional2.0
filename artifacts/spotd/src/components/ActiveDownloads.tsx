import { useListDownloads, useGetDownload, useDeleteDownload, getListDownloadsQueryKey, getGetDownloadStatsQueryKey } from "@workspace/api-client-react";
import { DownloadStatus } from "@workspace/api-client-react/src/generated/api.schemas";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { DownloadCloud, X, Loader2, FileArchive, CheckCircle2, AlertCircle, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

function TrackList({ tracks }: { tracks: any[] }) {
  if (!tracks || tracks.length === 0) return null;
  
  return (
    <ScrollArea className="h-48 mt-4 rounded-md border border-border bg-background/50">
      <div className="p-2 space-y-1">
        {tracks.map((track, i) => (
          <div key={i} className="flex items-center gap-3 text-sm p-2 rounded hover:bg-muted/50">
            {track.coverUrl ? (
              <img src={track.coverUrl} alt="" className="w-8 h-8 rounded bg-muted object-cover" />
            ) : (
              <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-muted-foreground">
                <Music size={14} />
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{track.name}</p>
              <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
            </div>
            
            <div className="flex items-center">
              {track.status === "queued" && <div className="text-xs text-muted-foreground uppercase tracking-wider">Queued</div>}
              {track.status === "downloading" && <Loader2 size={16} className="text-primary animate-spin" />}
              {track.status === "done" && <CheckCircle2 size={16} className="text-primary" />}
              {track.status === "error" && <AlertCircle size={16} className="text-destructive" />}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

function DownloadItem({ id, initialData }: { id: string, initialData: any }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: download } = useGetDownload(id, {
    query: {
      enabled: !!id,
      refetchInterval: (query) => {
        const state = query.state.data;
        if (!state) return 1500;
        if (state.status === "done" || state.status === "error" || state.status === "cancelled") return false;
        return 1500;
      },
      initialData
    }
  });

  const deleteMutation = useDeleteDownload({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListDownloadsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDownloadStatsQueryKey() });
      }
    }
  });

  if (!download) return null;

  const isComplete = download.status === "done";
  const isFailed = download.status === "error";
  const isZipping = download.status === "zipping";
  const isFetching = download.status === "fetching_playlist";
  
  let progress = 0;
  if (download.totalTracks > 0) {
    progress = (download.completedTracks / download.totalTracks) * 100;
  }
  if (isComplete) progress = 100;

  const getStatusText = () => {
    switch (download.status) {
      case "queued": return "Queued for download...";
      case "fetching_playlist": return "Fetching playlist details...";
      case "downloading": return `Downloading (${download.completedTracks}/${download.totalTracks})`;
      case "zipping": return "Compressing files...";
      case "done": return "Complete";
      case "error": return "Failed";
      case "cancelled": return "Cancelled";
      default: return download.status;
    }
  };

  return (
    <div className="bg-card border border-border p-6 rounded-xl space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg">
              {download.playlistName || download.url}
            </h3>
            {download.type === "spotify" ? (
              <span className="text-[10px] uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded font-bold">Spotify</span>
            ) : (
              <span className="text-[10px] uppercase tracking-wider bg-red-500/10 text-red-500 px-2 py-0.5 rounded font-bold">YouTube</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            {getStatusText()}
            {download.errorMessage && <span className="text-destructive">- {download.errorMessage}</span>}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {isComplete && download.zipReady && (
            <Button 
              size="sm" 
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              onClick={() => {
                window.location.href = `/api/downloads/${id}/file`;
              }}
            >
              <FileArchive className="w-4 h-4 mr-2" />
              Download ZIP
            </Button>
          )}
          
          <Button 
            size="icon" 
            variant="ghost" 
            className="text-muted-foreground hover:text-destructive"
            onClick={() => deleteMutation.mutate({ id })}
            disabled={deleteMutation.isPending}
          >
            <X size={18} />
          </Button>
        </div>
      </div>
      
      {!isComplete && !isFailed && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground font-medium uppercase tracking-wider">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2 bg-secondary" />
        </div>
      )}

      {download.tracks && download.tracks.length > 0 && (
        <TrackList tracks={download.tracks} />
      )}
    </div>
  );
}

export function ActiveDownloads() {
  const { data: downloads, isLoading } = useListDownloads({
    query: { refetchInterval: 5000 }
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="font-bold text-xl mb-4">Active Downloads</h2>
        <div className="h-32 border border-border bg-card rounded-xl animate-pulse flex items-center justify-center">
          <Loader2 className="animate-spin text-muted-foreground" size={24} />
        </div>
      </div>
    );
  }

  const activeDownloads = downloads?.filter(d => 
    ["queued", "fetching_playlist", "downloading", "zipping"].includes(d.status)
  ) || [];

  if (activeDownloads.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="font-bold text-xl mb-4">Active Downloads</h2>
        <div className="border border-dashed border-border bg-background/50 rounded-xl p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4 text-muted-foreground">
            <DownloadCloud size={24} />
          </div>
          <p className="font-medium">No active downloads</p>
          <p className="text-sm text-muted-foreground mt-1">Paste a link above to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="font-bold text-xl mb-4 flex items-center gap-2">
        Active Downloads
        <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full font-bold">{activeDownloads.length}</span>
      </h2>
      <div className="space-y-4">
        {activeDownloads.map(download => (
          <DownloadItem key={download.id} id={download.id} initialData={download} />
        ))}
      </div>
    </div>
  );
}
