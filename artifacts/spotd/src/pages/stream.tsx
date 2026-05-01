import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search, Play, Pause, SkipBack, SkipForward, Shuffle, Repeat,
  Volume2, VolumeX, Heart, Loader2, Music2, Radio, ChevronLeft
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

interface SearchResult {
  videoId: string;
  title: string;
  author: string;
  lengthSeconds: number;
  thumbnail: string;
  viewCount?: number;
}

interface PlayerState {
  track: SearchResult;
  playing: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: boolean;
  liked: boolean;
  queue: SearchResult[];
  queueIndex: number;
}

function formatTime(secs: number) {
  if (!secs || isNaN(secs)) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const GENRE_CARDS = [
  { label: "Phonk", color: "from-purple-900 to-purple-700", query: "phonk music 2024" },
  { label: "Lo-fi Beats", color: "from-blue-900 to-blue-700", query: "lofi hip hop beats" },
  { label: "Bollywood", color: "from-pink-900 to-pink-700", query: "bollywood hits 2024" },
  { label: "Hip Hop", color: "from-yellow-900 to-yellow-700", query: "hip hop playlist 2024" },
  { label: "Pop Hits", color: "from-green-900 to-green-700", query: "top pop hits 2024" },
  { label: "Rock", color: "from-red-900 to-red-700", query: "rock classics playlist" },
  { label: "EDM", color: "from-cyan-900 to-cyan-700", query: "edm electronic music 2024" },
  { label: "Podcasts", color: "from-orange-900 to-orange-700", query: "popular podcasts 2024" },
  { label: "Taylor Swift", color: "from-violet-900 to-violet-700", query: "Taylor Swift songs" },
  { label: "Arijit Singh", color: "from-rose-900 to-rose-700", query: "Arijit Singh songs" },
  { label: "Jazz", color: "from-amber-900 to-amber-700", query: "jazz music smooth" },
  { label: "Classical", color: "from-slate-900 to-slate-700", query: "classical music piano" },
];

function useYouTubePlayer(iframeId: string) {
  const playerRef = useRef<any>(null);
  const [apiReady, setApiReady] = useState(false);

  useEffect(() => {
    if (window.YT && window.YT.Player) {
      setApiReady(true);
      return;
    }
    const existing = document.getElementById("yt-api-script");
    if (!existing) {
      const tag = document.createElement("script");
      tag.id = "yt-api-script";
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
    const poll = setInterval(() => {
      if (window.YT && window.YT.Player) {
        setApiReady(true);
        clearInterval(poll);
      }
    }, 300);
    return () => clearInterval(poll);
  }, []);

  return { playerRef, apiReady };
}

export default function StreamPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [searchLabel, setSearchLabel] = useState("");
  const [playerState, setPlayerState] = useState<PlayerState | null>(null);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const { playerRef, apiReady } = useYouTubePlayer("yt-hidden-player");
  const iframeContainerRef = useRef<HTMLDivElement>(null);

  const initPlayer = useCallback((videoId: string, queue: SearchResult[], idx: number, autoplay = true) => {
    const container = iframeContainerRef.current;
    if (!container) return;

    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }

    const div = document.createElement("div");
    div.id = "yt-hidden-player";
    container.innerHTML = "";
    container.appendChild(div);

    if (!apiReady) return;

    playerRef.current = new window.YT.Player("yt-hidden-player", {
      videoId,
      playerVars: {
        autoplay: autoplay ? 1 : 0,
        controls: 0,
        rel: 0,
        iv_load_policy: 3,
        modestbranding: 1,
        quality: "hd1080",
      },
      events: {
        onStateChange: (event: any) => {
          if (event.data === window.YT.PlayerState.ENDED) {
            goNext();
          }
          if (event.data === window.YT.PlayerState.PLAYING) {
            setPlayerState(prev => prev ? { ...prev, playing: true, duration: playerRef.current?.getDuration() || 0 } : prev);
          }
          if (event.data === window.YT.PlayerState.PAUSED) {
            setPlayerState(prev => prev ? { ...prev, playing: false } : prev);
          }
        },
      },
    });
  }, [apiReady]);

  useEffect(() => {
    if (progressTimer.current) clearInterval(progressTimer.current);
    if (!playerState?.playing) return;
    progressTimer.current = setInterval(() => {
      if (playerRef.current?.getCurrentTime) {
        const ct = playerRef.current.getCurrentTime() || 0;
        const dur = playerRef.current.getDuration() || 0;
        setPlayerState(prev => prev ? { ...prev, currentTime: ct, duration: dur } : prev);
      }
    }, 500);
    return () => { if (progressTimer.current) clearInterval(progressTimer.current); };
  }, [playerState?.playing]);

  const play = (track: SearchResult, queue: SearchResult[], idx: number) => {
    setPlayerState(prev => ({
      track,
      playing: true,
      currentTime: 0,
      duration: track.lengthSeconds || 0,
      volume: prev?.volume ?? 80,
      muted: prev?.muted ?? false,
      shuffle: prev?.shuffle ?? false,
      repeat: prev?.repeat ?? false,
      liked: false,
      queue,
      queueIndex: idx,
    }));
    if (apiReady) initPlayer(track.videoId, queue, idx);
  };

  const togglePlay = () => {
    if (!playerState) return;
    if (playerState.playing) {
      playerRef.current?.pauseVideo?.();
    } else {
      playerRef.current?.playVideo?.();
    }
    setPlayerState(prev => prev ? { ...prev, playing: !prev.playing } : prev);
  };

  const goNext = useCallback(() => {
    setPlayerState(prev => {
      if (!prev) return prev;
      let nextIdx: number;
      if (prev.shuffle) {
        nextIdx = Math.floor(Math.random() * prev.queue.length);
      } else {
        nextIdx = prev.queueIndex + 1;
        if (nextIdx >= prev.queue.length) {
          if (prev.repeat) nextIdx = 0;
          else return prev;
        }
      }
      const next = prev.queue[nextIdx];
      setTimeout(() => initPlayer(next.videoId, prev.queue, nextIdx), 50);
      return { ...prev, track: next, queueIndex: nextIdx, currentTime: 0, duration: next.lengthSeconds || 0, playing: true };
    });
  }, [initPlayer]);

  const goPrev = () => {
    setPlayerState(prev => {
      if (!prev) return prev;
      if (prev.currentTime > 3) {
        playerRef.current?.seekTo?.(0, true);
        return { ...prev, currentTime: 0 };
      }
      const prevIdx = Math.max(0, prev.queueIndex - 1);
      const t = prev.queue[prevIdx];
      setTimeout(() => initPlayer(t.videoId, prev.queue, prevIdx), 50);
      return { ...prev, track: t, queueIndex: prevIdx, currentTime: 0, duration: t.lengthSeconds || 0, playing: true };
    });
  };

  const seek = (val: number[]) => {
    const t = val[0];
    playerRef.current?.seekTo?.(t, true);
    setPlayerState(prev => prev ? { ...prev, currentTime: t } : prev);
  };

  const setVolume = (val: number[]) => {
    const v = val[0];
    playerRef.current?.setVolume?.(v);
    setPlayerState(prev => prev ? { ...prev, volume: v, muted: v === 0 } : prev);
  };

  const toggleMute = () => {
    if (!playerState) return;
    if (playerState.muted) {
      playerRef.current?.unMute?.();
      playerRef.current?.setVolume?.(playerState.volume || 80);
    } else {
      playerRef.current?.mute?.();
    }
    setPlayerState(prev => prev ? { ...prev, muted: !prev.muted } : prev);
  };

  const search = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setError("");
    setHasSearched(true);
    setSearchLabel(q);
    try {
      const res = await fetch(`/api/stream/search?q=${encodeURIComponent(q)}&type=video`);
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(errBody.error || res.statusText);
      }
      const data = await res.json();
      setResults(data.results || []);
    } catch (e: any) {
      setError(e.message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    search(query);
  };

  const back = () => {
    setHasSearched(false);
    setResults([]);
    setError("");
    setQuery("");
  };

  return (
    <div className="flex flex-col h-full" style={{ background: "#121212" }}>
      {/* Hidden YouTube player container */}
      <div ref={iframeContainerRef} className="hidden" aria-hidden="true" />

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto" style={{ paddingBottom: playerState ? "100px" : "0" }}>

        {/* Header */}
        <div className="sticky top-0 z-10 px-6 pt-4 pb-3 flex items-center gap-4" style={{ background: "rgba(18,18,18,0.95)", backdropFilter: "blur(10px)" }}>
          {hasSearched && (
            <button onClick={back} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
              <ChevronLeft size={20} className="text-white" />
            </button>
          )}
          <form onSubmit={handleSearch} className="flex-1 flex gap-2 max-w-lg">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="What do you want to play?"
                className="w-full pl-9 pr-4 py-2.5 rounded-full text-sm text-white placeholder-gray-400 border-none outline-none"
                style={{ background: "#2a2a2a" }}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-5 py-2 rounded-full text-sm font-semibold text-black disabled:opacity-50 transition-colors"
              style={{ background: "#1db954" }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : "Search"}
            </button>
          </form>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium" style={{ background: "#1db95420", color: "#1db954" }}>
              <Radio size={12} />
              No Ads · Enjoy
            </div>
          </div>
        </div>

        {/* Browse / Results */}
        {!hasSearched ? (
          <div className="px-6 pb-8">
            <h1 className="text-2xl font-bold text-white mb-2 mt-4">Browse all</h1>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {GENRE_CARDS.map((card) => (
                <button
                  key={card.label}
                  onClick={() => { setQuery(card.query); search(card.query); }}
                  className={`relative rounded-lg overflow-hidden text-left h-28 bg-gradient-to-br ${card.color} hover:scale-[1.02] transition-transform`}
                >
                  <span className="absolute top-3 left-3 text-white font-bold text-base">{card.label}</span>
                  <div className="absolute bottom-2 right-2 w-14 h-14 rounded bg-black/20 flex items-center justify-center rotate-12 shadow-lg">
                    <Music2 size={28} className="text-white/80" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            {/* Playlist header (Spotify style) */}
            <div className="px-6 pt-6 pb-4" style={{ background: "linear-gradient(180deg,#3a3a3a 0%,#121212 100%)" }}>
              <div className="flex items-end gap-6">
                <div className="w-48 h-48 rounded shadow-2xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                  style={{ background: "linear-gradient(135deg,#444,#222)" }}>
                  {results[0]?.thumbnail ? (
                    <img src={results[0].thumbnail} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Music2 size={64} className="text-gray-500" />
                  )}
                </div>
                <div className="pb-2">
                  <p className="text-xs font-semibold uppercase text-gray-400 mb-1">Search Results</p>
                  <h2 className="text-4xl font-black text-white mb-3 leading-tight">"{searchLabel}"</h2>
                  <p className="text-sm text-gray-400">
                    <span style={{ color: "#1db954" }}>Spot D</span> &nbsp;·&nbsp; {results.length} tracks &nbsp;·&nbsp; No Ads, Enjoy 🎵
                  </p>
                </div>
              </div>

              {/* Actions */}
              {results.length > 0 && (
                <div className="flex items-center gap-4 mt-6">
                  <button
                    onClick={() => play(results[0], results, 0)}
                    className="w-14 h-14 rounded-full flex items-center justify-center transition-transform hover:scale-105"
                    style={{ background: "#1db954" }}
                  >
                    <Play size={22} fill="black" className="text-black ml-1" />
                  </button>
                  <button className="text-gray-400 hover:text-white transition-colors">
                    <Shuffle size={22} />
                  </button>
                </div>
              )}
            </div>

            {/* Track list header */}
            {results.length > 0 && (
              <div className="px-6">
                <div className="grid text-xs text-gray-400 uppercase tracking-widest border-b pb-2 mb-1" style={{ borderColor: "#282828", gridTemplateColumns: "40px 1fr 60px" }}>
                  <span className="text-center">#</span>
                  <span>Title</span>
                  <span className="text-right pr-2">⏱</span>
                </div>

                {/* Track rows */}
                <div>
                  {loading && (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="animate-spin text-gray-400" size={32} />
                    </div>
                  )}
                  {error && (
                    <div className="text-red-400 bg-red-900/20 rounded-lg p-4 my-4 text-sm">
                      ⚠️ {error}
                      <p className="text-xs text-gray-500 mt-1">Search backend issue — try a different term or retry.</p>
                    </div>
                  )}
                  {results.map((track, idx) => {
                    const isPlaying = playerState?.track.videoId === track.videoId && playerState.playing;
                    const isActive = playerState?.track.videoId === track.videoId;
                    return (
                      <div
                        key={track.videoId}
                        onDoubleClick={() => play(track, results, idx)}
                        onClick={() => play(track, results, idx)}
                        className="group grid items-center gap-4 px-2 py-2 rounded cursor-pointer transition-colors hover:bg-white/5"
                        style={{ gridTemplateColumns: "40px 1fr 60px" }}
                      >
                        {/* Number / Play indicator */}
                        <div className="flex items-center justify-center">
                          {isPlaying ? (
                            <div className="flex gap-0.5 items-end h-4">
                              <span className="w-0.5 bg-green-500 animate-bounce" style={{ height: "100%", animationDelay: "0ms" }} />
                              <span className="w-0.5 bg-green-500 animate-bounce" style={{ height: "60%", animationDelay: "150ms" }} />
                              <span className="w-0.5 bg-green-500 animate-bounce" style={{ height: "80%", animationDelay: "300ms" }} />
                            </div>
                          ) : (
                            <>
                              <span className={`text-sm group-hover:hidden ${isActive ? "text-green-500" : "text-gray-400"}`}>{idx + 1}</span>
                              <Play size={14} className="hidden group-hover:block text-white" fill="white" />
                            </>
                          )}
                        </div>

                        {/* Title + Author */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative w-10 h-10 flex-shrink-0 rounded overflow-hidden">
                            <img
                              src={track.thumbnail}
                              alt=""
                              className="w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Play size={14} fill="white" className="text-white" />
                            </div>
                          </div>
                          <div className="min-w-0">
                            <p className={`text-sm font-medium truncate ${isActive ? "text-green-500" : "text-white"}`}>{track.title}</p>
                            <p className="text-xs text-gray-400 truncate">{track.author}</p>
                          </div>
                        </div>

                        {/* Duration */}
                        <div className="text-xs text-gray-400 text-right pr-2">
                          {formatTime(track.lengthSeconds)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Spotify-like player bar */}
      {playerState && (
        <div
          className="fixed bottom-0 left-64 right-0 z-50 flex items-center px-4 py-3 gap-4 border-t"
          style={{ background: "#181818", borderColor: "#282828", height: "90px" }}
        >
          {/* Left: Track info */}
          <div className="flex items-center gap-3 w-64 flex-shrink-0">
            <div className="w-14 h-14 rounded overflow-hidden flex-shrink-0">
              <img
                src={playerState.track.thumbnail}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).src = ""; }}
              />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{playerState.track.title}</p>
              <p className="text-xs text-gray-400 truncate">{playerState.track.author}</p>
            </div>
            <button
              onClick={() => setPlayerState(prev => prev ? { ...prev, liked: !prev.liked } : prev)}
              className={`flex-shrink-0 transition-colors ${playerState.liked ? "text-green-500" : "text-gray-400 hover:text-white"}`}
            >
              <Heart size={16} fill={playerState.liked ? "currentColor" : "none"} />
            </button>
          </div>

          {/* Center: Controls + Progress */}
          <div className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
            <div className="flex items-center gap-5">
              <button
                onClick={() => setPlayerState(prev => prev ? { ...prev, shuffle: !prev.shuffle } : prev)}
                className={`transition-colors ${playerState.shuffle ? "text-green-500" : "text-gray-400 hover:text-white"}`}
              >
                <Shuffle size={18} />
              </button>
              <button onClick={goPrev} className="text-gray-400 hover:text-white transition-colors">
                <SkipBack size={20} fill="currentColor" />
              </button>
              <button
                onClick={togglePlay}
                className="w-9 h-9 rounded-full flex items-center justify-center text-black transition-transform hover:scale-105"
                style={{ background: "white" }}
              >
                {playerState.playing
                  ? <Pause size={18} fill="black" />
                  : <Play size={18} fill="black" className="ml-0.5" />
                }
              </button>
              <button onClick={goNext} className="text-gray-400 hover:text-white transition-colors">
                <SkipForward size={20} fill="currentColor" />
              </button>
              <button
                onClick={() => setPlayerState(prev => prev ? { ...prev, repeat: !prev.repeat } : prev)}
                className={`transition-colors ${playerState.repeat ? "text-green-500" : "text-gray-400 hover:text-white"}`}
              >
                <Repeat size={18} />
              </button>
            </div>
            <div className="flex items-center gap-2 w-full max-w-md">
              <span className="text-xs text-gray-400 w-8 text-right">{formatTime(playerState.currentTime)}</span>
              <div className="flex-1">
                <Slider
                  value={[playerState.currentTime]}
                  max={playerState.duration || 100}
                  step={1}
                  onValueChange={seek}
                  className="cursor-pointer"
                />
              </div>
              <span className="text-xs text-gray-400 w-8">{formatTime(playerState.duration)}</span>
            </div>
          </div>

          {/* Right: Volume */}
          <div className="flex items-center gap-2 w-36 flex-shrink-0 justify-end">
            <button onClick={toggleMute} className="text-gray-400 hover:text-white transition-colors">
              {playerState.muted || playerState.volume === 0
                ? <VolumeX size={18} />
                : <Volume2 size={18} />
              }
            </button>
            <div className="w-24">
              <Slider
                value={[playerState.muted ? 0 : playerState.volume]}
                max={100}
                step={1}
                onValueChange={setVolume}
                className="cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
