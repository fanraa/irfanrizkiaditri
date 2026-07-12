import { SEO } from "@/components/SEO";
import { ImageWithSkeleton } from "@/components/ImageWithSkeleton";
import { PageTransition } from "@/components/PageTransition";
import { motion, AnimatePresence } from "framer-motion";
import { User, Lightbulb, MapPin, Sparkles, ArrowRight, Beaker, Briefcase, PenTool, Image as ImageIcon, MessageSquare, Send, CheckCircle, AlertCircle, Mail } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import React, { useState, ChangeEvent, FormEvent, useRef, useEffect } from "react";
import { collection, query, orderBy, limit, getDocs, where, doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format } from "date-fns";
import { cn } from "@/lib/utils";


export function Home() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [errors, setErrors] = useState({ name: "", email: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isActuallyTyping, setIsActuallyTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [recentBlogs, setRecentBlogs] = useState<any[]>([]);
  const [featuredProjects, setFeaturedProjects] = useState<any[]>([]);
  const [recentPhotos, setRecentPhotos] = useState<any[]>([]);
  const [recentMusic, setRecentMusic] = useState<any[]>([]);
  const [recentPublicMessages, setRecentPublicMessages] = useState<any[]>([]);
  const DEFAULT_CHARACTER_IMAGES = [
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
  const [contactImage, setContactImage] = useState("https://res.cloudinary.com/dew39kqhy/image/upload/f_auto,q_auto/v1783234123/ChatGPT_Image_5_Jul_2026__13.47.35-removebg-preview_gztehs.png");
  
  useEffect(() => {
    const cacheKey = "fanra_cache_assets";
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const data = JSON.parse(cached);
        if (data.characterImages?.length > 0) setCharacterImages(data.characterImages);
        if (data.contactImage) setContactImage(data.contactImage);
      } catch(e){}
    }

    const unsub = onSnapshot(doc(db, 'site_content', 'assets'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.characterImages?.length > 0) setCharacterImages(data.characterImages);
        if (data.contactImage) setContactImage(data.contactImage);
        localStorage.setItem(cacheKey, JSON.stringify(data));
      }
    }, (err) => {
      console.warn("Could not load dynamic assets (using defaults).", err.code);
    });
    return () => unsub();
  }, []);


  const [characterImageIndex, setCharacterImageIndex] = useState(() => {
    const saved = sessionStorage.getItem('fanraImageIndex');
    return saved ? parseInt(saved, 10) : 0;
  });

  const [isChangingImage, setIsChangingImage] = useState(false);

  const changeCharacterImage = () => {
    if (isChangingImage) return;
    setIsChangingImage(true);
    
    setCharacterImageIndex(prev => {
      let nextIndex;
      do {
        nextIndex = Math.floor(Math.random() * characterImages.length);
      } while (nextIndex === prev && characterImages.length > 1);
      return nextIndex;
    });

    setTimeout(() => {
      setIsChangingImage(false);
    }, 1000);
  };
  
  const [activeMusicIndex, setActiveMusicIndex] = useState<number | null>(null);
  const [isMusicPaused, setIsMusicPaused] = useState(false);
  const musicPauseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [activeFeatureIndex, setActiveFeatureIndex] = useState(0);
  const [featureDragDirection, setFeatureDragDirection] = useState(1);
  const defaultProjects = [
    {
      id: "fanra",
      title: "Fanra",
      description: "Personal portfolio and digital garden. A space to share my thoughts, experiments, and creative works.",
      icon: "https://cdn-icons-png.flaticon.com/128/14047/14047292.png",
      link: "https://fanra.my.id",
    },
    {
      id: "fanratech",
      title: "Fanratech",
      description: "Technology blog and tutorial site focusing on web development, AI, and modern software engineering.",
      icon: "https://res.cloudinary.com/dew39kqhy/image/upload/f_auto,q_auto/v1779594254/FanraTech_esy4kn.png",
      link: "https://fanratech.web.id",
    },
    {
      id: "vektorion",
      title: "Vektorion",
      description: "Visual exploration platform offering free graphic design assets and curated design inspiration.",
      icon: "https://res.cloudinary.com/dew39kqhy/image/upload/f_auto,q_auto/v1778700411/ChatGPT_Image_14_Mei_2026_02.26.25_nx3u4o.png",
      link: "https://vektorion.web.id",
    },
    {
      id: "fanragem",
      title: "Fanragem",
      description: "A web-based peer-to-peer economic simulation game featuring a player-driven market where users trade resources, manage factories, and invest in a dynamic economy.",
      icon: "https://res.cloudinary.com/dew39kqhy/image/upload/f_auto,q_auto/v1783234123/ChatGPT_Image_5_Jul_2026__13.47.35-removebg-preview_gztehs.png",
      link: "https://fanragem.my.id",
    },
    {
      id: "fanrabot",
      title: "Fanrabot",
      description: "An AI-powered web platform to create and manage smart WhatsApp bots, connecting them with various LLMs for automated replies and business automation.",
      icon: "https://res.cloudinary.com/dew39kqhy/image/upload/f_auto,q_auto/v1780578024/file_0000000030647209b33b695fffe52c90_gi9rwf.png",
      link: "https://fanrabot.biz.id",
    },
    {
      id: "friendzone",
      title: "FriendsZone",
      description: "A global social community platform connecting people to build friendships. Evolved from a chat group into a cross-platform ecosystem prioritizing authentic interactions.",
      icon: "https://res.cloudinary.com/dew39kqhy/image/upload/f_auto,q_auto/v1776967780/1774023663426_cv3c6b.png",
      link: "https://friendszone.web.id",
    }
  ];
  const featureCards = featuredProjects.length > 0 ? featuredProjects : defaultProjects;
  
  useEffect(() => {
    const interval = setInterval(() => {
      setFeatureDragDirection(1); // always slide forward
      setActiveFeatureIndex(prev => (prev + 1) % featureCards.length);
    }, 10000); // Pelan (10 seconds)
    return () => clearInterval(interval);
  }, [activeFeatureIndex, featureCards.length]); // Reset timer when index changes (manual swipe)

  const handleMusicClick = (index: number) => {
    setActiveMusicIndex(index);
    setIsMusicPaused(true);
    
    if (musicPauseTimeoutRef.current) {
      clearTimeout(musicPauseTimeoutRef.current);
    }
    
    musicPauseTimeoutRef.current = setTimeout(() => {
      setIsMusicPaused(false);
      setActiveMusicIndex(null);
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (musicPauseTimeoutRef.current) {
        clearTimeout(musicPauseTimeoutRef.current);
      }
    };
  }, []);
  
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    sessionStorage.setItem('fanraImageIndex', String(characterImageIndex));
  }, [characterImageIndex]);

  // Toggle image when visiting page (mount) - using a flag to avoid strict mode double trigger
  useEffect(() => {
    const hasToggledThisMount = sessionStorage.getItem('fanraToggledThisMount');
    if (!hasToggledThisMount) {
      changeCharacterImage();
      sessionStorage.setItem('fanraToggledThisMount', 'true');
      
      // Clean up the flag slightly later so it acts per-mount
      setTimeout(() => {
        sessionStorage.removeItem('fanraToggledThisMount');
      }, 500);
    }
  }, []);

  // Toggle image when hero section goes out of view
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        // Toggle only when it goes completely out of view (and not on initial page load if it's visible)
        if (!entry.isIntersecting && entry.boundingClientRect.top < 0) {
          changeCharacterImage();
        }
      });
    }, {
      threshold: 0
    });

    const currentHero = heroRef.current;
    if (currentHero) {
      observer.observe(currentHero);
    }

    return () => {
      if (currentHero) {
        observer.unobserve(currentHero);
      }
    };
  }, []);

  useEffect(() => {
    async function fetchData() {
      const fetchProjects = async () => {
        const cacheKey = "fanra_cache_projects";
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            setFeaturedProjects(JSON.parse(cached));
          } catch(e){}
        }
        try {
          const projectsQ = query(collection(db, "projects_custom"), orderBy("createdAt", "desc"));
          const projectsSnapshot = await getDocs(projectsQ);
          const data = projectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setFeaturedProjects(data);
          localStorage.setItem(cacheKey, JSON.stringify(data));
        } catch (e) { console.error("Error projects", e); }
      };
      
      const fetchBlogs = async () => {
        try {
          const blogQ = query(collection(db, "blog_posts_production"), orderBy("timestamp", "desc"), limit(2));
          const blogSnapshot = await getDocs(blogQ);
          setRecentBlogs(blogSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (e) { console.error("Error blogs", e); }
      };

      const fetchPhotos = async () => {
        try {
          const photoQ = query(collection(db, "gallery_photos_production"), orderBy("timestamp", "desc"), limit(12));
          const photoSnapshot = await getDocs(photoQ);
          setRecentPhotos(photoSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (e) { console.error("Error photos", e); }
      };

      const fetchMusic = async () => {
        const cacheKey = "fanra_cache_music_recent";
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            setRecentMusic(JSON.parse(cached));
          } catch(e){}
        }
        try {
          const musicQ = query(collection(db, "music_playlist"));
          const musicSnapshot = await getDocs(musicQ);
          const musicData = musicSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          musicData.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
          setRecentMusic(musicData);
          localStorage.setItem(cacheKey, JSON.stringify(musicData));
        } catch (e) { console.error("Error music", e); }
      };

      const fetchMessages = async () => {
        try {
          const publicMessagesQ = query(collection(db, "messages"), where("type", "==", "public"));
          const publicMessagesSnapshot = await getDocs(publicMessagesQ);
          const msgs = publicMessagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
          msgs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
          setRecentPublicMessages(msgs.slice(0, 4));
        } catch (e) { console.error("Error messages", e); }
      };

      fetchProjects();
      fetchBlogs();
      fetchPhotos();
      fetchMusic();
      fetchMessages();
    }
    fetchData();
  }, []);

  const defaultBlogs = [
    {
      id: "fermi",
      title: "Paradoks Fermi: Keheningan yang Memekakkan Telinga",
      excerpt: "Jika alam semesta ini tak terhingga luasnya dan tua usianya, di mana semua orang? Mengapa hingga saat ini kita belum menemukan satupun tanda kehidupan lain di alam semesta yang maha luas ini? Mari menjelajahi berbagai kemungkinan dari ketiadaan bukti peradaban asing.",
      imageUrl: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=800&auto=format&fit=crop"
    },
    {
      id: "attractor",
      title: "The Great Attractor: Monster Gravitasi",
      excerpt: "Kita dan seluruh galaksi Bima Sakti sedang bergerak dengan kecepatan 600 km/detik menuju sesuatu yang tidak bisa kita lihat, bersembunyi di balik debu kosmik. Apa sebenarnya anomali gravitasi raksasa yang terus menarik jutaan galaksi menuju satu titik misterius ini?",
      imageUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=800&auto=format&fit=crop"
    }
  ];

  const defaultPhotos = [
    { id: "1", src: "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=800&auto=format&fit=crop" },
    { id: "2", src: "https://images.unsplash.com/photo-1531297172868-ed80a430963c?q=80&w=800&auto=format&fit=crop" },
    { id: "3", src: "https://images.unsplash.com/photo-1481481600465-364210be895f?q=80&w=800&auto=format&fit=crop" },
    { id: "4", src: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=800&auto=format&fit=crop" },
    { id: "5", src: "https://images.unsplash.com/photo-1605810230434-7631ac76ec81?q=80&w=800&auto=format&fit=crop" },
    { id: "6", src: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=800&auto=format&fit=crop" },
  ];

  const defaultMusicCovers = [
    "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=300&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=300&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=300&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1493225457124-a1a2a5956093?q=80&w=300&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=300&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=300&auto=format&fit=crop",
  ];

  const blogsToDisplay = recentBlogs.length > 0 ? recentBlogs : defaultBlogs;
  const photosToDisplay = recentPhotos.length > 0 ? recentPhotos : defaultPhotos;

  const validateForm = () => {
    let valid = true;
    const newErrors = { name: "", email: "", message: "" };

    // Validasi Nama
    if (formData.name.trim().length < 2) {
      newErrors.name = "Name is too short (min 2 characters).";
      valid = false;
    } else if (!/^[a-zA-Z\s]+$/.test(formData.name)) {
      newErrors.name = "Name can only contain letters and spaces.";
      valid = false;
    }

    // Validasi Email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format.";
      valid = false;
    }

    // Validasi Pesan
    if (formData.message.trim().length === 0) {
      newErrors.message = "Message cannot be empty.";
      valid = false;
    } else if (formData.message.length > 500) {
      newErrors.message = `Message is too long (maximum 500 characters). Currently: ${formData.message.length}`;
      valid = false;
    } else if (/[<>]/.test(formData.message)) {
      newErrors.message = "< and > characters are not allowed for security reasons.";
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Hapus error saat user mulai mengetik ulang
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
    setIsActuallyTyping(true);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      setIsActuallyTyping(false);
    }, 1000);
  };

  const handleEmailBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value && !value.includes('@')) {
      setFormData(prev => ({ ...prev, email: `${value}@gmail.com` }));
      if (errors.email) {
        setErrors(prev => ({ ...prev, email: "" }));
      }
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      setIsSubmitting(true);
      // Simulasi pengiriman data
      setTimeout(() => {
        setIsSubmitting(false);
        setShowToast(true);
        setFormData({ name: "", email: "", message: "" });
        setTimeout(() => setShowToast(false), 3000);
      }, 1500);
    }
  };

  return (
    <>
      <SEO title="Home" description="Personal portfolio and digital garden of Irfan Rizki Aditri." url={window.location.href} />
      <PageTransition>
      <div className="w-full space-y-12 relative z-10">
        {/* Hero Section */}
        <div ref={heroRef} className="flex flex-col gap-12 justify-between items-start">
          <div className="relative flex flex-col lg:flex-row gap-8 lg:gap-12 justify-center lg:justify-between items-center lg:items-start pt-4 md:pt-8 w-full min-h-[400px]">
            
            {/* Mobile/Tablet Image (hidden on lg) */}
            <div className="flex justify-center w-full lg:hidden relative z-10 -mb-4 cursor-pointer" onClick={changeCharacterImage}>
              <div className="relative w-64 h-64 sm:w-72 sm:h-72 md:w-80 md:h-80">
                {characterImages.map((src, index) => (
                  <img 
                    key={src}
                    src={src} 
                    alt="Fanra background" 
                    className={cn(
                      "absolute inset-0 w-full h-full object-contain object-bottom origin-bottom scale-110 translate-y-[5%] transition-opacity duration-300 ease-in-out",
                      index === characterImageIndex ? "opacity-100" : "opacity-0 pointer-events-none"
                    )}
                    style={{ 
                      WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 80%, rgba(0,0,0,0) 100%)',
                      maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 80%, rgba(0,0,0,0) 100%)'
                    }}
                    loading="lazy"
                    decoding="async"
                  />
                ))}
              </div>
            </div>

            <div className="space-y-6 flex-1 flex flex-col items-center lg:items-start text-center lg:text-left relative z-10 w-full lg:max-w-2xl">
              <h1 className="text-5xl md:text-7xl font-bold font-heading tracking-tight text-slate-900 leading-tight">
                <span className="text-slate-800">Fanra</span> is here.
              </h1>
              <p className="text-lg text-slate-600 leading-relaxed max-w-2xl break-words pt-2 text-justify [text-align-last:center] lg:text-left lg:[text-align-last:left] font-display">
                Hello, I'm Irfan Rizki Aditri, usually called Fanra. I'm a Physics student at ITERA class of 2025 with a huge interest in technology and digital development. Starting from curiosity about AI bot systems, I began to delve into programming self-taught. To me, technology is a medium to create something of value. Therefore, I built this digital space as a place to document my journey, hone my skills, and leave a trail of real and useful work.
              </p>
              
              {/* Desktop Social Icons */}
              <div className="hidden lg:flex items-center space-x-6 pt-2">
                <a href="mailto:irfanrizkiaditri@gmail.com" className="opacity-60 hover:opacity-100 transition-opacity" title="Email">
                  <img src="https://cdn-icons-png.flaticon.com/128/3781/3781605.png" alt="Email" className="w-5 h-5 opacity-90" />
                </a>
                <a href="https://www.instagram.com/inewnewton?igsh=MWN1aGNobGdibDYzYw==" target="_blank" rel="noreferrer" className="opacity-60 hover:opacity-100 transition-opacity" title="Instagram">
                  <img src="https://cdn-icons-png.flaticon.com/128/717/717392.png" alt="Instagram" className="w-5 h-5 opacity-90" />
                </a>
                <a href="https://www.threads.com/@irfanrizkiaditri" target="_blank" rel="noreferrer" className="opacity-60 hover:opacity-100 transition-opacity" title="Threads">
                  <img src="https://cdn-icons-png.flaticon.com/128/12105/12105336.png" alt="Threads" className="w-5 h-5 opacity-90" />
                </a>
                <a href="https://www.linkedin.com/in/irfan-rizki-aditri-b12162368?utm_source=share_via&utm_content=profile&utm_medium=member_android" target="_blank" rel="noreferrer" className="opacity-60 hover:opacity-100 transition-opacity" title="LinkedIn">
                  <img src="https://cdn-icons-png.flaticon.com/128/3128/3128219.png" alt="LinkedIn" className="w-5 h-5 opacity-90" />
                </a>
              </div>
            </div>
            
            {/* Desktop Image (hidden below lg) */}
            <div 
              className="hidden lg:flex w-5/12 max-w-lg justify-end relative z-10 cursor-pointer"
              onClick={changeCharacterImage}
            >
              <div className="relative w-80 h-80 xl:w-[28rem] xl:h-[28rem]">
                {characterImages.map((src, index) => (
                  <img 
                    key={src}
                    src={src} 
                    alt="Fanra" 
                    className={cn(
                      "absolute inset-0 w-full h-full object-contain scale-110 xl:scale-125 origin-bottom translate-y-[5%] transition-opacity duration-300 ease-in-out",
                      index === characterImageIndex ? "opacity-100" : "opacity-0 pointer-events-none"
                    )}
                    style={{ 
                      WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 80%, rgba(0,0,0,0) 100%)',
                      maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 80%, rgba(0,0,0,0) 100%)'
                    }}
                    loading="lazy"
                    decoding="async"
                  />
                ))}
              </div>
            </div>
          </div>
          
          <div className="w-full flex flex-wrap justify-center sm:justify-between gap-x-2 gap-y-6 sm:gap-8 pt-8 border-t border-slate-200/60 mt-4">
            <div className="w-[30%] sm:w-auto flex flex-col sm:flex-row items-center text-center sm:text-left space-y-2 sm:space-y-0 sm:space-x-3">
              <img src="https://cdn-icons-png.flaticon.com/128/3068/3068380.png" alt="Physics" className="w-6 h-6 sm:w-7 sm:h-7 object-contain opacity-75 grayscale-[20%]" />
              <div className="flex flex-col justify-center">
                <h3 className="font-semibold font-heading text-slate-900 text-xs sm:text-sm leading-none tracking-tight">Physics Major</h3>
                <p className="text-slate-500 text-[10px] sm:text-xs leading-none mt-1 sm:mt-1.5">ITERA '25</p>
              </div>
            </div>

            <div className="w-[30%] sm:w-auto flex flex-col sm:flex-row items-center text-center sm:text-left space-y-2 sm:space-y-0 sm:space-x-3">
              <img src="https://cdn-icons-png.flaticon.com/128/4046/4046911.png" alt="Interests" className="w-6 h-6 sm:w-7 sm:h-7 object-contain opacity-75 grayscale-[20%]" />
              <div className="flex flex-col justify-center">
                <h3 className="font-semibold text-slate-900 text-xs sm:text-sm leading-none tracking-tight">Interests</h3>
                <p className="text-slate-500 text-[10px] sm:text-xs leading-none mt-1 sm:mt-1.5">AI & Web Dev</p>
              </div>
            </div>

            <div className="w-[30%] sm:w-auto flex flex-col sm:flex-row items-center text-center sm:text-left space-y-2 sm:space-y-0 sm:space-x-3">
              <img src="https://cdn-icons-png.flaticon.com/128/14634/14634613.png" alt="Based In" className="w-6 h-6 sm:w-7 sm:h-7 object-contain opacity-75 grayscale-[20%]" />
              <div className="flex flex-col justify-center">
                <h3 className="font-semibold text-slate-900 text-xs sm:text-sm leading-none tracking-tight">Based In</h3>
                <p className="text-slate-500 text-[10px] sm:text-xs leading-none mt-1 sm:mt-1.5">Sumatera, ID</p>
              </div>
            </div>

            <div className="w-[45%] sm:w-auto flex flex-col sm:flex-row items-center text-center sm:text-left space-y-2 sm:space-y-0 sm:space-x-3">
              <img src="https://cdn-icons-png.flaticon.com/128/7542/7542074.png" alt="Status" className="w-6 h-6 sm:w-7 sm:h-7 object-contain opacity-75 grayscale-[20%]" />
              <div className="flex flex-col justify-center">
                <h3 className="font-semibold text-slate-900 text-xs sm:text-sm leading-none tracking-tight">Status</h3>
                <p className="text-slate-500 text-[10px] sm:text-xs leading-none mt-1 sm:mt-1.5">Active Student</p>
              </div>
            </div>

            <div className="w-[45%] sm:w-auto flex flex-col sm:flex-row items-center text-center sm:text-left space-y-2 sm:space-y-0 sm:space-x-3">
              <img src="https://cdn-icons-png.flaticon.com/128/9828/9828893.png" alt="Languages" className="w-6 h-6 sm:w-7 sm:h-7 object-contain opacity-75 grayscale-[20%]" />
              <div className="flex flex-col justify-center">
                <h3 className="font-semibold text-slate-900 text-xs sm:text-sm leading-none tracking-tight">Languages</h3>
                <p className="text-slate-500 text-[10px] sm:text-xs leading-none mt-1 sm:mt-1.5">ID, EN</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bento Grid */}
        <div className="flex flex-col gap-6 pt-4">
          {/* Fanra AI / FanraTech Toggle */}
          <div className="w-full bg-white/20 backdrop-blur-xl rounded-2xl relative overflow-hidden border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-colors hover:border-white/60 group h-[480px] sm:h-[400px] lg:h-[420px]">
            <div className="grid h-full">
              <AnimatePresence initial={false} custom={featureDragDirection}>
                <motion.div
                  key={activeFeatureIndex}
                  custom={featureDragDirection}
                  initial={{ x: featureDragDirection > 0 ? "50%" : "-50%", opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: featureDragDirection > 0 ? "-50%" : "50%", opacity: 0 }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="col-start-1 row-start-1 w-full h-full"
                >
                  {(() => {
  const currentProject = featureCards[activeFeatureIndex] || {};
  return (
    <div className="flex flex-col h-full justify-between p-6 sm:p-8 lg:p-10 pb-16 sm:pb-8 lg:pb-10 relative">
      <div className="absolute right-0 top-0 bottom-0 w-full sm:w-2/3 pointer-events-none z-0" style={{ maskImage: 'linear-gradient(to right, transparent, black 80%)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 80%)' }}>
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'linear-gradient(rgba(15, 23, 42, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(15, 23, 42, 0.03) 1px, transparent 1px)', backgroundSize: '16px 16px' }}></div>
      </div>
      
      <div className="flex justify-between items-start gap-8 lg:gap-16 flex-1 relative z-10 w-full">
        <div className="max-w-lg lg:max-w-xl flex flex-col items-center sm:items-start w-full">
          <div className="flex flex-col items-center sm:flex-row sm:space-x-3 mb-4 space-y-3 sm:space-y-0 text-center sm:text-left">
            {currentProject.icon && <img src={currentProject.icon} alt={currentProject.title} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover shadow-sm border border-slate-200 pointer-events-none" />}
            <h3 className="text-2xl sm:text-3xl font-bold font-heading text-slate-900 pointer-events-none">{currentProject.title}</h3>
          </div>
          <p className="text-slate-600 text-base sm:text-lg leading-relaxed break-words text-center sm:text-left pr-0 sm:pr-12 lg:pr-0 pointer-events-none">
            {currentProject.description}
          </p>
        </div>
        
        <div className="hidden lg:flex flex-col justify-start shrink-0 pt-2">
          <div className="w-64 xl:w-80 aspect-video rounded-xl overflow-hidden bg-white/50 flex items-center justify-center border border-slate-200 shadow-sm relative group-hover:border-slate-300 transition-colors">
            <img src={contactImage || "https://res.cloudinary.com/dew39kqhy/image/upload/f_auto,q_auto/v1783234123/ChatGPT_Image_5_Jul_2026__13.47.35-removebg-preview_gztehs.png"} alt="Preview" className="w-16 h-16 opacity-10 object-contain pointer-events-none grayscale" />
          </div>
        </div>
      </div>
      
      <div className="mt-12 sm:mt-16 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 relative z-10">
        <div className="flex items-center space-x-3">
          <img src={contactImage || "https://res.cloudinary.com/dew39kqhy/image/upload/f_auto,q_auto/v1783234123/ChatGPT_Image_5_Jul_2026__13.47.35-removebg-preview_gztehs.png"} alt="Icon" className="w-6 h-6 sm:w-8 sm:h-8 object-contain pointer-events-none opacity-60" />
          <span className="text-sm font-medium text-slate-400 hidden sm:block pointer-events-none pb-1">
            Featured Project
          </span>
        </div>
        <div className="w-full sm:w-auto lg:w-64 xl:w-80 flex justify-end">
          <a 
            href={currentProject.link || currentProject.url || '#'}
            target="_blank"
            rel="noreferrer"
            onPointerDownCapture={(e) => e.stopPropagation()}
            className="bg-slate-900 text-white px-8 py-3 rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors shadow-sm w-full sm:w-auto text-center block cursor-pointer relative z-20 pointer-events-auto"
          >
            Visit
          </a>
        </div>
      </div>
    </div>
  );
})()}
                </motion.div>
              </AnimatePresence>
            </div>
            
            {/* Dots indicator */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 sm:bottom-8 sm:left-8 sm:translate-x-0 md:left-1/2 md:-translate-x-1/2 flex space-x-2 z-10">
              {featureCards.map((_, idx) => (
                <div 
                  key={idx}
                  className={cn("w-2 h-2 rounded-full transition-all duration-300", activeFeatureIndex === idx ? "bg-slate-800 w-4" : "bg-slate-300")}
                />
              ))}
            </div>
          </div>

          <div className="py-16 md:py-24 px-4 sm:px-8 text-center max-w-4xl mx-auto flex flex-col items-center justify-center">
            <h2 className="text-2xl md:text-3xl font-bold font-heading text-slate-800 mb-6 tracking-tight">Stepping Further</h2>
            <p className="text-slate-600 text-base md:text-lg leading-relaxed text-center">
              After interacting with the virtual assistant, let's enter the experiment room. A place where curiosity, programming logic, and science exploration meet through a computational approach.
            </p>
          </div>

          <div className="flex flex-col gap-16 md:gap-24 py-16 md:py-24">
            {/* The Lab */}
            <div className="w-full flex flex-col md:flex-row justify-between group px-4 sm:px-8 border-l-2 border-transparent hover:border-slate-400 transition-all duration-300">
              <div className="flex-1 md:pr-12 text-center md:text-left flex flex-col items-center md:items-start">
                <div className="flex items-center justify-center md:justify-start space-x-4 mb-4 w-full">
                  <div className="flex items-center justify-center">
                    <img src="https://cdn-icons-png.flaticon.com/128/883/883032.png" alt="The Lab" className="w-7 h-7 object-contain grayscale opacity-80" />
                  </div>
                  <h3 className="text-2xl font-bold font-heading text-slate-900">The Lab</h3>
                </div>
                <p className="break-words text-lg leading-relaxed text-slate-600">
                  Interactive experiments & advanced physics simulations. A digital space to explore concepts of quantum mechanics, thermodynamics, and science data visualization through modern computational approaches.
                </p>
              </div>
              <div className="mt-6 md:mt-0 flex-shrink-0 flex justify-center md:justify-end items-start w-full md:w-auto">
                <Link to="/lab" className="font-medium text-base inline-flex items-center space-x-3 text-slate-800 hover:underline underline-offset-4">
                  <span>Enter Lab</span>
                </Link>
              </div>
            </div>

            {/* Proyek & Tools */}
            <div className="w-full flex flex-col md:flex-row justify-between group px-4 sm:px-8 border-l-2 border-transparent hover:border-slate-400 transition-all duration-300">
              <div className="flex-1 md:pr-12 text-center md:text-left flex flex-col items-center md:items-start">
                <div className="flex items-center justify-center md:justify-start space-x-4 mb-4 w-full">
                  <div className="flex items-center justify-center">
                    <img src="https://cdn-icons-png.flaticon.com/128/1421/1421358.png" alt="Proyek" className="w-7 h-7 object-contain grayscale opacity-80" />
                  </div>
                  <h3 className="text-2xl font-bold font-heading text-slate-900">Projects & Tools</h3>
                </div>
                <p className="break-words text-lg leading-relaxed text-slate-600">
                  Digital experiments encompassing system development, interactive user interfaces, and various simple computational tools. Designing experiences that are not only functional but also leave a strong visual impression.
                </p>
              </div>
              <div className="mt-6 md:mt-0 flex-shrink-0 flex justify-center md:justify-end items-start w-full md:w-auto">
                <Link to="/projects" className="font-medium font-heading text-base inline-flex items-center space-x-3 text-slate-800 hover:underline underline-offset-4">
                  <span>View Projects</span>
                </Link>
              </div>
            </div>

            {/* Visual Diaries */}
            <div className="w-full px-4 sm:px-8">
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
                <div className="flex-1 text-center md:text-left flex flex-col items-center md:items-start">
                  <div className="flex items-center justify-center md:justify-start space-x-3 mb-4 w-full">
                    <div className="flex items-center justify-center">
                      <img src="https://cdn-icons-png.flaticon.com/128/8692/8692947.png" alt="Galeri" className="w-6 h-6 object-contain grayscale opacity-80" />
                    </div>
                    <h3 className="text-2xl font-bold font-heading text-slate-900">Visual Diaries</h3>
                  </div>
                  <p className="text-slate-600 text-lg break-words max-w-2xl">Archive of captured visual moments. A collection of amateur portraits, screenshots, and memories worth remembering and immortalizing from my perspective.</p>
                </div>
                <div className="flex-shrink-0 pb-1 mt-6 md:mt-0 w-full md:w-auto flex justify-center md:justify-end">
                  <Link to="/gallery" className="text-slate-800 font-medium inline-flex items-center hover:underline underline-offset-4">
                    <span>View Gallery</span>
                  </Link>
                </div>
              </div>
              
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 sm:gap-4 w-full">
                {photosToDisplay.map((photo, index) => (
                  <div 
                    key={photo.id || index} 
                    onClick={() => navigate('/gallery')} 
                    className="w-full aspect-square rounded-xl overflow-hidden cursor-pointer group bg-slate-100"
                  >
                    <ImageWithSkeleton src={photo.src} alt={photo.caption || "Gallery photo"} className="w-full h-full object-cover transition-opacity duration-300 opacity-90 hover:opacity-100" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="py-16 md:py-24 px-4 sm:px-8 text-center max-w-4xl mx-auto flex flex-col items-center justify-center">
            <h2 className="text-2xl md:text-3xl font-bold font-heading text-slate-800 mb-6 tracking-tight">Capturing Moments</h2>
            <p className="text-slate-600 text-base md:text-lg leading-relaxed text-center">
              Beyond the lines of code and technical experiments, there's always another side better conveyed through visual frames and harmonic notes. A form of documentation of this journey.
            </p>
          </div>

          <div className="flex flex-col gap-16 md:gap-28">
            {/* Blog Preview (Cerita Terbaru) */}
            <div className="w-full flex flex-col group px-4 sm:px-8">
              <div className="flex items-center space-x-4 mb-10">
                <div className="flex items-center justify-center">
                  <img src="https://cdn-icons-png.flaticon.com/128/10412/10412582.png" alt="Blog" className="w-7 h-7 object-contain grayscale opacity-80" />
                </div>
                <h3 className="text-2xl font-bold font-heading text-slate-900">Latest Stories</h3>
              </div>
              
              <div className="grid md:grid-cols-2 gap-10">
                {blogsToDisplay.map((post) => (
                  <div key={post.id} onClick={() => navigate(`/blog?id=${post.id}`)} className="group/blog cursor-pointer flex flex-col">
                    <div className="aspect-video w-full rounded-xl overflow-hidden mb-6 bg-slate-900/50">
                      <img 
                        src={post.image || post.imageUrl || "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=800&auto=format&fit=crop"}
                        alt={post.title} 
                        className="w-full h-full object-cover transition-opacity duration-300 opacity-90 group-hover/blog:opacity-100" 
                      />
                    </div>
                    <div className="border-l-2 border-transparent group-hover/blog:border-slate-400 pl-4 transition-all duration-300">
                      <h4 className="font-semibold text-xl mb-3 text-slate-900 font-heading">
                        {post.title}
                      </h4>
                      <p className="text-base leading-relaxed break-words text-slate-600 line-clamp-4">
                        {post.excerpt || (post.content ? post.content.substring(0, 250) + "..." : "") || "No description."}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-12 flex justify-start pl-4">
                <Link to="/blog" className="font-medium text-base inline-flex items-center space-x-3 text-slate-800 hover:underline underline-offset-4">
                  <span>Read All Posts</span>
                </Link>
              </div>
            </div>
            
            {/* Music */}
            <div className="w-full px-4 sm:px-8">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="flex items-center justify-center">
                      <img src="https://cdn-icons-png.flaticon.com/128/9240/9240687.png" alt="Musik" className="w-6 h-6 object-contain grayscale opacity-80" />
                    </div>
                    <h3 className="text-2xl font-bold font-heading text-slate-900">Playlist</h3>
                  </div>
                  <p className="text-slate-600 text-lg break-words max-w-2xl">A music playlist accompanying coding sessions and creative processes. A compilation of tunes from various genres.</p>
                </div>
                <div className="flex-shrink-0 pb-1 mt-6 md:mt-0 w-full md:w-auto flex justify-center md:justify-end">
                  <Link to="/music" className="text-slate-800 font-medium inline-flex items-center hover:underline underline-offset-4">
                    <span>Listen</span>
                  </Link>
                </div>
              </div>
              
              <style>{`
                @keyframes scroll-left {
                  0% { transform: translateX(0); }
                  100% { transform: translateX(-50%); }
                }
                .animate-scroll-left {
                  animation: scroll-left 240s linear infinite;
                }
              `}</style>
              <div 
                className="relative w-full overflow-hidden flex" 
                style={{ 
                  maskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)', 
                  WebkitMaskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)' 
                }}
              >
                <div 
                  className={cn(
                    "flex w-max animate-scroll-left hover:[animation-play-state:paused]",
                    isMusicPaused && "[animation-play-state:paused]"
                  )}
                  onMouseEnter={() => {
                    if (musicPauseTimeoutRef.current) {
                      clearTimeout(musicPauseTimeoutRef.current);
                      musicPauseTimeoutRef.current = null;
                      setIsMusicPaused(false);
                      setActiveMusicIndex(null);
                    }
                  }}
                >
                  {(() => {
                    const musicItems = recentMusic.length > 0 ? recentMusic : defaultMusicCovers.map(src => ({ coverUrl: src }));
                    // Duplicate enough times to ensure it fills wide screens
                    const displayItems = [...musicItems, ...musicItems, ...musicItems, ...musicItems, ...musicItems, ...musicItems];
                    
                    const MarqueeBlock = () => (
                      <div className="flex gap-3 sm:gap-4 pr-3 sm:pr-4">
                        {displayItems.map((track, index) => {
                          const cover = track.coverUrl || track.cover || track.image;
                          const isActive = activeMusicIndex === index;
                          return (
                            <div 
                              key={`${track.id || 'track'}-${index}`} 
                              className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0 shadow-sm border border-slate-200/50 group cursor-pointer"
                              onClick={() => handleMusicClick(index)}
                            >
                              {cover ? (
                                <ImageWithSkeleton src={cover} alt="Album Cover" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-slate-50">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-slate-300"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
                                </div>
                              )}
                              <div className={cn(
                                "absolute inset-0 bg-black/40 flex items-center justify-center p-2 backdrop-blur-sm transition-opacity duration-300",
                                isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                              )}>
                                <span className="text-[10px] sm:text-xs text-white font-medium text-center line-clamp-2 leading-tight">
                                  {track.title || track.name || 'Unknown Track'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );

                    return (
                      <>
                        <MarqueeBlock />
                        <MarqueeBlock />
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* Transition to Contact */}
          <div className="py-16 md:py-24 px-4 sm:px-8 text-center max-w-3xl mx-auto flex flex-col items-center justify-center relative z-10">
            <h2 className="text-2xl md:text-3xl font-bold font-heading text-slate-800 mb-4 tracking-tight">Let's Connect</h2>
            <p className="text-slate-600 text-base md:text-lg leading-relaxed text-center font-display">
              Have an idea, project, or just want to say hi? I'm always open to discussing new opportunities and collaborations.
            </p>
          </div>

          {/* Messages Form */}
          <div className="w-full mt-8 md:mt-12 bg-white/20 backdrop-blur-xl rounded-2xl border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col lg:flex-row relative z-10">
            
            {/* Left Image (Desktop only) */}
            <div className="hidden lg:block lg:w-[40%] relative bg-transparent">
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-slate-200/40 to-transparent z-10 pointer-events-none rounded-bl-2xl"></div>
              <div className="absolute inset-0 flex items-end justify-center pointer-events-none z-20">
                <ImageWithSkeleton src="https://res.cloudinary.com/dew39kqhy/image/upload/f_auto,q_auto/v1783252226/ChatGPT_Image_5_Jul_2026_18.50.04_ts577y.png" alt="Default Character" containerClassName="absolute bottom-0 w-[105%] h-auto max-w-none origin-bottom flex items-end justify-center" className="w-full h-auto object-bottom opacity-100 pointer-events-none" disableOverflowHidden={true} loaderType="spinner" />
                <ImageWithSkeleton src="https://res.cloudinary.com/dew39kqhy/image/upload/f_auto,q_auto/v1783252227/ChatGPT_Image_5_Jul_2026_18.49.51_olroud.png" alt="Typing Character" containerClassName={cn("absolute bottom-0 w-[105%] h-auto max-w-none origin-bottom flex items-end justify-center transition-opacity duration-300 ease-in-out pointer-events-none", (isTyping && !isActuallyTyping) ? "opacity-100" : "opacity-0")} className="w-full h-auto object-bottom" disableOverflowHidden={true} loaderType="spinner" />
                <ImageWithSkeleton src="https://res.cloudinary.com/dew39kqhy/image/upload/f_auto,q_auto/v1783257310/Gemini_Generated_Image_1cbrbr1cbrbr1cbr-remove-bg-io_ea3duv.png" alt="Actually Typing Character" containerClassName={cn("absolute bottom-0 w-[105%] h-auto max-w-none origin-bottom flex items-end justify-center transition-opacity duration-300 ease-in-out pointer-events-none", isActuallyTyping ? "opacity-100" : "opacity-0")} className="w-full h-auto object-bottom" disableOverflowHidden={true} loaderType="spinner" />
              </div>
            </div>
            {/* Right Form */}
            <div className="w-full lg:w-[60%] p-6 sm:p-8">
              <div className="flex flex-col items-center sm:flex-row sm:items-center sm:space-x-3 text-center sm:text-left mb-6 gap-3 sm:gap-0">
                <div className="flex items-center justify-center">
                  <img src="https://cdn-icons-png.flaticon.com/128/3721/3721935.png" alt="Message" className="w-6 h-6 object-contain grayscale opacity-80" />
                </div>
                <div className="flex flex-col items-center sm:items-start">
                  <h3 className="text-xl font-bold text-slate-900 font-heading">Get in Touch</h3>
                  <p className="text-slate-500 text-sm mt-1 sm:mt-0">Send a message directly to my inbox</p>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Field Name */}
                <div className="space-y-1.5">
                  <label htmlFor="name" className="block text-sm font-medium text-slate-800">Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    onFocus={() => setIsTyping(true)}
                    onBlur={() => setIsTyping(false)}
                    placeholder="Your Name"
                    className={`w-full px-4 py-2.5 bg-white/50 backdrop-blur-sm border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                      errors.name ? 'border-red-300 focus:border-red-400 focus:ring-red-200' : 'border-white/60 focus:border-white focus:ring-white/50 hover:border-white'
                    }`}
                  />
                  {errors.name && (
                    <p className="text-red-500 text-xs flex items-center mt-1">
                      <AlertCircle className="w-3 h-3 mr-1" /> {errors.name}
                    </p>
                  )}
                </div>

                {/* Field Email */}
                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-sm font-medium text-slate-800">Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    onFocus={() => setIsTyping(true)}
                    onBlur={(e) => {
                      setIsTyping(false);
                      handleEmailBlur(e);
                    }}
                    placeholder="email@domain.com"
                    className={`w-full px-4 py-2.5 bg-white/50 backdrop-blur-sm border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                      errors.email ? 'border-red-300 focus:border-red-400 focus:ring-red-200' : 'border-white/60 focus:border-white focus:ring-white/50 hover:border-white'
                    }`}
                  />
                  {errors.email && (
                    <p className="text-red-500 text-xs flex items-center mt-1">
                      <AlertCircle className="w-3 h-3 mr-1" /> {errors.email}
                    </p>
                  )}
                </div>
              </div>

              {/* Field Message */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label htmlFor="message" className="block text-sm font-medium text-slate-800">Message</label>
                  <span className={`text-xs ${formData.message.length > 500 ? 'text-red-500 font-medium' : 'text-slate-500'}`}>
                    {formData.message.length}/500
                  </span>
                </div>
                <textarea
                  id="message"
                  name="message"
                  rows={4}
                  value={formData.message}
                  onChange={handleInputChange}
                  onFocus={() => setIsTyping(true)}
                  onBlur={() => setIsTyping(false)}
                  placeholder="Write your message here..."
                  className={`w-full px-4 py-3 bg-white/50 backdrop-blur-sm border rounded-xl focus:outline-none focus:ring-2 transition-all resize-none text-xs sm:text-sm ${
                    errors.message ? 'border-red-300 focus:border-red-400 focus:ring-red-200' : 'border-white/60 focus:border-white focus:ring-white/50 hover:border-white'
                  }`}
                />
                {errors.message && (
                  <p className="text-red-500 text-xs flex items-center mt-1">
                    <AlertCircle className="w-3 h-3 mr-1" /> {errors.message}
                  </p>
                )}
              </div>

              <div className="flex justify-between items-end pt-2">
                <div className="flex items-center">
                  <img src={contactImage} alt="Logo" className="w-12 h-12 object-contain opacity-80 rounded-full" />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-white/80 text-slate-800 px-8 py-2.5 rounded-xl font-medium hover:bg-white transition-colors inline-flex items-center justify-center shadow-sm border border-white/60 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  <span>{isSubmitting ? "Sending..." : "Send Message"}</span>
                </button>
              </div>
            </form>
          </div>

        </div>

          {/* Public Wall Preview */}
          {recentPublicMessages.length > 0 && (
            <div className="w-full mt-12 mb-4">
              <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="w-4 h-4 text-slate-500" />
                  <h3 className="text-base font-semibold text-slate-800">Public Wall</h3>
                </div>
                <Link to="/contact" className="text-sm text-slate-500 hover:text-slate-800 flex items-center transition-colors">
                  View All <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Link>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-6">
                {recentPublicMessages.map((msg, index) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "bg-white/20 backdrop-blur-xl rounded-xl sm:rounded-2xl p-2.5 sm:p-4 border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-white/60 transition-colors flex flex-col min-h-[5.5rem] sm:min-h-[6rem] justify-between",
                      index >= 3 ? "hidden sm:flex" : "flex"
                    )}
                  >
                    <p className="text-[10px] sm:text-sm text-slate-700 leading-relaxed line-clamp-2 italic mb-1 sm:mb-2">
                      "{msg.content}"
                    </p>
                    <div className="flex items-center justify-between mt-auto pt-1 sm:pt-2 border-t border-slate-200/40">
                      {msg.content && msg.content.length > 75 ? (
                        <Link to="/contact" className="text-[8px] sm:text-[10px] font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap">
                          Read more
                        </Link>
                      ) : (
                        <span className="text-[8px] sm:text-[10px] text-slate-500 font-medium truncate max-w-[40px] sm:max-w-none">
                          {msg.sender === 'Anonim' ? 'Anonymous' : (msg.sender || 'Anonymous')}
                        </span>
                      )}
                      {msg.timestamp && (
                        <span className="text-[8px] sm:text-[10px] text-slate-400 whitespace-nowrap">
                          {format(new Date(msg.timestamp), 'dd MMM yy')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 50, x: "-50%" }}
            className="fixed bottom-6 left-1/2 z-50 bg-white/90 backdrop-blur-md border border-slate-200 shadow-lg rounded-full px-4 py-2 flex items-center space-x-2"
          >
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-xs font-medium text-slate-700">Message sent</span>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
    </>
  );
}
