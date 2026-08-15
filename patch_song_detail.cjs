const fs = require('fs');
let code = fs.readFileSync('api/song-detail.ts', 'utf-8');

// Replace firebase imports and initialization with REST fetch
code = code.replace(
  /import \{ initializeApp \} from 'firebase\/app';\nimport \{ getFirestore, doc, getDoc \} from 'firebase\/firestore';\n\nconst firebaseConfig = \{\n  apiKey: "AIzaSyDjgrBvKUaVg9U1XustHj9TeO4lHZDrcNg",\n  projectId: "fanra-dev"\n\};\nconst app = initializeApp\(firebaseConfig, "SongDetailApp"\);\nconst db = getFirestore\(app\);/g,
  ''
);

code = code.replace(
  /let aiKey = "";\n    try \{\n      const snap = await getDoc\(doc\(db, 'site_content', 'settings'\)\);\n      if \(snap.exists\(\)\) \{\n        aiKey = snap.data\(\).geminiApiKey \|\| "";\n      \}\n    \} catch\(e\) \{\n      console.error\("Failed to read settings from Firestore", e\);\n    \}/g,
  `let aiKey = "";
    try {
      const snap = await fetch('https://firestore.googleapis.com/v1/projects/fanra-dev/databases/(default)/documents/site_content/settings');
      if (snap.ok) {
        const data = await snap.json();
        aiKey = data?.fields?.geminiApiKey?.stringValue || "";
      }
    } catch(e) {
      console.error("Failed to read settings from Firestore REST", e);
    }`
);

fs.writeFileSync('api/song-detail.ts', code);
