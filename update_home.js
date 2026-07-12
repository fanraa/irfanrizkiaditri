const fs = require('fs');
let code = fs.readFileSync('src/pages/Home.tsx', 'utf8');

code = code.replace(/const CHARACTER_IMAGES = \[\s*"(.*?)"\s*\];/s, `const DEFAULT_CHARACTER_IMAGES = [
    "https://res.cloudinary.com/dew39kqhy/image/upload/f_auto,q_auto/v1783231220/erasebg-transformed_2_woe6gb.png",
    "https://res.cloudinary.com/dew39kqhy/image/upload/f_auto,q_auto/v1783231221/erasebg-transformed_4_d2j4yd.png",
    "https://res.cloudinary.com/dew39kqhy/image/upload/f_auto,q_auto/v1783231219/erasebg-transformed_3_gc6bp3.png",
    "https://res.cloudinary.com/dew39kqhy/image/upload/f_auto,q_auto/v1783231222/erasebg-transformed_5_n5cyr9.png",
    "https://res.cloudinary.com/dew39kqhy/image/upload/f_auto,q_auto/v1783231357/erasebg-transformed_6_onz5ys.png",
    "https://res.cloudinary.com/dew39kqhy/image/upload/f_auto,q_auto/v1783245657/ChatGPT_Image_5_Jul_2026_16.37.48_j4fwwt.png",
    "https://res.cloudinary.com/dew39kqhy/image/upload/f_auto,q_auto/v1783245657/ChatGPT_Image_5_Jul_2026_16.38.00_tfogdr.png",
    "https://res.cloudinary.com/dew39kqhy/image/upload/f_auto,q_auto/v1783245657/ChatGPT_Image_5_Jul_2026_16.38.07_jdle6p.png",
    "https://res.cloudinary.com/dew39kqhy/image/upload/f_auto,q_auto/v1783245765/ChatGPT_Image_5_Jul_2026__16.37.30-removebg-preview_foknqe.png"
  ];
  const [characterImages, setCharacterImages] = useState(DEFAULT_CHARACTER_IMAGES);
  
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'site_content', 'assets'), (docSnap) => {
      if (docSnap.exists() && docSnap.data().characterImages?.length > 0) {
        setCharacterImages(docSnap.data().characterImages);
      }
    });
    return () => unsub();
  }, []);
`);

code = code.replace(/CHARACTER_IMAGES\.length/g, 'characterImages.length');
code = code.replace(/CHARACTER_IMAGES\[/g, 'characterImages[');

fs.writeFileSync('src/pages/Home.tsx', code);
