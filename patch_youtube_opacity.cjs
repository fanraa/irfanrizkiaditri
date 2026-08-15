const fs = require('fs');
let code = fs.readFileSync('src/context/AudioContext.tsx', 'utf-8');

code = code.replace(
  '<div className="fixed top-0 left-0 w-[200px] h-[200px] pointer-events-none opacity-0 -z-50">',
  '<div className="fixed top-0 left-0 w-[200px] h-[200px] pointer-events-none opacity-[0.01] z-0 overflow-hidden" aria-hidden="true">'
);

fs.writeFileSync('src/context/AudioContext.tsx', code);
