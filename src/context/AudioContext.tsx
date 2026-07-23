import React, { createContext, useContext, useState, useRef, useEffect, ReactNode, useMemo } from "react";
import { collection, getDocs, writeBatch, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import YouTube, { YouTubeEvent, YouTubePlayer } from "react-youtube";
import { Pause, Play, SkipBack, SkipForward, MoreVertical, Clock, X } from "lucide-react";
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
  translation?: string;
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
  repeatMode: number;
  isInstrumental: boolean;
  lyrics: LyricLine[];
  currentLyricIndex: number;
  toastMessage: string | null;
  dominantColors: string[];
  sleepTimerEnd: number | null;
  isIndoSong: boolean;
  setPlayingId: (id: string | null) => void;
  playTemporaryTrack: (track: Track) => void;
  addToQueue: (track: Track) => void;
  togglePlay: (track: Track, forcePlay?: boolean) => void;
  playNext: () => void;
  playPrevious: () => void;
  handleShuffle: () => void;
  handleRepeat: () => void;
  handleSeek: (percent: number) => void;
  closePlayer: () => void;
  pausePlayer: () => void;
  setSleepTimer: (minutes: number | null) => void;
  updateTracksOrder: (newTracks: Track[]) => Promise<void>;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: ReactNode }) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [temporaryTrack, setTemporaryTrack] = useState<Track | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const queueRef = useRef<Track[]>([]);
  
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);
  const getTrack = (id: string | null) => {
    if (!id) return undefined;
    if (temporaryTrack?.id === id) return temporaryTrack;
    const queuedTrack = queue.find(t => t.id === id) || queueRef.current.find(t => t.id === id);
    if (queuedTrack) return queuedTrack;
    return tracks.find(t => t.id === id);
  };
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytPlayerRef = useRef<YouTubePlayer | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState(0);
  const [isInstrumental, setIsInstrumental] = useState(false);
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [isIndoSong, setIsIndoSong] = useState(false);
  const [currentLyricIndex, setCurrentLyricIndex] = useState<number>(-1);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [isIdle, setIsIdle] = useState(false);
  const [isPlayerMenuOpen, setIsPlayerMenuOpen] = useState(false);
  const [playerTimeLeft, setPlayerTimeLeft] = useState<string | null>(null);
  const [sleepTimerEnd, setSleepTimerEnd] = useState<number | null>(null);
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sleepIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const setSleepTimer = (minutes: number | null) => {
    if (minutes === null) {
      setSleepTimerEnd(null);
      showToast("Sleep timer cancelled");
    } else {
      const currentEnd = sleepTimerEnd && sleepTimerEnd > Date.now() ? sleepTimerEnd : Date.now();
      const end = currentEnd + minutes * 60000;
      setSleepTimerEnd(end);
      showToast(`Added ${minutes}m to sleep timer`);
    }
  };

  useEffect(() => {
    if (sleepTimerEnd) {
      if (sleepIntervalRef.current) clearInterval(sleepIntervalRef.current);
      sleepIntervalRef.current = setInterval(() => {
        const diff = sleepTimerEnd - Date.now();
        
        // Fading out over the last 10 seconds
        if (diff <= 10000 && diff > 0) {
          const volume = Math.max(0, Math.min(100, (diff / 10000) * 100)); // 0 to 100
          if (ytPlayerRef.current) {
            try { ytPlayerRef.current.setVolume(volume); } catch(e) {}
          }
          if (audioRef.current) {
            audioRef.current.volume = volume / 100;
          }
        }

        if (diff <= 0) {
          pausePlayer();
          setSleepTimerEnd(null);
          setPlayerTimeLeft(null);
          showToast("Sleep timer finished");
          
          // Restore volume after pausing so next play isn't muted
          if (ytPlayerRef.current) {
            try { ytPlayerRef.current.setVolume(100); } catch(e) {}
          }
          if (audioRef.current) {
            audioRef.current.volume = 1;
          }
        } else {
          // Update UI timer
          const h = Math.floor(diff / 3600000);
          const m = Math.floor((diff % 3600000) / 60000);
          const s = Math.floor((diff % 60000) / 1000);
          
          // Only update string every second roughly for UI performance
          if (diff % 1000 < 250 || diff <= 10000) {
            setPlayerTimeLeft(
              (h > 0 ? `${h.toString().padStart(2, '0')}:` : '') +
              `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
            );
          }
        }
      }, 250); // Faster interval for smoother volume fade

      return () => {
        if (sleepIntervalRef.current) clearInterval(sleepIntervalRef.current);
        // Restore volume when timer is cancelled early
        if (ytPlayerRef.current) {
          try { ytPlayerRef.current.setVolume(100); } catch(e) {}
        }
        if (audioRef.current) {
          audioRef.current.volume = 1;
        }
      };
    } else {
      setPlayerTimeLeft(null);
    }
  }, [sleepTimerEnd]);

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
  const temporaryTrackRef = useRef<Track | null>(null);
  const repeatModeRef = useRef<number>(0);

  useEffect(() => {
    playingIdRef.current = playingId;
    tracksRef.current = tracks;
    isShuffledRef.current = isShuffled;
    temporaryTrackRef.current = temporaryTrack;
    repeatModeRef.current = repeatMode;
  }, [playingId, tracks, isShuffled, repeatMode, temporaryTrack]);

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
    const track = getTrack(playingId);
    if (!track) return;
    const title = track.title || track.name || "";
    const artist = track.artist || "";
    setLyrics([]);
    setCurrentLyricIndex(-1);


    const fetchLyrics = async () => {
      const origCacheKey = `lyric_orig_${playingId}`;
      const cachedOrig = localStorage.getItem(origCacheKey);
      
      const processParsedLyrics = (parsedLyrics: any[]) => {
          setLyrics(parsedLyrics);
          try {
              const fullText = parsedLyrics.map(l => l.text).join('\n');
              const indoWords = [' yang ', ' di ', ' ke ', ' dari ', ' pada ', ' dalam ', ' untuk ', ' dengan ', ' dan ', ' atau ', ' aku ', ' kamu ', ' dia ', ' kita ', ' mereka ', ' itu ', ' ini ', ' ada ', ' tidak ', ' bisa '];
              const matches = indoWords.filter(word => fullText.toLowerCase().includes(word)).length;
              const isIndo = matches >= 3;
              setIsIndoSong(isIndo);
          } catch(e) {}
      };

      if (cachedOrig) {
          try {
              const parsed = JSON.parse(cachedOrig);
              processParsedLyrics(parsed);
              return;
          } catch (e) {
              console.error("Failed to parse cached original lyrics", e);
          }
      }

      try {
        const res = await fetch(`https://lrclib.net/api/get?track_name=${encodeURIComponent(title)}&artist_name=${encodeURIComponent(artist)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.syncedLyrics) {
            const parsedLyrics = parseLrc(data.syncedLyrics);
            localStorage.setItem(origCacheKey, JSON.stringify(parsedLyrics));
            processParsedLyrics(parsedLyrics);
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
    if (!lyrics || lyrics.length === 0 || isIndoSong || !playingId) return;
    
    // Check if we need to translate (e.g. if we don't have translations or language changed)
    const fullText = lyrics.map(l => l.text).join('\n');
    if (!fullText.trim()) return;
    
    const cacheKey = `lyric_trans_${playingId}_id`;
    const cachedTrans = localStorage.getItem(cacheKey);
    
    if (cachedTrans) {
      try {
        const translatedLines = JSON.parse(cachedTrans);
        setLyrics(prev => prev.map((l, i) => ({
          ...l,
          translation: translatedLines[i] || undefined
        })));
        return;
      } catch (e) {
        console.error("Cache parsing error", e);
      }
    }
    
    // Need to fetch
    // First clear existing translations
    setLyrics(prev => prev.map(l => ({ ...l, translation: undefined })));
    
    const translateUrl = `/api/translate`;
    fetch(translateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text: fullText, targetLanguage: "id" })
    })
      .then(res => res.json())
      .then(transData => {
        if (transData && transData[0]) {
          const translatedFullText = transData[0].map((item: any) => item[0]).join('');
          const translatedLines = translatedFullText.split('\n');
          
          localStorage.setItem(cacheKey, JSON.stringify(translatedLines));
          
          setLyrics(prev => {
            return prev.map((l, i) => ({
              ...l,
              translation: translatedLines[i] || undefined
            }));
          });
        }
      })
      .catch(err => console.error("Translation error", err));
  }, [playingId, isIndoSong]);

  useEffect(() => {
    if (lyrics.length === 0) {
      setCurrentLyricIndex(-1);
      return;
    }
    const currentTrack = getTrack(playingId);
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
    const track = getTrack(playingId);
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

  const playPrevious = () => {
    const currentPlayingId = playingIdRef.current;
    const currentTracks = tracksRef.current;
    if (!currentPlayingId || currentTracks.length === 0) return;
    
    // If we're more than 3 seconds in, just restart the song
    if (currentTime > 3) {
      if (ytPlayerRef.current) {
        ytPlayerRef.current.seekTo(0, true);
        if (isPlaying) ytPlayerRef.current.playVideo();
      } else if (audioRef.current) {
        audioRef.current.currentTime = 0;
        if (isPlaying) audioRef.current.play();
      }
      setCurrentTime(0);
      return;
    }

    const currentIndex = currentTracks.findIndex(t => t.id === currentPlayingId);
    if (currentIndex !== -1) {
      const prevIndex = currentIndex - 1 >= 0 ? currentIndex - 1 : currentTracks.length - 1;
      togglePlay(currentTracks[prevIndex], true);
    }
  };

  const playNext = () => {
    const currentPlayingId = playingIdRef.current;
    const currentTracks = tracksRef.current;
    const shuffled = isShuffledRef.current;
    if (!currentPlayingId && queueRef.current.length === 0 && currentTracks.length === 0) return;

    if (queueRef.current.length > 0) {
      const nextTrack = queueRef.current[0];
      setQueue(prev => prev.slice(1));
      playTemporaryTrack(nextTrack);
      return;
    }

    if (!currentPlayingId) return;
    if (repeatModeRef.current === 2) {
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
      if (repeatModeRef.current === 0 && currentIndex + 1 >= currentTracks.length) {
        setPlayingId(null);
        setIsPlaying(false);
        setCurrentTime(0);
        return;
      }
      const nextIndex = currentIndex + 1 < currentTracks.length ? currentIndex + 1 : 0;
      togglePlay(currentTracks[nextIndex], true);
    } else {
      const currentTrack = temporaryTrackRef.current || queueRef.current.find(t => t.id === currentPlayingId);
      if (currentTrack) {
        showToast("Finding similar song...");
        fetch(`/api/search?q=${encodeURIComponent(currentTrack.artist || 'popular')}`)
          .then(res => res.json())
          .then(data => {
            const results = data.results || [];
            if (results.length > 0) {
              const filtered = results.filter((r: any) => r.youtubeId !== currentTrack.youtubeId);
              let randomResult = results[0];
              if (filtered.length > 0) {
                randomResult = filtered[Math.floor(Math.random() * filtered.length)];
              }
              const track = {
                id: `temp-${Date.now()}`,
                title: randomResult.title || randomResult.trackName,
                artist: randomResult.artist || randomResult.artistName,
                youtubeId: randomResult.youtubeId,
                coverUrl: randomResult.coverUrl || randomResult.artworkUrl100,
                createdAt: Date.now()
              };
              playTemporaryTrack(track as any);
            } else {
              setPlayingId(null);
              setIsPlaying(false);
              setCurrentTime(0);
            }
          })
          .catch(() => {
            setPlayingId(null);
            setIsPlaying(false);
            setCurrentTime(0);
          });
      } else {
        setPlayingId(null);
        setIsPlaying(false);
        setCurrentTime(0);
      }
    }
  };

  const addToQueue = (track: Track) => {
    setQueue(prev => [...prev, track]);
    showToast("Added to queue");
  };

  const playTemporaryTrack = (track: Track) => {
    setTemporaryTrack(track);
    togglePlay(track, true);
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
    showToast(newState ? "Shuffle on" : "Shuffle off");
  };

  const handleRepeat = () => {
    const newState = (repeatMode + 1) % 3;
    setRepeatMode(newState);
    if (newState === 0) showToast("Normal mode");
    else if (newState === 1) showToast("Repeat playlist on");
    else showToast("Repeat one song on");
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
    const currentTrack = getTrack(playingId);
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

  const playingTrack = getTrack(playingId);
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
        repeatMode,
        isInstrumental,
        lyrics,
        currentLyricIndex,
        toastMessage,
        dominantColors,
        sleepTimerEnd,
        isIndoSong,
        setPlayingId,
        togglePlay,
        playNext,
        playPrevious,
        handleShuffle,
        handleRepeat,
        handleSeek,
        closePlayer,
        pausePlayer,
        setSleepTimer,
        updateTracksOrder,
        playTemporaryTrack,
        addToQueue,
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
          "fixed bottom-0 left-0 right-0 h-[64px] z-[40] flex flex-col justify-center px-3 sm:px-6 backdrop-blur-2xl border-t border-slate-200/50 bg-white/70 shadow-[0_-8px_30px_rgba(0,0,0,0.05)] overflow-visible transition-transform duration-700 ease-in-out",
          isIdle ? "translate-y-full" : "translate-y-0"
        )}>
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-3 relative z-10">
            
            {/* Left side: Cover & Info */}
            <div className="flex items-center min-w-0 gap-3 shrink-0">
              <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-slate-100 shadow-sm border border-slate-200/50">
                {trackCover ? (
                  <img src={trackCover} alt={trackTitle} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-slate-200" />
                )}
              </div>
              <div className="flex flex-col min-w-0 hidden md:flex">
                <span className="text-sm font-semibold text-slate-800 truncate">{trackTitle}</span>
                <span className="text-xs text-slate-600 truncate">{trackArtist}</span>
              </div>
            </div>

            {/* Center: Controls & Seekbar */}
            <div className="flex-1 flex items-center justify-center gap-3">
              <span className="text-[10px] text-slate-500 font-medium w-8 text-right shrink-0 hidden sm:block">
                {formatTime(currentTime)}
              </span>
              
              <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                <button 
                  onClick={playPrevious}
                  className="w-8 h-8 flex items-center justify-center text-slate-700 hover:text-slate-900 transition-colors"
                >
                  <SkipBack className="w-4 h-4" fill="currentColor" />
                </button>
                <button 
                  onClick={() => playingTrack && togglePlay(playingTrack)}
                  className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center text-white hover:scale-105 hover:bg-slate-800 transition-all shadow-md shrink-0"
                >
                  {isPlaying ? <Pause className="w-4 h-4" fill="currentColor" /> : <Play className="w-4 h-4 ml-0.5" fill="currentColor" />}
                </button>
                <button 
                  onClick={playNext}
                  className="w-8 h-8 flex items-center justify-center text-slate-700 hover:text-slate-900 transition-colors"
                >
                  <SkipForward className="w-4 h-4" fill="currentColor" />
                </button>
              </div>

              <div 
                className="flex-1 h-1.5 max-w-sm bg-slate-400/30 rounded-full cursor-pointer relative group backdrop-blur-sm hidden sm:block"
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
              
              <span className="text-[10px] text-slate-500 font-medium w-8 shrink-0 hidden sm:block">
                {formatTime(duration)}
              </span>
            </div>

            {/* Right side: Menu */}
            <div className="flex items-center justify-end shrink-0 relative gap-1">
              <button 
                onClick={() => setIsPlayerMenuOpen(!isPlayerMenuOpen)}
                className="w-8 h-8 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
              <button
                onClick={closePlayer}
                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
                title="Close player"
              >
                <X className="w-4 h-4" />
              </button>

              {isPlayerMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsPlayerMenuOpen(false)} />
                  <div className="absolute bottom-full right-0 mb-4 w-48 bg-white border border-slate-200/80 rounded-2xl shadow-xl z-50 py-2 animate-in fade-in slide-in-from-bottom-2 duration-200 overflow-hidden font-sans">
                    <div className="px-4 py-2 flex justify-between items-center text-[13px] font-medium text-slate-500">
                      <span>Sleep timer</span>
                      {playerTimeLeft && (
                        <span className="text-emerald-600 font-semibold tabular-nums">
                          {playerTimeLeft}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => { setSleepTimer(15); setIsPlayerMenuOpen(false); }}
                      className="w-full text-left px-4 py-2.5 text-[14px] text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      15m
                    </button>
                    <button
                      onClick={() => { setSleepTimer(30); setIsPlayerMenuOpen(false); }}
                      className="w-full text-left px-4 py-2.5 text-[14px] text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      30m
                    </button>
                    <button
                      onClick={() => { setSleepTimer(60); setIsPlayerMenuOpen(false); }}
                      className="w-full text-left px-4 py-2.5 text-[14px] text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      1h
                    </button>
                    <button
                      onClick={() => { setSleepTimer(120); setIsPlayerMenuOpen(false); }}
                      className="w-full text-left px-4 py-2.5 text-[14px] text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      2h
                    </button>
                    {sleepTimerEnd && (
                      <button
                        onClick={() => { setSleepTimer(null); setIsPlayerMenuOpen(false); }}
                        className="w-full text-left px-4 py-2.5 text-[14px] text-red-600 hover:bg-red-50 transition-colors border-t border-slate-100 mt-1"
                      >
                        Batalkan waktu tidur
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* Mobile bottom absolute seekbar */}
          <div 
            className="absolute top-0 left-0 w-full h-1 bg-slate-400/20 cursor-pointer sm:hidden"
            onClick={(e) => {
              const bounds = e.currentTarget.getBoundingClientRect();
              const percent = (e.clientX - bounds.left) / bounds.width;
              handleSeek(percent);
            }}
          >
            <div 
              className="absolute top-0 left-0 h-full bg-slate-800 transition-colors"
              style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            />
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
