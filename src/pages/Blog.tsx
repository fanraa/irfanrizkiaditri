import { ImageWithSkeleton } from "@/components/ImageWithSkeleton";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { collection, getDocs, doc, updateDoc, increment, query, orderBy, limit, startAfter, QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PageTransition } from "@/components/PageTransition";
import { format } from "date-fns";
import { FileText, Loader2, ArrowLeft, Eye, Share2 } from "lucide-react";
import { SEO } from "@/components/SEO";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";

const StarryBackground = () => {
  const stars = React.useMemo(() => {
    return Array.from({ length: 45 }).map((_, i) => {
      const isTwinkling = Math.random() > 0.8;
      return {
        id: i,
        baseSize: isTwinkling ? (Math.random() * 2 + 2 + 'px') : (Math.random() * 1.5 + 0.5 + 'px'),
        left: Math.random() * 100 + '%',
        top: Math.random() * 100 + '%',
        baseOpacity: Math.random() * 0.15 + 0.05,
        targetOpacity: isTwinkling ? Math.random() * 0.5 + 0.5 : 0,
        duration: isTwinkling ? Math.random() * 5 + 4 : 0,
        delay: Math.random() * 8,
        isTwinkling
      };
    });
  }, []);

  const shootingStars = React.useMemo(() => {
    return Array.from({ length: 3 }).map((_, i) => ({
      id: `shoot-${i}`,
      top: Math.random() * -20 + '%',
      left: Math.random() * 50 + '%',
      delay: Math.random() * 15,
      duration: Math.random() * 1 + 1.2,
    }));
  }, []);

  const flareSvg = `url("data:image/svg+xml,%3Csvg viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M12 0C12 8 16 12 24 12C16 12 12 16 12 24C12 16 8 12 0 12C8 12 12 8 12 0Z' fill='white' /%3E%3C/svg%3E")`;

  return (
    <div className="absolute inset-x-0 top-0 h-[600px] pointer-events-none z-0 overflow-hidden">
      {stars.map((star) => (
        <motion.div
          key={star.id}
          className="absolute"
          style={{
            width: star.baseSize,
            height: star.baseSize,
            left: star.left,
            top: star.top,
            opacity: star.isTwinkling ? 0 : star.baseOpacity,
            backgroundImage: star.isTwinkling ? flareSvg : 'none',
            backgroundColor: star.isTwinkling ? 'transparent' : 'white',
            borderRadius: star.isTwinkling ? '0' : '50%',
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
          }}
          {...(star.isTwinkling ? {
            animate: {
              opacity: [0, star.targetOpacity, 0],
              scale: [0.2, 1.2, 0.2],
              rotate: [0, 45, 90]
            },
            transition: {
              duration: star.duration,
              repeat: Infinity,
              ease: "easeInOut",
              delay: star.delay,
            }
          } : {})}
        />
      ))}
      {shootingStars.map((star) => (
        <motion.div
          key={star.id}
          className="absolute w-[100px] h-[2px] bg-gradient-to-r from-transparent via-white to-transparent"
          style={{ 
            top: star.top, 
            left: star.left, 
            opacity: 0,
            transformOrigin: "left center",
            rotate: 45
          }}
          animate={{
            x: [0, 800],
            y: [0, 800],
            opacity: [0, 1, 0],
            scale: [0, 1.5, 0]
          }}
          transition={{
            duration: star.duration,
            repeat: Infinity,
            delay: star.delay,
            ease: "easeOut"
          }}
        />
      ))}
    </div>
  );
};

interface BlogPost {
  id: string;
  title?: string;
  excerpt?: string;
  content?: string;
  timestamp?: number;
  createdAt?: number;
  image?: string;
  imageUrl?: string;
  date?: string;
  imageSource?: string;
  image_source?: string;
  source?: string;
  credit?: string;
  credits?: string;
  views?: number;
}

export function Blog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);

  const [loadingMore, setLoadingMore] = useState(false);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const ITEMS_PER_PAGE = 6;

  useEffect(() => {
    async function fetchPosts() {
      try {
        const q = query(
          collection(db, "blog_posts_production"),
          orderBy("timestamp", "desc"),
          limit(ITEMS_PER_PAGE)
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as BlogPost[];
        
        data.sort((a, b) => {
          const timeA = a.timestamp || a.createdAt || (a.date ? new Date(a.date).getTime() : 0);
          const timeB = b.timestamp || b.createdAt || (b.date ? new Date(b.date).getTime() : 0);
          return timeB - timeA;
        });
        
        setPosts(data);
        if (snapshot.docs.length > 0) {
          setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        }
        if (snapshot.docs.length < ITEMS_PER_PAGE) {
          setHasMore(false);
        }
      } catch (err) {
        console.error("Failed to fetch posts:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPosts();
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !lastVisible) return;
    setLoadingMore(true);
    try {
      const q = query(
        collection(db, "blog_posts_production"),
        orderBy("timestamp", "desc"),
        startAfter(lastVisible),
        limit(ITEMS_PER_PAGE)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as BlogPost[];
      
      data.sort((a, b) => {
        const timeA = a.timestamp || a.createdAt || (a.date ? new Date(a.date).getTime() : 0);
        const timeB = b.timestamp || b.createdAt || (b.date ? new Date(b.date).getTime() : 0);
        return timeB - timeA;
      });

      setPosts(prev => [...prev, ...data]);
      
      if (snapshot.docs.length > 0) {
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
      }
      if (snapshot.docs.length < ITEMS_PER_PAGE) {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error loading more posts:", error);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, lastVisible]);


  // Sync selected post with URL param
  useEffect(() => {
    const postId = searchParams.get("post");
    if (postId && posts.length > 0) {
      const found = posts.find(p => p.id === postId);
      if (found) {
        setSelectedPost(found);
      } else {
        setSelectedPost(null);
      }
    } else if (!postId) {
      setSelectedPost(null);
    }
  }, [searchParams, posts]);

  const handleOpenPost = async (post: BlogPost) => {
    setSelectedPost(post);
    setSearchParams({ post: post.id });
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Increment view count
    try {
      const postRef = doc(db, "blog_posts_production", post.id);
      await updateDoc(postRef, {
        views: increment(1)
      });
      setPosts(prev => prev.map(p => {
        if (p.id === post.id) {
          return { ...p, views: (p.views || 0) + 1 };
        }
        return p;
      }));
    } catch (err) {
      console.log("Error incrementing views", err);
    }
  };

  const handleClosePost = () => {
    setSelectedPost(null);
    setSearchParams({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const formatDate = (post: BlogPost) => {
    try {
      if (post.date) return format(new Date(post.date), "dd MMM yyyy");
      if (post.timestamp) return format(new Date(post.timestamp), "dd MMM yyyy");
      if (post.createdAt) return format(new Date(post.createdAt), "dd MMM yyyy");
    } catch (e) {}
    return "Unknown Date";
  };

  const getReadTime = (content?: string) => {
    if (!content) return "1 min read";
    const words = content.trim().split(/\s+/).length;
    const minutes = Math.ceil(words / 200);
    return `${minutes} min read`;
  };

  const handleShare = async () => {
    if (!selectedPost) return;
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: selectedPost.title,
          text: selectedPost.excerpt,
          url: url,
        });
      } catch (err) {
        console.log("Error sharing:", err);
      }
    } else {
      navigator.clipboard.writeText(url);
      alert("Link copied to clipboard!");
    }
  };

  return (
    <>
      <SEO title={selectedPost ? selectedPost.title || "Blog Post" : "Blog"} description={selectedPost ? selectedPost.excerpt : "Read my latest articles, stories, and thoughts."} url={window.location.href} />
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-72px] inset-x-0 h-[600px] bg-slate-950 z-0 pointer-events-none" style={{ maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)' }}><StarryBackground /></div>
      </div>
      <PageTransition>
      <div className="w-full space-y-12 pt-8 sm:pt-16 pb-16 relative z-10 max-w-4xl mx-auto">
        <AnimatePresence mode="wait">
          {selectedPost ? (
            // Full Article Reader View
            <motion.div
              key="article-reader"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-[2.5rem] shadow-[0_8px_32px_rgba(0,0,0,0.04)] px-5 py-8 sm:px-10 sm:py-12"
            >
              <button
                onClick={handleClosePost}
                className="inline-flex items-center space-x-2 text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-6 group cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                <span>Back to Blog</span>
              </button>
              
              <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 leading-tight mb-3 font-heading">
                {selectedPost.title}
              </h1>
              
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div className="flex flex-wrap gap-x-4 gap-y-1 items-center text-[11px] sm:text-xs text-slate-500 font-medium">
                  <span>{formatDate(selectedPost)}</span>
                  <span>{getReadTime(selectedPost.content)}</span>
                  <span>Article</span>
                  <div className="flex items-center space-x-1.5" title="View count">
                    <Eye className="w-3.5 h-3.5" />
                    <span>{selectedPost.views || 0}</span>
                  </div>
                </div>
                <button
                  onClick={handleShare}
                  className="text-slate-500 hover:text-slate-600 transition-colors cursor-pointer"
                  title="Share Article"
                >
                  <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
              
              {(selectedPost.image || selectedPost.imageUrl) && (
                <div className="mb-8">
                  <div className="w-full aspect-video sm:aspect-[21/10] rounded-2xl overflow-hidden bg-white/5 shadow-sm">
                    <ImageWithSkeleton
                      src={selectedPost.image || selectedPost.imageUrl}
                      alt={selectedPost.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {(selectedPost.imageSource || selectedPost.image_source || selectedPost.source || selectedPost.credit || selectedPost.credits) && (
                    <p className="text-[10px] sm:text-[11px] text-slate-500 mt-2 text-center italic">
                      Source: {selectedPost.imageSource || selectedPost.image_source || selectedPost.source || selectedPost.credit || selectedPost.credits}
                    </p>
                  )}
                </div>
              )}
              
              <div className="text-slate-500 text-sm sm:text-base leading-relaxed break-words pb-10 border-b border-slate-200">
                {selectedPost.content ? (
                  selectedPost.content.split(/\n\s*\n/).map((paragraph, index) => {
                    if (!paragraph.trim()) return null;
                    return (
                      <p key={index} className="indent-0 text-justify mb-4 sm:mb-5 break-inside-avoid" style={{ textAlign: "justify" }}>
                        {paragraph.split('\n').map((line, lIdx, arr) => (
                          <span key={lIdx}>
                            {line}
                            {lIdx < arr.length - 1 && <br />}
                          </span>
                        ))}
                      </p>
                    );
                  })
                ) : (
                  <p className="italic text-slate-500">Content not available.</p>
                )}
              </div>
              
              {posts.filter(p => p.id !== selectedPost.id).length > 0 && (
                <div className="mt-10">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-5">
                    More Recommended Readings
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {posts
                      .filter(p => p.id !== selectedPost.id)
                      .slice(0, 2)
                      .map(other => (
                        <div
                          key={other.id}
                          onClick={() => handleOpenPost(other)}
                          className="group cursor-pointer flex gap-3 p-3 bg-white border border-slate-100 rounded-xl hover:border-slate-200 transition-all hover:shadow-md items-center"
                        >
                          {(other.image || other.imageUrl) && (
                            <div className="w-16 h-12 sm:w-20 sm:h-14 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                              <ImageWithSkeleton
                                src={other.image || other.imageUrl}
                                alt={other.title}
                                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                              />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] text-slate-500 block mb-0.5">
                              {formatDate(other)}
                            </span>
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-1 group-hover:text-slate-600 transition-colors">
                              {other.title}
                            </h4>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            // Blog List View
            <motion.div
              key="blog-list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <header className="space-y-4 max-w-2xl mb-12">
                <h1 className="text-3xl sm:text-4xl font-bold font-heading tracking-tight text-white">
                  Blog
                </h1>
                <p className="text-white/80 text-sm sm:text-base leading-relaxed">
                  My thoughts, stories, and explorations in life, tech, and the universe.
                </p>
              </header>

              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-white/50" />
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No posts published yet.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {posts.map(post => {
                    const postExcerpt = post.excerpt || post.content || "No content preview available.";
                    return (
                      <article 
                        key={post.id} 
                        onClick={() => handleOpenPost(post)}
                        className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100 transition-all hover:shadow-md hover:border-slate-200 cursor-pointer break-words overflow-hidden flex flex-col sm:flex-row gap-4 sm:gap-6 items-stretch group"
                      >
                        {(post.image || post.imageUrl) && (
                          <div className="w-full sm:w-40 md:w-48 aspect-video sm:aspect-[4/3] rounded-xl overflow-hidden bg-white/5 flex-shrink-0 transition-transform duration-300 group-hover:scale-[1.01] self-start sm:self-center">
                            <ImageWithSkeleton
                              src={post.image || post.imageUrl}
                              alt={post.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1 w-full flex flex-col justify-between py-1">
                          <div>
                            <div className="flex items-center space-x-3 text-[10px] sm:text-xs font-medium text-slate-500 mb-1">
                              <time>{formatDate(post)}</time>
                              <span>{getReadTime(post.content)}</span>
                              <div className="flex items-center space-x-1">
                                <Eye className="w-3 h-3" />
                                <span>{post.views || 0}</span>
                              </div>
                            </div>
                            <h2 className="text-sm sm:text-base font-bold text-slate-900 mb-1.5 leading-snug hover:text-slate-600 transition-colors group-hover:text-slate-800">
                              {post.title || "Untitled Post"}
                            </h2>
                            <p className="text-slate-600 text-xs sm:text-sm leading-relaxed mb-3 line-clamp-2">
                              {postExcerpt}
                            </p>
                          </div>
                          <div className="text-slate-800 font-semibold text-xs sm:text-sm group-hover:underline cursor-pointer inline-flex items-center mt-auto">
                            Read article
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
              
              {/* Load More Button */}
              {!selectedPost && hasMore && posts.length > 0 && (
                <div className="flex justify-center pt-8 pb-4">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="flex items-center space-x-2 bg-white hover:bg-slate-50 text-black px-6 py-2.5 rounded-full border border-slate-200 transition-all font-bold text-sm disabled:opacity-50 shadow-md hover:shadow-lg"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Memuat...</span>
                      </>
                    ) : (
                      <span>Muat Lebih Banyak</span>
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      </PageTransition>
    </>
  );
}
