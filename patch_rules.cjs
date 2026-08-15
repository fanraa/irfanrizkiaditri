const fs = require('fs');
let code = fs.readFileSync('firestore.rules', 'utf-8');

code = code.replace(
  /\/\/ Default: Deny others/,
  "// 17. SONG DETAILS\\nmatch /song_details/{docId} {\\n    allow read, write: if true;\\n}\\n\\n// Default: Deny others"
);

fs.writeFileSync('firestore.rules', code);
