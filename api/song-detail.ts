import { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDjgrBvKUaVg9U1XustHj9TeO4lHZDrcNg",
  projectId: "fanra-dev"
};
const app = initializeApp(firebaseConfig, "SongDetailApp");
const db = getFirestore(app);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { title, artist } = req.body || {};
    if (!title || !artist) {
      return res.status(400).json({ error: "Title and artist are required" });
    }
    
    let description = "Sorry, I couldn't find specific details for this song in the database.";
    let lyrics = "";
    
    // 1. Fetch AI API Key from Firestore
    let aiKey = "";
    try {
      const snap = await getDoc(doc(db, 'site_content', 'settings'));
      if (snap.exists()) {
        aiKey = snap.data().geminiApiKey || "";
      }
    } catch(e) {
      console.error("Failed to read settings from Firestore", e);
    }

    if (aiKey) {
      try {
        const ai = new GoogleGenAI({
          apiKey: aiKey,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
        });
        const prompt = `Provide a brief, engaging background and description of the song "${title}" by "${artist}". Explain the song's meaning, background, and release info. If it's relatively unknown, describe the typical style or theme based on the title. Do NOT mention unrelated topics like TV shows. Output in English, max 3 paragraphs.`;
        
        const response = await ai.models.generateContent({
          model: "gemini-3.7-flash",
          contents: prompt,
          config: {
            systemInstruction: "You are a music assistant. Focus ONLY on music, songs, and artists. Avoid discussing TV shows or irrelevant topics.",
          }
        });
        if (response.text) {
           description = response.text.trim();
        }
      } catch (genaiErr) {
        console.error("Gemini Error:", genaiErr);
      }
    }

    // If description is still default, fallback to Wikipedia
    if (description === "Sorry, I couldn't find specific details for this song in the database.") {
      try {
        const searchRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent('"' + title + '" ' + artist + ' song')}&utf8=&format=json`);
        const searchData = await searchRes.json();
        let pageId = null;
        if (searchData.query && searchData.query.search && searchData.query.search.length > 0) {
          pageId = searchData.query.search[0].pageid;
        } else {
          const fallbackRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(title + ' ' + artist + ' (song OR music)')}&utf8=&format=json`);
          const fallbackData = await fallbackRes.json();
          if (fallbackData.query && fallbackData.query.search && fallbackData.query.search.length > 0) {
            pageId = fallbackData.query.search[0].pageid;
          }
        }
        if (pageId) {
          const extractRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exsentences=4&explaintext=1&pageids=${pageId}&format=json`);
          const extractData = await extractRes.json();
          const page = extractData.query.pages[pageId];
          if (page && page.extract && page.extract.length > 20) {
            const lowerExtract = page.extract.toLowerCase();
            if (!lowerExtract.includes("television series") && !lowerExtract.includes("reality television") && !lowerExtract.includes("singing competition")) {
              description = page.extract;
            }
          }
        }
        if (description === "Sorry, I couldn't find specific details for this song in the database.") {
            description = `Enjoy listening to "${title}" by ${artist}. This track brings a unique energy and vibe!`;
        }
      } catch (wikiErr) {
        description = `Enjoy listening to "${title}" by ${artist}. This track brings a unique energy and vibe!`;
      }
    }

    // 2. Search LRCLIB for lyrics
    try {
      const lrclibRes = await fetch(`https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(title)}`);
      if (lrclibRes.ok) {
        const lrclibData = await lrclibRes.json();
        if (lrclibData && lrclibData.plainLyrics) {
          lyrics = lrclibData.plainLyrics.replace(/\[\d{1,2}:\d{2}(\.\d+)?\]/g, '').trim();
        } else if (lrclibData && lrclibData.syncedLyrics) {
          lyrics = lrclibData.syncedLyrics.replace(/\[\d{1,2}:\d{2}(\.\d+)?\]/g, '').trim();
        }
      }
    } catch (lrclibErr) {
      console.error("LRCLIB Error:", lrclibErr);
    }

    return res.status(200).json({ description, lyrics });
  } catch (err) {
    console.error("Song Detail API Error:", err);
    return res.status(500).json({ error: "Failed to fetch song detail" });
  }
}
