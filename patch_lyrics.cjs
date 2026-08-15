const fs = require('fs');
let code = fs.readFileSync('src/context/AudioContext.tsx', 'utf-8');

const lyricsOld = `                  {/* Lyrics Section */}
                  {songDetail.lyrics && (
                    <div className="w-full text-left border-t border-slate-200/70 pt-6 mt-8 mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Full Lyrics
                        </h3>
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
                      </div>
                      <div className="text-slate-800 text-sm sm:text-base leading-relaxed whitespace-pre-wrap mt-3 font-sans">
                        {songDetail.lyrics}
                      </div>
                    </div>
                  )}`;

const lyricsNew = `                  {/* Lyrics Section */}
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
                  </div>`;

code = code.replace(lyricsOld, lyricsNew);

const descOld = `                    ) : songDetail.error ? (
                      <p className="text-red-500 text-xs mt-3">{songDetail.error}</p>
                    ) : (
                      <div className="text-slate-700 text-sm sm:text-base leading-relaxed whitespace-pre-wrap mt-3 font-sans transition-all">
                        {songDetail.isShowingTranslation && songDetail.translatedDescription 
                           ? songDetail.translatedDescription 
                           : (songDetail.description || "No description available for this track.")}
                      </div>
                    )}`;

const descNew = `                    ) : songDetail.error ? (
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
                    )}`;

code = code.replace(descOld, descNew);

fs.writeFileSync('src/context/AudioContext.tsx', code);
