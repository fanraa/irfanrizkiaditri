const fs = require('fs');
let code = fs.readFileSync('src/context/AudioContext.tsx', 'utf-8');

code = code.replace(
  'import { db } from "@/lib/firebase";',
  'import { db, auth } from "@/lib/firebase";'
);

fs.writeFileSync('src/context/AudioContext.tsx', code);
