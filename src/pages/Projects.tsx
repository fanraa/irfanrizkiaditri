import { SEO } from "@/components/SEO";
import { ImageWithSkeleton } from "@/components/ImageWithSkeleton";
import { PageTransition } from "@/components/PageTransition";
import { ExternalLink, Globe, Code2, Cpu, MessageSquare, Users, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import React, { useState, useEffect } from "react";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

const projects = [
  {
    id: "fanra",
    title: "Fanra",
    description: "Personal portfolio and digital garden. A space to share my thoughts, experiments, and creative works.",
    icon: <ImageWithSkeleton src="https://cdn-icons-png.flaticon.com/128/14047/14047292.png" alt="Fanra" className="w-full h-full object-contain drop-shadow-sm" containerClassName="w-full h-full bg-transparent" style={{ filter: "brightness(0) invert(22%) sepia(91%) saturate(1376%) hue-rotate(200deg) brightness(95%) contrast(94%)" }} />,
    url: "https://fanra.my.id",
    color: "from-blue-500/10 to-indigo-500/10",
    border: "group-hover:border-blue-500/40",
    iconColor: "text-blue-500"
  },
  {
    id: "fanratech",
    title: "Fanratech",
    description: "Technology blog and tutorial site focusing on web development, AI, and modern software engineering.",
    icon: <ImageWithSkeleton src="https://res.cloudinary.com/dew39kqhy/image/upload/f_auto,q_auto/v1779594254/FanraTech_esy4kn.png" alt="Fanratech" className="w-full h-full object-cover rounded-full drop-shadow-sm" containerClassName="w-full h-full bg-transparent" />,
    url: "https://fanratech.web.id",
    color: "from-emerald-500/10 to-teal-500/10",
    border: "group-hover:border-emerald-500/40",
    iconColor: "text-emerald-500"
  },
  {
    id: "vektorion",
    title: "Vektorion",
    description: "Visual exploration platform offering free graphic design assets and curated design inspiration.",
    icon: <ImageWithSkeleton src="https://res.cloudinary.com/dew39kqhy/image/upload/f_auto,q_auto/v1778700411/ChatGPT_Image_14_Mei_2026_02.26.25_nx3u4o.png" alt="Vektorion" className="w-full h-full object-cover rounded-full drop-shadow-sm" containerClassName="w-full h-full bg-transparent" />,
    url: "https://vektorion.web.id",
    color: "from-amber-500/10 to-orange-500/10",
    border: "group-hover:border-amber-500/40",
    iconColor: "text-amber-500"
  },
  {
    id: "fanragem",
    title: "Fanragem",
    description: "A web-based peer-to-peer economic simulation game featuring a player-driven market where users trade resources, manage factories, and invest in a dynamic economy.",
    icon: <ImageWithSkeleton src="https://res.cloudinary.com/dew39kqhy/image/upload/f_auto,q_auto/v1783234123/ChatGPT_Image_5_Jul_2026__13.47.35-removebg-preview_gztehs.png" alt="Fanragem" className="w-full h-full object-contain drop-shadow-sm grayscale opacity-60" containerClassName="w-full h-full bg-transparent" />,
    url: "https://fanragem.my.id",
    color: "from-purple-500/10 to-pink-500/10",
    border: "group-hover:border-purple-500/40",
    iconColor: "text-purple-500"
  },
  {
    id: "fanrabot",
    title: "Fanrabot",
    description: "An AI-powered web platform to create and manage smart WhatsApp bots, connecting them with various LLMs for automated replies and business automation.",
    icon: <ImageWithSkeleton src="https://res.cloudinary.com/dew39kqhy/image/upload/f_auto,q_auto/v1780578024/file_0000000030647209b33b695fffe52c90_gi9rwf.png" alt="Fanrabot" className="w-full h-full object-cover rounded-full drop-shadow-sm" containerClassName="w-full h-full bg-transparent" />,
    url: "https://fanrabot.biz.id",
    color: "from-cyan-500/10 to-blue-500/10",
    border: "group-hover:border-cyan-500/40",
    iconColor: "text-cyan-500"
  },
  {
    id: "friendzone",
    title: "FriendsZone",
    description: "A global social community platform connecting people to build friendships. Evolved from a chat group into a cross-platform ecosystem prioritizing authentic interactions.",
    icon: <ImageWithSkeleton src="https://res.cloudinary.com/dew39kqhy/image/upload/f_auto,q_auto/v1776967780/1774023663426_cv3c6b.png" alt="Friendzone" className="w-full h-full object-cover rounded-full drop-shadow-sm" containerClassName="w-full h-full bg-transparent" />,
    url: "https://friendszone.web.id",
    color: "from-rose-500/10 to-red-500/10",
    border: "group-hover:border-rose-500/40",
    iconColor: "text-rose-500"
  }
];

export function Projects() {
  const [customProjects, setCustomProjects] = useState<any[]>([]);

  useEffect(() => {
    async function fetchProjects() {
      try {
        const q = query(collection(db, "projects_custom"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        setCustomProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error(error);
      }
    }
    fetchProjects();
  }, []);
  
  const displayProjects = customProjects.length > 0 ? customProjects : projects;

  return (
    <>
      <SEO title="Projects" description="Showcase of my latest tools, projects, and web development works." url={window.location.href} />
      <PageTransition>
      <div className="w-full space-y-12 pt-8 sm:pt-16 pb-16">
        <header className="space-y-4 max-w-2xl">
          <h1 className="text-3xl sm:text-4xl font-bold font-heading tracking-tight text-white">
            Projects
          </h1>
          <p className="text-white/80 text-sm sm:text-base leading-relaxed">
            A collection of web applications, tools, and digital experiments I've built over time.
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayProjects.map((project) => (
            <a
              key={project.id}
              href={(project.link || project.url)}
              target="_blank"
              rel="noreferrer"
              className="group relative flex flex-col bg-white/20 backdrop-blur-lg rounded-2xl p-6 border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:border-white/60 hover:bg-white/30 transition-all duration-300 overflow-hidden"
            >
              <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500", project.color)} />
              
              <div className="relative w-12 h-12 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                {typeof project.icon === 'string' ? <img src={project.icon} alt={project.title} className="w-full h-full object-cover rounded-full shadow-sm" /> : project.icon}
              </div>
              
              <div className="relative flex-1">
                <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-slate-800 transition-colors font-heading">
                  {project.title}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed mb-6 line-clamp-3 font-display">
                  {project.description}
                </p>
              </div>

              <div className="relative mt-auto flex items-center text-sm font-medium font-heading text-slate-400 group-hover:text-slate-900 transition-colors">
                <span>View Project</span>
                <ExternalLink className="w-4 h-4 ml-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
              </div>
            </a>
          ))}
        </div>
      </div>
    </PageTransition>
    </>
  );
}