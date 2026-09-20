import { GoogleGenAI } from "@google/genai";
import { translate } from '@vitalets/google-translate-api';

import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import ytSearch from "yt-search";

const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT = 20; // max requests per minute
const WINDOW_MS = 60 * 1000;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());


  const DATA_DIR = path.join(process.cwd(), '.data');
  const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  app.get("/api/admin/settings", (req, res) => {
    try {
      let key = process.env.GEMINI_API_KEY || '';
      if (fs.existsSync(SETTINGS_FILE)) {
        const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
        if (settings.geminiApiKey) {
          key = settings.geminiApiKey;
        }
      }
      res.json({ hasGeminiKey: !!key, key });
    } catch(e) {
      res.status(500).json({ error: 'Failed' });
    }
  });

  app.post("/api/admin/settings", (req, res) => {
    try {
      const { geminiApiKey } = req.body;
      const settings = { geminiApiKey: geminiApiKey || '' };
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
      res.json({ success: true });
    } catch(e) {
      res.status(500).json({ error: 'Failed' });
    }
  });

  // API route for YouTube search

  app.get("/api/search", async (req, res) => {
    // Simple in-memory rate limiting based on IP
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    let limitData = rateLimitMap.get(ip);
    
    if (!limitData || now - limitData.lastReset > WINDOW_MS) {
      limitData = { count: 0, lastReset: now };
    }
    limitData.count++;
    rateLimitMap.set(ip, limitData);
    
    if (limitData.count > RATE_LIMIT) {
      return res.status(429).json({ error: "Too many requests, please try again later." });
    }

    try {
      let q = req.query.q;
      if (!q || typeof q !== "string") {
        return res.status(400).json({ error: "Query parameter 'q' is required" });
      }
      
      // Truncate to prevent excessively long queries
      q = q.substring(0, 100);
      

      // Add official or lyrics hint if not already present
      let searchQuery = q;
      // We want to fetch more results initially to have enough after filtering
      const r = await ytSearch(searchQuery + " official audio OR lyrics");
      
      const blockedWords = ['dj ', ' dj', 'remix', 'kumpulan', 'full album', 'nonstop', 'karaoke', '1 jam', '2 jam', 'hour', 'kompilasi'];
      
      const filteredVideos = r.videos.filter(v => {
        const titleLower = v.title.toLowerCase();
        // Exclude if title contains blocked words
        if (blockedWords.some(bw => titleLower.includes(bw))) return false;
        // Exclude videos longer than 8 minutes (480 seconds) or shorter than 1 minute (60 seconds)
        if (v.seconds > 480 || v.seconds < 60) return false;
        return true;
      });

      const videos = await Promise.all(filteredVideos.slice(0, 10).map(async (v) => {
        let coverUrl = v.image;
        let title = v.title;
        let artist = v.author.name;

        // Clean title for iTunes search
        let cleanTitle = v.title
          .replace(/\(.*?\)|\[.*?\]/g, '') // remove () and []
          .replace(/official|music|video|audio|lyrics|lyric/gi, '') // remove common keywords
          .trim();
          
        let queryForItunes = cleanTitle;
        if (artist && !artist.toLowerCase().includes('vevo') && !artist.toLowerCase().includes('topic')) {
            queryForItunes = `${artist} ${queryForItunes}`;
        }
        
        // Also add the original search query as a fallback
        let userQueryForItunes = req.query.q as string;

        try {
           let itunesRes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(queryForItunes)}&entity=song&limit=5`);
           let itunesData = await itunesRes.json();
           
           if (!itunesData.results || itunesData.results.length === 0) {
              itunesRes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(userQueryForItunes)}&entity=song&limit=5`);
              itunesData = await itunesRes.json();
           }
           
           let bestMatch = null;
           
           if (itunesData.results && itunesData.results.length > 0) {
              // Try to find a track where trackName or artistName overlaps with the video title
              const titleLower = v.title.toLowerCase();
              bestMatch = itunesData.results.find(r => {
                 const tName = r.trackName.toLowerCase();
                 // If the track name is in the YouTube title, it's a good match
                 return titleLower.includes(tName);
              });
              
              if (!bestMatch) bestMatch = itunesData.results[0]; // fallback to first
           }
           
           // Verify the best match is actually somewhat related to avoid "Somebody to Love" replacing "Stay"
           if (bestMatch) {
              const tName = bestMatch.trackName.toLowerCase();
              const vName = v.title.toLowerCase();
              
              // Only apply if there is some string overlap between track name and video title
              // e.g. "stay" is in "stay (official video)"
              // if tName is "somebody to love" and vName is "the kid laroi, justin bieber - stay", they don't overlap
              const tWords = tName.split(/[\s\W]+/);
              const hasOverlap = tWords.some(w => w.length > 2 && vName.includes(w));
              
              if (hasOverlap) {
                 coverUrl = bestMatch.artworkUrl100 ? bestMatch.artworkUrl100.replace('100x100bb', '600x600bb') : v.image;
                 title = bestMatch.trackName;
                 artist = bestMatch.artistName;
              } else {
                 // Clean up youtube title manually if iTunes result is bad
                 title = cleanTitle.split('-').pop().trim();
                 if (!title) title = cleanTitle;
              }
           } else {
              title = cleanTitle.split('-').pop().trim();
              if (!title) title = cleanTitle;
           }
        } catch (e) {
           title = cleanTitle.split('-').pop().trim();
           if (!title) title = cleanTitle;
        }

        return {
          youtubeId: v.videoId,
          title: title,
          artist: artist,
          coverUrl: coverUrl,
          duration: v.timestamp
        };
      }));
      
      res.json({ results: videos });
    } catch (err) {
      console.error("Search error:", err);
      res.status(500).json({ error: "Failed to search YouTube" });
    }
  });

    // API route for Translation using Popcat API
  app.post("/api/translate", async (req, res) => {
    try {
      const { text, targetLanguage = 'id' } = req.body;
      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }
      
      const lines = text.split('\n');
      const mockData = [[]];
      
      try {
        const { text: translatedText } = await translate(text, { to: targetLanguage });
        const translatedLines = translatedText.split('\n');
        
        // Ensure we return the exact number of lines
        for (let i = 0; i < lines.length; i++) {
          if (!lines[i].trim()) {
            mockData[0].push([lines[i] + '\n']);
          } else {
            mockData[0].push([(translatedLines[i] || lines[i]) + '\n']);
          }
        }
      } catch (e) {
        console.error("Translate API Error:", e);
        for (const line of lines) {
           mockData[0].push([line + '\n']);
        }
      }
      
      res.json(mockData);
    } catch (err) {
      console.error("Translation error:", err);
      res.status(500).json({ error: "Failed to translate text" });
    }
  });

  // API route for Song Detail using Wikipedia and LRCLIB
  app.post("/api/song-detail", async (req, res) => {
    try {
      const { title, artist } = req.body;
      if (!title || !artist) {
        return res.status(400).json({ error: "Title and artist are required" });
      }
      
      let description = "Sorry, I couldn't find specific details for this song in the database.";
      let lyrics = "";
      

      // 1. Fetch AI API Key
      let aiKey = process.env.GEMINI_API_KEY || "";
      try {
        if (fs.existsSync(SETTINGS_FILE)) {
          const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
          if (settings.geminiApiKey) {
            aiKey = settings.geminiApiKey;
          }
        }
      } catch(e) {}

      if (aiKey) {
        try {
          const ai = new GoogleGenAI({
            apiKey: aiKey,
            httpOptions: {
              headers: {
                'User-Agent': 'aistudio-build',
              }
            }
          });
          const prompt = `Provide a brief, engaging background and description of the song "${title}" by "${artist}". Explain the song's meaning, background, and release info. If it's relatively unknown, describe the typical style or theme based on the title. Do NOT mention unrelated topics like TV shows. Output in English, max 3 paragraphs.`;
          
          const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
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

      res.json({ description, lyrics });
      
    } catch (err) {
      console.error("Song Detail API Error:", err);
      res.status(500).json({ error: "Failed to fetch song detail" });
    }
  });

  // API route for News
  app.get("/api/news", async (req, res) => {
    try {
      const apiKey = process.env.NEWS_API_KEY || 'ce9a41c46a2849d7bfee4276179b0885';
      const response = await fetch(`https://newsapi.org/v2/top-headlines?country=us&category=technology&pageSize=5&apiKey=${apiKey}&_t=${Date.now()}`, { cache: 'no-store' });
      const data = await response.json();
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.json(data);
    } catch (error) {
      console.error("News API Error:", error);
      res.status(500).json({ error: "Failed to fetch news" });
    }
  });

  // Vite middleware for development  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
