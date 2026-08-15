const fs = require('fs');

let serverCode = fs.readFileSync('server.ts', 'utf-8');

// Ensure fs import
if (!serverCode.includes('import fs from "fs"')) {
  serverCode = serverCode.replace('import path from "path";', 'import path from "path";\nimport fs from "fs";');
}

// Ensure GoogleGenAI import
if (!serverCode.includes('GoogleGenAI')) {
  serverCode = 'import { GoogleGenAI } from "@google/genai";\n' + serverCode;
}

// Add API endpoints
const settingsApiCode = `
  const DATA_DIR = path.join(process.cwd(), '.data');
  const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  app.get("/api/admin/settings", (req, res) => {
    try {
      let settings = { geminiApiKey: '' };
      if (fs.existsSync(SETTINGS_FILE)) {
        settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
      }
      res.json({ hasGeminiKey: !!settings.geminiApiKey, key: settings.geminiApiKey });
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
`;
serverCode = serverCode.replace('  // API route for YouTube search', settingsApiCode);

// Update /api/song-detail
const newSongDetailCode = `
      // 1. Fetch AI API Key
      let aiKey = "";
      try {
        if (fs.existsSync(SETTINGS_FILE)) {
          const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
          aiKey = settings.geminiApiKey;
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
          const prompt = \`Provide a brief, engaging background and description of the song "\${title}" by "\${artist}". Explain the song's meaning, background, and release info. If it's relatively unknown, describe the typical style or theme based on the title. Do NOT mention unrelated topics like TV shows. Output in English, max 3 paragraphs.\`;
          
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
          const searchRes = await fetch(\`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=\${encodeURIComponent('"' + title + '" ' + artist + ' song')}&utf8=&format=json\`);
          const searchData = await searchRes.json();
          let pageId = null;
          if (searchData.query && searchData.query.search && searchData.query.search.length > 0) {
            pageId = searchData.query.search[0].pageid;
          } else {
            const fallbackRes = await fetch(\`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=\${encodeURIComponent(title + ' ' + artist + ' (song OR music)')}&utf8=&format=json\`);
            const fallbackData = await fallbackRes.json();
            if (fallbackData.query && fallbackData.query.search && fallbackData.query.search.length > 0) {
              pageId = fallbackData.query.search[0].pageid;
            }
          }
          if (pageId) {
            const extractRes = await fetch(\`https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exsentences=4&explaintext=1&pageids=\${pageId}&format=json\`);
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
              description = \`Enjoy listening to "\${title}" by \${artist}. This track brings a unique energy and vibe!\`;
          }
        } catch (wikiErr) {
          description = \`Enjoy listening to "\${title}" by \${artist}. This track brings a unique energy and vibe!\`;
        }
      }
`;

serverCode = serverCode.replace(/      \/\/ 1\. Search Wikipedia for the song description[\s\S]*?\/\/ 2\. Search LRCLIB for lyrics/m, newSongDetailCode + '\n      // 2. Search LRCLIB for lyrics');

fs.writeFileSync('server.ts', serverCode);
