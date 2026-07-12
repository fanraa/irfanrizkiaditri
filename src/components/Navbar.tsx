import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Home, Image as ImageIcon, Music, PenTool, MessageSquare, Briefcase, Beaker, X, Mail, Settings } from "lucide-react";
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "motion/react";
import { useState, useEffect } from "react";

import { useAuth } from "@/context/AuthContext";

export function Navbar() {
  const location = useLocation();
  const { isAdmin, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const { scrollY } = useScroll();
  const [navState, setNavState] = useState<"top" | "floating" | "hidden">("top");
  const [isDarkTheme, setIsDarkTheme] = useState(false);

  useEffect(() => {
    const handleThemeChange = (e: any) => setIsDarkTheme(e.detail);
    window.addEventListener("nav-theme-change", handleThemeChange);
    return () => window.removeEventListener("nav-theme-change", handleThemeChange);
  }, []);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
      document.documentElement.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
      document.documentElement.style.overflow = "unset";
    };
  }, [mobileMenuOpen]);

  const [lastScrollY, setLastScrollY] = useState(0);

  useMotionValueEvent(scrollY, "change", (latest) => {
    if (latest < 20) {
      setNavState("top");
    } else if (latest > 60 && navState === "top") {
      setNavState("floating");
    } else if (latest > 20 && navState !== "floating" && navState !== "top") {
       setNavState("floating");
    }
    setLastScrollY(latest);
  });

  const links = [
    { href: "/", label: "Home", iconSrc: "https://cdn-icons-png.flaticon.com/128/1946/1946488.png" },
    { href: "/projects", label: "Projects", iconSrc: "https://cdn-icons-png.flaticon.com/128/1421/1421358.png" },
    { href: "/lab", label: "The Lab", iconSrc: "https://cdn-icons-png.flaticon.com/128/883/883032.png" },
    { href: "/gallery", label: "Gallery", iconSrc: "https://cdn-icons-png.flaticon.com/128/8692/8692947.png" },
    { href: "/music", label: "Playlist", iconSrc: "https://cdn-icons-png.flaticon.com/128/9240/9240687.png" },
    { href: "/blog", label: "Blog", iconSrc: "https://cdn-icons-png.flaticon.com/128/10412/10412582.png" },
    { href: "/contact", label: "Contact", iconSrc: "https://cdn-icons-png.flaticon.com/128/3721/3721935.png" },
  ];

  // Prevent scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [mobileMenuOpen]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <>
      <motion.div 
        initial={false}
        animate={{ 
          y: navState === "hidden" ? "-150%" : "0%",
          opacity: navState === "hidden" ? 0 : 1
        }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "fixed z-50 transition-all duration-300 flex justify-center w-full",
          navState === "top" ? "top-0 px-0" : "top-0 sm:top-6 px-0 sm:px-8 lg:px-12"
        )}
      >
        <header 
          className={cn(
            "w-full transition-all duration-300 border border-transparent",
            navState === "top" 
              ? "bg-transparent max-w-none rounded-b-[20px] sm:rounded-none h-14 sm:h-16 shadow-none" 
              : "bg-white/50 backdrop-blur-xl max-w-none sm:max-w-7xl border-white/20 sm:border-white/20 rounded-b-[20px] sm:rounded-full shadow-sm sm:shadow-md h-14 sm:h-[3.5rem]"
          )}
        >
          <div className={cn(
            "h-full w-full mx-auto flex items-center justify-between transition-all duration-300",
             navState === "top" ? "max-w-7xl px-4 sm:px-8 lg:px-12" : "px-4 sm:px-6 lg:px-8"
          )}>
            <Link to="/" className={cn("text-[22px] font-bold font-display lowercase tracking-tight transition-colors flex items-center gap-2", navState === "top" ? (["/", "/lab", "/gallery", "/privacy", "/terms", "/about"].includes(location.pathname) ? "text-slate-900 hover:text-slate-700" : (location.pathname === "/music" ? (isDarkTheme ? "text-white hover:text-white/80" : "text-slate-900 hover:text-slate-700") : "text-white hover:text-white/80")) : "text-slate-900 hover:text-slate-700")}>
              irfanrizkiaditri
              {isAdmin && (
                <span 
                  onClick={(e) => { e.preventDefault(); logout(); }}
                  className="text-[9px] font-medium px-1.5 py-0.5 bg-slate-100 hover:bg-red-50 hover:text-red-500 hover:border-red-200 cursor-pointer text-slate-400 rounded border border-slate-200/50 hidden sm:block transition-colors"
                  title="Logout admin"
                >
                  admin
                </span>
              )}
            </Link>
            
            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-1 sm:space-x-2">
              {(() => {
                const isTop = navState === "top";
                const isMusic = location.pathname === "/music";
                const isWhiteBgPage = ["/", "/lab", "/gallery", "/privacy", "/terms", "/about"].includes(location.pathname);
                const useWhiteTop = isTop && !isWhiteBgPage && (!isMusic || isDarkTheme);
                const useDarkTop = isTop && (isMusic && !isDarkTheme);
                
                return (
                  <>
                    {links.map((link) => {
                      const isActive = location.pathname === link.href;
                      return (
                        <Link
                          key={link.href}
                          to={link.href}
                          className={cn(
                            "relative flex items-center px-3 py-2 transition-all duration-300 outline-none",
                            isActive ? (useWhiteTop ? "text-white font-semibold" : "text-slate-900 font-semibold") : (useWhiteTop ? "text-white/70 hover:text-white font-medium" : "text-slate-500 hover:text-slate-900 font-medium")
                          )}
                        >
                          <span className="text-[15px]">{link.label}</span>
                        </Link>
                      );
                    })}
                    {isAdmin && (
                      <Link
                        to="/admin"
                        className={cn(
                          "relative flex items-center px-3 py-2 transition-all duration-300 outline-none ml-2",
                          location.pathname === "/admin" ? "text-slate-900 font-semibold" : (useWhiteTop ? "text-white/70 hover:text-white" : "text-slate-500 hover:text-slate-900")
                        )}
                        title="Admin Settings"
                      >
                        <Settings className="w-[18px] h-[18px]" />
                      </Link>
                    )}
                  </>
                );
              })()}
            </nav>

            {/* Mobile Menu Toggle */}
            <motion.button 
              whileHover="hover"
              whileTap="tap"
              className={cn("lg:hidden p-2 -mr-2 transition-colors focus:outline-none flex flex-col justify-center items-center gap-[5px] w-10 h-10", navState === "top" ? (["/", "/lab", "/gallery", "/privacy", "/terms", "/about"].includes(location.pathname) ? "text-slate-600 hover:text-slate-900" : (location.pathname === "/music" && !isDarkTheme ? "text-slate-600 hover:text-slate-900" : "text-white/80 hover:text-white")) : "text-slate-600 hover:text-slate-900")}
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open Menu"
            >
              <motion.span 
                variants={{ hover: { scaleX: 1.1 }, tap: { scaleX: 0.9 } }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="w-5 h-[2px] bg-current rounded-full"
              />
              <motion.span 
                variants={{ hover: { scaleX: 0.8 }, tap: { scaleX: 0.9 } }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="w-5 h-[2px] bg-current rounded-full"
              />
              <motion.span 
                variants={{ hover: { scaleX: 1.1 }, tap: { scaleX: 0.9 } }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="w-5 h-[2px] bg-current rounded-full"
              />
            </motion.button>
          </div>
        </header>
      </motion.div>

      {/* Mobile Sidebar / Drawer */}
      {createPortal(
        <AnimatePresence>
          {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9998] lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            
            {/* Drawer */}
            <motion.div
              initial={{ y: "-100%" }}
              animate={{ y: 0 }}
              exit={{ y: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 right-0 bottom-0 w-full bg-white z-[9999] shadow-2xl flex flex-col lg:hidden overflow-y-auto overflow-x-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100 relative z-10">
                <span className="font-bold text-slate-900 tracking-tight text-lg font-heading">Menu</span>
                <motion.button 
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-900 focus:outline-none transition-colors"
                >
                  <X className="w-6 h-6" />
                </motion.button>
              </div>
              
              <div className="p-6 flex flex-col gap-1.5 relative z-10">
                {links.map((link) => {
                  const isActive = location.pathname === link.href;
                  
                  return (
                    <Link
                      key={link.href}
                      to={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex justify-center px-4 py-3.5 rounded-xl font-bold transition-colors outline-none text-base tracking-wide bg-white/40 backdrop-blur-sm border border-transparent",
                        isActive ? "bg-slate-900 text-white border-slate-800" : "text-slate-600 hover:bg-slate-100/60 hover:text-slate-900 hover:border-slate-200/50"
                      )}
                    >
                      {link.label}
                    </Link>
                  );
                })}
                {isAdmin && (
                  <Link
                    to="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex justify-center px-4 py-3.5 rounded-xl font-bold transition-colors outline-none text-base tracking-wide bg-white/40 backdrop-blur-sm border border-transparent mt-2",
                      location.pathname === "/admin" ? "bg-slate-900 text-white border-slate-800" : "text-slate-600 hover:bg-slate-100/60 hover:text-slate-900 hover:border-slate-200/50"
                    )}
                  >
                    Admin
                  </Link>
                )}
              </div>
              
              <div className="mt-auto p-6 border-t border-slate-100/50 flex flex-col items-center justify-center gap-4 relative z-10">
                <div className="flex items-center gap-6">
                  <a href="mailto:irfanrizkiaditri@gmail.com" className="text-slate-400 hover:text-slate-900 transition-colors opacity-70 hover:opacity-100">
                    <img src="https://cdn-icons-png.flaticon.com/128/3781/3781605.png" alt="Email" className="w-5 h-5" />
                  </a>
                  <a href="https://www.instagram.com/inewnewton?igsh=MWN1aGNobGdibDYzYw==" target="_blank" rel="noreferrer" className="text-slate-400 hover:text-slate-900 transition-colors opacity-70 hover:opacity-100">
                    <img src="https://cdn-icons-png.flaticon.com/128/717/717392.png" alt="Instagram" className="w-5 h-5" />
                  </a>
                  <a href="https://www.threads.com/@irfanrizkiaditri" target="_blank" rel="noreferrer" className="text-slate-400 hover:text-slate-900 transition-colors opacity-70 hover:opacity-100">
                    <img src="https://cdn-icons-png.flaticon.com/128/12105/12105336.png" alt="Threads" className="w-5 h-5" />
                  </a>
                  <a href="https://www.linkedin.com/in/irfan-rizki-aditri-b12162368?utm_source=share_via&utm_content=profile&utm_medium=member_android" target="_blank" rel="noreferrer" className="text-slate-400 hover:text-slate-900 transition-colors opacity-70 hover:opacity-100">
                    <img src="https://cdn-icons-png.flaticon.com/128/3128/3128219.png" alt="LinkedIn" className="w-5 h-5" />
                  </a>
                </div>
                <p className="text-xs text-slate-400">© 2026 Fanra.</p>
              </div>
            </motion.div>
          </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
