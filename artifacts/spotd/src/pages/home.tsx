import { DownloadForm } from "@/components/DownloadForm";
import { StatsDashboard } from "@/components/StatsDashboard";
import { ActiveDownloads } from "@/components/ActiveDownloads";

export default function Home() {
  return (
    <div className="max-w-5xl mx-auto p-8 pt-12">
      <header className="mb-10">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground">SpotD Workspace</h1>
        <p className="text-muted-foreground mt-2 text-lg">Your professional local music archive.</p>
      </header>

      <StatsDashboard />
      <DownloadForm />
      <ActiveDownloads />
    </div>
  );
}
