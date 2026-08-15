const fs = require('fs');
let code = fs.readFileSync('src/context/AudioContext.tsx', 'utf-8');

const fetchOld = `      const res = await fetch("/api/song-detail", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: track.title, artist: track.artist })
      });`;

const fetchNew = `      let authHeader = "";
      try {
        if (auth.currentUser) {
          const token = await auth.currentUser.getIdToken();
          authHeader = \`Bearer \${token}\`;
        }
      } catch(e) {}
      const res = await fetch("/api/song-detail", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
        body: JSON.stringify({ title: track.title, artist: track.artist })
      });`;

code = code.replace(fetchOld, fetchNew);

// Also remove the entire checking block because the backend handles it now.
const oldCheckingBlock = `    try {
      const dbSongId = \`\${track.artist}-\${track.title}\`.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const songDocRef = doc(db, 'song_details', dbSongId);
      
      if (!forceRegenerate) {
        const songDoc = await getDoc(songDocRef);
        if (songDoc.exists()) {
          const data = songDoc.data();
          setSongDetail({
            isLoading: false,
            description: data.description || "Sorry, no details available.",
            lyrics: data.lyrics || ""
          });
          return;
        }
      }`;

const newCheckingBlock = `    try {
      if (!forceRegenerate) {
         // Note: the backend will check its own cache if forceRegenerate is false
         // But we still need a way to pass forceRegenerate. Let's just always call the API
      }`;

code = code.replace(oldCheckingBlock, newCheckingBlock);

fs.writeFileSync('src/context/AudioContext.tsx', code);
