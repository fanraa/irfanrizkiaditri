import { ReactNode, useEffect } from "react";
import { Navbar } from "./Navbar";
import { Link, useLocation } from "react-router-dom";
import { Mail, Instagram, Linkedin } from "lucide-react";
import { useAudio } from "@/context/AudioContext";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { playingId, tracks } = useAudio();
  const playingTrack = tracks.find(t => t.id === playingId);
  const trackCover = playingTrack?.coverUrl || playingTrack?.cover || playingTrack?.image;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const validRoutes = ['/', '/projects', '/lab', '/gallery', '/music', '/blog', '/contact', '/privacy', '/terms', '/about'];
  const isNotFound = !validRoutes.includes(location.pathname) && !location.pathname.startsWith('/blog/') && !location.pathname.startsWith('/projects/');

  if (isNotFound) {
    return <div className="min-h-[100dvh] bg-slate-50">{children}</div>;
  }

  return (
    <div id="layout-wrapper" className={`flex-1 w-full min-h-[100dvh] flex flex-col transition-colors duration-1000 ease-in-out ${['/privacy', '/terms', '/about'].includes(location.pathname) ? 'bg-white' : 'bg-slate-50'} selection:bg-slate-200 selection:text-slate-900 relative`}>
      {/* Global Background Wrapper to prevent overflow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {/* Soft Sky Gradient at Top */}
        <div className={`absolute top-0 inset-x-0 h-[1800px] pointer-events-none z-0 bg-gradient-to-b to-transparent transition-colors duration-1000 ${location.pathname === '/music' ? 'from-slate-50 via-slate-50/80' : location.pathname.startsWith('/blog') ? 'from-slate-900/80 via-slate-800/20' : ['/', '/lab', '/gallery', '/privacy', '/terms', '/about'].includes(location.pathname) ? 'from-white via-slate-100 to-transparent' : 'from-sky-600/50 via-sky-400/20'}`}></div>
        
        {location.pathname === '/music' && trackCover && (
          <div 
            className="absolute top-0 inset-x-0 h-[600px] pointer-events-none z-[1]"
            style={{ 
              maskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)'
            }}
          >
            <div 
              className="absolute inset-0 bg-cover bg-center blur-[16px] opacity-60 transition-all duration-1000 scale-110"
              style={{ backgroundImage: `url(${trackCover})` }}
            />
          </div>
        )}
      </div>
      <div className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-hidden mix-blend-multiply">
        <div className="absolute inset-0 opacity-70">
          {/* Top to Middle */}
          <div className="absolute top-[5%] left-[-10%] w-[80vw] h-[30%] min-h-[600px] md:w-[50vw] filter blur-[100px] md:blur-[180px] opacity-40 bg-sky-300"></div>
          <div className="absolute top-[10%] right-[-10%] w-[70vw] h-[35%] min-h-[600px] md:w-[40vw] filter blur-[100px] md:blur-[180px] opacity-40 bg-rose-200"></div>
          
          {/* Middle */}
          <div className="absolute top-[30%] left-[10%] w-[90vw] h-[35%] min-h-[600px] md:w-[55vw] filter blur-[100px] md:blur-[180px] opacity-40 bg-amber-200"></div>
          <div className="absolute top-[45%] right-[-5%] w-[85vw] h-[40%] min-h-[600px] md:w-[60vw] filter blur-[100px] md:blur-[180px] opacity-40 bg-emerald-200"></div>
          
          {/* Bottom */}
          <div className="absolute top-[65%] left-[-10%] w-[80vw] h-[35%] min-h-[600px] md:w-[50vw] filter blur-[100px] md:blur-[180px] opacity-40 bg-purple-300"></div>
          <div className="absolute top-[80%] right-[10%] w-[75vw] h-[30%] min-h-[600px] md:w-[40vw] filter blur-[100px] md:blur-[180px] opacity-40 bg-cyan-300"></div>
        </div>
      </div>

      <Navbar />
      <main className="flex-1 w-full container mx-auto px-4 sm:px-8 lg:px-12 pt-12 pb-10 md:pt-20 md:pb-16 max-w-7xl relative z-10">
        {children}
      </main>
      
      <div className="w-full mt-auto relative flex-shrink-0 bg-slate-950">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 120" className="w-full absolute bottom-full left-0 pointer-events-none block" style={{ marginBottom: "-1px" }}>
          <path fill="#020617" fillOpacity="1" d="M0,32L48,42.7C96,53,192,75,288,80C384,85,480,75,576,64C672,53,768,43,864,48C960,53,1056,75,1152,80C1248,85,1344,75,1392,70L1440,64L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z"></path>
        </svg>
        <footer className="bg-slate-950 text-slate-300 pt-10 pb-8 relative z-10 w-full overflow-hidden">
          {/* Hexagon layer container with top fade */}
          <div 
            className="absolute inset-0 z-0 pointer-events-none" 
            style={{ 
              maskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)',
              WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)'
            }} 
          >
            {/* Static hexagon */}
            <div 
              className="absolute inset-0 opacity-10" 
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='28' height='49' viewBox='0 0 28 49' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.5'%3E%3Cpath d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9zM0 15l12.98-7.5V0h-2v6.35L0 12.69v2.3zm0 18.5L12.98 41v8h-2v-6.85L0 35.81v-2.3zM15 0v7.5L27.99 15H28v-2.31h-.01L17 6.35V0h-2zm0 49v-8l12.99-7.5H28v2.31h-.01L17 42.65V49h-2z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }} 
            />
            {/* Shimmering hexagon */}
            <div 
              className="absolute inset-0 opacity-30 animate-shine-hex" 
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='28' height='49' viewBox='0 0 28 49' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.5'%3E%3Cpath d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9zM0 15l12.98-7.5V0h-2v6.35L0 12.69v2.3zm0 18.5L12.98 41v8h-2v-6.85L0 35.81v-2.3zM15 0v7.5L27.99 15H28v-2.31h-.01L17 6.35V0h-2zm0 49v-8l12.99-7.5H28v2.31h-.01L17 42.65V49h-2z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }} 
            />
          </div>
          <div className="container mx-auto px-4 sm:px-8 lg:px-12 max-w-7xl relative z-10">
            <div className="mb-12 md:mb-16">
              <h2 className="text-2xl sm:text-[28px] font-bold font-display lowercase text-white tracking-tight">irfanrizkiaditri</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-8">
              {/* Left Column - About */}
              <div className="md:col-span-4 flex flex-col items-center md:items-start space-y-4 text-center md:text-left">
                <Link to="/about" className="font-semibold text-white/90 hover:text-white transition-colors tracking-widest uppercase text-xs">ABOUT ME</Link>
                <p className="text-slate-400 leading-relaxed max-w-md text-sm font-display">
                  An ITERA student batch of 2025 who enjoys exploring code and sharing stories through the digital space.
                </p>
              </div>

              {/* Middle Column - Exploration */}
              <div className="md:col-span-4 space-y-4 flex flex-col items-center md:items-start text-center md:text-left">
                <h3 className="font-semibold text-white/90 tracking-widest uppercase text-xs">EXPLORATION</h3>
                <div className="grid grid-cols-2 gap-x-12 gap-y-4">
                  <div className="flex flex-col space-y-3 items-center md:items-start">
                    <Link to="/" className="hover:text-white transition-colors text-xs text-slate-400">Home</Link>
                    <Link to="/projects" className="hover:text-white transition-colors text-xs text-slate-400">Projects</Link>
                    <Link to="/blog" className="hover:text-white transition-colors text-xs text-slate-400">Blog</Link>
                    <Link to="/lab" className="hover:text-white transition-colors text-xs text-slate-400">The Lab</Link>
                  </div>
                  <div className="flex flex-col space-y-3 items-center md:items-start">
                    <Link to="/gallery" className="hover:text-white transition-colors text-xs text-slate-400">Gallery</Link>
                    <Link to="/music" className="hover:text-white transition-colors text-xs text-slate-400">Playlist</Link>
                    <Link to="/contact" className="hover:text-white transition-colors text-xs text-slate-400">Contact</Link>
                  </div>
                </div>
              </div>

              {/* Right Column - Communication & Social */}
              <div className="md:col-span-4 space-y-8 relative z-20 flex flex-col items-center md:items-start text-center md:text-left">
                <div className="space-y-4 flex flex-col items-center md:items-start">
                  <h3 className="font-semibold text-white/90 tracking-widest uppercase text-xs">COMMUNICATION</h3>
                  <a href="mailto:irfanrizkiaditri@gmail.com" className="flex items-center space-x-3 hover:text-white transition-colors group">
                    <img src="https://cdn-icons-png.flaticon.com/128/3781/3781605.png" alt="Email" className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity grayscale invert shrink-0" />
                    <span className="text-xs text-slate-400 group-hover:text-white transition-colors break-all">irfanrizkiaditri@gmail.com</span>
                  </a>
                </div>

                <div className="space-y-4 flex flex-col items-center md:items-start">
                  <h3 className="font-semibold text-white/90 tracking-widest uppercase text-xs">SOCIAL</h3>
                  <div className="flex items-center space-x-5">
                    <a href="https://www.instagram.com/inewnewton?igsh=MWN1aGNobGdibDYzYw==" target="_blank" rel="noreferrer" className="opacity-50 hover:opacity-100 transition-opacity">
                      <img src="https://cdn-icons-png.flaticon.com/128/717/717392.png" alt="Instagram" className="w-5 h-5 invert" />
                    </a>
                    <a href="https://www.threads.com/@irfanrizkiaditri" target="_blank" rel="noreferrer" className="opacity-50 hover:opacity-100 transition-opacity">
                      <img src="https://cdn-icons-png.flaticon.com/128/12105/12105336.png" alt="Threads" className="w-5 h-5 invert" />
                    </a>
                    <a href="https://www.linkedin.com/in/irfan-rizki-aditri-b12162368?utm_source=share_via&utm_content=profile&utm_medium=member_android" target="_blank" rel="noreferrer" className="opacity-50 hover:opacity-100 transition-opacity">
                      <img src="https://cdn-icons-png.flaticon.com/128/3128/3128219.png" alt="LinkedIn" className="w-5 h-5 invert" />
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-16 pt-8 border-t border-slate-800/60 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-4 text-xs text-slate-500 relative z-20 text-center md:text-left">
              <div>© 2026 PERSPECTIVE OF FANRA</div>
              <div className="flex flex-col md:flex-row items-center space-y-3 md:space-y-0 md:space-x-6">
                <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
                <Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
                <span>Sumatra, Indonesia</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
