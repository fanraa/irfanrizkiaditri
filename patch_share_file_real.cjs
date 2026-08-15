const fs = require('fs');
let code = fs.readFileSync('src/pages/Gallery.tsx', 'utf-8');

const replacement = `  const handleShare = async (
    e: React.MouseEvent,
    url: string,
    caption?: string,
    photoId?: string
  ) => {
    e.stopPropagation();
    resetOverlayTimer();
    const shareText = caption || "Visual Diary";
    const shareUrl = photoId ? \`\${window.location.origin}\${window.location.pathname}?photo=\${photoId}\` : window.location.href;

    try {
      // Try to share as actual image file
      const response = await fetch(url);
      const blob = await response.blob();
      const file = new File([blob], 'photo.jpg', { type: blob.type || 'image/jpeg' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: shareText,
          text: shareText
        });
        return;
      }
    } catch (fetchError) {
      console.error("Could not fetch image for sharing", fetchError);
    }

    // Fallback to URL sharing
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareText,
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

code = code.replace(/const handleShare = async \([\s\S]*?fallbackCopy\(url\);\n    \}\n  \};/, replacement);

fs.writeFileSync('src/pages/Gallery.tsx', code);
