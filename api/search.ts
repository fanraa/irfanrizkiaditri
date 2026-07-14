import { VercelRequest, VercelResponse } from '@vercel/node';
import ytSearch from 'yt-search';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let q = req.query.q as string;
    if (!q) {
      return res.status(400).json({ error: "Query parameter 'q' is required" });
    }

    q = q.substring(0, 100);
    let searchQuery = q;
    
    const r = await ytSearch(searchQuery + " official audio OR lyrics");
    
    const blockedWords = ['dj ', ' dj', 'remix', 'kumpulan', 'full album', 'nonstop', 'karaoke', '1 jam', '2 jam', 'hour', 'kompilasi'];
    
    const filteredVideos = r.videos.filter(v => {
      const titleLower = v.title.toLowerCase();
      if (blockedWords.some(bw => titleLower.includes(bw))) return false;
      if (v.seconds > 480 || v.seconds < 60) return false;
      return true;
    });

    const videos = await Promise.all(filteredVideos.slice(0, 10).map(async (v) => {
      let coverUrl = v.image;
      let title = v.title;
      let artist = v.author.name;
      
      let cleanTitle = v.title
        .replace(/\(.*?\)|\[.*?\]/g, '')
        .replace(/official|music|video|audio|lyrics|lyric/gi, '')
        .trim();
        
      let queryForItunes = cleanTitle;
      if (artist && !artist.toLowerCase().includes('vevo') && !artist.toLowerCase().includes('topic')) {
          queryForItunes = `${artist} ${queryForItunes}`;
      }
      
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
            const titleLower = v.title.toLowerCase();
            bestMatch = itunesData.results.find((r: any) => titleLower.includes(r.trackName.toLowerCase()));
            if (!bestMatch) bestMatch = itunesData.results[0];
         }
         
         if (bestMatch) {
            const tName = bestMatch.trackName.toLowerCase();
            const vName = v.title.toLowerCase();
            const tWords = tName.split(/[\s\W]+/);
            const hasOverlap = tWords.some((w: string) => w.length > 2 && vName.includes(w));
            
            if (hasOverlap) {
               coverUrl = bestMatch.artworkUrl100 ? bestMatch.artworkUrl100.replace('100x100bb', '600x600bb') : v.image;
               title = bestMatch.trackName;
               artist = bestMatch.artistName;
            } else {
               title = cleanTitle.split('-').pop()?.trim() || cleanTitle;
            }
         } else {
            title = cleanTitle.split('-').pop()?.trim() || cleanTitle;
         }
      } catch (e) {
         title = cleanTitle.split('-').pop()?.trim() || cleanTitle;
      }

      return {
        youtubeId: v.videoId,
        title: title,
        artist: artist,
        coverUrl: coverUrl,
        duration: v.timestamp
      };
    }));
    
    return res.status(200).json({ results: videos });
  } catch (err) {
    console.error("Search error:", err);
    return res.status(500).json({ error: "Failed to search YouTube" });
  }
}
