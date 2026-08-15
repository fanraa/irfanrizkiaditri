const fs = require('fs');
let code = fs.readFileSync('src/context/AudioContext.tsx', 'utf-8');

const oldCode = `        setSongDetail({ isLoading: false, description: data.description, lyrics: cleanLyrics });
        
        // Save to Firestore for future
        try {
          await setDoc(songDocRef, {
            title: track.title,
            artist: track.artist,
            description: data.description,
            lyrics: cleanLyrics,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch(e) {
          console.error("Failed to save song detail to Firestore", e);
        }`;

const newCode = `        setSongDetail({ isLoading: false, description: data.description, lyrics: cleanLyrics });`;

code = code.replace(oldCode, newCode);

fs.writeFileSync('src/context/AudioContext.tsx', code);
