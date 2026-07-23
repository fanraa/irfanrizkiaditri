import { VercelRequest, VercelResponse } from '@vercel/node';
import { translate } from '@vitalets/google-translate-api';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text, targetLanguage = 'id' } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }
    
    const lines = text.split('\n');
    const mockData: any[][] = [[]];
    
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
    
    return res.status(200).json(mockData);
  } catch (err) {
    console.error("Translation error:", err);
    return res.status(500).json({ error: "Failed to translate text" });
  }
}
