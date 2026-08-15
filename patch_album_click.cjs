const fs = require('fs');
let code = fs.readFileSync('src/context/AudioContext.tsx', 'utf-8');

code = code.replace(
  /<div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-slate-100 shadow-sm border border-slate-200\/50">/g,
  '<div onClick={() => navigate("/music")} className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-slate-100 shadow-sm border border-slate-200/50 cursor-pointer hover:opacity-80 transition-opacity">'
);

fs.writeFileSync('src/context/AudioContext.tsx', code);
