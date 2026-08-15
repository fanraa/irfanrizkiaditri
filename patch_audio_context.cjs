const fs = require('fs');

let code = fs.readFileSync('src/context/AudioContext.tsx', 'utf-8');

// Add "isAdmin" to Auth context if not there
if (!code.includes('const { isAdmin } = useAuth();')) {
  // It might be complex, let's just use `useAuth` hook in AudioContext.
  if (code.includes('export function AudioProvider')) {
    // Add useAuth import if needed
    if (!code.includes('useAuth')) {
      code = code.replace(/import {([^}]+)} from "lucide-react";/g, 'import { $1 } from "lucide-react";\nimport { useAuth } from "@/context/AuthContext";');
    }
    
    // Add isAdmin extraction
    code = code.replace('export function AudioProvider({ children }: { children: ReactNode }) {\n', 'export function AudioProvider({ children }: { children: ReactNode }) {\n  const authContext = useAuth();\n  const isAdmin = authContext ? authContext.isAdmin : false;\n');
  }
}

// Update fetchSongDetailForTrack to check firestore
const newFetchSongDetail = `
  const fetchSongDetailForTrack = async (trackId: string | null, forceRegenerate: boolean = false) => {
    if (!trackId) return;
    const track = getTrack(trackId);
    if (!track) return;
    setSongDetail({ isLoading: true });
    
    try {
      const dbSongId = \`\${track.artist}-\${track.title}\`.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const songDocRef = doc(db, 'song_details', dbSongId);
      
      if (!forceRegenerate) {
        const songDoc = await getDoc(songDocRef);
        if (songDoc.exists()) {
          const data = songDoc.data();
          setSongDetail({ 
            isLoading: false, 
            description: data.description, 
            lyrics: data.lyrics,
            translatedDescription: data.translatedDescription
          });
          return;
        }
      }

      const res = await fetch("/api/song-detail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        }
      }
    } catch (e) {
      setSongDetail({ isLoading: false, error: "An error occurred." });
    }
  };
`;

code = code.replace(/  const fetchSongDetailForTrack = async \(trackId: string \| null\) => {[\s\S]*?  };/, newFetchSongDetail.trim());

// Update the "Regenerate AI" button in the UI
const headerSection = `
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        About the Artist & Song
                      </h3>
                      {isAdmin && (
                        <button 
                          onClick={() => fetchSongDetailForTrack(playingId, true)}
                          className="ml-auto text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded transition-colors"
                          title="Force Regenerate via AI"
                        >
                          Regenerate AI
                        </button>
                      )}
                      <button 
`;
code = code.replace(/<div className="flex items-center gap-2 mb-3">\s*<h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">\s*About the Artist & Song\s*<\/h3>\s*<button/m, headerSection.trim() + ' \n');

fs.writeFileSync('src/context/AudioContext.tsx', code);
