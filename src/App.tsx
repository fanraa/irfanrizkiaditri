/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { AnimatePresence } from "motion/react";
import { AudioProvider } from "@/context/AudioContext";
import { AuthProvider } from "@/context/AuthContext";
import { FullscreenHandler } from "@/components/FullscreenHandler";
import { Suspense, lazy } from "react";
import { logVisit } from '@/lib/analytics';
import { useEffect } from 'react';
function AnalyticsTracker() { useEffect(() => { logVisit(); }, []); return null; }
import { Loader2 } from "lucide-react";

// Lazy-loaded components
const Home = lazy(() => import("@/pages/Home").then(m => ({ default: m.Home })));
const Gallery = lazy(() => import("@/pages/Gallery").then(m => ({ default: m.Gallery })));
const Music = lazy(() => import("@/pages/Music").then(m => ({ default: m.Music })));
const Blog = lazy(() => import("@/pages/Blog").then(m => ({ default: m.Blog })));
const Contact = lazy(() => import("@/pages/Contact").then(m => ({ default: m.Contact })));
const Projects = lazy(() => import("@/pages/Projects").then(m => ({ default: m.Projects })));
const Lab = lazy(() => import("@/pages/Lab").then(m => ({ default: m.Lab })));
const Privacy = lazy(() => import("@/pages/Privacy").then(m => ({ default: m.Privacy })));
const Terms = lazy(() => import("@/pages/Terms").then(m => ({ default: m.Terms })));
const About = lazy(() => import("@/pages/About").then(m => ({ default: m.About })));
const NotFound = lazy(() => import("@/pages/NotFound").then(m => ({ default: m.NotFound })));
const Admin = lazy(() => import("@/pages/Admin").then(m => ({ default: m.Admin })));

function PageFallback() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AnalyticsTracker />
      <FullscreenHandler />
      <AuthProvider>
        <AudioProvider>
          <Layout>
            <AnimatePresence mode="wait">
              <Suspense fallback={<PageFallback />}>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/projects" element={<Projects />} />
                  <Route path="/lab" element={<Lab />} />
                  <Route path="/gallery" element={<Gallery />} />
                  <Route path="/music" element={<Music />} />
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </AnimatePresence>
          </Layout>
        </AudioProvider>
      </AuthProvider>
    </Router>
  );
}
