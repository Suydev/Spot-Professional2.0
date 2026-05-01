import { Link } from "wouter";
import { DownloadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-background/50">
      <div className="w-20 h-20 bg-muted rounded-2xl flex items-center justify-center text-muted-foreground mb-6">
        <DownloadCloud size={40} />
      </div>
      <h1 className="text-4xl font-extrabold tracking-tight mb-2 text-foreground">404</h1>
      <p className="text-xl text-muted-foreground mb-8">Page not found in the SpotD workspace.</p>
      
      <Link href="/">
        <Button size="lg" className="h-12 px-8 text-base font-semibold">
          Return to Downloader
        </Button>
      </Link>
    </div>
  );
}
