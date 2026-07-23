import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiKey = process.env.NEWS_API_KEY || 'ce9a41c46a2849d7bfee4276179b0885';
    const response = await fetch(`https://newsapi.org/v2/top-headlines?country=us&category=technology&pageSize=5&apiKey=${apiKey}&_t=${Date.now()}`, { cache: 'no-store' });
    const data = await response.json();
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    return res.status(200).json(data);
  } catch (error) {
    console.error("News API Error:", error);
    return res.status(500).json({ error: "Failed to fetch news" });
  }
}
