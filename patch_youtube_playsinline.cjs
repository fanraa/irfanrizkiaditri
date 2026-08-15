const fs = require('fs');
let code = fs.readFileSync('src/context/AudioContext.tsx', 'utf-8');

code = code.replace(
  'modestbranding: 1',
  'modestbranding: 1,\n                playsinline: 1'
);

fs.writeFileSync('src/context/AudioContext.tsx', code);
