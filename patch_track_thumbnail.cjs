const fs = require('fs');
let code = fs.readFileSync('src/context/AudioContext.tsx', 'utf-8');

code = code.replace(
  'thumbnail: playingTrack.thumbnail || "",',
  'cover: playingTrack.coverUrl || playingTrack.cover || playingTrack.image || "",'
);

fs.writeFileSync('src/context/AudioContext.tsx', code);
