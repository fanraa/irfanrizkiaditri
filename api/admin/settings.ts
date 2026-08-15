import { VercelRequest, VercelResponse } from '@vercel/node';

const PROJECT_ID = "fanra-dev";
const URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/site_content/settings`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      const snap = await fetch(URL);
      if (snap.ok) {
        const data = await snap.json();
        const key = data?.fields?.geminiApiKey?.stringValue || '';
        return res.status(200).json({ hasGeminiKey: !!key, key: key });
      } else {
        return res.status(200).json({ hasGeminiKey: false, key: '' });
      }
    } 
    
    if (req.method === 'POST') {
      const { geminiApiKey } = req.body || {};
      const payload = {
        fields: {
          geminiApiKey: { stringValue: geminiApiKey || '' }
        }
      };
      // For REST API, we can use PATCH to update the document.
      // We append ?updateMask.fieldPaths=geminiApiKey to only update that field.
      const authHeader = req.headers.authorization || '';
      const snap = await fetch(`${URL}?updateMask.fieldPaths=geminiApiKey`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
        body: JSON.stringify(payload)
      });
      
      if (snap.ok) {
        return res.status(200).json({ success: true });
      } else {
        const errData = await snap.json();
        console.error("Firestore REST Error:", errData);
        return res.status(500).json({ error: "Failed to save settings" });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error("Settings API Error:", error);
    return res.status(500).json({ error: "Failed to handle settings" });
  }
}
