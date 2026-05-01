import { useGetDownloadStats } from "@workspace/api-client-react";
import { Activity, CheckCircle2, AlertCircle, HardDrive, ListMusic } from "lucide-react";

export function StatsDashboard() {
  const { data: stats } = useGetDownloadStats({
    query: { refetchInterval: 5000 }
  });

  if (!stats) return null;

  return (
    <div className="grid grid-cols-5 gap-4 mb-8">
      <div className="bg-card border border-border p-4 rounded-xl flex items-center gap-4">
        <div className="p-3 bg-blue-500/10 text-blue-500 rounded-lg">
          <HardDrive size={20} />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Total Requests</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
      </div>
      <div className="bg-card border border-border p-4 rounded-xl flex items-center gap-4">
        <div className="p-3 bg-primary/10 text-primary rounded-lg">
          <Activity size={20} />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Active</p>
          <p className="text-2xl font-bold">{stats.active}</p>
        </div>
      </div>
      <div className="bg-card border border-border p-4 rounded-xl flex items-center gap-4">
        <div className="p-3 bg-green-500/10 text-green-500 rounded-lg">
          <CheckCircle2 size={20} />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Completed</p>
          <p className="text-2xl font-bold">{stats.completed}</p>
        </div>
      </div>
      <div className="bg-card border border-border p-4 rounded-xl flex items-center gap-4">
        <div className="p-3 bg-destructive/10 text-destructive rounded-lg">
          <AlertCircle size={20} />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Failed</p>
          <p className="text-2xl font-bold">{stats.failed}</p>
        </div>
      </div>
      <div className="bg-card border border-border p-4 rounded-xl flex items-center gap-4">
        <div className="p-3 bg-purple-500/10 text-purple-500 rounded-lg">
          <ListMusic size={20} />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Tracks DL'd</p>
          <p className="text-2xl font-bold">{stats.totalTracksDownloaded}</p>
        </div>
      </div>
    </div>
  );
}
