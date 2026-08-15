const fs = require('fs');
let code = fs.readFileSync('src/context/AudioContext.tsx', 'utf-8');

const newFunc = `  const fetchSongDetailForTrack = async (trackId: string, forceRegenerate = false) => {
    const track = getTrack(trackId);
    if (!track) return;
    setSongDetail({ isLoading: true });
    
    try {
      let authHeader = "";
      try {
        if (auth.currentUser) {
          const token = await auth.currentUser.getIdToken();
          authHeader = \`Bearer \${token}\`;
        }
      } catch(e) {}
      
      const res = await fetch("/api/song-detail", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": authHeader },
        body: JSON.stringify({
          title: track.title || track.name || "",
          artist: track.artist || ""
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setSongDetail({ isLoading: false, error: data.error || "Failed to get song detail." });
      } else {
        const cleanLyrics = data.lyrics ? data.lyrics.replace(/\\[\\d{1,2}:\\d{2}(\\.\\d+)?\\]/g, '').trim() : "";
        setSongDetail({ isLoading: false, description: data.description, lyrics: cleanLyrics });
      }
    } catch (e) {
      setSongDetail({ isLoading: false, error: "An error occurred." });
    }
  };`;

const regex = /  const fetchSongDetailForTrack = async \(trackId: string, forceRegenerate = false\) => \{[\s\S]*?  const removeFromQueue/m;

code = code.replace(regex, newFunc + '\n\n  const removeFromQueue');

fs.writeFileSync('src/context/AudioContext.tsx', code);
