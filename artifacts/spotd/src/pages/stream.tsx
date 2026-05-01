import { useState, useRef } from "react";
import { Search, Play, Music2, Loader2, Radio, X, Volume2, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SearchResult {
  videoId: string;
  title: string;
  author: string;
  lengthSeconds: number;
  thumbnail: string;
}

interface NowPlaying {
  videoId: string;
  title: string;
  author: string;
  thumbnail: string;
  embedUrl: string;
}

function formatDuration(secs: number) {
  if (!secs) return "--:--";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatViews(n: number) {
  if (!n) return "";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function CategoryChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function ResultCard({ result, onPlay }: { result: SearchResult; onPlay: () => void }) {
  return (
    <div
      onClick={onPlay}
      className="group flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
    >
      <div className="relative flex-shrink-0">
        <img
          src={result.thumbnail}
          alt={result.title}
          className="w-14 h-14 rounded object-cover bg-muted"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='56'%3E%3Crect width='56' height='56' fill='%23333'/%3E%3C/svg%3E";
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded opacity-0 group-hover:opacity-100 transition-opacity">
          <Play size={20} fill="white" className="text-white" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate text-sm">{result.title}</p>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{result.author}</p>
      </div>
      <div className="text-xs text-muted-foreground flex-shrink-0 text-right">
        <p>{formatDuration(result.lengthSeconds)}</p>
      </div>
    </div>
  );
}

function PlayerFrame({ track, onClose }: { track: NowPlaying; onClose: () => void }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-2xl z-50">
      <div className="max-w-7xl mx-auto flex items-center gap-4 p-4">
        <img
          src={track.thumbnail}
          alt={track.title}
          className="w-12 h-12 rounded object-cover flex-shrink-0"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48'%3E%3Crect width='48' height='48' fill='%23333'/%3E%3C/svg%3E";
          }}
        />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{track.title}</p>
          <p className="text-xs text-muted-foreground truncate">{track.author}</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`https://www.youtube.com/watch?v=${track.videoId}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <ExternalLink size={16} />
            </Button>
          </a>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" onClick={onClose}>
            <X size={18} />
          </Button>
        </div>
      </div>
      <div className="w-full" style={{ height: 0, paddingBottom: "56.25%" as any, position: "relative" }}>
        <iframe
          src={track.embedUrl}
          className="absolute inset-0 w-full h-full"
          style={{ display: "none" }}
          allow="autoplay; encrypted-media"
          allowFullScreen
          title={track.title}
        />
      </div>
      {/* Actual embedded player - smaller for bar style */}
      <iframe
        src={`https://www.youtube.com/embed/${track.videoId}?autoplay=1&quality=hd1080&rel=0`}
        className="w-full"
        style={{ height: "80px", border: "none" }}
        allow="autoplay; encrypted-media"
        allowFullScreen
        title={track.title}
      />
    </div>
  );
}

const CATEGORIES = [
  { id: "video", label: "All Music" },
  { id: "playlist", label: "Playlists" },
  { id: "channel", label: "Artists / Channels" },
];

const FEATURED_SEARCHES = [
  "Arijit Singh", "Bollywood 2024", "Lo-fi beats", "Taylor Swift", "Hip Hop playlist", "EDM top hits", "Classical music", "Podcasts"
];

export default function StreamPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("video");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const search = async (q: string, cat = category) => {
    if (!q.trim()) return;
    setLoading(true);
    setError("");
    setHasSearched(true);
    try {
      const res = await fetch(`/api/stream/search?q=${encodeURIComponent(q)}&type=${cat}`);
      if (!res.ok) throw new Error(`Search failed: ${res.statusText}`);
      const data = await res.json();
      setResults(data.results || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    search(query, category);
  };

  const handlePlay = async (result: SearchResult) => {
    setNowPlaying({
      videoId: result.videoId,
      title: result.title,
      author: result.author,
      thumbnail: result.thumbnail,
      embedUrl: `https://www.youtube.com/embed/${result.videoId}?autoplay=1&quality=hd1080&rel=0`,
    });
  };

  const handleCategoryChange = (cat: string) => {
    setCategory(cat);
    if (query.trim()) search(query, cat);
  };

  return (
    <div className="max-w-5xl mx-auto p-8 pt-12 pb-40">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Radio size={22} className="text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground">Spot D</h1>
            <p className="text-muted-foreground text-sm">Stream in highest quality — No Ads, Enjoy 🎵</p>
          </div>
        </div>
        <div className="mt-4 inline-flex items-center gap-2 bg-primary/10 text-primary text-sm px-4 py-2 rounded-full font-medium">
          <Volume2 size={14} />
          Streaming at highest available quality · Zero ads
        </div>
      </header>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for songs, playlists, artists, albums, podcasts..."
            className="pl-11 h-12 text-base bg-card border-border rounded-xl"
          />
        </div>
        <Button type="submit" disabled={loading || !query.trim()} className="h-12 px-8 text-base font-semibold rounded-xl">
          {loading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
        </Button>
      </form>

      {/* Category chips */}
      <div className="flex gap-2 mb-8 flex-wrap">
        {CATEGORIES.map((cat) => (
          <CategoryChip
            key={cat.id}
            label={cat.label}
            active={category === cat.id}
            onClick={() => handleCategoryChange(cat.id)}
          />
        ))}
      </div>

      {/* Featured searches (when no search done) */}
      {!hasSearched && (
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-4 text-foreground">Browse</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {FEATURED_SEARCHES.map((term) => (
              <button
                key={term}
                onClick={() => {
                  setQuery(term);
                  search(term, category);
                }}
                className="bg-card border border-border rounded-xl p-4 text-left hover:border-primary/40 hover:bg-card/80 transition-colors"
              >
                <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center mb-2">
                  <Music2 size={16} className="text-primary" />
                </div>
                <p className="text-sm font-medium">{term}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-xl p-4 mb-6 text-sm">
          {error}
        </div>
      )}

      {/* Results */}
      {hasSearched && !loading && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">
              {results.length > 0 ? `${results.length} results` : "No results found"}
            </h2>
          </div>
          <ScrollArea className="h-[calc(100vh-480px)] min-h-[300px]">
            <div className="space-y-1">
              {results.map((result) => (
                <ResultCard key={result.videoId} result={result} onPlay={() => handlePlay(result)} />
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Now playing bar */}
      {nowPlaying && <PlayerFrame track={nowPlaying} onClose={() => setNowPlaying(null)} />}
    </div>
  );
}
