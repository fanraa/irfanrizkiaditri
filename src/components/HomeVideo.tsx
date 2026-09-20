import React, { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface HomeVideoProps {
  src?: string;
  poster?: string;
  className?: string;
  fullBleed?: boolean;
}

// Optimized video stream via Cloudinary auto-format (WebM/AV1/MP4) & perceptual smart compression
const DEFAULT_VIDEO_SRC =
  "https://res.cloudinary.com/dew39kqhy/video/upload/f_auto,q_auto:good,vc_auto/v1789489931/gemini_generated_video_2d21d504_lxqp6u.mp4";

// High-res instant poster snapshot from the first frame for instantaneous zero-lag paint
const DEFAULT_POSTER_SRC =
  "https://res.cloudinary.com/dew39kqhy/video/upload/f_auto,q_auto:good,so_0,w_1400/v1789489931/gemini_generated_video_2d21d504_lxqp6u.jpg";

export function HomeVideo({
  src = DEFAULT_VIDEO_SRC,
  poster = DEFAULT_POSTER_SRC,
  className,
  fullBleed = false,
}: HomeVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Ensure muted for smooth auto-play compliance
    video.muted = true;

    // IntersectionObserver: Only decode and play when visible in viewport (prevents GPU/CPU lag)
    let observer: IntersectionObserver | null = null;
    if ("IntersectionObserver" in window && containerRef.current) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              video.play().catch(() => {});
            } else {
              video.pause();
            }
          });
        },
        { threshold: 0.1 }
      );
      observer.observe(containerRef.current);
    } else {
      video.play().catch(() => {});
    }

    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full overflow-hidden pointer-events-none select-none",
        fullBleed && "w-screen max-w-[100vw] relative left-1/2 -translate-x-1/2",
        className
      )}
    >
      {/* Background Video: Edge-to-edge full width, top flush with 0 gradient/empty space */}
      <div
        className="relative w-full h-[280px] sm:h-[380px] md:h-[480px] lg:h-[540px] flex items-center justify-center overflow-hidden [transform:translateZ(0)]"
        style={{
          WebkitMaskImage:
            "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 70%, rgba(0,0,0,0) 100%)",
          maskImage:
            "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 70%, rgba(0,0,0,0) 100%)",
        }}
      >
        {/* Instant High-Res Poster Image before video stream buffers */}
        <img
          src={poster}
          alt="Ambient Background Poster"
          className={cn(
            "absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none transition-opacity duration-700 ease-out",
            isVideoLoaded ? "opacity-0 pointer-events-none" : "opacity-95"
          )}
          loading="eager"
          decoding="async"
        />

        <video
          ref={videoRef}
          src={src}
          poster={poster}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onLoadedData={() => setIsVideoLoaded(true)}
          className={cn(
            "w-full h-full object-cover object-center pointer-events-none select-none transition-opacity duration-700 [will-change:transform]",
            isVideoLoaded ? "opacity-95" : "opacity-0"
          )}
        />

        {/* Bottom smooth blend to page background, top is completely clear without gradient/overlay */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-transparent to-white" />
      </div>
    </div>
  );
}


