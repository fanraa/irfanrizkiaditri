const fs = require('fs');
let code = fs.readFileSync('firestore.rules', 'utf-8');

code = code.replace(
  /\/\/ 17\. SONG DETAILS\\nmatch \/song_details\/\{docId\} \{\\n    allow read, write: if true;\\n\}\\n\\n\/\/ Default: Deny others/,
  `// 17. SONG DETAILS
match /song_details/{docId} {
    allow read: if true;
    allow write: if isAdmin();
}

// Default: Deny others`
);

fs.writeFileSync('firestore.rules', code);
