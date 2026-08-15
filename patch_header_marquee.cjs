const fs = require('fs');
let code = fs.readFileSync('src/context/AudioContext.tsx', 'utf-8');

const target = `<div className="text-center font-medium text-xs sm:text-sm text-slate-500 truncate max-w-[180px] sm:max-w-xs">
                {trackTitle} &bull; {trackArtist}
              </div>`;

const newCode = `<div className="text-center font-medium text-xs sm:text-sm text-slate-500 overflow-hidden max-w-[180px] sm:max-w-xs relative flex items-center justify-center whitespace-nowrap mask-fade-edges">
                <div className={(trackTitle.length + trackArtist.length > 25) ? "animate-sliding-text" : ""}>
                  {trackTitle} &bull; {trackArtist}
                </div>
              </div>`;

code = code.replace(target, newCode);

fs.writeFileSync('src/context/AudioContext.tsx', code);
