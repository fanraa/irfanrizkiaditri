const fs = require('fs');
let code = fs.readFileSync('src/components/PlaySearchModal.tsx', 'utf-8');

// Add searchHistory state
code = code.replace(
  'const [trendingSongs, setTrendingSongs] = useState<any[]>([]);',
  'const [trendingSongs, setTrendingSongs] = useState<any[]>([]);\n  const [searchHistory, setSearchHistory] = useState<any[]>([]);\n\n  useEffect(() => {\n    try {\n      const history = JSON.parse(localStorage.getItem("music_search_history") || "[]");\n      setSearchHistory(history);\n    } catch(e) {}\n  }, [isOpen]);'
);

// Add addToHistory function inside playSong
const playSongBlock = `  const playSong = (item: any) => {
    // Generate a temporary unique ID
    const track = {
      id: \`temp-\${Date.now()}\`,
      title: item.title || item.trackName,
      artist: item.artist || item.artistName,
      youtubeId: item.youtubeId,
      coverUrl: item.coverUrl || item.artworkUrl100,
      createdAt: Date.now()
    };
    
    try {
      const history = JSON.parse(localStorage.getItem("music_search_history") || "[]");
      const newHistory = history.filter((h: any) => h.youtubeId !== track.youtubeId);
      newHistory.unshift(track);
      if (newHistory.length > 10) newHistory.pop();
      localStorage.setItem("music_search_history", JSON.stringify(newHistory));
      setSearchHistory(newHistory);
    } catch(e) {}

    playTemporaryTrack(track as any);
    onClose();
  };`;

code = code.replace(/const playSong = \(item: any\) => \{[\s\S]*?onClose\(\);\n  \};/, playSongBlock);

// Render history
const renderHistoryBlock = `) : searchQuery && !isSearching ? (
              <div className="py-8 text-center text-[13px] text-slate-500">
                No results found.
              </div>
            ) : (!searchQuery && searchHistory.length > 0) ? (
              <div className="space-y-1">
                <div className="flex items-center justify-between px-2 pt-1 pb-2">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Recent History</h3>
                  <button onClick={() => { localStorage.removeItem('music_search_history'); setSearchHistory([]); }} className="text-[10px] uppercase font-bold text-slate-400 hover:text-red-500 tracking-wider">Clear</button>
                </div>
                {searchHistory.map((item, idx) => (
                  <div key={\`hist-\${idx}\`} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-100 relative">
                    <div className="flex-1 min-w-0 flex items-center gap-3 cursor-pointer" onClick={() => playSong(item)}>
                      {item.coverUrl || item.artworkUrl100 ? (
                        <ImageWithSkeleton src={item.coverUrl || item.artworkUrl100} alt="Cover" className="w-12 h-12 rounded-md object-cover flex-shrink-0 opacity-80 grayscale-[30%]" />
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
                    </div>
                  </div>
                ))}
                
                {trendingSongs.length > 0 && (
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 pt-6 pb-2">Trending Suggestions</h3>
                )}
                {trendingSongs.map((item, idx) => (`;

code = code.replace(/\) : searchQuery && !isSearching \? \([\s\S]*?No results found.[\s\S]*?<\/div>[\s\S]*?\) : trendingSongs\.length > 0 \? \([\s\S]*?<div className="space-y-1">[\s\S]*?<h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 pt-1 pb-2">Trending Suggestions<\/h3>[\s\S]*?\{trendingSongs\.map\(\(item, idx\) => \(/, renderHistoryBlock);

fs.writeFileSync('src/components/PlaySearchModal.tsx', code);
