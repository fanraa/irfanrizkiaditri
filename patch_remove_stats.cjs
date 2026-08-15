const fs = require('fs');
let code = fs.readFileSync('src/context/AudioContext.tsx', 'utf-8');

const target = `<div className="flex items-center justify-center gap-4 text-xs font-medium text-slate-400">
                      <div className="flex items-center gap-1">
                        <Play className="w-3.5 h-3.5" fill="currentColor" />
                        {getTrack(playingId)?.playCount || 0} plays
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatTime(getTrack(playingId)?.totalTimePlayed || 0)}
                      </div>
                    </div>`;

code = code.replace(target, '');

fs.writeFileSync('src/context/AudioContext.tsx', code);
