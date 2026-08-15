import { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDjgrBvKUaVg9U1XustHj9TeO4lHZDrcNg",
  projectId: "fanra-dev"
};
// Use a unique app name to avoid "already exists" errors in serverless
const app = initializeApp(firebaseConfig, "AdminSettingsApp");
const db = getFirestore(app);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const settingsRef = doc(db, 'site_content', 'settings');
    
    if (req.method === 'GET') {
      const snap = await getDoc(settingsRef);
      const data = snap.exists() ? snap.data() : { geminiApiKey: '' };
      return res.status(200).json({ hasGeminiKey: !!data.geminiApiKey, key: data.geminiApiKey });
    } 
    
    if (req.method === 'POST') {
      const { geminiApiKey } = req.body || {};
      await setDoc(settingsRef, { geminiApiKey: geminiApiKey || '' }, { merge: true });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error("Settings API Error:", error);
    return res.status(500).json({ error: "Failed to handle settings" });
  }
}
