import React, { createContext, useContext, useState, useRef, useEffect, ReactNode, useMemo } from "react";
import { collection, getDocs, writeBatch, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import YouTube, { YouTubeEvent, YouTubePlayer } from "react-youtube";
import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { FastAverageColor } from "fast-average-color";

export function extractYouTubeId(urlOrId: string | undefined): string | undefined {
  if (!urlOrId) return undefined;
  if (/^[a-zA-Z0-9_-]{11}$/.test(urlOrId)) {
    return urlOrId;
  }
  try {
    const url = new URL(urlOrId);
    if (url.hostname === "youtu.be") {
      return url.pathname.slice(1);
    }
    if (url.hostname.includes("youtube.com")) {
      return url.searchParams.get("v") || undefined;
    }
  } catch (e) {}
  return urlOrId;
}

export interface Track {
  id: string;
  title?: string;
  name?: string;
  artist?: string;
  url?: string;
  src?: string;
  audio?: string;
  coverUrl?: string;
  cover?: string;
  image?: string;
  spotifyId?: string;
  youtubeId?: string;
  order?: number;
}

export interface LyricLine {
  time: number;
  text: string;
}

export function parseLrc(lrc: string): LyricLine[] {
  const lines = lrc.split("\n");
  const result: LyricLine[] = [];
  for (const line of lines) {
    const match = line.match(/\[(\d+):(\d+\.\d+)\](.*)/);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseFloat(match[2]);
      const text = match[3].trim();
      if (text) {
        result.push({ time: minutes * 60 + seconds, text });
      }
    }
  }
  return result;
}

interface AudioContextType {
  tracks: Track[];
  loading: boolean;
  playingId: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isShuffled: boolean;
  isRepeat: boolean;
  isInstrumental: boolean;
  lyrics: LyricLine[];
  currentLyricIndex: number;
  toastMessage: string | null;
  dominantColors: string[];
  setPlayingId: (id: string | null) => void;
  togglePlay: (track: Track, forcePlay?: boolean) => void;
  playNext: () => void;
  handleShuffle: () => void;
  handleRepeat: () => void;
  handleSeek: (percent: number) => void;
  closePlayer: () => void;
  pausePlayer: () => void;
  updateTracksOrder: (newTracks: Track[]) => Promise<void>;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: ReactNode }) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytPlayerRef = useRef<YouTubePlayer | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isShuffled, setIsShuffled] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [isInstrumental, setIsInstrumental] = useState(false);
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [currentLyricIndex, setCurrentLyricIndex] = useState<number>(-1);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [isIdle, setIsIdle] = useState(false);
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleUserActivity = () => {
      setIsIdle(false);
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }
      idleTimeoutRef.current = setTimeout(() => {
        setIsIdle(true);
      }, 5000); // 5 seconds of inactivity
    };

    // Initial setup
    handleUserActivity();

    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('scroll', handleUserActivity);
    window.addEventListener('click', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('touchstart', handleUserActivity);

    return () => {
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('scroll', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
    };
  }, []);

  const playingIdRef = useRef<string | null>(null);
  const tracksRef = useRef<Track[]>([]);
  const isShuffledRef = useRef<boolean>(false);
  const isRepeatRef = useRef<boolean>(false);

  useEffect(() => {
    playingIdRef.current = playingId;
    tracksRef.current = tracks;
    isShuffledRef.current = isShuffled;
    isRepeatRef.current = isRepeat;
  }, [playingId, tracks, isShuffled, isRepeat]);

  useEffect(() => {
    async function fetchTracks() {
      try {
        const snapshot = await getDocs(collection(db, "music_playlist"));
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Track[];
        data.sort((a, b) => (a.order || 0) - (b.order || 0));
        data.forEach(t => {
          if (t.title && t.title.toLowerCase().includes("mirror") && t.artist && t.artist.toLowerCase().includes("timberlake")) {
            t.youtubeId = "uuZE_IRwLNI";
          }
        });
        setTracks(data);
      } catch (error) {
        console.error("Error fetching tracks:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchTracks();
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.pauseVideo();
        } catch (e) {}
      }
    };
  }, []);

  useEffect(() => {
    if (!playingId) {
      setLyrics([]);
      setIsInstrumental(false);
      return;
    }
    const track = tracks.find(t => t.id === playingId);
    if (!track) return;
    const title = track.title || track.name || "";
    const artist = track.artist || "";
    setLyrics([]);
    setCurrentLyricIndex(-1);
    const fetchLyrics = async () => {
      try {
        const res = await fetch(`https://lrclib.net/api/get?track_name=${encodeURIComponent(title)}&artist_name=${encodeURIComponent(artist)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.syncedLyrics) {
            setLyrics(parseLrc(data.syncedLyrics));
          } else {
            setLyrics([]);
          }
        } else {
          setLyrics([]);
        }
      } catch (e) {
        setLyrics([]);
      }
    };
    fetchLyrics();
  }, [playingId, tracks]);

  useEffect(() => {
    if (lyrics.length === 0) {
      setCurrentLyricIndex(-1);
      return;
    }
    const currentTrack = tracks.find(t => t.id === playingId);
    let offset = 0;
    if (currentTrack && currentTrack.title?.toLowerCase().includes("mirror") && currentTrack.artist?.toLowerCase().includes("timberlake")) {
      offset = -5.25;
    }
    let newIndex = -1;
    for (let i = 0; i < lyrics.length; i++) {
      if (lyrics[i].time <= currentTime + offset + 0.1) {
        newIndex = i;
      } else {
        break;
      }
    }
    setCurrentLyricIndex(newIndex);
  }, [currentTime, lyrics, playingId, tracks]);

  useEffect(() => {
    if (!playingId) {
      setIsInstrumental(false);
      return;
    }
    if (currentLyricIndex === -1) {
      const timer = setTimeout(() => setIsInstrumental(true), 2500);
      return () => clearTimeout(timer);
    }
    const currentLyric = lyrics[currentLyricIndex];
    if (currentLyric && !currentLyric.text.trim()) {
      const timer = setTimeout(() => setIsInstrumental(true), 1500);
      return () => clearTimeout(timer);
    }
    setIsInstrumental(false);
  }, [playingId, currentLyricIndex, lyrics]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (playingId) {
      interval = setInterval(() => {
        if (ytPlayerRef.current) {
          try {
            const time = ytPlayerRef.current.getCurrentTime();
            const dur = ytPlayerRef.current.getDuration();
            if (time !== undefined) setCurrentTime(time);
            if (dur !== undefined && dur > 0) setDuration(dur);
          } catch (e) {}
        } else if (audioRef.current) {
          setCurrentTime(audioRef.current.currentTime);
          setDuration(audioRef.current.duration || 0);
        }
      }, 150);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [playingId]);

  const [dominantColors, setDominantColors] = useState<string[]>([]);

  useEffect(() => {
    if (!playingId) {
      setDominantColors([]);
      return;
    }
    const track = tracks.find(t => t.id === playingId);
    const coverUrl = track?.coverUrl || track?.cover || track?.image;
    
    if (coverUrl) {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.src = coverUrl;
      img.onload = async () => {
        try {
          const fac = new FastAverageColor();
          const color1 = await fac.getColorAsync(img, { height: Math.max(1, Math.floor(img.height / 2)) });
          const color2 = await fac.getColorAsync(img, { top: Math.floor(img.height / 2), height: Math.max(1, Math.ceil(img.height / 2)) });
          
          setDominantColors([
            color1.rgb,
            color2.rgb
          ]);
          fac.destroy();
        } catch (e) {
          console.error("Failed to extract color palette", e);
          setDominantColors([]);
        }
      };
      img.onerror = () => {
        setDominantColors([]);
      };
    } else {
      setDominantColors([]);
    }
  }, [playingId, tracks]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2000);
  };

  const playNext = () => {
    const currentPlayingId = playingIdRef.current;
    const currentTracks = tracksRef.current;
    const shuffled = isShuffledRef.current;
    if (!currentPlayingId || currentTracks.length === 0) return;
    if (isRepeatRef.current) {
      if (ytPlayerRef.current) {
        ytPlayerRef.current.seekTo(0, true);
        ytPlayerRef.current.playVideo();
      } else if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
      setCurrentTime(0);
      setIsPlaying(true);
      return;
    }
    if (shuffled) {
      const nextIndex = Math.floor(Math.random() * currentTracks.length);
      togglePlay(currentTracks[nextIndex], true);
      return;
    }
    const currentIndex = currentTracks.findIndex(t => t.id === currentPlayingId);
    if (currentIndex !== -1) {
      const nextIndex = currentIndex + 1 < currentTracks.length ? currentIndex + 1 : 0;
      togglePlay(currentTracks[nextIndex], true);
    } else {
      setPlayingId(null);
      setIsPlaying(false);
      setCurrentTime(0);
    }
  };

  const togglePlay = (track: Track, forcePlay = false) => {
    const audioUrl = track.url || track.src || track.audio;
    if (playingId === track.id && !forcePlay) {
      if (isPlaying) {
        if (track.youtubeId && ytPlayerRef.current) {
          ytPlayerRef.current.pauseVideo();
        } else {
          audioRef.current?.pause();
        }
        setIsPlaying(false);
      } else {
        if (track.youtubeId && ytPlayerRef.current) {
          ytPlayerRef.current.playVideo();
        } else {
          audioRef.current?.play();
        }
        setIsPlaying(true);
      }
    } else {
      setCurrentTime(0);
      setDuration(0);
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.pauseVideo();
        } catch (e) {}
      }
      if (!track.youtubeId && audioUrl) {
        const audio = new Audio(audioUrl);
        audio.play().catch(e => console.error("Audio playback error", e));
        audioRef.current = audio;
        audio.onended = playNext;
        audio.ontimeupdate = () => {
          setCurrentTime(audio.currentTime);
          setDuration(audio.duration || 0);
        };
      }
      setPlayingId(track.id);
      setIsPlaying(true);
    }
  };

  const pausePlayer = () => {
    if (isPlaying) {
      setIsPlaying(false);
      if (ytPlayerRef.current) {
        ytPlayerRef.current.pauseVideo();
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }
  };

  const closePlayer = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (ytPlayerRef.current) {
      try {
        ytPlayerRef.current.pauseVideo();
      } catch (e) {}
    }
    setPlayingId(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  };

  const handleShuffle = () => {
    const newState = !isShuffled;
    setIsShuffled(newState);
    showToast(newState ? "Acak lagu diaktifkan" : "Acak lagu dinonaktifkan");
  };

  const handleRepeat = () => {
    const newState = !isRepeat;
    setIsRepeat(newState);
    showToast(newState ? "Ulangi lagu diaktifkan" : "Ulangi lagu dinonaktifkan");
  };

    const updateTracksOrder = async (newTracks: Track[]) => {
    setTracks(newTracks);
    try {
      const batch = writeBatch(db);
      newTracks.forEach((track, index) => {
        const trackRef = doc(db, "music_playlist", track.id);
        batch.update(trackRef, { order: index });
      });
      await batch.commit();
    } catch (error) {
      console.error("Error updating order:", error);
    }
  };

  const handleSeek = (percent: number) => {
    if (!duration) return;
    const seekTime = percent * duration;
    const currentTrack = tracks.find(t => t.id === playingId);
    if (ytPlayerRef.current && currentTrack?.youtubeId) {
      ytPlayerRef.current.seekTo(seekTime, true);
    } else if (audioRef.current) {
      audioRef.current.currentTime = seekTime;
    }
    setCurrentTime(seekTime);
  };

  const formatTime = (time: number) => {
    if (isNaN(time) || time === 0) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const playingTrack = tracks.find(t => t.id === playingId);
  const trackCover = playingTrack?.coverUrl || playingTrack?.cover || playingTrack?.image;
  const trackTitle = playingTrack?.title || playingTrack?.name || "Unknown Track";
  const trackArtist = playingTrack?.artist || "Unknown Artist";

  return (
    <AudioContext.Provider
      value={{
        tracks,
        loading,
        playingId,
        isPlaying,
        currentTime,
        duration,
        isShuffled,
        isRepeat,
        isInstrumental,
        lyrics,
        currentLyricIndex,
        toastMessage,
        dominantColors,
        setPlayingId,
        togglePlay,
        playNext,
        handleShuffle,
        handleRepeat,
        handleSeek,
        closePlayer,
        pausePlayer,
        updateTracksOrder,
      }}
    >
      {/* Hidden YouTube Player for Audio */}
      {playingTrack?.youtubeId && (
        <div className="fixed top-[-9999px] left-[-9999px] opacity-0 pointer-events-none w-[1px] h-[1px] overflow-hidden">
          <YouTube 
            videoId={extractYouTubeId(playingTrack.youtubeId)}
            opts={{
              height: '1',
              width: '1',
              playerVars: {
                autoplay: 1,
                controls: 0,
                showinfo: 0,
                rel: 0,
                modestbranding: 1
              }
            }}
            onReady={(e: YouTubeEvent) => {
              ytPlayerRef.current = e.target;
              e.target.setVolume(100);
              e.target.playVideo();
            }}
            onEnd={playNext}
            onError={(e: YouTubeEvent) => {
              console.error("YouTube Error", e);
              setPlayingId(null);
            }}
          />
        </div>
      )}
      
      {children}

      {/* Persistent Bottom Player Bar */}
      {playingId && (
        <div className={cn(
          "fixed bottom-0 left-0 right-0 h-[72px] z-[40] flex flex-col justify-center px-4 sm:px-6 backdrop-blur-2xl border-t border-slate-200/50 bg-white/70 shadow-[0_-8px_30px_rgba(0,0,0,0.05)] overflow-hidden transition-transform duration-700 ease-in-out",
          isIdle ? "translate-y-full" : "translate-y-0"
        )}>
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-3 sm:gap-4 relative z-10">
            
            {/* Left side: Cover & Info */}
            <div className="flex items-center min-w-0 gap-3 shrink-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden shrink-0 bg-slate-100 shadow-sm border border-slate-200/50">
                {trackCover ? (
                  <img src={trackCover} alt={trackTitle} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-slate-200" />
                )}
              </div>
              <div className="flex flex-col min-w-0 hidden sm:flex">
                <span className="text-sm font-semibold text-slate-800 truncate">{trackTitle}</span>
                <span className="text-xs text-slate-600 truncate">{trackArtist}</span>
              </div>
            </div>

            {/* Center: Seekbar & Controls */}
            <div className="flex-1 flex flex-col items-center justify-center gap-1">
              <div className="w-full max-w-xl flex items-center gap-2 sm:gap-3">
                <span className="text-[10px] text-slate-600 font-semibold w-8 text-right shrink-0">
                  {formatTime(currentTime)}
                </span>
                <div 
                  className="flex-1 h-1.5 bg-slate-400/30 rounded-full cursor-pointer relative group backdrop-blur-sm"
                  onClick={(e) => {
                    const bounds = e.currentTarget.getBoundingClientRect();
                    const percent = (e.clientX - bounds.left) / bounds.width;
                    handleSeek(percent);
                  }}
                >
                  <div 
                    className="absolute top-0 left-0 h-full bg-slate-800 rounded-full transition-colors"
                    style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                  >
                     <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 bg-white border border-slate-300 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
                <span className="text-[10px] text-slate-600 font-semibold w-8 shrink-0">
                  {formatTime(duration)}
                </span>
              </div>
            </div>

            {/* Right side: Controls */}
            <div className="flex items-center justify-end shrink-0 gap-2">
              <button 
                onClick={() => playingTrack && togglePlay(playingTrack)}
                className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-900 rounded-full flex items-center justify-center text-white hover:scale-105 hover:bg-slate-800 transition-all shadow-md shrink-0"
              >
                {isPlaying ? <Pause className="w-5 h-5" fill="currentColor" /> : <Play className="w-5 h-5 ml-0.5" fill="currentColor" />}
              </button>
            </div>
          </div>
        </div>
      )}
      
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error("useAudio must be used within an AudioProvider");
  }
  return context;
}
