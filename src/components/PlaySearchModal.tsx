import React, { useState, useEffect } from "react";
import { Search, Loader2, Music as MusicIcon, X, Play, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAudio } from "@/context/AudioContext";
import { ImageWithSkeleton } from "./ImageWithSkeleton";
import { createPortal } from "react-dom";

export function PlaySearchModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 700);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (debouncedQuery.trim()) {
      handleSearch();
    } else {
      setSearchResults([]);
    }
  }, [debouncedQuery]);
  const { playTemporaryTrack, addToQueue } = useAudio();
  const [menuState, setMenuState] = useState<{ id: number; top: number; right: number; item: any } | null>(null);
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchResults([]);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        let results = data.results || [];
        
        // Deduplicate based on title and artist (lowercase comparison)
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
      }
    } catch (error) {
      console.error("Search failed", error);
    } finally {
      setIsSearching(false);
    }
  };

  const playSong = (item: any) => {
    // Generate a temporary unique ID
    const track = {
      id: `temp-${Date.now()}`,
      title: item.title || item.trackName,
      artist: item.artist || item.artistName,
      youtubeId: item.youtubeId,
      coverUrl: item.coverUrl || item.artworkUrl100,
      createdAt: Date.now()
    };
    
    playTemporaryTrack(track as any);
    onClose();
  };

  if (!isOpen) return null;

  const content = (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative z-10 animate-in fade-in zoom-in duration-200 font-sans flex flex-col max-h-[80vh]">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">Search & Play</h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 flex flex-col flex-1 min-h-0">
          <form onSubmit={handleSearch} className="flex items-center mb-4 shrink-0">
            <div className="relative flex-1">
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search song..." 
                className="w-full pl-4 pr-10 py-2.5 text-[14px] bg-slate-100 border-none rounded-xl focus:outline-none focus:bg-slate-200 transition-all placeholder-slate-400 text-slate-800"
              />
              <button 
                type="submit" 
                disabled={isSearching || !searchQuery.trim()} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 outline-none"
              >
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </button>
            </div>
          </form>

          <div className="flex-1 overflow-y-auto min-h-0 space-y-1 pr-1 custom-scrollbar">
            {isSearching ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-100 relative">
                  <div className="flex-1 min-w-0 flex items-center gap-3 cursor-pointer" onClick={() => playSong(item)}>
                    {item.coverUrl || item.artworkUrl100 ? (
                      <ImageWithSkeleton src={item.coverUrl || item.artworkUrl100} alt="Cover" className="w-12 h-12 rounded-md object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-12 flex-shrink-0 rounded-md bg-slate-100 flex items-center justify-center">
                        <MusicIcon className="w-5 h-5 text-slate-400" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold text-slate-800 truncate">{item.title || item.trackName}</p>
                      <p className="text-[12px] text-slate-500 truncate">{item.artist || item.artistName}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 pr-1">
                    <button 
                      onClick={() => playSong(item)}
                      className="p-2 text-slate-400 hover:text-slate-600 outline-none rounded-full hover:bg-slate-100 transition-colors"
                    >
                      <Play className="w-4 h-4 fill-current" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        setMenuState(menuState?.id === idx ? null : {
                          id: idx,
                          top: rect.bottom + 8,
                          right: window.innerWidth - rect.right,
                          item
                        });
                      }}
                      className="p-2 text-slate-400 hover:text-slate-600 outline-none rounded-full hover:bg-slate-100 transition-colors relative"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                  

                </div>
              ))
            ) : searchQuery && !isSearching ? (
              <div className="py-8 text-center text-[13px] text-slate-500">
                No results found.
              </div>
            ) : (
              <div className="py-8 text-center text-[13px] text-slate-400 flex flex-col items-center justify-center gap-2">
                <Search className="w-6 h-6 opacity-30" />
                <p>Search for a song to play</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (!mounted) return null;
  
  const menuPortal = menuState ? (
    <div className="fixed inset-0 z-[100]" style={{ pointerEvents: 'none' }}>
      <div className="absolute inset-0 pointer-events-auto" onClick={() => setMenuState(null)} />
      <div 
        className="fixed bg-white border border-slate-200/80 rounded-xl shadow-lg py-1 animate-in fade-in zoom-in duration-200 font-sans pointer-events-auto"
        style={{ top: menuState.top, right: menuState.right, width: '12rem' }}
      >
        <button
          onClick={() => {
            const track = {
              id: `temp-${Date.now()}`,
              title: menuState.item.title || menuState.item.trackName,
              artist: menuState.item.artist || menuState.item.artistName,
              youtubeId: menuState.item.youtubeId,
              coverUrl: menuState.item.coverUrl || menuState.item.artworkUrl100,
              createdAt: Date.now()
            };
            addToQueue(track as any);
            setMenuState(null);
            onClose();
          }}
          className="w-full text-left px-4 py-2.5 text-[14px] text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Add to queue
        </button>
      </div>
    </div>
  ) : null;

  return (
    <>
      {createPortal(content, document.body)}
      {menuPortal && createPortal(menuPortal, document.body)}
    </>
  );
}
