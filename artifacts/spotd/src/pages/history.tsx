import { useListDownloads, useDeleteDownload, getListDownloadsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { FileArchive, X, Loader2, Music, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function History() {
  const queryClient = useQueryClient();
  const { data: downloads, isLoading } = useListDownloads();
  
  const deleteMutation = useDeleteDownload({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListDownloadsQueryKey() });
      }
    }
  });

  const pastDownloads = downloads?.filter(d => 
    ["done", "error", "cancelled"].includes(d.status)
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) || [];

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-8 pt-12">
      <header className="mb-10">
        <h1 className="text-4xl font-extrabold tracking-tight">Download History</h1>
        <p className="text-muted-foreground mt-2 text-lg">Your archive of past requests and completed bundles.</p>
      </header>

      {pastDownloads.length === 0 ? (
        <div className="border border-dashed border-border bg-card rounded-xl p-16 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4 text-muted-foreground">
            <FileArchive size={32} />
          </div>
          <h2 className="text-xl font-bold mb-2">No history yet</h2>
          <p className="text-muted-foreground">Your completed downloads will appear here.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Details</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pastDownloads.map((download) => (
                <TableRow key={download.id} className="group">
                  <TableCell>
                    <div className="font-medium text-base truncate max-w-[300px]">
                      {download.playlistName || download.url}
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <Music size={12} />
                      {download.completedTracks}/{download.totalTracks} tracks
                    </div>
                  </TableCell>
                  <TableCell>
                    {download.type === "spotify" ? (
                      <span className="text-[10px] uppercase tracking-wider bg-primary/10 text-primary px-2 py-1 rounded font-bold">Spotify</span>
                    ) : (
                      <span className="text-[10px] uppercase tracking-wider bg-red-500/10 text-red-500 px-2 py-1 rounded font-bold">YouTube</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {download.status === "done" && (
                      <Badge variant="outline" className="text-primary border-primary bg-primary/5">
                        <CheckCircle2 size={12} className="mr-1" />
                        Complete
                      </Badge>
                    )}
                    {download.status === "error" && (
                      <Badge variant="outline" className="text-destructive border-destructive bg-destructive/5">
                        <AlertCircle size={12} className="mr-1" />
                        Failed
                      </Badge>
                    )}
                    {download.status === "cancelled" && (
                      <Badge variant="secondary">Cancelled</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(download.createdAt), "MMM d, yyyy h:mm a")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {download.status === "done" && download.zipReady && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="hover:bg-primary hover:text-primary-foreground transition-colors font-medium"
                          onClick={() => {
                            window.location.href = `/api/downloads/${download.id}/file`;
                          }}
                        >
                          <FileArchive size={16} className="mr-2" />
                          ZIP
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => deleteMutation.mutate({ id: download.id })}
                      >
                        <X size={16} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
