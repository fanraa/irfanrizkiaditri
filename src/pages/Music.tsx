import { SEO } from "@/components/SEO";
import { ImageWithSkeleton } from "@/components/ImageWithSkeleton";
import { PlaySearchModal } from "@/components/PlaySearchModal";

import YouTube from 'react-youtube';
import React, { useEffect, useState, useRef, useMemo } from "react";
import { PageTransition } from "@/components/PageTransition";
import { Languages, Palette, Play, Pause, GripVertical, Music as MusicIcon, Loader2, Shuffle, Edit2, MoreVertical, Clock, Repeat, Repeat1, ChevronRight, Sparkles, Minimize2, Maximize2, SkipBack, SkipForward, ListMusic, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { Reorder, useDragControls, motion, AnimatePresence } from 'motion/react';

import { useAudio, Track } from "@/context/AudioContext";
import { useAuth } from "@/context/AuthContext";
import { addDoc, collection, updateDoc, doc, onSnapshot, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Plus, X } from "lucide-react";
import { createPortal } from "react-dom";

const SearchCoverImage = ({
  src,
  youtubeId,
  alt,
}: {
  src?: string;
  youtubeId?: string;
  alt?: string;
}) => {
  const [currentSrc, setCurrentSrc] = useState<string | undefined>(src);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setCurrentSrc(src);
    setHasError(false);
  }, [src]);

  const handleError = () => {
    if (youtubeId && currentSrc !== `https://i.ytimg.com/vi/${youtubeId}/mqdefault.jpg`) {
      setCurrentSrc(`https://i.ytimg.com/vi/${youtubeId}/mqdefault.jpg`);
    } else {
      setHasError(true);
    }
  };

  if (!currentSrc || hasError) {
    return (
      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 text-slate-400">
        <MusicIcon className="w-4 h-4" />
      </div>
    );
  }

  return (
    <img
      src={currentSrc}
      alt={alt || ""}
      onError={handleError}
      className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg object-cover bg-slate-100 shrink-0"
      referrerPolicy="no-referrer"
      loading="lazy"
    />
  );
};

const formatTrackTime = (time: number) => {
  if (isNaN(time) || time === 0) return "0:00";
  const hours = Math.floor(time / 3600);
  const mins = Math.floor((time % 3600) / 60);
  const secs = Math.floor(time % 60);
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const MarqueeText = ({ text, className }: { text: string; className?: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        setIsOverflowing(textRef.current.scrollWidth > containerRef.current.clientWidth);
      }
    };
    
    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, [text]);

  return (
    <div ref={containerRef} className={cn("relative overflow-hidden w-full mask-fade-edges", className)}>
      <div
        ref={textRef}
        className={cn(
          "whitespace-nowrap inline-block",
          isOverflowing ? "animate-[marquee_8s_linear_infinite]" : ""
        )}
      >
        {text}
        {isOverflowing && <span className="ml-8">{text}</span>}
      </div>
    </div>
  );
};





import { Search, Link as LinkIcon } from 'lucide-react';


function SearchResultItem({ track, onAdd, onPlayToggle, isPlaying, loading }: any) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    if (containerRef.current && textRef.current) {
      setIsOverflowing(textRef.current.scrollWidth > containerRef.current.clientWidth);
    }
  }, [track.title]);

  return (
    <div className="flex items-center p-2 rounded-xl hover:bg-slate-100/50 transition-colors group cursor-default w-full box-border">
      <div className="relative w-12 h-12 rounded-md overflow-hidden bg-slate-200 flex-shrink-0 mr-3">
        <ImageWithSkeleton src={track.coverUrl} alt="" className="w-full h-full object-cover" />
        {(!track.youtubeId || !track.youtubeId.startsWith('itunes-')) && (
          <button 
            onClick={onPlayToggle}
            className={cn(
              "absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity",
              isPlaying ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}
          >
            {isPlaying ? <Pause className="w-5 h-5 text-white" fill="currentColor" /> : <Play className="w-5 h-5 text-white ml-0.5" fill="currentColor" />}
          </button>
        )}
      </div>
      <div className="flex-1 min-w-0 mr-3 overflow-hidden">
        <div 
          ref={containerRef} 
          className={cn("relative overflow-hidden w-full", isOverflowing ? "whitespace-nowrap mask-fade-edges" : "")}
        >
          <div 
            ref={textRef} 
            className={cn("text-sm font-bold text-slate-800", isOverflowing ? "inline-block group-hover:animate-marquee" : "truncate")}
          >
            {track.title}
            {isOverflowing && <span className="ml-8">{track.title}</span>}
          </div>
        </div>
        <p className="text-xs text-slate-500 truncate">{track.artist}</p>
      </div>
      <button 
        onClick={onAdd}
        disabled={loading}
        className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors flex-shrink-0 disabled:opacity-50"
      >
        {loading ? 'Adding...' : 'Add'}
      </button>
    </div>
  );
}

function AddTrackModal({ isOpen, onClose, onAdded, existingTracks }: { isOpen: boolean; onClose: () => void; onAdded: () => void; existingTracks: any[] }) {
  const [mode, setMode] = useState<'search' | 'manual'>('search');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ title: '', artist: '', youtubeId: '', coverUrl: '' });
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Recommendations State
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isFetchingRecommendations, setIsFetchingRecommendations] = useState(false);

  // Preview State
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const previewPlayerRef = useRef<any>(null);

  const { isPlaying: mainIsPlaying, pausePlayer } = useAudio();

  const fetchRecommendations = async () => {
    setIsFetchingRecommendations(true);
    try {
      const randomQueries = ["latest popular hits","top global songs","viral tiktok songs","billboard hot 100","indonesian top hits","chill pop music","trending pop songs"];
      const randomQuery = randomQueries[Math.floor(Math.random() * randomQueries.length)];
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);
      
      const res = await fetch(`/api/search?q=${encodeURIComponent(randomQuery)}`, { signal: controller.signal });
      clearTimeout(timeoutId);
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType?.includes('application/json')) {
        const data = await res.json();
        const results = data.results || [];
        // Filter out existing tracks
        const existingIds = new Set(existingTracks.map(t => t.youtubeId));
        const filtered = results.filter((t: any) => !existingIds.has(t.youtubeId));
        setRecommendations(filtered);
      } else {
         throw new Error('Backend not available');
      }
    } catch (err) {
      console.log('Falling back to iTunes recommendations...');
      try {
        const itunesRes = await fetch(`https://itunes.apple.com/search?term=pop+hits&entity=song&limit=15`);
        if (itunesRes.ok) {
           const itunesData = await itunesRes.json();
           const formattedResults = (itunesData.results || []).map((item: any) => ({
             youtubeId: item.trackId ? `itunes-${item.trackId}` : '', 
             audio: item.previewUrl,
             title: item.trackName,
             artist: item.artistName,
             coverUrl: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '600x600bb') : ''
           }));
           setRecommendations(formattedResults);
        }
      } catch (fallbackErr) {
        console.error(fallbackErr);
      }
    } finally {
      setIsFetchingRecommendations(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      if (recommendations.length === 0) {
        fetchRecommendations();
      }
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      // Reset state
      setMode('search');
      setSearchQuery('');
      setSearchResults([]);
      setFormData({ title: '', artist: '', youtubeId: '', coverUrl: '' });
      setPreviewId(null);
      setPreviewPlaying(false);
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (previewPlaying && mainIsPlaying) {
       pausePlayer();
    }
  }, [previewPlaying, mainIsPlaying]);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // Wait a bit longer for explicit searches
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`, { signal: controller.signal });
      clearTimeout(timeoutId);
      const contentType = res.headers.get('content-type');
      if (!res.ok || !contentType?.includes('application/json')) {
        throw new Error('Backend not available');
      }
      const data = await res.json();
      let results = data.results || [];
      const seen = new Set();
      const deduped = [];
      for (const r of results) {
        const key = `${(r.title || '').toLowerCase()}|${(r.artist || '').toLowerCase()}`;
        if (!seen.has(key)) {
          seen.add(key);
          deduped.push(r);
        }
      }
      setSearchResults(deduped);
    } catch (err) {
      console.log('Falling back to iTunes search...', err);
      try {
        const itunesRes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(searchQuery)}&entity=song&limit=10`);
        if (!itunesRes.ok) throw new Error('iTunes search failed');
        const itunesData = await itunesRes.json();
        
        const formattedResults = (itunesData.results || []).map((item: any) => ({
          youtubeId: item.trackId ? `itunes-${item.trackId}` : '', // Use iTunes ID as a dummy youtubeId to avoid empty keys rendering issues
          audio: item.previewUrl,
          title: item.trackName,
          artist: item.artistName,
          coverUrl: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '600x600bb') : ''
        }));
        setSearchResults(formattedResults);
      } catch (fallbackErr) {
        console.error(fallbackErr);
        alert('Gagal mencari lagu. Fitur ini memerlukan backend atau koneksi internet yang stabil.');
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddSearchResult = async (track: any) => {
    setLoading(true);
    try {
      const trackData: any = {
        title: track.title,
        artist: track.artist || track.author || 'Unknown Artist',
        youtubeId: track.youtubeId?.startsWith('itunes-') ? '' : track.youtubeId,
        coverUrl: track.coverUrl,
        order: Date.now()
      };
      if (track.audio) {
        trackData.audio = track.audio;
      }
      await addDoc(collection(db, "music_playlist"), trackData);
      onAdded();
      
      // Stop preview when added
      if (previewId === track.youtubeId) {
         previewPlayerRef.current?.pauseVideo();
         setPreviewPlaying(false);
         setPreviewId(null);
      }
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let finalYtId = formData.youtubeId;
      if (finalYtId.includes('youtube.com') || finalYtId.includes('youtu.be')) {
        try {
          const url = new URL(finalYtId);
          if (url.hostname === 'youtu.be') {
            finalYtId = url.pathname.slice(1);
          } else {
            finalYtId = url.searchParams.get('v') || finalYtId;
          }
        } catch (err) {}
      }
      await addDoc(collection(db, "music_playlist"), {
        title: formData.title,
        artist: formData.artist,
        youtubeId: finalYtId,
        coverUrl: formData.coverUrl,
        order: Date.now()
      });
      onAdded();
      onClose();
      setFormData({ title: '', artist: '', youtubeId: '', coverUrl: '' });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const togglePreview = (id: string) => {
    if (previewId === id) {
      if (previewPlaying) {
         previewPlayerRef.current?.pauseVideo();
         setPreviewPlaying(false);
      } else {
         previewPlayerRef.current?.playVideo();
         setPreviewPlaying(true);
      }
    } else {
      setPreviewId(id);
      setPreviewPlaying(false);
    }
  };

  const displayResults = searchQuery && !isSearching ? searchResults : (recommendations.length > 0 ? recommendations : []);
  const showRecommendationsTitle = !searchQuery && !isSearching && recommendations.length > 0;

  return createPortal(
    <div className="fixed inset-0 z-[10000] overflow-y-auto overflow-x-hidden flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}>
      <div 
        className={cn(
          "bg-white backdrop-blur-xl rounded-3xl shadow-2xl w-full overflow-hidden relative flex flex-col md:flex-row m-auto transition-all duration-300",
          mode === 'manual' ? "max-w-lg" : "max-w-2xl"
        )}
        onClick={e => e.stopPropagation()}
      >
        {/* Hidden YouTube player for preview */}
        <div className="absolute w-0 h-0 overflow-hidden opacity-0 pointer-events-none">
          {previewId && (
            <YouTube 
              videoId={previewId}
              opts={{ playerVars: { autoplay: 1 } }}
              onReady={(e) => {
                previewPlayerRef.current = e.target;
                e.target.playVideo();
                setPreviewPlaying(true);
              }}
              onStateChange={(e) => {
                if (e.data === 1) setPreviewPlaying(true);
                if (e.data === 2) setPreviewPlaying(false);
                if (e.data === 0) { setPreviewPlaying(false); setPreviewId(null); }
              }}
            />
          )}
        </div>

        {mode === 'manual' && (
          <div className={cn("relative bg-slate-100 flex-shrink-0 flex items-center justify-center", formData.coverUrl ? "" : "hidden md:flex", "h-32 md:h-auto md:w-2/5")}>
            {formData.coverUrl ? (
              <ImageWithSkeleton src={formData.coverUrl} alt="Cover Preview" className="w-full h-full object-cover" />
            ) : (
              <div className="text-slate-400 flex flex-col items-center justify-center space-y-2 p-4 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-image"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                <span className="text-xs font-medium">Cover Preview</span>
              </div>
            )}
            <button onClick={onClose} className="md:hidden absolute top-2 right-2 p-1.5 bg-black/40 hover:bg-black/60 rounded-full text-white transition-colors backdrop-blur-md">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="p-5 md:p-6 flex-1 flex flex-col min-h-[450px] max-w-full w-full">
          <div className="flex justify-between items-center mb-4 md:mb-5">
            <h2 className="text-lg font-bold text-slate-800 tracking-tight font-heading">Add Track</h2>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-200/50 rounded-full text-slate-500 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl mb-5 shrink-0 w-full">
            <button 
              onClick={() => setMode('search')}
              className={cn("flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2", mode === 'search' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            >
              <Search className="w-3.5 h-3.5" /> Global Search
            </button>
            <button 
              onClick={() => setMode('manual')}
              className={cn("flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2", mode === 'manual' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            >
              <LinkIcon className="w-3.5 h-3.5" /> Manual
            </button>
          </div>

          {mode === 'search' ? (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              <form onSubmit={handleSearch} className="flex gap-2 mb-4 shrink-0 w-full max-w-full">
                <div className="relative flex-1 min-w-0">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for any song or artist..." 
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border-none rounded-xl focus:outline-none focus:bg-slate-100 transition-all placeholder-slate-400"
                  />
                </div>
                <button type="submit" disabled={isSearching || !searchQuery.trim()} className="px-4 py-2.5 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 disabled:opacity-50 transition-all shadow-md shrink-0 flex items-center justify-center min-w-[80px]">
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                </button>
              </form>

              <div className="flex-1 overflow-y-auto pr-2 space-y-1 pb-2">
                {isSearching || (isFetchingRecommendations && !searchQuery) ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3 py-10">
                    <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
                    <p className="text-xs font-medium">{isSearching ? 'Searching globally...' : 'Loading recommendations...'}</p>
                  </div>
                ) : displayResults.length > 0 ? (
                  <>
                    {showRecommendationsTitle && (
                      <div className="px-2 pb-2 pt-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Trending Recommendations
                      </div>
                    )}
                    {displayResults.map((track) => (
                      <SearchResultItem 
                        key={track.youtubeId}
                        track={track}
                        onAdd={() => handleAddSearchResult(track)}
                        onPlayToggle={() => togglePreview(track.youtubeId)}
                        isPlaying={previewId === track.youtubeId && previewPlaying}
                        loading={loading}
                      />
                    ))}
                  </>
                ) : searchQuery ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 py-10">
                    <p className="text-sm">No results found.</p>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitManual} className="space-y-3.5 flex-1 flex flex-col w-full max-w-full">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wider">Title</label>
                <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-3 py-2 text-sm bg-slate-50 border-none rounded-lg focus:outline-none focus:bg-slate-100 transition-all placeholder-slate-400" placeholder="Song Title" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wider">Artist</label>
                <input required type="text" value={formData.artist} onChange={e => setFormData({...formData, artist: e.target.value})} className="w-full px-3 py-2 text-sm bg-slate-50 border-none rounded-lg focus:outline-none focus:bg-slate-100 transition-all placeholder-slate-400" placeholder="Artist Name" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wider">YouTube ID/Link</label>
                <input required type="text" value={formData.youtubeId} onChange={e => setFormData({...formData, youtubeId: e.target.value})} className="w-full px-3 py-2 text-sm bg-slate-50 border-none rounded-lg focus:outline-none focus:bg-slate-100 transition-all placeholder-slate-400" placeholder="e.g. dQw4w9WgXcQ" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wider">Cover Image URL</label>
                <input required type="url" value={formData.coverUrl} onChange={e => setFormData({...formData, coverUrl: e.target.value})} className="w-full px-3 py-2 text-sm bg-slate-50 border-none rounded-lg focus:outline-none focus:bg-slate-100 transition-all placeholder-slate-400" placeholder="https://..." />
              </div>
              <div className="pt-3 mt-auto flex justify-end gap-2 w-full">
                <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100/50 hover:bg-slate-200/50 rounded-full transition-all">Cancel</button>
                <button type="submit" disabled={loading} className="px-5 py-2 bg-slate-900 text-white text-xs font-semibold rounded-full hover:bg-slate-800 disabled:opacity-50 transition-all shadow-md">
                  {loading ? 'Adding...' : 'Add Track'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function TrackItem({ track, isAdmin, isCurrentTrack, togglePlay, isPlaying, onEdit }: any) {
  const controls = useDragControls();
  const { addToQueue } = useAudio();
  const [showMenu, setShowMenu] = useState(false);
  const trackTitle = track.title || track.name || "Unknown Track";
  const trackArtist = track.artist || "Unknown Artist";
  const trackCover = track.coverUrl || track.cover || track.image;

  // Add click outside handler for the menu
  useEffect(() => {
    if (!showMenu) return;
    const handleClick = () => setShowMenu(false);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [showMenu]);

  if (track.spotifyId && !track.youtubeId) {
    return (
      <Reorder.Item 
        value={track} 
        dragListener={false} 
        dragControls={controls} 
        className="w-full bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:border-slate-300 transition-colors h-[80px] relative"
      >
        {isAdmin && (
          <div 
            className="absolute left-2 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 transition-colors z-10 bg-white/80 p-1.5 rounded-full backdrop-blur-sm"
            onPointerDown={(e) => controls.start(e)}
            style={{ touchAction: "none" }}
          >
            <GripVertical className="w-4 h-4" />
          </div>
        )}
        <iframe
          src={`https://open.spotify.com/embed/track/${track.spotifyId}?utm_source=generator&theme=0`}
          width="100%"
          height="80"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          style={{ border: 0, borderRadius: "0.75rem" }}
        ></iframe>
      </Reorder.Item>
    );
  }

  return (
    <Reorder.Item
      value={track}
      dragListener={false}
      dragControls={controls}
      className={cn(
        "relative",
        "flex items-center p-3 border transition-all duration-300",
        isCurrentTrack
          ? "bg-slate-100 border-slate-800 shadow-sm rounded-xl"
          : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm rounded-xl"
      )}
    >
      {isAdmin && (
        <div 
          className="mr-2 p-1 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 transition-colors rounded"
          onPointerDown={(e) => controls.start(e)}
          style={{ touchAction: "none" }}
        >
          <GripVertical className="w-5 h-5" />
        </div>
      )}
      <div className={cn(
        "flex-shrink-0 w-12 h-12 rounded-md overflow-hidden flex items-center justify-center pointer-events-none",
        !trackCover && "bg-slate-100"
      )}>
        {trackCover ? (
          <ImageWithSkeleton src={trackCover} alt={trackTitle} className="w-full h-full object-cover" />
        ) : (
          <MusicIcon className="w-5 h-5 text-slate-400" />
        )}
      </div>
      
      <div className="ml-4 flex-1 min-w-0 overflow-hidden flex flex-col justify-center">
        <MarqueeText
          text={trackTitle}
          className={cn("font-semibold text-sm", "text-slate-800")}
        />
        <MarqueeText
          text={trackArtist}
          className="text-xs text-slate-500 mt-0.5"
        />
      </div>

      {isAdmin && (
        <button 
          onClick={() => onEdit(track)}
          className="ml-2 text-slate-400 hover:text-slate-600 p-1.5 transition-colors rounded-md"
        >
          <Edit2 className="w-4 h-4" />
        </button>
      )}
      
      <button
        onClick={() => togglePlay(track)}
        className={cn(
          "ml-2 sm:ml-4 flex-shrink-0 w-10 h-10 flex items-center justify-center transition-all outline-none rounded-full",
          isCurrentTrack ? "text-slate-800 hover:bg-slate-200/50" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
        )}
      >
        {(isCurrentTrack && isPlaying) ? <Pause className="w-5 h-5" fill="currentColor" /> : <Play className="w-5 h-5 ml-0.5" fill="currentColor" />}
      </button>

      <div className="relative ml-1 sm:ml-2">
        <button
          onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
          className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
        >
          <MoreVertical className="w-5 h-5" />
        </button>
        {showMenu && (
          <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden py-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                addToQueue(track);
                setShowMenu(false);
              }}
              className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Add to queue
            </button>
          </div>
        )}
      </div>
    </Reorder.Item>
  );
}

function EditTrackModal({ isOpen, onClose, track, onSaved }: { isOpen: boolean; onClose: () => void; track: any; onSaved: () => void }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ title: '', artist: '', coverUrl: '' });
  
  // Search state for metadata
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  useEffect(() => {
    if (track) {
      setFormData({
        title: track.title || track.name || '',
        artist: track.artist || '',
        coverUrl: track.coverUrl || track.cover || track.image || ''
      });
      
      // Auto-populate search with current title and artist
      const title = track.title || track.name || '';
      const artist = track.artist || '';
      if (title) {
        setSearchQuery(`${artist} ${title}`.trim());
      }
    }
  }, [track]);

  if (!isOpen || !track) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const trackRef = doc(db, "music_playlist", track.id);
      await updateDoc(trackRef, {
        title: formData.title,
        artist: formData.artist,
        coverUrl: formData.coverUrl
      });
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this track?')) return;
    setLoading(true);
    try {
      const { deleteDoc } = await import('firebase/firestore');
      const trackRef = doc(db, "music_playlist", track.id);
      await deleteDoc(trackRef);
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      // Instead of YouTube search, let's use iTunes API for metadata
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(searchQuery)}&entity=song&limit=5`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      let results = data.results || [];
      const seen = new Set();
      const deduped = [];
      for (const r of results) {
        const key = `${(r.title || '').toLowerCase()}|${(r.artist || '').toLowerCase()}`;
        if (!seen.has(key)) {
          seen.add(key);
          deduped.push(r);
        }
      }
      setSearchResults(deduped);
    } catch (err) {
      console.error(err);
      alert('Failed to search iTunes. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const applyMetadata = (item: any) => {
    setFormData({
      title: item.trackName,
      artist: item.artistName,
      coverUrl: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '600x600bb') : ''
    });
    setSearchResults([]);
  };

  return createPortal(
    <div className="fixed inset-0 z-[10000] overflow-y-auto overflow-x-hidden flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden relative m-auto flex flex-col md:flex-row"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 md:p-6 flex-1 flex flex-col w-full">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-slate-800 tracking-tight font-heading">Edit Track</h2>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-200/50 rounded-full text-slate-500 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSearchMetadata} className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for correct metadata..." 
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-100 border-none rounded-xl focus:outline-none focus:bg-slate-200 transition-all placeholder-slate-400"
              />
            </div>
            <button type="submit" disabled={isSearching || !searchQuery.trim()} className="px-3 py-2 bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-300 disabled:opacity-50 transition-all">
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
            </button>
          </form>

          {searchResults.length > 0 && (
            <div className="mb-4 max-h-40 overflow-y-auto border border-slate-200 rounded-xl bg-slate-50 p-1 space-y-1">
              {searchResults.map((item, idx) => (
                <div key={idx} onClick={() => applyMetadata(item)} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors shadow-sm">
                  {item.artworkUrl100 ? (
                    <ImageWithSkeleton src={item.artworkUrl100} className="w-10 h-10 rounded-md object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-md bg-slate-200 flex items-center justify-center">
                      <MusicIcon className="w-4 h-4 text-slate-400" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800 truncate">{item.trackName}</p>
                    <p className="text-xs text-slate-500 truncate">{item.artistName}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wider">Title</label>
              <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-3 py-2 text-sm bg-slate-50 border-none rounded-lg focus:outline-none focus:bg-slate-100 transition-all placeholder-slate-400" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wider">Artist</label>
              <input required type="text" value={formData.artist} onChange={e => setFormData({...formData, artist: e.target.value})} className="w-full px-3 py-2 text-sm bg-slate-50 border-none rounded-lg focus:outline-none focus:bg-slate-100 transition-all placeholder-slate-400" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wider">Cover Image URL</label>
              <input type="url" value={formData.coverUrl} onChange={e => setFormData({...formData, coverUrl: e.target.value})} className="w-full px-3 py-2 text-sm bg-slate-50 border-none rounded-lg focus:outline-none focus:bg-slate-100 transition-all placeholder-slate-400" />
            </div>
            
            <div className="pt-3 mt-4 border-t border-slate-100 flex justify-between gap-2">
              <button type="button" onClick={handleDelete} disabled={loading} className="px-4 py-2 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-full transition-all flex items-center gap-1.5">
                Delete Track
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100/50 hover:bg-slate-200/50 rounded-full transition-all">Cancel</button>
                <button type="submit" disabled={loading} className="px-5 py-2 bg-slate-900 text-white text-xs font-semibold rounded-full hover:bg-slate-800 disabled:opacity-50 transition-all shadow-md">
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
}




export function Music() {
  const {
    tracks,
    loading,
    playingId,
    isPlaying,
    currentTime,
    duration,
    isShuffled,
    repeatMode, sleepTimerEnd, setSleepTimer,
    isInstrumental,
    lyrics,
    currentLyricIndex,
    toastMessage,
    dominantColors,
    togglePlay,
    playNext,
    playPrevious,
    handleShuffle,
    handleRepeat,
    updateTracksOrder,
    isIndoSong,
    handleSeek,
    isCharacterMode,
    setIsCharacterMode,
    playTemporaryTrack,
    temporaryTrack,
  } = useAudio();
  const { isAdmin } = useAuth();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPlaySearchOpen, setIsPlaySearchOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showMenuTimerOptions, setShowMenuTimerOptions] = useState(false);
  const [showFullLyrics, setShowFullLyrics] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [characterSearch, setCharacterSearch] = useState("");
  const [isCharSearchDropdownOpen, setIsCharSearchDropdownOpen] = useState(false);
  const [internetResults, setInternetResults] = useState<any[]>([]);
  const [isSearchingInternet, setIsSearchingInternet] = useState(false);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const [editTrack, setEditTrack] = useState<any>(null);
  const spotifyPlaylistId = "2EtLBMiPdkw0XiDhYr0Zrj";

  const [isDarkBg, setIsDarkBg] = useState(false);
  const [invertLyricColor, setInvertLyricColor] = useState(false);
  const [musicImage, setMusicImage] = useState<string>('https://cdn-icons-png.flaticon.com/128/9240/9240687.png');
  const playingTrack = tracks.find(t => t.id === playingId) || (temporaryTrack?.id === playingId ? temporaryTrack : null);

  // Debounced internet search when typing in characterSearch
  useEffect(() => {
    if (!characterSearch.trim()) {
      setInternetResults([]);
      setIsSearchingInternet(false);
      return;
    }

    const query = characterSearch.trim();
    setIsSearchingInternet(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          const results = data.results || [];
          const seen = new Set();
          const deduped: any[] = [];
          for (const r of results) {
            const key = `${(r.title || "").toLowerCase()}|${(r.artist || "").toLowerCase()}`;
            if (!seen.has(key)) {
              seen.add(key);
              deduped.push(r);
            }
          }
          setInternetResults(deduped);
        }
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          console.error("Internet search error", e);
        }
      } finally {
        setIsSearchingInternet(false);
      }
    }, 350);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [characterSearch]);

  const filteredTracks = useMemo(() => {
    if (!characterSearch.trim()) return [];
    const q = characterSearch.toLowerCase();
    return (tracks || []).filter(t => 
      (t.title || t.name || '').toLowerCase().includes(q) ||
      (t.artist || '').toLowerCase().includes(q)
    );
  }, [tracks, characterSearch]);

  useEffect(() => {
    if (!isMenuOpen) {
      setShowMenuTimerOptions(false);
    }
  }, [isMenuOpen]);

  // Lock background scrolling when search dropdown is active in character mode
  useEffect(() => {
    if (isCharacterMode && isCharSearchDropdownOpen && characterSearch.trim()) {
      const prevBodyOverflow = document.body.style.overflow;
      const prevHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevBodyOverflow;
        document.documentElement.style.overflow = prevHtmlOverflow;
      };
    }
  }, [isCharacterMode, isCharSearchDropdownOpen, characterSearch]);

  useEffect(() => {
    if (!isCharacterMode) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsCharacterMode(false);
      } else if (e.code === "Space" && (e.target === document.body || e.target === document.documentElement)) {
        e.preventDefault();
        if (playingTrack) {
          togglePlay(playingTrack);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCharacterMode, playingTrack, togglePlay, setIsCharacterMode]);

  useEffect(() => {
    setInvertLyricColor(false);
  }, [playingId]);

  useEffect(() => {
    if (!sleepTimerEnd) {
      setTimeLeft(null);
      return;
    }
    const interval = setInterval(() => {
      const diff = sleepTimerEnd - Date.now();
      if (diff <= 0) {
        setTimeLeft(null);
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(
        (h > 0 ? `${h.toString().padStart(2, '0')}:` : '') +
        `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [sleepTimerEnd]);

  useEffect(() => { getDoc(doc(db, 'site_content', 'assets')).then(docSnap => { if (docSnap.exists() && docSnap.data().musicImage) { setMusicImage(docSnap.data().musicImage); } }); }, []);

  useEffect(() => {
    if (isIndoSong) setShowTranslation(false);
  }, [isIndoSong]);

  useEffect(() => {
    if (showFullLyrics && lyricsContainerRef.current) {
      const activeElement = lyricsContainerRef.current.querySelector(".active-lyric") as HTMLElement;
      if (activeElement) {
        const container = lyricsContainerRef.current;
        const scrollPos = activeElement.offsetTop - (container.clientHeight / 2) + (activeElement.clientHeight / 2);
        container.scrollTo({ top: scrollPos, behavior: 'smooth' });
      }
    }
  }, [currentLyricIndex, showFullLyrics]);

  useEffect(() => {
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      if (e instanceof Error && e.message.includes("already have ads")) {
        // Ignore this specific AdSense error
      } else {
        console.error("AdSense error", e);
      }
    }
  }, []);

  useEffect(() => {
    if (!playingId || !dominantColors || dominantColors.length === 0) {
      setIsDarkBg(false);
      return;
    }
    const rgbStr = dominantColors[0];
    const match = rgbStr.match(/rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)/);
    if (match) {
      const r = parseInt(match[1]);
      const g = parseInt(match[2]);
      const b = parseInt(match[3]);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      setIsDarkBg(brightness < 128);
    } else {
      setIsDarkBg(false);
    }
  }, [playingId, dominantColors]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("nav-theme-change", { detail: isDarkBg }));
    return () => {
      window.dispatchEvent(new CustomEvent("nav-theme-change", { detail: false }));
    };
  }, [isDarkBg]);

  const bgColor = useMemo(() => {
    if (!playingId) return "rgba(248, 250, 252, 0)";
    if (dominantColors && dominantColors.length > 0) {
      return dominantColors[0].replace('rgb', 'rgba').replace(')', ', 0.6)');
    }
    let hash = 0;
    for (let i = 0; i < playingId.length; i++) {
      hash = playingId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return `hsla(${h}, 70%, 85%, 0.6)`;
  }, [playingId, dominantColors]);

  return (
    <>
      <SEO title="Music" description="My personal playlist and music player." url={window.location.href} />
      <PageTransition>
      <div 
        className="fixed inset-0 pointer-events-none transition-colors duration-[1500ms] ease-in-out z-0"
        style={{ 
          background: `radial-gradient(circle at top, ${bgColor}20 0%, transparent 70%)`,
        }}
      />
      <div 
        className="absolute inset-x-0 top-0 h-[800px] pointer-events-none transition-colors duration-[1500ms] ease-in-out z-0"
        style={{ 
          background: `linear-gradient(to bottom, ${bgColor}60 0%, transparent 100%)`
        }}
      />
      
      {isCharacterMode ? (
        <div className="relative w-full min-h-[100dvh] flex flex-col items-center justify-center overflow-hidden select-none px-4 py-8">
          {/* Top Bar Navigation: Search on left, 3-dots on right, strictly aligned vertically */}
          <div className="fixed top-4 sm:top-6 inset-x-4 sm:inset-x-7 z-50 pointer-events-none flex items-center justify-between gap-3">
            {/* Search Input & Dropdown */}
            <div className="pointer-events-auto relative w-56 sm:w-64 md:w-72">
              <div className="relative flex items-center w-full h-9 sm:h-10">
                <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400/80 absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  value={characterSearch}
                  onChange={(e) => {
                    setCharacterSearch(e.target.value);
                    setIsCharSearchDropdownOpen(true);
                  }}
                  onFocus={() => setIsCharSearchDropdownOpen(true)}
                  placeholder="Cari lagu..."
                  className="w-full h-full pl-9 pr-8 text-xs sm:text-sm bg-white/40 hover:bg-white/60 focus:bg-white/80 backdrop-blur-md border border-white/50 focus:border-slate-300/80 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.03)] text-slate-700 placeholder-slate-400/80 focus:outline-none focus:ring-1 focus:ring-slate-300/40 transition-all duration-200"
                />
                {isSearchingInternet && (
                  <Loader2 className={cn("w-3.5 h-3.5 text-slate-400 animate-spin absolute", characterSearch ? "right-8" : "right-3")} />
                )}
                {characterSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setCharacterSearch("");
                      setIsCharSearchDropdownOpen(false);
                    }}
                    className="absolute right-2 p-1 text-slate-400 hover:text-slate-600 rounded-full"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Direct Search Dropdown (Matching exact width, ultra-sleek scrollbar, scrollable) */}
              {isCharSearchDropdownOpen && characterSearch.trim() && (
                <>
                  <div 
                    className="fixed inset-0 z-40 bg-transparent" 
                    onClick={() => setIsCharSearchDropdownOpen(false)} 
                    onTouchMove={(e) => e.preventDefault()}
                    onWheel={(e) => e.preventDefault()}
                  />
                  <div 
                    data-lenis-prevent="true"
                    data-lenis-prevent-wheel="true"
                    data-lenis-prevent-touch="true"
                    onWheel={(e) => e.stopPropagation()}
                    onTouchMove={(e) => e.stopPropagation()}
                    style={{
                      scrollbarWidth: 'thin',
                      scrollbarColor: 'rgba(148, 163, 184, 0.45) transparent',
                      overscrollBehavior: 'contain',
                      touchAction: 'pan-y',
                      WebkitOverflowScrolling: 'touch',
                    }}
                    className="absolute left-0 right-0 top-full mt-2 w-full max-h-[55vh] sm:max-h-[380px] bg-white/95 backdrop-blur-2xl border border-slate-200/90 rounded-2xl shadow-2xl z-50 py-1.5 overflow-y-auto font-sans animate-in fade-in zoom-in-95 duration-150 custom-mini-scrollbar select-auto"
                  >
                    {/* Internet Results (No header text) */}
                    {internetResults.length > 0 && (
                      internetResults.map((item, idx) => (
                        <button
                          key={`net-${item.youtubeId || idx}`}
                          onClick={() => {
                            const track = {
                              id: `temp-${Date.now()}`,
                              title: item.title || item.trackName,
                              artist: item.artist || item.artistName,
                              youtubeId: item.youtubeId,
                              coverUrl: item.coverUrl || item.artworkUrl100,
                              createdAt: Date.now()
                            };
                            playTemporaryTrack(track as any);
                            setIsCharSearchDropdownOpen(false);
                            setCharacterSearch("");
                          }}
                          className="w-full px-2.5 py-2 text-left hover:bg-slate-100/80 active:bg-slate-200/70 flex items-center gap-2 transition-colors group cursor-pointer"
                        >
                          <SearchCoverImage
                            src={item.coverUrl}
                            youtubeId={item.youtubeId}
                            alt={item.title}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-slate-900">
                              {item.title}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate">
                              {item.artist || "YouTube"}
                            </p>
                          </div>
                          {item.duration && (
                            <span className="text-[10px] text-slate-400 font-medium shrink-0 ml-1">
                              {item.duration}
                            </span>
                          )}
                        </button>
                      ))
                    )}

                    {/* Divider between Internet and Playlist if both have results */}
                    {internetResults.length > 0 && filteredTracks.length > 0 && (
                      <div className="h-px bg-slate-100 my-1 mx-2" />
                    )}

                    {/* Playlist Results (No header text) */}
                    {filteredTracks.length > 0 && (
                      filteredTracks.map((track) => (
                        <button
                          key={`pl-${track.id}`}
                          onClick={() => {
                            togglePlay(track);
                            setIsCharSearchDropdownOpen(false);
                            setCharacterSearch("");
                          }}
                          className="w-full px-2.5 py-2 text-left hover:bg-slate-100/80 active:bg-slate-200/70 flex items-center gap-2 transition-colors group cursor-pointer"
                        >
                          <SearchCoverImage
                            src={track.coverUrl || track.cover || track.image}
                            youtubeId={track.youtubeId}
                            alt={track.title || track.name}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-slate-900">
                              {track.title || track.name}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate">
                              {track.artist}
                            </p>
                          </div>
                        </button>
                      ))
                    )}

                    {/* Loading state when no results yet */}
                    {isSearchingInternet && internetResults.length === 0 && filteredTracks.length === 0 && (
                      <div className="px-4 py-3 flex items-center justify-center gap-2 text-xs text-slate-400">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />
                        <span>Mencari lagu...</span>
                      </div>
                    )}

                    {/* Empty state when finished searching and nothing found */}
                    {!isSearchingInternet && internetResults.length === 0 && filteredTracks.length === 0 && (
                      <div className="px-4 py-3 text-center text-xs text-slate-400">
                        Lagu tidak ditemukan
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* 3-dots Menu Button & Dropdown */}
            <div className="pointer-events-auto relative">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={cn(
                  "w-9 h-9 sm:w-10 sm:h-10 rounded-full transition-all duration-300 outline-none flex items-center justify-center cursor-pointer",
                  isDarkBg 
                    ? "text-white/90 hover:text-white hover:bg-white/15 active:bg-white/25 drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]" 
                    : "text-slate-700 hover:text-slate-900 hover:bg-black/5 active:bg-black/10"
                )}
                title="Opsi"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {isMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => { setIsMenuOpen(false); setShowMenuTimerOptions(false); }} />
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white/95 backdrop-blur-2xl border border-slate-200/80 rounded-2xl shadow-2xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-150 overflow-hidden font-sans text-slate-700">
                    {/* 1. Keluar */}
                    <button
                      onClick={() => {
                        setIsCharacterMode(false);
                        setIsMenuOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-2.5 text-[13.5px] text-slate-700 hover:bg-slate-100/70 flex items-center gap-2.5 transition-colors font-medium"
                    >
                      <Minimize2 className="w-4 h-4 text-slate-500 shrink-0" />
                      <span>Keluar</span>
                    </button>

                    <div className="h-px bg-slate-100 my-1" />

                    {/* 2. Sleep Timer */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenuTimerOptions(!showMenuTimerOptions);
                      }}
                      className="w-full flex items-center justify-between px-3.5 py-2.5 text-[13.5px] text-slate-700 hover:bg-slate-100/70 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>Sleep timer</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {timeLeft && (
                          <span className="text-emerald-600 font-medium tabular-nums text-xs">
                            {timeLeft}
                          </span>
                        )}
                        <ChevronRight className={cn("w-4 h-4 text-slate-400 transition-transform duration-200", showMenuTimerOptions ? "rotate-90" : "")} />
                      </div>
                    </button>

                    {showMenuTimerOptions && (
                      <div className="bg-slate-50/90 py-1 border-y border-slate-100 animate-in fade-in duration-150">
                        <button
                          onClick={() => { setSleepTimer(15); setIsMenuOpen(false); setShowMenuTimerOptions(false); }}
                          className="w-full text-left pl-8 pr-4 py-1.5 text-[13px] text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-colors"
                        >
                          15m
                        </button>
                        <button
                          onClick={() => { setSleepTimer(30); setIsMenuOpen(false); setShowMenuTimerOptions(false); }}
                          className="w-full text-left pl-8 pr-4 py-1.5 text-[13px] text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-colors"
                        >
                          30m
                        </button>
                        <button
                          onClick={() => { setSleepTimer(60); setIsMenuOpen(false); setShowMenuTimerOptions(false); }}
                          className="w-full text-left pl-8 pr-4 py-1.5 text-[13px] text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-colors"
                        >
                          1h
                        </button>
                        <button
                          onClick={() => { setSleepTimer(120); setIsMenuOpen(false); setShowMenuTimerOptions(false); }}
                          className="w-full text-left pl-8 pr-4 py-1.5 text-[13px] text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-colors"
                        >
                          2h
                        </button>
                        {sleepTimerEnd && (
                          <button
                            onClick={() => { setSleepTimer(null); setIsMenuOpen(false); setShowMenuTimerOptions(false); }}
                            className="w-full text-left pl-8 pr-4 py-1.5 text-[13px] text-red-600 hover:bg-red-50 transition-colors"
                          >
                            Batalkan timer
                          </button>
                        )}
                      </div>
                    )}

                    <div className="h-px bg-slate-100 my-1" />

                    {/* 3. Lirik */}
                    <button
                      onClick={() => {
                        setShowFullLyrics(!showFullLyrics);
                        setIsMenuOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-2.5 text-[13.5px] text-slate-700 hover:bg-slate-100/70 flex items-center justify-between transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <ListMusic className="w-4 h-4 text-slate-500 shrink-0" />
                        <span>Lirik</span>
                      </div>
                      <span className={cn("text-xs font-medium transition-colors", showFullLyrics ? "text-emerald-600" : "text-slate-400")}>
                        {showFullLyrics ? "Aktif" : "Mati"}
                      </span>
                    </button>

                    {/* 4. Terjemahan */}
                    <button
                      onClick={() => {
                        setShowTranslation(!showTranslation);
                        setIsMenuOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-2.5 text-[13.5px] text-slate-700 hover:bg-slate-100/70 flex items-center justify-between transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <Languages className="w-4 h-4 text-slate-500 shrink-0" />
                        <span>Terjemahan</span>
                      </div>
                      <span className={cn("text-xs font-medium transition-colors", showTranslation ? "text-emerald-600" : "text-slate-400")}>
                        {showTranslation ? "Aktif" : "Mati"}
                      </span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Mobile Lyrics (Above Character, no box, dynamic contrast, next lyric preview) */}
          {!showFullLyrics && (
            <div className="sm:hidden w-full max-w-xs sm:max-w-sm px-4 my-1 min-h-[60px] flex flex-col items-center justify-center pointer-events-none text-center z-20">
              {lyrics.length > 0 && !isInstrumental && currentLyricIndex >= 0 ? (
                <div className="w-full flex flex-col items-center justify-center overflow-hidden">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`mob-curr-${currentLyricIndex}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="w-full flex flex-col items-center"
                    >
                      <p className={cn(
                        "text-sm sm:text-base font-bold text-center leading-snug font-heading transition-colors duration-300",
                        isDarkBg 
                          ? "text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]" 
                          : "text-slate-800 drop-shadow-[0_1px_3px_rgba(255,255,255,0.9)]"
                      )}>
                        {lyrics[currentLyricIndex]?.text}
                      </p>
                      {showTranslation && lyrics[currentLyricIndex]?.translation && (
                        <p className={cn(
                          "mt-0.5 text-[11px] font-medium text-center italic transition-colors duration-300",
                          isDarkBg ? "text-white/80" : "text-slate-600"
                        )}>
                          {lyrics[currentLyricIndex]?.translation}
                        </p>
                      )}
                    </motion.div>
                  </AnimatePresence>

                  {/* Next Lyric (Small, dimmed, smoothly transitions up on next step) */}
                  {lyrics[currentLyricIndex + 1] && (
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={`mob-next-${currentLyricIndex + 1}`}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 0.45, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.35, ease: "easeOut" }}
                        className="w-full mt-1 flex flex-col items-center"
                      >
                        <p className={cn(
                          "text-xs font-medium text-center leading-tight line-clamp-1 transition-colors duration-300",
                          isDarkBg 
                            ? "text-white/60 drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]" 
                            : "text-slate-600/70"
                        )}>
                          {lyrics[currentLyricIndex + 1]?.text}
                        </p>
                      </motion.div>
                    </AnimatePresence>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {/* Center Stage: Character + Desktop Side Lyrics */}
          <div className="relative w-full max-w-4xl h-[65vh] sm:h-[75vh] flex items-center justify-center">
            {/* Centered Character (Enlarged) - Hidden when full lyrics is open */}
            {!showFullLyrics && (
              <div
                onClick={() => {
                  if (playingTrack) {
                    togglePlay(playingTrack);
                  } else if (tracks && tracks.length > 0) {
                    togglePlay(tracks[0]);
                  }
                }}
                className="relative z-10 w-72 h-72 sm:w-96 sm:h-96 md:w-[420px] md:h-[420px] lg:w-[460px] lg:h-[460px] cursor-pointer group flex items-center justify-center transition-transform duration-300 active:scale-95 select-none"
                title={playingTrack ? (isPlaying ? "Klik karakter untuk jeda" : "Klik karakter untuk memutar") : "Klik untuk memutar lagu"}
              >
                {/* Subtle ambient light glow */}
                <div className="absolute inset-4 rounded-full bg-white/40 filter blur-3xl opacity-70 pointer-events-none group-hover:scale-105 transition-transform duration-500" />

                {/* Character Images with bottom transparent gradient fade so it never looks cut off */}
                <div 
                  className="relative w-full h-full pointer-events-none"
                  style={{
                    WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 45%, rgba(0,0,0,0) 95%)',
                    maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 45%, rgba(0,0,0,0) 95%)',
                  }}
                >
                  <ImageWithSkeleton
                    src="https://res.cloudinary.com/dew39kqhy/image/upload/f_auto,q_auto/v1783266447/Gemini_Generated_Image_q1fedfq1fedfq1fe-remove-bg-io_xunibq.png"
                    alt="Character Idle"
                    containerClassName={cn(
                      "absolute inset-0 z-10 flex items-center justify-center transition-opacity duration-700 pointer-events-none",
                      (!playingId || !isPlaying) ? "opacity-100" : "opacity-0"
                    )}
                    className="w-full h-full object-contain filter drop-shadow-2xl"
                    disableOverflowHidden={true}
                    loaderType="spinner"
                  />
                  <ImageWithSkeleton
                    src="https://res.cloudinary.com/dew39kqhy/image/upload/f_auto,q_auto/v1783269529/Gemini_Generated_Image_ycjtjgycjtjgycjt-remove-bg-io_qppuze.png"
                    alt="Character Instrumental"
                    containerClassName={cn(
                      "absolute inset-0 z-10 flex items-center justify-center transition-opacity duration-700 pointer-events-none",
                      (playingId && isPlaying && isInstrumental) ? "opacity-100" : "opacity-0"
                    )}
                    className="w-full h-full object-contain filter drop-shadow-2xl"
                    disableOverflowHidden={true}
                    loaderType="spinner"
                  />
                  <ImageWithSkeleton
                    src="https://res.cloudinary.com/dew39kqhy/image/upload/f_auto,q_auto/v1783266448/Gemini_Generated_Image_iv9kceiv9kceiv9k_1_-remove-bg-io_gmvnvs.png"
                    alt="Character Playing"
                    containerClassName={cn(
                      "absolute inset-0 z-10 flex items-center justify-center transition-opacity duration-700 pointer-events-none",
                      (playingId && isPlaying && !isInstrumental) ? "opacity-100" : "opacity-0"
                    )}
                    className="w-full h-full object-contain filter drop-shadow-2xl"
                    disableOverflowHidden={true}
                    loaderType="spinner"
                  />
                </div>
              </div>
            )}

            {/* Desktop Floating Lyrics (Beside the character, strictly alternating sides so no stacking bug) */}
            {!showFullLyrics ? (
              <div className="hidden sm:block absolute inset-0 pointer-events-none z-20">
                {lyrics.length > 0 && !isInstrumental ? (
                  lyrics.map((lyric, idx) => {
                    const isCurrent = idx === currentLyricIndex;
                    const isNext = idx === currentLyricIndex + 1;
                    if (!isCurrent && !isNext) return null;

                    // Strictly alternate: even is left, odd is right
                    // This ensures isCurrent and isNext are ALWAYS on opposite sides and NEVER stack!
                    const isLeft = idx % 2 === 0;

                    return (
                      <div
                        key={`desk-clean-${idx}`}
                        onClick={() => duration && handleSeek(lyric.time / duration)}
                        className={cn(
                          "absolute top-[28%] md:top-[32%] w-[40%] md:w-[34%] lg:w-[30%] transition-all duration-500 ease-out pointer-events-auto cursor-pointer",
                          isLeft 
                            ? "left-2 sm:left-4 md:left-8 lg:left-14 text-right pr-2 md:pr-4" 
                            : "right-2 sm:right-4 md:right-8 lg:right-14 text-left pl-2 md:pl-4",
                          isCurrent 
                            ? "opacity-100 scale-100 translate-y-0 z-20" 
                            : "opacity-40 scale-95 translate-y-3 z-10"
                        )}
                      >
                        <span className={cn(
                          "relative inline-block px-4 py-2.5 md:px-5 md:py-3 bg-white/75 hover:bg-white/90 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-white/70 text-sm md:text-base font-bold text-slate-800 transition-all",
                          isLeft ? "rounded-3xl rounded-br-none" : "rounded-3xl rounded-bl-none",
                          isCurrent ? "ring-2 ring-slate-900/10 shadow-[0_12px_36px_rgba(0,0,0,0.12)]" : ""
                        )}>
                          <span className="block leading-snug">{lyric.text}</span>
                          {showTranslation && lyric.translation && (
                            <span className="mt-1 text-xs font-medium text-slate-500 italic block">
                              {lyric.translation}
                            </span>
                          )}
                        </span>
                      </div>
                    );
                  })
                ) : null}
              </div>
            ) : null}

            {/* Choose song button when stopped */}
            {!playingId && !showFullLyrics && (
              <div className="absolute bottom-2 sm:bottom-4 z-30 pointer-events-none flex justify-center w-full animate-in fade-in duration-500">
                <button
                  onClick={() => setIsPlaySearchOpen(true)}
                  className="pointer-events-auto cursor-pointer px-5 py-2.5 sm:px-6 sm:py-3 rounded-full bg-white/85 hover:bg-white backdrop-blur-xl border border-white/80 shadow-[0_8px_30px_rgba(0,0,0,0.08)] text-slate-700 hover:text-slate-900 text-xs sm:text-sm font-semibold flex items-center gap-2.5 transition-all hover:scale-105 active:scale-95 group"
                >
                  <MusicIcon className="w-4 h-4 text-slate-500 group-hover:text-slate-700" />
                  <span>Pilih lagu untuk memulai ♪</span>
                </button>
              </div>
            )}

            {/* Full Lyrics View in Character Mode (No box, clean floating typography with gradient fade) */}
            {showFullLyrics && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-4">
                <div
                  ref={lyricsContainerRef}
                  className="w-full max-w-2xl h-[65vh] sm:h-[75vh] overflow-y-auto scrollbar-hide py-[25vh] sm:py-[28vh] text-center pointer-events-auto px-4 select-none"
                  style={{
                    WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)',
                    maskImage: 'linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)',
                  }}
                >
                  {lyrics.map((lyric, idx) => {
                    const isCurrent = idx === currentLyricIndex;
                    return (
                      <div
                        key={idx}
                        onClick={() => duration && handleSeek(lyric.time / duration)}
                        className={cn(
                          "py-3 sm:py-3.5 transition-all duration-300 cursor-pointer hover:opacity-90",
                          isCurrent 
                            ? "opacity-100 scale-105 active-lyric font-bold text-slate-900 text-lg sm:text-2xl drop-shadow-sm" 
                            : "opacity-35 hover:opacity-60 scale-95 text-slate-700 text-sm sm:text-lg font-medium"
                        )}
                      >
                        <p className="leading-relaxed">{lyric.text}</p>
                        {showTranslation && lyric.translation && (
                          <p className="text-xs sm:text-sm text-slate-500 font-normal mt-1 italic">{lyric.translation}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
      <div className="relative z-10 w-full pt-8 space-y-8 pb-32">
        {/* Mobile Lyrics */}
        {!showFullLyrics && (
          <div className="sm:hidden w-full px-4 mb-4 flex justify-center pointer-events-none h-[140px] relative overflow-hidden">
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {lyrics.map((lyric, idx) => {
                const isCurrent = idx === currentLyricIndex;
                const isNext = idx === currentLyricIndex + 1;
                const isPrev = idx === currentLyricIndex - 1;
                if (!isCurrent && !isNext && !isPrev) return null;
                return (
                  <div 
                    key={idx}
                    className={cn(
                      "absolute w-full flex justify-center transition-all duration-1000 ease-out",
                      isCurrent ? "translate-y-[-12px] opacity-100 scale-100" : (isNext ? "translate-y-[52px] opacity-40 scale-95" : "translate-y-[-60px] opacity-0 scale-90")
                    )}
                  >
                    <span className={cn(
                      "inline-block text-center px-2 line-clamp-2",
                      isDarkBg ? "drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" : "drop-shadow-[0_2px_4px_rgba(255,255,255,0.8)]",
                      isCurrent ? (isDarkBg ? "text-lg font-bold text-white font-heading" : "text-lg font-bold text-slate-800 font-heading") : (isDarkBg ? "text-sm font-semibold text-slate-200" : "text-sm font-semibold text-slate-500")
                    )}>
                      {lyric.text}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Character & Desktop Lyrics Area */}
        <div className={cn(
          "relative w-full overflow-hidden transition-all duration-500",
          showFullLyrics ? "h-[50vh] sm:h-[60vh] max-h-[600px] my-6" : "h-56 sm:h-72 mb-2 [mask-image:linear-gradient(to_bottom,black_70%,transparent_100%)] -webkit-[mask-image:linear-gradient(to_bottom,black_70%,transparent_100%)]"
        )}>
          {/* Desktop Lyrics */}
          <div className={cn(
            "absolute inset-0 pointer-events-none z-20 flex flex-col items-center justify-center space-y-4 px-4 sm:px-12",
            showFullLyrics ? "opacity-100" : "hidden sm:block"
          )}>
            {showFullLyrics ? (
              // Full Lyrics View (Scrollable / Centered list of current & surrounding lyrics)
              <>
                {/* Translate Toggle Icon (Fixed) */}
                <div className="absolute top-4 right-4 z-50 flex items-center gap-4 pointer-events-auto">
                  <button
                    onClick={() => setInvertLyricColor(!invertLyricColor)}
                    className={cn(
                      "transition-opacity opacity-50 hover:opacity-100 outline-none",
                      invertLyricColor ? (isDarkBg ? "text-slate-800" : "text-white/90") : (isDarkBg ? "text-white/90" : "text-slate-800")
                    )}
                    title="Toggle Lyric Color"
                  >
                    <img src="https://cdn-icons-png.flaticon.com/128/16167/16167362.png" alt="Color" className="w-5 h-5 brightness-0 opacity-80" />
                  </button>
                  {!isIndoSong && (
                    <button
                      onClick={() => setShowTranslation(!showTranslation)}
                      className={cn(
                        "transition-opacity opacity-50 hover:opacity-100 outline-none",
                        invertLyricColor ? (isDarkBg ? "text-slate-800" : "text-white/90") : (isDarkBg ? "text-white/90" : "text-slate-800"),
                        showTranslation ? "opacity-100" : ""
                      )}
                      title="Translate Lyrics"
                    >
                      <img src="https://cdn-icons-png.flaticon.com/128/8933/8933942.png" alt="Translate" className="w-5 h-5 brightness-0 opacity-80" />
                    </button>
                  )}
                </div>
                
                <div 
                  ref={lyricsContainerRef}
                  className="w-full h-full flex flex-col items-center justify-start relative pointer-events-auto overflow-y-auto scrollbar-hide pt-[30vh] pb-[30vh]"
                >
                  {(!playingId || (lyrics.length === 0 && !isInstrumental)) ? (
                    <div className="flex flex-col items-center justify-center h-full opacity-60">
                      <MusicIcon className={cn("w-12 h-12 mb-4", invertLyricColor ? (isDarkBg ? "text-slate-800" : "text-white/90") : (isDarkBg ? "text-white/90" : "text-slate-800"))} />
                      <p className={cn("text-lg font-medium", invertLyricColor ? (isDarkBg ? "text-slate-800" : "text-white/90") : (isDarkBg ? "text-white/90" : "text-slate-800"))}>
                        {!playingId ? "Play a song to see lyrics" : "Searching for lyrics..."}
                      </p>
                    </div>
                  ) : lyrics.map((lyric, idx) => {
                  const isCurrent = idx === currentLyricIndex;
                  return (
                    <div
                      key={idx}
                      onClick={() => duration && handleSeek(lyric.time / duration)}
                      className={cn(
                        "w-full text-center transition-all duration-500 py-2 sm:py-3 cursor-pointer hover:opacity-80",
                        isCurrent ? "opacity-100 scale-105 active-lyric" : "opacity-40 scale-95"
                      )}
                    >
                      <span className={cn(
                        "inline-block max-w-2xl text-base sm:text-xl font-bold font-sans",
                        invertLyricColor ? (isDarkBg ? "text-slate-800" : "text-white/90") : (isDarkBg ? "text-white/90" : "text-slate-800")
                      )}>
                        {lyric.text}
                      </span>
                      <AnimatePresence>
                        {showTranslation && lyric.text && lyric.translation && (
                          <motion.div 
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            transition={{ duration: 0.4 }}
                            className={cn(
                            "mt-1 text-[13px] sm:text-sm font-medium opacity-80",
                            invertLyricColor ? (isDarkBg ? "text-slate-800" : "text-white/90") : (isDarkBg ? "text-white/90" : "text-slate-800")
                          )}>
                            {lyric.translation}
                          </motion.div>
                        )}
                        {showTranslation && lyric.text && !lyric.translation && (
                          <motion.div 
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            transition={{ duration: 0.4 }}
                            className={cn(
                            "mt-1 text-[12px] sm:text-[13px] font-medium italic opacity-50",
                            invertLyricColor ? (isDarkBg ? "text-slate-800" : "text-white/90") : (isDarkBg ? "text-white/90" : "text-slate-800")
                          )}>
                            Translating...
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
              </>
            ) : (
              // Floating Lyrics View (Original)
              lyrics.map((lyric, idx) => {
                const isCurrent = idx === currentLyricIndex;
                const isNext = idx === currentLyricIndex + 1;
                if (!isCurrent && !isNext) return null;
                const isLeft = idx % 2 === 0;

                return (
                  <div
                    key={idx}
                    className={cn(
                      "absolute top-[15%] w-[50%] sm:w-[40%] md:w-[35%] lg:w-[30%] transition-all duration-500 ease-out",
                      isLeft ? "left-1 sm:left-3 md:left-6 lg:left-8 text-right pr-2 sm:pr-4" : "right-1 sm:right-3 md:right-6 lg:right-8 text-left pl-2 sm:pl-4",
                      isCurrent ? "opacity-100 scale-100 translate-y-0" : "opacity-40 scale-95 translate-y-2"
                    )}
                  >
                    <span className={cn(
                      "relative inline-block px-3 py-1.5 sm:px-4 sm:py-2 lg:px-5 lg:py-2.5 bg-white/40 backdrop-blur-lg shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-white/50 text-xs sm:text-sm lg:text-base font-bold text-slate-800",
                      isLeft ? "rounded-3xl rounded-br-none" : "rounded-3xl rounded-bl-none"
                    )}>
                      {lyric.text}
                    </span>
                  </div>
                );
              })
            )}
          </div>
          
          {/* Characters */}
          {!showFullLyrics && (
            <>
              <ImageWithSkeleton src="https://res.cloudinary.com/dew39kqhy/image/upload/f_auto,q_auto/v1783266447/Gemini_Generated_Image_q1fedfq1fedfq1fe-remove-bg-io_xunibq.png" alt="Character Idle" containerClassName={cn("absolute inset-0 z-10 flex items-center justify-center transition-opacity duration-700", (!playingId || !isPlaying) ? "opacity-100" : "opacity-0")} className="w-full h-full object-contain" disableOverflowHidden={true} loaderType="spinner" />
              <ImageWithSkeleton src="https://res.cloudinary.com/dew39kqhy/image/upload/f_auto,q_auto/v1783269529/Gemini_Generated_Image_ycjtjgycjtjgycjt-remove-bg-io_qppuze.png" alt="Character Instrumental" containerClassName={cn("absolute inset-0 z-10 flex items-center justify-center transition-opacity duration-700", (playingId && isPlaying && isInstrumental) ? "opacity-100" : "opacity-0")} className="w-full h-full object-contain" disableOverflowHidden={true} loaderType="spinner" />
              <ImageWithSkeleton src="https://res.cloudinary.com/dew39kqhy/image/upload/f_auto,q_auto/v1783266448/Gemini_Generated_Image_iv9kceiv9kceiv9k_1_-remove-bg-io_gmvnvs.png" alt="Character Playing" containerClassName={cn("absolute inset-0 z-10 flex items-center justify-center transition-opacity duration-700", (playingId && isPlaying && !isInstrumental) ? "opacity-100" : "opacity-0")} className="w-full h-full object-contain" disableOverflowHidden={true} loaderType="spinner" />
            </>
          )}
        </div>

                <header className="flex flex-row items-center justify-between w-full gap-4">
          <div className="space-y-1 flex-1 min-w-0">
            <h1 className="text-3xl font-bold font-heading tracking-tight text-slate-900 truncate flex items-center gap-3">
              Playlist
              {isAdmin && (
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="bg-slate-900 hover:bg-slate-800 text-white p-1 rounded-full transition-colors flex-shrink-0"
                  title="Add Track"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </h1>
            {tracks && tracks.length > 0 ? (
              <div className="space-y-0.5">
                <p className="text-sm text-slate-500 line-clamp-2 sm:line-clamp-1">A curated collection of currently playing songs.</p>
                <p className="text-xs text-slate-400">
                  {tracks.length} {tracks.length === 1 ? 'song' : 'songs'}, ~{Math.round(tracks.length * 3.5)} mins
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-500 line-clamp-2 sm:line-clamp-1">A curated collection of currently playing songs.</p>
            )}
          </div>
          <div className="flex items-center gap-4 flex-shrink-0 relative">
            <button
              onClick={() => setIsPlaySearchOpen(true)}
              className="flex items-center justify-center transition-opacity hover:opacity-70 outline-none"
              title="Search Song"
            >
              <Search className="w-5 h-5 opacity-40 text-slate-800" />
            </button>
            <button
              onClick={handleRepeat}
              className="flex items-center justify-center transition-opacity hover:opacity-70 outline-none"
              title={repeatMode === 0 ? "Mode putar biasa" : repeatMode === 1 ? "Ulangi Playlist" : "Ulangi Satu Lagu"}
            >
              {repeatMode === 2 ? (
                <Repeat1 className="w-5 h-5 text-slate-800" />
              ) : (
                <img 
                  src="https://cdn-icons-png.flaticon.com/128/9041/9041602.png" 
                  alt="Repeat" 
                  className={cn("w-5 h-5", repeatMode === 1 ? "opacity-100" : "opacity-40")} 
                />
              )}
            </button>
            <button
              onClick={handleShuffle}
              className="flex items-center justify-center transition-opacity hover:opacity-70 outline-none"
              title="Shuffle Playlist"
            >
              <img 
                src="https://cdn-icons-png.flaticon.com/128/8191/8191664.png" 
                alt="Shuffle" 
                className={cn("w-5 h-5", isShuffled ? "opacity-100" : "opacity-40")} 
              />
            </button>
            <div className="relative">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex items-center justify-center transition-opacity hover:opacity-70 outline-none p-1 relative z-10"
                title="More Options"
              >
                <MoreVertical className="w-5 h-5 text-slate-700" />
              </button>
              
              {isMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => { setIsMenuOpen(false); setShowMenuTimerOptions(false); }} />
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-slate-200/80 rounded-2xl shadow-xl z-50 py-2 animate-in fade-in zoom-in duration-200 overflow-hidden font-sans">
                    {/* Enter Fullscreen Character Mode */}
                    <button
                      onClick={() => {
                        setIsCharacterMode(true);
                        setIsMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-[14px] text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors font-medium"
                    >
                      <Maximize2 className="w-4 h-4 text-slate-500 shrink-0" />
                      <span>Layar Penuh Karakter</span>
                    </button>

                    <div className="h-px bg-slate-100 my-1"></div>

                    {/* Sleep Timer (Click to reveal duration) */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenuTimerOptions(!showMenuTimerOptions);
                      }}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-[14px] text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>Sleep timer</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {timeLeft && (
                          <span className="text-emerald-600 font-semibold tabular-nums text-xs bg-emerald-50 px-2 py-0.5 rounded-full">
                            {timeLeft}
                          </span>
                        )}
                        <ChevronRight className={cn("w-4 h-4 text-slate-400 transition-transform duration-200", showMenuTimerOptions ? "rotate-90" : "")} />
                      </div>
                    </button>

                    {showMenuTimerOptions && (
                      <div className="bg-slate-50/90 py-1 border-y border-slate-100 animate-in fade-in duration-150">
                        <button
                          onClick={() => { setSleepTimer(15); setIsMenuOpen(false); setShowMenuTimerOptions(false); }}
                          className="w-full text-left pl-9 pr-4 py-2 text-[13px] text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-colors"
                        >
                          15m
                        </button>
                        <button
                          onClick={() => { setSleepTimer(30); setIsMenuOpen(false); setShowMenuTimerOptions(false); }}
                          className="w-full text-left pl-9 pr-4 py-2 text-[13px] text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-colors"
                        >
                          30m
                        </button>
                        <button
                          onClick={() => { setSleepTimer(60); setIsMenuOpen(false); setShowMenuTimerOptions(false); }}
                          className="w-full text-left pl-9 pr-4 py-2 text-[13px] text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-colors"
                        >
                          1h
                        </button>
                        <button
                          onClick={() => { setSleepTimer(120); setIsMenuOpen(false); setShowMenuTimerOptions(false); }}
                          className="w-full text-left pl-9 pr-4 py-2 text-[13px] text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-colors"
                        >
                          2h
                        </button>
                        {sleepTimerEnd && (
                          <button
                            onClick={() => { setSleepTimer(null); setIsMenuOpen(false); setShowMenuTimerOptions(false); }}
                            className="w-full text-left pl-9 pr-4 py-2 text-[13px] text-red-600 hover:bg-red-50 transition-colors"
                          >
                            Cancel sleep timer
                          </button>
                        )}
                      </div>
                    )}

                    <div className="h-px bg-slate-100 my-1"></div>
                    <button
                      onClick={() => { setShowFullLyrics(!showFullLyrics); setIsMenuOpen(false); }}
                      className="w-full text-left px-4 py-2.5 text-[14px] text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      {showFullLyrics ? "Hide lyrics" : "Show lyrics"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-slate-900" />
          </div>
        ) : tracks.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
            <MusicIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Playlist is empty.</p>
          </div>
        ) : (
          <Reorder.Group axis="y" values={tracks} onReorder={updateTracksOrder} className="space-y-3">
            {tracks.map((track) => (
              <TrackItem 
                key={track.id} 
                track={track} 
                isAdmin={isAdmin} 
                isCurrentTrack={playingId === track.id} 
                isPlaying={isPlaying} 
                togglePlay={togglePlay} 
                onEdit={(t: any) => setEditTrack(t)}
              />
            ))}
          </Reorder.Group>
        )}
        
                {/* Spotify Embedded Playlist */}
        <div className="mt-12 max-w-lg mx-auto">
          <div className="mb-3 px-2 flex justify-center">
            <img src="https://storage.googleapis.com/pr-newsroom-wp/1/2018/11/Spotify_Logo_RGB_Green.png" alt="Spotify" className="h-6 object-contain drop-shadow-sm" />
          </div>
          
          <div className="w-full">
            <iframe
              title="Spotify Embed: Recommendation Playlist"
              src={`https://open.spotify.com/embed/playlist/${spotifyPlaylistId}?utm_source=generator&theme=0`}
              width="100%"
              height="152"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              style={{ borderRadius: '12px' }}
            />
          </div>
        </div>
        
        <div className="mt-12 text-center px-4 space-y-8 pb-8">
          <p className="text-xs text-slate-400 max-w-2xl mx-auto">
            Note: Lyrics synchronization and loading speed may vary depending on network connection and tracker data source availability.
          </p>

          {/* Google AdSense */}
          <div className="mx-auto w-full max-w-[500px] min-h-[120px] bg-white/5 rounded-xl border border-white/10 flex items-center justify-center relative overflow-hidden transition-all">
            {/* Fallback Logo (visible while ad is loading or if blocked) */}
            <div className="absolute inset-0 flex items-center justify-center opacity-20 grayscale pointer-events-none">
              <img src={musicImage} alt="Logo" className="w-16 h-16 object-contain drop-shadow-sm rounded-full" />
            </div>
            
            {/* Ad Unit */}
            <div className="relative z-10 w-full h-full">
              <ins className="adsbygoogle"
                   style={{ display: "block" }}
                   data-ad-client="ca-pub-7807989106123808"
                   data-ad-slot="auto"
                   data-ad-format="auto"
                   data-full-width-responsive="true"></ins>
            </div>
          </div>
        </div>
      </div>
      )}
      <EditTrackModal 
        isOpen={!!editTrack} 
        track={editTrack} 
        onClose={() => setEditTrack(null)} 
        onSaved={() => { window.location.reload(); }}
      />
      <AddTrackModal 
        isOpen={isAddModalOpen} existingTracks={tracks} 
        onClose={() => setIsAddModalOpen(false)} 
        onAdded={() => { window.location.reload(); }}
      />
      <PlaySearchModal 
        isOpen={isPlaySearchOpen} 
        onClose={() => setIsPlaySearchOpen(false)} 
      />
          
    </PageTransition>
    </>
  );
}
