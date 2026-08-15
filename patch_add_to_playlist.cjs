const fs = require('fs');
let code = fs.readFileSync('src/context/AudioContext.tsx', 'utf-8');

const target = `                      {sleepTimerEnd && (
                        <button
                          onClick={() => { setSleepTimer(null); setIsPlayerMenuOpen(false); }}
                          className="w-full text-left px-4 py-2.5 text-[14px] text-red-600 hover:bg-red-50 transition-colors border-t border-slate-100 mt-1"
                        >
                          Cancel sleep timer
                        </button>
                      )}`;

const newBlock = `                      {sleepTimerEnd && (
                        <button
                          onClick={() => { setSleepTimer(null); setIsPlayerMenuOpen(false); }}
                          className="w-full text-left px-4 py-2.5 text-[14px] text-red-600 hover:bg-red-50 transition-colors border-t border-slate-100 mt-1"
                        >
                          Cancel sleep timer
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={async () => {
                            setIsPlayerMenuOpen(false);
                            if (playingTrack) {
                              try {
                                await addDoc(collection(db, 'music_playlist'), {
                                  title: playingTrack.title || playingTrack.name || "Unknown Title",
                                  artist: playingTrack.artist || "Unknown Artist",
                                  youtubeId: playingTrack.youtubeId,
                                  thumbnail: playingTrack.thumbnail || "",
                                  addedAt: Date.now()
                                });
                                showToast("Added to playlist");
                              } catch (error) {
                                console.error(error);
                                showToast("Failed to add to playlist");
                              }
                            }
                          }}
                          className="w-full text-left px-4 py-2.5 text-[14px] text-slate-700 hover:bg-slate-50 transition-colors border-t border-slate-100 mt-1 flex items-center gap-2"
                        >
                          <ListPlus className="w-4 h-4" />
                          Add to Playlist
                        </button>
                      )}`;

code = code.replace(target, newBlock);

fs.writeFileSync('src/context/AudioContext.tsx', code);
