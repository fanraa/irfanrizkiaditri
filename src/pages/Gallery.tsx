import { ImageWithSkeleton } from "@/components/ImageWithSkeleton";
import React from 'react';
import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  updateDoc,
  increment,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
  addDoc,
  deleteDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PageTransition } from "@/components/PageTransition";
import { Heart, Loader2, Share2, Download, Plus, X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SEO } from "@/components/SEO";
import { format } from "date-fns";
import { useAuth } from "@/context/AuthContext";

interface Photo {
  id: string;
  src: string;
  caption: string;
  likes: number;
  timestamp: number;
}

// A component that only scrolls text if it overflows
function AutoMarqueeText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        setIsOverflowing(
          textRef.current.scrollWidth > containerRef.current.clientWidth,
        );
      }
    };
    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, [text]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full overflow-hidden whitespace-nowrap",
        isOverflowing && "mask-fade-edges",
        className,
      )}
    >
      <div className={cn("inline-block", isOverflowing && "animate-marquee")}>
        <span
          ref={textRef}
          className={cn(
            "font-medium drop-shadow-md pr-8",
            className || "text-sm",
          )}
        >
          {text}
        </span>
        {isOverflowing && (
          <span
            className={cn("font-medium drop-shadow-md", className || "text-sm")}
          >
            {text}
          </span>
        )}
      </div>
    </div>
  );
}

export function Gallery() {
  const { isAdmin } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const ITEMS_PER_PAGE = 9;

  const [likedPhotos, setLikedPhotos] = useState<string[]>([]);

  // Add Photo State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPhotoCaption, setNewPhotoCaption] = useState("");
  const [newPhotoMonth, setNewPhotoMonth] = useState(new Date().getMonth());
  const [isAdding, setIsAdding] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [photoToDelete, setPhotoToDelete] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const resizeAndCompressImage = (file: File, maxWidth = 1000): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          
          let width = img.width;
          let height = img.height;
          
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          ctx?.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
          resolve(dataUrl);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  // Lightbox state
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);

  const overlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetOverlayTimer = useCallback(() => {
    setShowOverlay(true);
    if (overlayTimeoutRef.current) {
      clearTimeout(overlayTimeoutRef.current);
    }
    // overlayTimeoutRef.current = setTimeout(() => {
    //   setShowOverlay(false);
    // }, 1500);
  }, []);

  useEffect(() => {
    if (selectedIndex !== null) {
      resetOverlayTimer();
    } else {
      if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current);
    }
    return () => {
      if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current);
    };
  }, [selectedIndex, resetOverlayTimer]);

  useEffect(() => {
    const storedLikes = localStorage.getItem("gallery_likes");
    if (storedLikes) {
      try {
        setLikedPhotos(JSON.parse(storedLikes));
      } catch (e) {
        console.error("Error parsing stored likes", e);
      }
    }

    async function fetchPhotos() {
      try {
        const q = query(
          collection(db, "gallery_photos_production"),
          orderBy("timestamp", "desc"),
          limit(ITEMS_PER_PAGE)
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Photo[];
        setPhotos(data);
        if (snapshot.docs.length > 0) {
          setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        }
        if (snapshot.docs.length < ITEMS_PER_PAGE) {
          setHasMore(false);
        }
      } catch (error) {
        console.error("Error fetching photos:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchPhotos();
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !lastVisible) return;
    setLoadingMore(true);
    try {
      const q = query(
        collection(db, "gallery_photos_production"),
        orderBy("timestamp", "desc"),
        startAfter(lastVisible),
        limit(ITEMS_PER_PAGE)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Photo[];
      
      setPhotos(prev => [...prev, ...data]);
      
      if (snapshot.docs.length > 0) {
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
      }
      if (snapshot.docs.length < ITEMS_PER_PAGE) {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error loading more photos:", error);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, lastVisible]);


  // Block scroll when lightbox is open
  useEffect(() => {
    if (selectedIndex !== null) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [selectedIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedIndex === null) return;
      if (e.key === "ArrowLeft") {
        navigate(-1);
      } else if (e.key === "ArrowRight") {
        navigate(1);
      } else if (e.key === "Escape") {
        closePhoto();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, photos.length]);

  const navigate = (dir: number) => {
    if (selectedIndex === null) return;
    let nextIndex = selectedIndex + dir;
    if (nextIndex < 0) nextIndex = photos.length - 1;
    if (nextIndex >= photos.length) nextIndex = 0;
    setSelectedIndex(nextIndex);
  };

  const handleAddPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !newPhotoCaption) return;
    
    setIsAdding(true);
    try {
      const year = new Date().getFullYear();
      const date = new Date(year, newPhotoMonth, 15);
      
      const compressedImageBase64 = await resizeAndCompressImage(selectedFile);
      
      const formData = new FormData();
      formData.append("file", compressedImageBase64);
      formData.append("upload_preset", "fanra_upload"); 
      
      let imageUrl = compressedImageBase64;
      try {
        const res = await fetch("https://api.cloudinary.com/v1_1/dew39kqhy/image/upload", {
          method: "POST",
          body: formData,
        });
        if (res.ok) {
          const data = await res.json();
          imageUrl = data.secure_url;
        } else {
          console.error("Cloudinary error", await res.text());
          throw new Error("Gagal upload ke Cloudinary");
        }
      } catch (err) {
        console.error(err);
        alert("Gagal upload ke Cloudinary. Pastikan Anda sudah membuat upload preset 'fanra_upload' (Unsigned) di Settings Cloudinary Anda.");
        throw err;
      }
      
      const docRef = await addDoc(collection(db, "gallery_photos_production"), {
        src: imageUrl,
        caption: newPhotoCaption,
        likes: 0,
        timestamp: date.getTime()
      });
      
      const newPhoto: Photo = {
        id: docRef.id,
        src: imageUrl,
        caption: newPhotoCaption,
        likes: 0,
        timestamp: date.getTime()
      };
      
      setPhotos(prev => [newPhoto, ...prev]);
      setSelectedFile(null);
      setImagePreview(null);
      setNewPhotoCaption("");
      setShowAddForm(false);
    } catch (error) {
      console.error("Error adding photo:", error);
      alert("Terjadi kesalahan saat mengunggah foto.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeletePhoto = async (e: React.MouseEvent, photoId: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, "gallery_photos_production", photoId));
      setPhotos(prev => prev.filter(p => p.id !== photoId));
      setPhotoToDelete(null);
      if (selectedIndex !== null && photos[selectedIndex]?.id === photoId) {
        closePhoto();
      }
    } catch (error) {
      console.error("Error deleting photo:", error);
    }
  };

  const handleLike = async (e: React.MouseEvent, photoId: string) => {
    e.preventDefault();
    e.stopPropagation();
    resetOverlayTimer();

    if (likedPhotos.includes(photoId)) return;

    // Optimistic update
    setLikedPhotos((prev) => {
      const newLikes = [...prev, photoId];
      localStorage.setItem("gallery_likes", JSON.stringify(newLikes));
      return newLikes;
    });

    setPhotos((prev) =>
      prev.map((p) =>
        p.id === photoId ? { ...p, likes: (p.likes || 0) + 1 } : p,
      ),
    );

    try {
      const docRef = doc(db, "gallery_photos_production", photoId);
      await updateDoc(docRef, {
        likes: increment(1),
      });
    } catch (error) {
      console.error("Error liking photo:", error);
    }
  };

  const handleShare = async (
    e: React.MouseEvent,
    url: string,
    caption?: string,
  ) => {
    e.stopPropagation();
    resetOverlayTimer();
    if (navigator.share) {
      try {
        await navigator.share({
          title: caption || "Gallery Photo",
          url: url,
        });
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          fallbackCopy(url);
        }
      }
    } else {
      fallbackCopy(url);
    }
  };

  const fallbackCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      alert("Tautan disalin ke clipboard!");
    } catch (error) {
      console.error("Failed to copy link", error);
    }
  };

  const handleDownload = async (
    e: React.MouseEvent,
    url: string,
    caption: string,
  ) => {
    e.stopPropagation();
    resetOverlayTimer();
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = caption
        ? `${caption.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.jpg`
        : "gallery-photo.jpg";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Failed to download image", error);
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.download = caption
        ? `${caption.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.jpg`
        : "gallery-photo.jpg";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const openPhoto = (index: number) => {
    setSelectedIndex(index);
  };

  const closePhoto = () => {
    setSelectedIndex(null);
  };

  // Touch handlers for swipe
  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // Prevent default to avoid scrolling on some devices if needed
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const dx = touchEndX - touchStartX.current;

    if (Math.abs(dx) > 50) {
      if (dx > 0)
        navigate(-1); // Swipe right -> prev
      else navigate(1); // Swipe left -> next
    }
    touchStartX.current = null;
  };

  const selectedPhoto = selectedIndex !== null ? photos[selectedIndex] : null;

  return (
    <>
      <SEO title="Gallery" description="Visual Diaries of Irfan Rizki Aditri." url={window.location.href} />
      <PageTransition>
      <div className="w-full space-y-8 pt-16 sm:pt-20 pb-16">
        <header className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold font-heading tracking-tight text-slate-900">
                Gallery
              </h1>
              <p className="text-slate-600">
                A collection of moments and visual projects.
              </p>
            </div>
            {isAdmin && (
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="p-2 sm:px-4 sm:py-2 bg-white/40 backdrop-blur-md border border-slate-200/50 text-slate-800 rounded-full sm:rounded-xl hover:bg-white/60 transition-colors flex items-center gap-2 shadow-sm font-display text-sm"
              >
                {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                <span className="hidden sm:inline">{showAddForm ? "Cancel" : "Add Photo"}</span>
              </button>
            )}
          </div>
          
          {isAdmin && showAddForm && (
            <form onSubmit={handleAddPhoto} className="bg-white/30 backdrop-blur-xl border border-white/50 p-4 sm:p-5 rounded-2xl shadow-sm space-y-4 animate-in fade-in slide-in-from-top-4 duration-300 font-display text-sm">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Image File</label>
                  <input
                    type="file"
                    accept="image/*"
                    required
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white/40 border border-white/50 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-white/60 file:text-slate-700 hover:file:bg-white/80 cursor-pointer"
                  />
                  {imagePreview && (
                    <div className="mt-3 relative w-full h-32 rounded-xl overflow-hidden border border-white/50 bg-black/5">
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Caption</label>
                  <input
                    type="text"
                    required
                    value={newPhotoCaption}
                    onChange={(e) => setNewPhotoCaption(e.target.value)}
                    placeholder="A short description..."
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white/40 border border-white/50 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Month</label>
                  <select
                    value={newPhotoMonth}
                    onChange={(e) => setNewPhotoMonth(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white/40 border border-white/50 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all"
                  >
                    {Array.from({ length: 12 }).map((_, i) => {
                      const date = new Date(2000, i, 1);
                      return (
                        <option key={i} value={i}>
                          {format(date, "MMMM")}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
              <button
                type="submit"
                disabled={isAdding || !selectedFile}
                className="w-full py-2 bg-white/50 backdrop-blur-md border border-white/60 text-slate-800 text-xs font-bold rounded-xl hover:bg-white/70 transition-colors disabled:opacity-50 flex justify-center items-center gap-2 shadow-sm"
              >
                {isAdding && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {isAdding ? "Uploading..." : "Upload Photo"}
              </button>
            </form>
          )}
        </header>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-slate-900" />
          </div>
        ) : photos.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
            <p className="text-slate-500">No photos uploaded yet.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {photos.map((photo, index) => (
                <div
                key={photo.id}
                onClick={() => openPhoto(index)}
                className="group relative cursor-pointer overflow-hidden rounded-xl bg-slate-100 shadow-sm border border-slate-200/50 aspect-square"
              >
                {photo.src ? (
                  <ImageWithSkeleton
                    src={photo.src}
                    alt={photo.caption || "Gallery photo"}
                    className="w-full h-full object-cover transition-transform duration-700"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    No Image
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between pointer-events-none">
                  <div className="flex justify-end p-3 gap-2 pointer-events-auto">
                    {isAdmin && (
                      photoToDelete === photo.id ? (
                        <div className="flex items-center gap-2 bg-white/30 backdrop-blur-md px-2 py-1 rounded-full text-xs font-display font-bold shadow-sm">
                          <button
                            onClick={(e) => handleDeletePhoto(e, photo.id)}
                            className="text-red-600 hover:text-red-800 transition-colors px-1"
                          >
                            Yes
                          </button>
                          <span className="text-slate-400">/</span>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setPhotoToDelete(null);
                            }}
                            className="text-slate-700 hover:text-slate-900 transition-colors px-1"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setPhotoToDelete(photo.id);
                          }}
                          className="p-2 text-white hover:text-red-400 transition-colors drop-shadow-md"
                          aria-label="Delete photo"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                      )
                    )}
                    <button
                      onClick={(e) => handleShare(e, photo.src, photo.caption)}
                      className="p-2 text-white hover:text-white/80 transition-colors drop-shadow-md"
                      aria-label="Share photo"
                      title="Share"
                    >
                      <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                    <button
                      onClick={(e) =>
                        handleDownload(e, photo.src, photo.caption)
                      }
                      className="p-2 text-white hover:text-white/80 transition-colors drop-shadow-md"
                      aria-label="Download photo"
                      title="Download"
                    >
                      <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>

                  <div className="p-4 w-full flex justify-between items-end gap-3 text-white pointer-events-auto">
                    <div className="flex flex-col overflow-hidden w-full">
                      {photo.timestamp && (
                        <span className="text-[10px] sm:text-xs text-white/80 font-medium tracking-wide mb-1 drop-shadow-sm uppercase">
                          {format(new Date(photo.timestamp), "MMMM yyyy")}
                        </span>
                      )}

                      <AutoMarqueeText text={photo.caption || "Untitled"} />
                    </div>
                    <button
                      onClick={(e) => handleLike(e, photo.id)}
                      disabled={likedPhotos.includes(photo.id)}
                      className={cn(
                        "flex flex-col items-center shrink-0 transition-colors group/like disabled:cursor-not-allowed",
                        likedPhotos.includes(photo.id)
                          ? "text-red-500"
                          : "text-white hover:text-red-400",
                      )}
                      aria-label="Like photo"
                    >
                      <Heart
                        className={cn(
                          "w-5 h-5 transition-transform group-active/like:scale-90 drop-shadow-md",
                          likedPhotos.includes(photo.id) &&
                            "fill-current text-red-500",
                        )}
                      />
                      <span className="text-[10px] sm:text-xs font-semibold drop-shadow-md mt-0.5">
                        {photo.likes || 0}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
            {/* Load More Button */}
            {hasMore && (
              <div className="flex justify-center pt-8 pb-4">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 px-4 py-2 transition-all font-bold text-xs disabled:opacity-50"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Loading...</span>
                    </>
                  ) : (
                    <span>Load More</span>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Lightbox Modal */}
      {selectedPhoto && createPortal(
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-white p-4 sm:p-8"
          onClick={closePhoto}
        >
          <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden">
            
            <div className="relative flex flex-col items-center justify-center w-full max-w-[90vw] sm:max-w-[80vw]">
              <ImageWithSkeleton
                src={selectedPhoto.src}
                alt={selectedPhoto.caption || "Gallery preview"}
                className="max-w-full max-h-[60vh] sm:max-h-[65vh] object-contain select-none cursor-pointer rounded-lg shadow-xl"
                draggable={false}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowOverlay(prev => !prev);
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              />

              {/* UI controls below the image */}
              <div 
                className={cn(
                  "w-full flex flex-col pt-4 sm:pt-6 transition-opacity duration-500",
                  showOverlay ? "opacity-100" : "opacity-0"
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex flex-col sm:flex-row justify-between items-center sm:items-end w-full gap-3 sm:gap-4">
                  <div className="flex flex-col overflow-hidden w-full items-center sm:items-start text-center sm:text-left font-display">
                    {/* Desktop layout */}
                    <div className="hidden sm:flex flex-col">
                      {selectedPhoto.timestamp && (
                        <span className="text-xs text-slate-500 font-bold tracking-wide mb-1 uppercase">
                          {format(new Date(selectedPhoto.timestamp), "MMMM yyyy")}
                        </span>
                      )}
                      <AutoMarqueeText
                        text={selectedPhoto.caption || "Untitled"}
                        className="text-sm text-slate-900 font-bold leading-snug"
                      />
                    </div>
                    
                    {/* Mobile layout */}
                    <div className="sm:hidden text-xs text-slate-900 font-bold leading-snug text-center">
                      {selectedPhoto.timestamp && (
                         <span className="text-slate-500 font-normal mr-1">({format(new Date(selectedPhoto.timestamp), "MMMM yyyy")})</span>
                      )}
                      {selectedPhoto.caption || "Untitled"}
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-3 sm:gap-4 shrink-0 text-slate-600 self-center sm:self-end w-full sm:w-auto">
                    <button
                      onClick={(e) => handleLike(e, selectedPhoto.id)}
                      disabled={likedPhotos.includes(selectedPhoto.id)}
                      className={cn(
                        "hover:text-slate-900 transition-colors disabled:cursor-not-allowed flex items-center gap-1",
                        likedPhotos.includes(selectedPhoto.id) ? "text-red-500" : "hover:text-red-400"
                      )}
                    >
                      <Heart className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", likedPhotos.includes(selectedPhoto.id) && "fill-current")} />
                      <span className="text-[10px] sm:text-xs font-bold font-display">{selectedPhoto.likes || 0}</span>
                    </button>
                    
                    <button
                      onClick={(e) => handleShare(e, selectedPhoto.src, selectedPhoto.caption)}
                      className="hover:text-slate-900 transition-colors"
                      title="Share"
                    >
                      <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                    
                    <button
                      onClick={(e) => handleDownload(e, selectedPhoto.src, selectedPhoto.caption)}
                      className="hover:text-slate-900 transition-colors"
                      title="Download"
                    >
                      <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                    
                    {isAdmin && (
                      photoToDelete === selectedPhoto.id ? (
                         <div className="flex items-center gap-2 bg-red-50/80 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-display font-bold ml-1">
                           <button onClick={(e) => handleDeletePhoto(e, selectedPhoto.id)} className="text-red-600 hover:text-red-800 transition-colors">Yes</button>
                           <span className="text-red-300">/</span>
                           <button onClick={(e) => setPhotoToDelete(null)} className="text-slate-500 hover:text-slate-800 transition-colors">Cancel</button>
                         </div>
                      ) : (
                        <button
                          onClick={(e) => setPhotoToDelete(selectedPhoto.id)}
                          className="text-slate-400 hover:text-red-500 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>

            <p
              className={cn(
                "absolute bottom-4 sm:bottom-8 text-[10px] sm:text-xs text-slate-400 font-medium pointer-events-none transition-opacity duration-500 select-none font-display",
                showOverlay ? "opacity-100" : "opacity-0"
              )}
            >
              Click outside to close
            </p>
          </div>
        </div>,
        document.body
      )}
    </PageTransition>
    </>
  );
}
