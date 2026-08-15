const fs = require('fs');
let code = fs.readFileSync('src/pages/Gallery.tsx', 'utf-8');

// Import motion and useSearchParams
code = code.replace(
  'import { useAuth } from "@/context/AuthContext";',
  'import { useAuth } from "@/context/AuthContext";\nimport { motion, AnimatePresence } from "motion/react";\nimport { useSearchParams } from "react-router-dom";'
);

// Add direction state
code = code.replace(
  'const [selectedIndex, setSelectedIndex] = useState<number | null>(null);',
  'const [selectedIndex, setSelectedIndex] = useState<number | null>(null);\n  const [direction, setDirection] = useState<number>(0);\n  const [searchParams] = useSearchParams();'
);

// Update navigate function
const newNavigate = `  const navigate = (dir: number) => {
    if (selectedIndex === null) return;
    setDirection(dir);
    let nextIndex = selectedIndex + dir;
    if (nextIndex < 0) nextIndex = photos.length - 1;
    if (nextIndex >= photos.length) nextIndex = 0;
    setSelectedIndex(nextIndex);
  };`;
code = code.replace(/const navigate = \(dir: number\) => \{[\s\S]*?setSelectedIndex\(nextIndex\);\n  \};/, newNavigate);

// Update handleShare
const newShare = `  const handleShare = async (
    e: React.MouseEvent,
    url: string,
    caption?: string,
    photoId?: string
  ) => {
    e.stopPropagation();
    resetOverlayTimer();
    const shareUrl = photoId ? \`\${window.location.origin}\${window.location.pathname}?photo=\${photoId}\` : window.location.href;
    const shareText = caption || "Check out this photo from the gallery!";
    if (navigator.share) {
      try {
        await navigator.share({
          title: caption || "Visual Diary",
          text: shareText,
          url: shareUrl,
        });
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          fallbackCopy(url);
        }
      }
    } else {
      fallbackCopy(url);
    }
  };`;
code = code.replace(/const handleShare = async \([\s\S]*?fallbackCopy\(url\);\n    \}\n  \};/, newShare);

// Update handleShare calls
code = code.replace(/handleShare\(e, photo\.src, photo\.caption\)/g, 'handleShare(e, photo.src, photo.caption, photo.id)');
code = code.replace(/handleShare\(e, selectedPhoto\.src, selectedPhoto\.caption\)/g, 'handleShare(e, selectedPhoto.src, selectedPhoto.caption, selectedPhoto.id)');

fs.writeFileSync('src/pages/Gallery.tsx', code);
