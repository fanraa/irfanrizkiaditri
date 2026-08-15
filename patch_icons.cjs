const fs = require('fs');
let code = fs.readFileSync('src/context/AudioContext.tsx', 'utf-8');

code = code.replace(
  /<span className="text-lg">🎵<\/span>/g,
  ''
);

code = code.replace(
  /<span className="text-lg">ℹ️<\/span>/g,
  ''
);

fs.writeFileSync('src/context/AudioContext.tsx', code);
