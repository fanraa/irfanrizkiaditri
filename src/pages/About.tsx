import { SEO } from "@/components/SEO";
import React from 'react';
import { PageTransition } from "@/components/PageTransition";
import { useAuth } from "@/context/AuthContext";
import { AnimatePresence, motion } from "motion/react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";

export function About() {
  const { userEmail, logout, isAdmin, loginWithGoogle } = useAuth();
  
  return (
    <>
      <SEO title="About" description="About Irfan Rizki Aditri - Software Developer and Tech Enthusiast." url={window.location.href} />
      <PageTransition>
      <div className="w-full max-w-3xl mx-auto py-16 px-4 sm:px-8">
        <div className="text-slate-800 flex flex-col gap-10">
          
          <div className="space-y-6 text-xs sm:text-sm leading-relaxed text-justify">
            <h1 className="text-2xl sm:text-3xl font-bold font-heading tracking-tight text-slate-900 mb-6 text-left border-b border-slate-200 pb-4">About Me</h1>
            
            <p>
              Hello, I am Irfan Rizki Aditri, commonly known as Fanra. I am a Physics student class of 2025 at the Sumatera Institute of Technology (ITERA), with a profound interest in technology and digital development.
            </p>
            
            <p>
              My journey in the programming world did not begin in a classroom, but rather from curiosity. When I first saw a WhatsApp bot capable of automatically responding to messages using AI, I became intrigued to understand how the system worked. From that curiosity, I delved deeper into the world of coding and began building various projects independently.
            </p>
            
            <p>
              I am an independent learner who thrives through exploration. In the process, I utilize AI as a tool to accelerate understanding and execution. To me, technology is not just a tool, but a medium to create something of value and impact.
            </p>
            
            <p>
              Before focusing on this path, I explored various forms of creation, from writing novels, making comics, composing songs, to being a content creator. Every attempt gave me one crucial realization: I want to leave a tangible and lasting footprint.
            </p>
            
            <p>
              This website is a representation of that vision. A digital space I built to document my journey, develop my skills, and create an identity that grows over time. I was born and raised on the island of Sumatra, and I believe that one's background is not a boundary, but a starting point.
            </p>
            
            <p className="font-medium italic text-slate-900 text-left">
              I don't just want to be known.<br/>
              I want to grow, contribute, and create something worth remembering.
            </p>
          </div>

          <div className="flex flex-col items-center gap-12 mt-4 pt-12 border-t border-slate-200">
            <div className="flex flex-col items-center text-center">
              <h3 className="text-base font-semibold text-slate-900 mb-4">Connect</h3>
              <div className="flex items-center gap-5 justify-center">
                <a href="mailto:irfanrizkiaditri02@gmail.com" className="opacity-70 hover:opacity-100 transition-opacity flex items-center justify-center p-2 rounded-full hover:bg-slate-100">
                  <img src="https://cdn-icons-png.flaticon.com/128/3721/3721935.png" alt="Email" className="w-5 h-5 object-contain grayscale" />
                </a>
                <a href="https://www.instagram.com/inewnewton?igsh=MWN1aGNobGdibDYzYw==" target="_blank" rel="noreferrer" className="opacity-70 hover:opacity-100 transition-opacity flex items-center justify-center p-2 rounded-full hover:bg-slate-100">
                  <img src="https://cdn-icons-png.flaticon.com/128/717/717392.png" alt="Instagram" className="w-5 h-5 object-contain grayscale" />
                </a>
                <a href="https://www.threads.com/@irfanrizkiaditri" target="_blank" rel="noreferrer" className="opacity-70 hover:opacity-100 transition-opacity flex items-center justify-center p-2 rounded-full hover:bg-slate-100">
                  <img src="https://cdn-icons-png.flaticon.com/128/12105/12105336.png" alt="Threads" className="w-5 h-5 object-contain grayscale" />
                </a>
                <a href="https://www.linkedin.com/in/irfan-rizki-aditri-b12162368?utm_source=share_via&utm_content=profile&utm_medium=member_android" target="_blank" rel="noreferrer" className="opacity-70 hover:opacity-100 transition-opacity flex items-center justify-center p-2 rounded-full hover:bg-slate-100">
                  <img src="https://cdn-icons-png.flaticon.com/128/3128/3128219.png" alt="LinkedIn" className="w-5 h-5 object-contain grayscale" />
                </a>
              </div>
            </div>

            <div className="w-full max-w-sm flex flex-col items-center text-center">
              <h3 className="text-base font-semibold text-slate-900 mb-3">Join Community</h3>
              <p className="text-xs text-slate-500 mb-6">Join our community to stay updated and not miss out on upcoming experiments and updates. Coming soon!</p>
              
              {(!userEmail && !isAdmin) ? (
                <div className="w-full flex flex-col items-center gap-1.5 relative group">
                  <button 
                    onClick={() => loginWithGoogle()}
                    className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm"
                  >
                    <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-4 h-4" />
                    Sign in with Google
                  </button>
                  <div className="absolute -bottom-8 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] text-slate-300">
                       Welcome to the community!
                    </span>
                  </div>
                </div>
              ) : (
                <div className="w-full flex flex-col sm:flex-row items-center justify-between px-5 py-4 bg-green-50/50 border border-green-100 rounded-xl gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm shadow-sm">
                      {userEmail ? userEmail.charAt(0).toUpperCase() : "A"}
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-medium text-slate-900">Signed in successfully!</p>
                      <p className="text-[10px] text-slate-500 truncate max-w-[120px]">{userEmail || "Admin Access"}</p>
                    </div>
                  </div>
                  <button onClick={logout} className="text-[11px] font-medium text-slate-500 hover:text-slate-800 bg-white px-3 py-1.5 rounded-md border border-slate-200 shadow-sm transition-colors">Sign out</button>
                </div>
              )}
            </div>
          </div>
          
        </div>
      </div>
      
    </PageTransition>
  
    </>
  );
}