import React, { createContext, useContext, useEffect, useRef } from "react";
import Lenis from "lenis";
import { useLocation } from "react-router-dom";

interface SmoothScrollContextType {
  lenis: Lenis | null;
  scrollTo: (target: number | string | HTMLElement, options?: any) => void;
}

const SmoothScrollContext = createContext<SmoothScrollContextType>({
  lenis: null,
  scrollTo: () => {},
});

export const useSmoothScroll = () => useContext(SmoothScrollContext);

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);
  const location = useLocation();

  useEffect(() => {
    // Instantiate Lenis with weighted, silky smooth inertial scroll configuration
    const lenis = new Lenis({
      duration: 1.4, // Generous duration for a graceful, delayed momentum feel
      lerp: 0.075, // Damped interpolation gives that weighty, elegant gliding sensation
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Exponential deceleration
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 0.9, // Gentle wheel response preventing jarring jumps
      touchMultiplier: 1.2,
      infinite: false,
      autoRaf: false, // Managed manually via component RAF loop for precise lifecycle cleanup
    });

    lenisRef.current = lenis;

    // Optional: make lenis accessible on window for debugging or deep script interactions
    if (typeof window !== "undefined") {
      (window as any).lenis = lenis;
    }

    // Fallback RAF loop just in case autoRaf needs reinforcement
    let animationFrameId: number;
    function onRaf(time: number) {
      lenis.raf(time);
      animationFrameId = requestAnimationFrame(onRaf);
    }
    animationFrameId = requestAnimationFrame(onRaf);

    return () => {
      cancelAnimationFrame(animationFrameId);
      lenis.destroy();
      lenisRef.current = null;
      if (typeof window !== "undefined") {
        delete (window as any).lenis;
      }
    };
  }, []);

  // When changing pages across any menu route, smoothly reset position to top
  useEffect(() => {
    if (lenisRef.current) {
      lenisRef.current.scrollTo(0, { immediate: true });
    }
  }, [location.pathname]);

  const scrollTo = (target: number | string | HTMLElement, options?: any) => {
    if (lenisRef.current) {
      lenisRef.current.scrollTo(target, options);
    }
  };

  return (
    <SmoothScrollContext.Provider value={{ lenis: lenisRef.current, scrollTo }}>
      {children}
    </SmoothScrollContext.Provider>
  );
}
