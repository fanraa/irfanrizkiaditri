import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, orderBy } from "firebase/firestore";
import fs from "fs";
import path from "path";

const firebaseConfig = {
  apiKey: "AIzaSyDjgrBvKUaVg9U1XustHj9TeO4lHZDrcNg",
  authDomain: "fanra-dev.firebaseapp.com",
  projectId: "fanra-dev",
  storageBucket: "fanra-dev.firebasestorage.app",
  messagingSenderId: "664735861834",
  appId: "1:664735861834:web:6519570201553dbe4faab3",
  measurementId: "G-HMKEVZS65H"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Use the primary domain
const BASE_URL = "https://irfanrizkiaditri.site"; 

async function generateSitemap() {
  console.log("Generating sitemap with images...");
  const urls = [];

  // Static routes
  urls.push({ loc: `${BASE_URL}/`, changefreq: 'daily', priority: '1.0' });
  urls.push({ loc: `${BASE_URL}/projects`, changefreq: 'weekly', priority: '0.9' });
  urls.push({ loc: `${BASE_URL}/lab`, changefreq: 'weekly', priority: '0.9' });
  urls.push({ loc: `${BASE_URL}/music`, changefreq: 'weekly', priority: '0.8' });
  urls.push({ loc: `${BASE_URL}/contact`, changefreq: 'monthly', priority: '0.7' });
  urls.push({ loc: `${BASE_URL}/about`, changefreq: 'monthly', priority: '0.8' });
  urls.push({ loc: `${BASE_URL}/privacy`, changefreq: 'monthly', priority: '0.5' });
  urls.push({ loc: `${BASE_URL}/terms`, changefreq: 'monthly', priority: '0.5' });

  // Gallery (with images)
  const galleryImages = [];
  try {
    const photoSnapshot = await getDocs(query(collection(db, "gallery_photos_production"), orderBy("timestamp", "desc")));
    photoSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.src) {
        galleryImages.push({ loc: data.src, title: data.caption || 'Gallery Photo' });
      }
    });
  } catch (e) {
    console.error("Error fetching gallery for sitemap:", e);
  }
  urls.push({ loc: `${BASE_URL}/gallery`, changefreq: 'weekly', priority: '0.8', images: galleryImages });

  // Blog (with individual posts and images)
  const blogImages = [];
  try {
    const blogSnapshot = await getDocs(query(collection(db, "blog_posts_production"), orderBy("timestamp", "desc")));
    blogSnapshot.forEach((doc) => {
      const data = doc.data();
      const id = doc.id;
      const img = data.image || data.imageUrl;
      
      // Index individual blog post URL
      urls.push({ loc: `${BASE_URL}/blog?id=${id}`, changefreq: 'weekly', priority: '0.9' });

      if (img) {
        blogImages.push({ loc: img, title: data.title || 'Blog Image' });
      }
    });
  } catch (e) {
    console.error("Error fetching blogs for sitemap:", e);
  }
  urls.push({ loc: `${BASE_URL}/blog`, changefreq: 'weekly', priority: '0.9', images: blogImages });

  // Generate XML
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

  for (const url of urls) {
    xml += `  <url>\n`;
    xml += `    <loc>${url.loc}</loc>\n`;
    xml += `    <changefreq>${url.changefreq}</changefreq>\n`;
    xml += `    <priority>${url.priority}</priority>\n`;
    
    if (url.images && url.images.length > 0) {
      for (const img of url.images) {
        // Prevent XML injection with basic encoding
        const safeLoc = img.loc.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
        const safeTitle = img.title ? img.title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;') : 'Image';
        xml += `    <image:image>\n`;
        xml += `      <image:loc>${safeLoc}</image:loc>\n`;
        xml += `      <image:title>${safeTitle}</image:title>\n`;
        xml += `    </image:image>\n`;
      }
    }
    
    xml += `  </url>\n`;
  }

  xml += `</urlset>\n`;

  const publicDir = path.resolve(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir);
  }

  fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), xml);
  console.log("Sitemap generated at public/sitemap.xml");
  process.exit(0);
}

generateSitemap();
