import React, { createContext, useContext, useState, useRef, useEffect, ReactNode, useMemo } from "react";
import { motion } from "motion/react";
import { useLocation, useNavigate } from "react-router-dom";
import { collection, getDocs, writeBatch, doc, updateDoc, increment, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import YouTube, { YouTubeEvent, YouTubePlayer } from "react-youtube";
import {  Pause, Play, SkipBack, SkipForward, MoreVertical, Clock, X, ChevronUp, ChevronDown, Volume2, Volume1, VolumeX, Shuffle, Repeat, Repeat1, ListMusic, Trash2, ListPlus, Languages, Copy, Check  } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
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
  playCount?: number;
  totalTimePlayed?: number;
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
  queue: Track[];
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  moveQueueItem: (fromIndex: number, toIndex: number) => void;
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
  volume: number;
  isMuted: boolean;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: ReactNode }) {
  const authContext = useAuth();
  const isAdmin = authContext ? authContext.isAdmin : false;
  const location = useLocation();
  const navigate = useNavigate();
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
  const isPlayingRef = useRef(false);
  const playtimeAccumulatorRef = useRef(0);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytPlayerRef = useRef<YouTubePlayer | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isShuffled, setIsShuffled] = useState(false);
  const [shuffledTracks, setShuffledTracks] = useState<Track[]>([]);
  const [repeatMode, setRepeatMode] = useState(0);
  const [isInstrumental, setIsInstrumental] = useState(false);
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [isIndoSong, setIsIndoSong] = useState(false);
  const [currentLyricIndex, setCurrentLyricIndex] = useState<number>(-1);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [activeModalTab, setActiveModalTab] = useState<"details" | "queue">("details");
  const [nextMenuTrackId, setNextMenuTrackId] = useState<string | null>(null);
  const [isIdle, setIsIdle] = useState(false);
  const [isPlayerMenuOpen, setIsPlayerMenuOpen] = useState(false);
  const [isScreenOff, setIsScreenOff] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isSongDetailOpen, setIsSongDetailOpen] = useState(false);
  const [songDetail, setSongDetail] = useState<{
    description?: string, 
    lyrics?: string,
    isLoading: boolean, 
    error?: string,
    isTranslating?: boolean,
    translatedDescription?: string,
    isShowingTranslation?: boolean
  }>({ isLoading: false });

  useEffect(() => {
    if (isSongDetailOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isSongDetailOpen]);
  const wakeLockRef = useRef<any>(null);
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

  const [volume, setVolumeState] = useState(100);
  const shuffledTracksRef = useRef<Track[]>([]);
  useEffect(() => {
    shuffledTracksRef.current = shuffledTracks;
  }, [shuffledTracks]);
  const [isMuted, setIsMuted] = useState(false);
  const volumeRef = useRef(100);
  const isMutedRef = useRef(false);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  const setVolume = (newVolume: number) => {
    const rounded = Math.round(Math.max(0, Math.min(100, newVolume)));
    setVolumeState(rounded);
    if (rounded > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  // Sync volume with players whenever volume or isMuted changes
  useEffect(() => {
    const actualVolume = isMuted ? 0 : volume;
    if (ytPlayerRef.current) {
      try { ytPlayerRef.current.setVolume(actualVolume); } catch(e) {}
    }
    if (audioRef.current) {
      audioRef.current.volume = actualVolume / 100;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    if (sleepTimerEnd) {
      if (sleepIntervalRef.current) clearInterval(sleepIntervalRef.current);
      sleepIntervalRef.current = setInterval(() => {
        const diff = sleepTimerEnd - Date.now();
        const actualVolume = isMutedRef.current ? 0 : volumeRef.current;
        
        // Fading out over the last 10 seconds
        if (diff <= 10000 && diff > 0) {
          const fadeVolume = Math.max(0, Math.min(actualVolume, (diff / 10000) * actualVolume)); // 0 to actualVolume
          if (ytPlayerRef.current) {
            try { ytPlayerRef.current.setVolume(fadeVolume); } catch(e) {}
          }
          if (audioRef.current) {
            audioRef.current.volume = fadeVolume / 100;
          }
        }

        if (diff <= 0) {
          pausePlayer();
          setSleepTimerEnd(null);
          setPlayerTimeLeft(null);
          showToast("Sleep timer finished");
          
          // Restore volume after pausing so next play isn't muted
          if (ytPlayerRef.current) {
            try { ytPlayerRef.current.setVolume(actualVolume); } catch(e) {}
          }
          if (audioRef.current) {
            audioRef.current.volume = actualVolume / 100;
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
        const actualVolume = isMutedRef.current ? 0 : volumeRef.current;
        if (ytPlayerRef.current) {
          try { ytPlayerRef.current.setVolume(actualVolume); } catch(e) {}
        }
        if (audioRef.current) {
          audioRef.current.volume = actualVolume / 100;
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

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }
      
      // If a button is focused, Space or Enter triggers the button's native click.
      // We shouldn't intercept Space here to avoid double-triggering or blocking the click.
      if (target.tagName === 'BUTTON' && (e.code === 'Space' || e.code === 'Enter')) {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          if (playingIdRef.current || temporaryTrackRef.current) {
            const currentTrack = temporaryTrackRef.current || queueRef.current.find(t => t.id === playingIdRef.current) || tracksRef.current.find(t => t.id === playingIdRef.current);
            if (currentTrack) {
              if (ytPlayerRef.current || audioRef.current) {
                // If it's already playing, togglePlay will pause it, and vice versa.
                // Wait, togglePlay will play/pause properly. We need to know if it's currently playing to know whether to call pausePlayer or playPlayer, or simply use togglePlay.
                // Let's call the same toggle logic:
                if (audioRef.current && !audioRef.current.paused) {
                  pausePlayer();
                } else if (ytPlayerRef.current && ytPlayerRef.current.getPlayerState && ytPlayerRef.current.getPlayerState() === YouTube.PlayerState.PLAYING) {
                  pausePlayer();
                } else {
                  togglePlay(currentTrack);
                }
              }
            }
          }
          break;
        case 'KeyN':
          e.preventDefault();
          playNext();
          break;
        case 'KeyM':
          e.preventDefault();
          toggleMute();
          break;
        case 'Escape':
          e.preventDefault();
          setIsIdle(true);
          setIsPlayerMenuOpen(false);
          break;
      }
    };

    // Initial setup
    handleUserActivity();

    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('scroll', handleUserActivity);
    window.addEventListener('click', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('keydown', handleGlobalKeyDown);
    window.addEventListener('touchstart', handleUserActivity);

    return () => {
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('scroll', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('keydown', handleGlobalKeyDown);
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    fetch(translateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text: fullText, targetLanguage: "id" }),
      signal: controller.signal
    })
      .then(res => {
         clearTimeout(timeoutId);
         if (!res.ok) throw new Error("Translation failed");
         return res.json();
      })
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
        
        if (isPlayingRef.current) {
           playtimeAccumulatorRef.current += 0.15;
           if (playtimeAccumulatorRef.current >= 10) {
              const secondsToAdd = Math.floor(playtimeAccumulatorRef.current);
              playtimeAccumulatorRef.current -= secondsToAdd;
              
              if (!temporaryTrackRef.current?.id) {
                 updateDoc(doc(db, "music_playlist", playingId), {
                    totalTimePlayed: increment(secondsToAdd)
                 }).catch(() => {});
                 
                 setTracks(prev => prev.map(t => t.id === playingId ? { ...t, totalTimePlayed: (t.totalTimePlayed || 0) + secondsToAdd } : t));
              }
           }
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
  }, [playingId, tracks, temporaryTrack, queue]);

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
      const list = shuffledTracksRef.current.length > 0 ? shuffledTracksRef.current : currentTracks;
      const currentIndex = list.findIndex(t => t.id === currentPlayingId);
      if (currentIndex !== -1) {
        if (repeatModeRef.current === 0 && currentIndex + 1 >= list.length) {
          setPlayingId(null);
          setIsPlaying(false);
          setCurrentTime(0);
          return;
        }
        const nextIndex = currentIndex + 1 < list.length ? currentIndex + 1 : 0;
        togglePlay(list[nextIndex], true);
      } else if (list.length > 0) {
        togglePlay(list[0], true);
      }
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
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        fetch(`/api/search?q=${encodeURIComponent(currentTrack.artist || 'popular')}`, { signal: controller.signal })
          .then(res => { clearTimeout(timeoutId); if (!res.ok) throw new Error('API error'); return res.json(); })
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
    const trackId = track.id || track.title || track.name;
    const sameSongCount = queue.filter(t => (t.id || t.title || t.name) === trackId).length;
    if (sameSongCount >= 5) {
      showToast("Maximum 5 copies of this song in queue");
      return;
    }
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
      
      // Update play count in Firestore
      if (track.id && !temporaryTrack?.id) {
         try {
            updateDoc(doc(db, "music_playlist", track.id), {
               playCount: increment(1)
            }).catch(() => {});
            
            setTracks(prev => prev.map(t => t.id === track.id ? { ...t, playCount: (t.playCount || 0) + 1 } : t));
         } catch (e) {}
      }
    }
  };

const fetchSongDetailForTrack = async (trackId: string | null, forceRegenerate: boolean = false) => {
    if (!trackId) return;
    const track = getTrack(trackId);
    if (!track) return;
    setSongDetail({ isLoading: true });
    
    try {
      const dbSongId = `${track.artist}-${track.title}`.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const songDocRef = doc(db, 'song_details', dbSongId);
      
      if (!forceRegenerate) {
        const songDoc = await getDoc(songDocRef);
        if (songDoc.exists()) {
          const data = songDoc.data();
          setSongDetail({ 
            isLoading: false, 
            description: data.description, 
            lyrics: data.lyrics,
            translatedDescription: data.translatedDescription
          });
          return;
        }
      }

      const res = await fetch("/api/song-detail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: track.title || track.name || "",
          artist: track.artist || ""
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setSongDetail({ isLoading: false, error: data.error || "Failed to get song detail." });
      } else {
        const cleanLyrics = data.lyrics ? data.lyrics.replace(/\[\d{1,2}:\d{2}(\.\d+)?\]/g, '').trim() : "";
        setSongDetail({ isLoading: false, description: data.description, lyrics: cleanLyrics });
        
        // Save to Firestore for future
        try {
          await setDoc(songDocRef, {
            title: track.title,
            artist: track.artist,
            description: data.description,
            lyrics: cleanLyrics,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch(e) {
          console.error("Failed to save song detail to Firestore", e);
        }
      }
    } catch (e) {
      setSongDetail({ isLoading: false, error: "An error occurred." });
    }
  };

  const removeFromQueue = (index: number) => {
    setQueue(prev => prev.filter((_, i) => i !== index));
    showToast("Removed from queue");
  };

  const moveQueueItem = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= queue.length) return;
    setQueue(prev => {
      const newQueue = [...prev];
      const [movedItem] = newQueue.splice(fromIndex, 1);
      newQueue.splice(toIndex, 0, movedItem);
      return newQueue;
    });
  };

  const createShuffledList = (trackList: Track[], currentId: string | null) => {
    if (!trackList || trackList.length === 0) return [];
    const current = trackList.find(t => t.id === currentId);
    const rest = trackList.filter(t => t.id !== currentId);
    const shuffledRest = [...rest];
    for (let i = shuffledRest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledRest[i], shuffledRest[j]] = [shuffledRest[j], shuffledRest[i]];
    }
    return current ? [current, ...shuffledRest] : shuffledRest;
  };

  useEffect(() => {
    if (isShuffled && tracks.length > 0 && shuffledTracks.length === 0) {
      setShuffledTracks(createShuffledList(tracks, playingId));
    } else if (!isShuffled && shuffledTracks.length > 0) {
      setShuffledTracks([]);
    }
  }, [isShuffled, tracks]);

  const getNextInPlaylist = (): Track[] => {
    const list = isShuffled && shuffledTracks.length > 0 ? shuffledTracks : tracks;
    if (!list || list.length === 0) return [];

    const currentIndex = list.findIndex(t => t.id === playingId);
    if (currentIndex === -1) {
      return list.filter(t => t.id !== playingId);
    }

    const result: Track[] = [];
    for (let i = currentIndex + 1; i < list.length; i++) {
      result.push(list[i]);
    }
    return result;
  };

  const clearQueue = () => {
    setQueue([]);
    showToast("Queue cleared");
  };

  const openSongDetail = () => {
    setIsPlayerMenuOpen(false);
    setIsSongDetailOpen(true);
  };

  useEffect(() => {
    if (isSongDetailOpen && playingId) {
      fetchSongDetailForTrack(playingId);
    }
  }, [playingId, isSongDetailOpen]);


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
    if (newState && tracks.length > 0) {
      setShuffledTracks(createShuffledList(tracks, playingId));
    } else {
      setShuffledTracks([]);
    }
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

  useEffect(() => {
    if ('mediaSession' in navigator) {
      const currentTrack = getTrack(playingId);
      if (currentTrack) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: currentTrack.title || currentTrack.name || "Unknown Title",
          artist: currentTrack.artist || "Unknown Artist",
          album: "My Playlist",
          artwork: currentTrack.coverUrl ? [
            { src: currentTrack.coverUrl, sizes: '512x512', type: 'image/jpeg' }
          ] : []
        });
      }

      navigator.mediaSession.setActionHandler('play', () => {
        if (currentTrack) {
          if (ytPlayerRef.current && currentTrack.youtubeId) {
            ytPlayerRef.current.playVideo();
          } else if (audioRef.current) {
            audioRef.current.play();
          }
          setIsPlaying(true);
        }
      });
      navigator.mediaSession.setActionHandler('pause', pausePlayer);
      navigator.mediaSession.setActionHandler('previoustrack', playPrevious);
      navigator.mediaSession.setActionHandler('nexttrack', playNext);
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime && duration) {
          handleSeek(details.seekTime / duration);
        }
      });
    }
  }, [playingId, tracks, temporaryTrack, duration, isPlaying]);

  const formatTime = (time: number) => {
    if (isNaN(time) || time === 0) return "0:00";
    const hours = Math.floor(time / 3600);
    const mins = Math.floor((time % 3600) / 60);
    const secs = Math.floor(time % 60);
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
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
        queue,
        removeFromQueue,
        moveQueueItem,
        clearQueue,
        volume,
        isMuted,
        setVolume,
        toggleMute,
      }}
    >
      {/* Hidden YouTube Player for Audio */}
      {playingTrack?.youtubeId && (
        <div className="fixed top-0 left-0 w-[200px] h-[200px] pointer-events-none opacity-0 -z-50">
          <YouTube 
            videoId={extractYouTubeId(playingTrack.youtubeId)}
            opts={{
              height: '200',
              width: '200',
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
              e.target.setVolume(isMuted ? 0 : volume);
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

      {/* Persistent Bottom Player Bar & Full Screen Song View */}
      {playingId && (
        <>
          {/* Collapsed Player Bar at Bottom */}
          <div 
            className={cn(
              "fixed bottom-0 left-0 right-0 h-[64px] bg-white/85 backdrop-blur-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.08)] transition-transform duration-300 ease-out border-t border-slate-200/60 z-[40] flex items-center px-3 sm:px-6",
              (isIdle || isSongDetailOpen) ? "translate-y-full pointer-events-none" : "translate-y-0"
            )}
          >
            <div 
              className="absolute inset-0 z-0 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                openSongDetail();
              }}
            />
            <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-3 relative z-10 pointer-events-none">
              {/* Left: Cover & Info */}
              <div className="flex items-center min-w-0 gap-3 shrink-0 pointer-events-auto">
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

              {/* Center: Playback Controls & Seekbar */}
              <div className="flex-1 min-w-0 flex items-center justify-center gap-3 pointer-events-auto">
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
                    className="w-9 h-9 bg-slate-900 rounded-full flex items-center justify-center text-white hover:scale-105 hover:bg-slate-800 transition-all shadow-md shrink-0"
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
                  className="flex-1 h-1 max-w-sm bg-slate-200/90 rounded-full cursor-pointer relative group hidden sm:block"
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
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-2.5 h-2.5 bg-white border border-slate-300 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
                
                <span className="text-[10px] text-slate-500 font-medium w-8 shrink-0 hidden sm:block">
                  {formatTime(duration)}
                </span>
              </div>

              {/* Right: Draggable Volume & Menu */}
              <div className="flex items-center justify-end shrink-0 relative gap-2 pointer-events-auto">
                <div className="hidden sm:flex items-center gap-2">
                  <button 
                    onClick={toggleMute}
                    className="text-slate-600 hover:text-slate-900 transition-colors p-1"
                  >
                    {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : volume < 50 ? <Volume1 className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <div 
                    className="w-20 h-1 bg-slate-200/90 rounded-full cursor-pointer relative"
                    onClick={(e) => {
                      const bounds = e.currentTarget.getBoundingClientRect();
                      const percent = Math.max(0, Math.min(1, (e.clientX - bounds.left) / bounds.width));
                      setVolume(percent * 100);
                    }}
                  >
                    <div 
                      className="absolute top-0 left-0 h-full bg-slate-800 rounded-full"
                      style={{ width: `${isMuted ? 0 : volume}%` }}
                    />
                  </div>
                </div>

                <button 
                  onClick={() => setIsPlayerMenuOpen(!isPlayerMenuOpen)}
                  className="w-8 h-8 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openSongDetail();
                  }}
                  className="w-8 h-8 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors"
                  title="Expand detail"
                >
                  <ChevronUp className="w-5 h-5" />
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
                    <div className="absolute bottom-full right-0 mb-4 w-52 bg-white border border-slate-200/80 rounded-2xl shadow-xl z-50 py-2 animate-in fade-in slide-in-from-bottom-2 duration-200 overflow-hidden font-sans">
                      {/* Mobile Volume Slider */}
                      <div className="px-4 py-3 sm:hidden border-b border-slate-100 flex items-center gap-3">
                        <button onClick={toggleMute} className="text-slate-600 shrink-0">
                          {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                        </button>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={isMuted ? 0 : volume}
                          onChange={(e) => setVolume(Number(e.target.value))}
                          className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-800"
                        />
                      </div>

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
                          Cancel sleep timer
                        </button>
                      )}
                      <button
                        onClick={async () => {
                          setIsPlayerMenuOpen(false);
                          setIsScreenOff(true);
                          try {
                            if ('wakeLock' in navigator) {
                              wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
                            }
                          } catch (e) {
                            console.warn("Wake lock failed", e);
                          }
                        }}
                        className="w-full text-left px-4 py-2.5 text-[14px] text-slate-700 hover:bg-slate-50 transition-colors border-t border-slate-100"
                      >
                        Screen off mode
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Mobile bottom absolute seekbar */}
            <div 
              className="absolute top-0 left-0 w-full h-1 bg-slate-300/50 cursor-pointer sm:hidden pointer-events-auto"
              onClick={(e) => {
                e.stopPropagation();
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

          {/* Full Screen Song Detail & Lyrics Modal Overlay */}
          <div 
            className={cn(
              "fixed inset-0 z-[60] bg-slate-50/95 backdrop-blur-3xl flex flex-col font-sans overflow-hidden transition-all duration-300 ease-out select-none",
              isSongDetailOpen ? "opacity-100 pointer-events-auto translate-y-0" : "opacity-0 pointer-events-none translate-y-full"
            )}
          >
            {/* Ambient Blurred Artwork Backdrop */}
            {trackCover && (
              <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-30">
                <img 
                  src={trackCover} 
                  alt="" 
                  className="w-full h-full object-cover blur-3xl scale-150 transform transition-all duration-700 saturate-150" 
                />
                <div className="absolute inset-0 bg-gradient-to-b from-slate-50/40 via-white/80 to-white" />
              </div>
            )}

            {/* Top Bar Navigation */}
            <div className="h-[60px] shrink-0 border-b border-slate-200/60 px-4 sm:px-6 flex items-center justify-between bg-white/70 backdrop-blur-md relative z-10">
              <button 
                onClick={() => setIsSongDetailOpen(false)}
                className="flex items-center gap-1.5 text-slate-700 hover:text-slate-900 font-medium text-sm transition-colors py-1 px-2 rounded-lg hover:bg-slate-100/80"
              >
                <ChevronDown className="w-5 h-5" />
                <span className="font-semibold hidden md:inline">Now Playing</span>
              </button>

              <div className="text-center font-medium text-xs sm:text-sm text-slate-500 truncate max-w-[180px] sm:max-w-xs">
                {trackTitle} &bull; {trackArtist}
              </div>

              <button 
                onClick={() => setIsSongDetailOpen(false)}
                className="p-2 text-slate-500 hover:text-slate-800 rounded-full hover:bg-slate-100/80 transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Main Content */}
            <div className="flex-1 overflow-y-auto w-full relative z-10">
              <div className="w-full max-w-2xl mx-auto px-4 sm:px-8 py-6 flex flex-col items-center">
              
              {/* Tab Navigation: Details vs Queue */}
              <div className="flex items-center justify-center gap-8 max-w-xs mx-auto mb-8 text-sm font-semibold shrink-0 w-full border-b border-slate-200/60 pb-3">
                <button
                  onClick={() => setActiveModalTab("details")}
                  className={cn(
                    "transition-all relative",
                    activeModalTab === "details" ? "text-slate-900" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  Details
                  {activeModalTab === "details" && (
                    <span className="absolute -bottom-[13px] left-0 right-0 h-[2px] bg-slate-800 rounded-t-full" />
                  )}
                </button>
                <button
                  onClick={() => setActiveModalTab("queue")}
                  className={cn(
                    "transition-all relative flex items-center gap-1.5",
                    activeModalTab === "queue" ? "text-slate-900" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  <ListMusic className="w-4 h-4" />
                  <span>Queue</span>
                  {activeModalTab === "queue" && (
                    <span className="absolute -bottom-[13px] left-0 right-0 h-[2px] bg-slate-800 rounded-t-full" />
                  )}
                </button>
              </div>

              {activeModalTab === "details" ? (
                <>
                  {/* Big Cover Art */}
                  <div className="w-48 h-48 sm:w-64 sm:h-64 rounded-2xl overflow-hidden shadow-2xl border border-slate-200/60 bg-slate-100 shrink-0 mb-6 mt-2">
                    {trackCover ? (
                      <img src={trackCover} alt={trackTitle} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-slate-200" />
                    )}
                  </div>

                  {/* Song Title & Artist */}
                  <div className="text-center w-full mb-4">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1 line-clamp-2">
                      {trackTitle}
                    </h2>
                    <p className="text-slate-600 text-sm sm:text-base font-medium mb-3">
                      {trackArtist}
                    </p>
                    <div className="flex items-center justify-center gap-4 text-xs font-medium text-slate-400">
                      <div className="flex items-center gap-1">
                        <Play className="w-3.5 h-3.5" fill="currentColor" />
                        {getTrack(playingId)?.playCount || 0} plays
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatTime(getTrack(playingId)?.totalTimePlayed || 0)}
                      </div>
                    </div>
                  </div>

                  {/* Full Screen Interactive Seekbar */}
                  <div className="w-full mb-4 px-2">
                    <div 
                      className="w-full h-1 bg-slate-200/90 rounded-full cursor-pointer relative group"
                      onClick={(e) => {
                        const bounds = e.currentTarget.getBoundingClientRect();
                        const percent = (e.clientX - bounds.left) / bounds.width;
                        handleSeek(percent);
                      }}
                    >
                      <div 
                        className="absolute top-0 left-0 h-full bg-slate-900 rounded-full"
                        style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                      >
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-2.5 h-2.5 bg-white border border-slate-400 rounded-full shadow-sm" />
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500 font-medium mt-2">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>

                  {/* Full Screen Playback Controls */}
                  <div className="flex items-center justify-center gap-4 sm:gap-6 mb-6">
                    <button 
                      onClick={handleShuffle}
                      className="p-2 transition-opacity hover:opacity-70 outline-none flex items-center justify-center"
                      title={isShuffled ? "Shuffle on" : "Shuffle off"}
                    >
                      <img 
                        src="https://cdn-icons-png.flaticon.com/128/8191/8191664.png" 
                        alt="Shuffle" 
                        className={cn("w-5 h-5 transition-opacity", isShuffled ? "opacity-100" : "opacity-40")} 
                      />
                    </button>
                    <button 
                      onClick={playPrevious}
                      className="p-2 text-slate-700 hover:text-slate-900 transition-colors"
                      title="Previous"
                    >
                      <SkipBack className="w-6 h-6" fill="currentColor" />
                    </button>
                    <button 
                      onClick={() => playingTrack && togglePlay(playingTrack)}
                      className="w-14 h-14 bg-slate-900 rounded-full flex items-center justify-center text-white hover:scale-105 hover:bg-slate-800 transition-all shadow-lg"
                      title={isPlaying ? "Pause" : "Play"}
                    >
                      {isPlaying ? <Pause className="w-6 h-6" fill="currentColor" /> : <Play className="w-6 h-6 ml-1" fill="currentColor" />}
                    </button>
                    <button 
                      onClick={playNext}
                      className="p-2 text-slate-700 hover:text-slate-900 transition-colors"
                      title="Next"
                    >
                      <SkipForward className="w-6 h-6" fill="currentColor" />
                    </button>
                    <button 
                      onClick={handleRepeat}
                      className="p-2 transition-opacity hover:opacity-70 outline-none flex items-center justify-center"
                      title={repeatMode === 0 ? "Mode putar biasa" : repeatMode === 1 ? "Ulangi Playlist" : "Ulangi Satu Lagu"}
                    >
                      {repeatMode === 2 ? (
                        <Repeat1 className="w-5 h-5 text-slate-800" />
                      ) : (
                        <img 
                          src="https://cdn-icons-png.flaticon.com/128/9041/9041602.png" 
                          alt="Repeat" 
                          className={cn("w-5 h-5 transition-opacity", repeatMode === 1 ? "opacity-100" : "opacity-40")} 
                        />
                      )}
                    </button>
                  </div>

                  {/* Full Screen Clean Volume Control with Dark Fill */}
                  <div className="flex items-center gap-3 w-full max-w-sm mx-auto mb-8 px-2">
                    <button onClick={toggleMute} className="text-slate-600 hover:text-slate-900 transition-colors p-1 shrink-0">
                      {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : volume < 50 ? <Volume1 className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    <div 
                      className="flex-1 h-1 bg-slate-200/90 rounded-full cursor-pointer relative"
                      onClick={(e) => {
                        const bounds = e.currentTarget.getBoundingClientRect();
                        const percent = Math.max(0, Math.min(1, (e.clientX - bounds.left) / bounds.width));
                        setVolume(percent * 100);
                      }}
                    >
                      <div 
                        className="absolute top-0 left-0 h-full bg-slate-900 rounded-full"
                        style={{ width: `${isMuted ? 0 : volume}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-slate-500 w-8 text-right shrink-0">{Math.round(isMuted ? 0 : volume)}%</span>
                  </div>

                  {/* About the Artist & Song Section */}
                  <div className="w-full text-left border-t border-slate-200/70 pt-6">
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        About the Artist & Song
                      </h3>
                      {isAdmin && (
                        <button 
                          onClick={() => fetchSongDetailForTrack(playingId, true)}
                          className="ml-auto text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded transition-colors"
                          title="Force Regenerate via AI"
                        >
                          Regenerate AI
                        </button>
                      )}
                      <button 
 
                        onClick={async () => {
                          if (songDetail.isShowingTranslation) {
                            setSongDetail(prev => ({ ...prev, isShowingTranslation: false }));
                            return;
                          }
                          if (songDetail.translatedDescription) {
                            setSongDetail(prev => ({ ...prev, isShowingTranslation: true }));
                            return;
                          }
                          if (!songDetail.description) return;
                        
                          setSongDetail(prev => ({ ...prev, isTranslating: true }));
                          try {
                            const res = await fetch("/api/translate", {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ text: songDetail.description, targetLanguage: "id" })
                            });
                            const data = await res.json();
                            if (res.ok && data && data[0]) {
                              const translated = data[0].map((item: any) => item[0]).join('');
                              setSongDetail(prev => ({ ...prev, translatedDescription: translated, isShowingTranslation: true, isTranslating: false }));
                            } else {
                              setSongDetail(prev => ({ ...prev, isTranslating: false }));
                            }
                          } catch(e) {
                            setSongDetail(prev => ({ ...prev, isTranslating: false }));
                          }
                        }}
                        className={cn("transition-colors flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700", songDetail.isShowingTranslation && "text-slate-700")}
                        title="Translate"
                      >
                        {songDetail.isTranslating ? (
                          <span className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 border-t-slate-600 animate-spin" />
                        ) : (
                          <Languages className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                    
                    {songDetail.isLoading ? (
                      <div className="flex flex-col gap-2.5 mt-4">
                        <div className="h-3.5 bg-slate-200/80 rounded animate-pulse w-full"></div>
                        <div className="h-3.5 bg-slate-200/80 rounded animate-pulse w-5/6"></div>
                        <div className="h-3.5 bg-slate-200/80 rounded animate-pulse w-4/6"></div>
                      </div>
                    ) : songDetail.error ? (
                      <div className="flex items-center gap-3 p-4 bg-slate-50/50 rounded-xl border border-slate-100 text-slate-500 text-sm mt-3">
                        <span className="text-lg">ℹ️</span>
                        <p>About the artist is currently unavailable.</p>
                      </div>
                    ) : (
                      <div className="text-slate-700 text-sm sm:text-base leading-relaxed whitespace-pre-wrap mt-3 font-sans transition-all">
                        {songDetail.isShowingTranslation && songDetail.translatedDescription 
                          ? songDetail.translatedDescription 
                          : (songDetail.description || "No description available for this track.")}
                      </div>
                    )}
                  </div>

                  {/* Lyrics Section */}
                  <div className="w-full text-left border-t border-slate-200/70 pt-6 mt-8 mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Full Lyrics
                      </h3>
                      {songDetail.lyrics && !songDetail.error && (
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(songDetail.lyrics || '');
                            setIsCopied(true);
                            setTimeout(() => setIsCopied(false), 2000);
                            showToast("Lyrics copied");
                          }}
                          className="text-slate-400 hover:text-slate-700 transition-colors flex items-center justify-center rounded-full"
                          title="Copy Lyrics"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                    {songDetail.isLoading ? (
                      <div className="flex flex-col gap-2.5 mt-4">
                        <div className="h-3.5 bg-slate-200/80 rounded animate-pulse w-3/4"></div>
                        <div className="h-3.5 bg-slate-200/80 rounded animate-pulse w-1/2"></div>
                      </div>
                    ) : songDetail.error || !songDetail.lyrics ? (
                      <div className="flex items-center gap-3 p-4 bg-slate-50/50 rounded-xl border border-slate-100 text-slate-500 text-sm mt-3">
                        <span className="text-lg">🎵</span>
                        <p>Lyrics are not available for this track yet.</p>
                      </div>
                    ) : (
                      <div className="text-slate-800 text-sm sm:text-base leading-relaxed whitespace-pre-wrap mt-3 font-sans">
                        {songDetail.lyrics}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* QUEUE TAB */
                <div className="w-full text-left flex flex-col gap-6">
                  {/* Currently Playing Card */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                      Now Playing
                    </h3>
                    {playingTrack ? (
                      <div className="flex items-center gap-3 py-2">
                        <img 
                          src={playingTrack.coverUrl || playingTrack.cover || playingTrack.image || "/placeholder.png"} 
                          alt="" 
                          className="w-12 h-12 rounded-xl object-cover shrink-0 shadow-sm" 
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">
                            {playingTrack.title || playingTrack.name}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            {playingTrack.artist}
                          </p>
                        </div>
                        <div className="flex items-end gap-[3px] h-[14px] px-2 shrink-0 pb-1" title={isPlaying ? "Playing" : "Paused"}>
                          <span className={cn("w-[2.5px] rounded-t-sm bg-slate-700 transition-all duration-300", isPlaying ? "h-[10px] animate-[pulse_0.6s_ease-in-out_infinite]" : "h-1.5")} />
                          <span className={cn("w-[2.5px] rounded-t-sm bg-slate-700 transition-all duration-300", isPlaying ? "h-[14px] animate-[pulse_0.8s_ease-in-out_infinite_150ms]" : "h-1.5")} />
                          <span className={cn("w-[2.5px] rounded-t-sm bg-slate-700 transition-all duration-300", isPlaying ? "h-[8px] animate-[pulse_0.5s_ease-in-out_infinite_300ms]" : "h-1.5")} />
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No track playing</p>
                    )}
                  </div>

                  {/* Queued Songs (Manual Queue) */}
                  {queue.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Queue
                        </h3>
                        <button 
                          onClick={clearQueue}
                          className="text-xs font-medium text-slate-500 hover:text-red-600 transition-colors"
                        >
                          Clear All
                        </button>
                      </div>
                      <div className="flex flex-col gap-2">
                        {queue.map((qTrack, idx) => (
                          <div 
                            key={`queue-${qTrack.id}-${idx}`}
                            className="flex items-center gap-3 py-2 hover:bg-slate-50/50 rounded-xl px-2 -mx-2 transition-all group"
                          >
                            <img 
                              src={qTrack.coverUrl || qTrack.cover || qTrack.image || "/placeholder.png"} 
                              alt="" 
                              className="w-10 h-10 rounded-lg object-cover shrink-0 cursor-pointer" 
                              onClick={() => togglePlay(qTrack, true)}
                            />
                            <div 
                              className="flex-1 min-w-0 cursor-pointer"
                              onClick={() => togglePlay(qTrack, true)}
                            >
                              <p className="text-xs font-bold text-slate-800 truncate">
                                {qTrack.title || qTrack.name}
                              </p>
                              <p className="text-[11px] text-slate-500 truncate">
                                {qTrack.artist}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="flex flex-col">
                                <button
                                  disabled={idx === 0}
                                  onClick={() => moveQueueItem(idx, idx - 1)}
                                  className="text-slate-400 hover:text-slate-700 disabled:opacity-25 p-0.5 transition-colors"
                                  title="Move up"
                                >
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  disabled={idx === queue.length - 1}
                                  onClick={() => moveQueueItem(idx, idx + 1)}
                                  className="text-slate-400 hover:text-slate-700 disabled:opacity-25 p-0.5 transition-colors"
                                  title="Move down"
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <button
                                onClick={() => removeFromQueue(idx)}
                                className="text-slate-400 hover:text-slate-700 transition-colors p-1"
                                title="Remove from queue"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Next in Playlist / Library */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                      Next in Playlist
                    </h3>
                    <div className="flex flex-col gap-2">
                      {getNextInPlaylist().map((pTrack) => (
                        <div 
                          key={`playlist-next-${pTrack.id}`}
                          className={cn(
                            "flex items-center gap-3 py-2 hover:bg-slate-50/50 rounded-xl px-2 -mx-2 transition-all cursor-pointer group relative",
                            nextMenuTrackId === pTrack.id ? "z-30" : "z-0"
                          )}
                          onClick={() => togglePlay(pTrack, true)}
                        >
                          <img 
                            src={pTrack.coverUrl || pTrack.cover || pTrack.image || "/placeholder.png"} 
                            alt="" 
                            className="w-10 h-10 rounded-lg object-cover shrink-0" 
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-slate-900">
                              {pTrack.title || pTrack.name}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate">
                              {pTrack.artist}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0 relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setNextMenuTrackId(nextMenuTrackId === pTrack.id ? null : pTrack.id);
                              }}
                              className="p-1.5 text-slate-400 hover:text-slate-800 transition-colors"
                              title="Options"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {nextMenuTrackId === pTrack.id && (
                              <>
                                <div 
                                  className="fixed inset-0 z-40" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setNextMenuTrackId(null);
                                  }} 
                                />
                                <div 
                                  className="absolute right-0 top-full mt-1 w-36 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1 font-sans animate-in fade-in zoom-in-95 duration-150"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      addToQueue(pTrack);
                                      setNextMenuTrackId(null);
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                                  >
                                    <ListPlus className="w-3.5 h-3.5 text-slate-500" />
                                    <span>Add to queue</span>
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              </div>
            </div>
          </div>
        </>
      )}
      
      {/* Screen Off Overlay */}
      {isScreenOff && (
        <div 
          className="fixed inset-0 bg-black z-[9999] flex flex-col items-center justify-center cursor-pointer"
          onClick={() => {
            setIsScreenOff(false);
            if (wakeLockRef.current) {
              wakeLockRef.current.release().catch(() => {});
              wakeLockRef.current = null;
            }
          }}
        >
          <p className="text-white/30 text-sm font-medium tracking-widest uppercase mb-4 animate-pulse">
            Tap anywhere to wake
          </p>
          <div className="flex items-center gap-3">
            <span className="flex items-end gap-1 h-4">
              <motion.span animate={{ height: ["4px", "16px", "4px"] }} transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }} className="w-1 bg-white/40 rounded-full" />
              <motion.span animate={{ height: ["16px", "4px", "16px"] }} transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }} className="w-1 bg-white/40 rounded-full" />
              <motion.span animate={{ height: ["8px", "12px", "8px"] }} transition={{ duration: 1.0, repeat: Infinity, ease: "easeInOut" }} className="w-1 bg-white/40 rounded-full" />
            </span>
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
