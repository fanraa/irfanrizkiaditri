import { motion } from "motion/react";
import { useEffect, useState, FormEvent } from "react";
import { collection, addDoc, query, onSnapshot, where, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PageTransition } from "@/components/PageTransition";
import { Loader2, CheckCircle2, MessageSquare, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { SEO } from "@/components/SEO";

interface WallMessage {
  id: string;
  content: string;
  sender: string;
  timestamp: number;
  type?: string;
}

interface MyMessage {
  id: string;
  timestamp: number;
}

export function Contact() {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [cooldownTime, setCooldownTime] = useState(0);

  useEffect(() => {
    const lastSentStr = localStorage.getItem('fanra_last_message_time');
    if (lastSentStr) {
      const lastSent = parseInt(lastSentStr, 10);
      const timePassed = Math.floor((Date.now() - lastSent) / 1000);
      if (timePassed < 60) {
        setCooldownTime(60 - timePassed);
      }
    }
  }, []);

  useEffect(() => {
    if (cooldownTime > 0) {
      const timer = setTimeout(() => setCooldownTime(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownTime]);
  
  const [messages, setMessages] = useState<WallMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  
  const [myMessages, setMyMessages] = useState<MyMessage[]>([]);
  const [now, setNow] = useState(Date.now());
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    // Load sent messages from localStorage
    try {
      const stored = localStorage.getItem("myWallMessages");
      if (stored) {
        setMyMessages(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to parse local storage", e);
    }

    // Update time for delete 5 min limit
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const q = query(collection(db, "messages"), where("type", "==", "public"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as WallMessage[];
      
      const publicMessages = data
        .filter(msg => msg.type === "public" || !msg.type)
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        
      setMessages(publicMessages);
      setLoadingMessages(false);
    }, (error) => {
      console.warn("Could not load messages (using local state).", error.code);
      setLoadingMessages(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!content.trim() || content.trim().length < 10) return;
    
    if (cooldownTime > 0) {
      setError(`Harap tunggu ${cooldownTime} detik sebelum mengirim pesan lagi.`);
      return;
    }
    
    setIsSubmitting(true);
    setError("");
    
    try {
      const docRef = await addDoc(collection(db, "messages"), {
        content: content.trim(),
        type: "public",
        timestamp: Date.now(),
        sender: "Anonymous"
      });
      
      const newMyMsg = { id: docRef.id, timestamp: Date.now() };
      const updatedMyMsgs = [...myMessages, newMyMsg];
      setMyMessages(updatedMyMsgs);
      localStorage.setItem("myWallMessages", JSON.stringify(updatedMyMsgs));

      setSuccess(true);
      setContent("");
      const nowMs = Date.now();
      localStorage.setItem('fanra_last_message_time', nowMs.toString());
      setCooldownTime(60);
      setTimeout(() => setSuccess(false), 5000);
    } catch (err: any) {
      console.error("Error sending message:", err);
      setError("Failed to send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "messages", id));
      const updated = myMessages.filter(m => m.id !== id);
      setMyMessages(updated);
      localStorage.setItem("myWallMessages", JSON.stringify(updated));
    } catch (err) {
      console.error("Failed to delete", err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <SEO title="Contact" description="Contact Irfan Rizki Aditri." url={window.location.href} />
      <PageTransition>
        {/* Subtle Clouds Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-10%] md:top-[-5%] left-0 right-0 h-[800px] pointer-events-none z-0 overflow-hidden flex items-center justify-center">
          <motion.img 
            src="https://res.cloudinary.com/dew39kqhy/image/upload/f_auto,q_auto/v1783403663/pexels-brett-sayles-4312324-removebg-preview_baeb0f.png" 
            alt="Clouds" 
            className="w-[350%] sm:w-[300%] md:w-[220%] max-w-none h-auto object-contain opacity-[0.12] mix-blend-overlay flex-shrink-0" 
            initial={{ x: '10%' }}
            animate={{ x: ['10%', '30%', '10%'] }}
            transition={{ duration: 250, repeat: Infinity, ease: "easeInOut" }}
          />
          </div>
        </div>
        
        <div className="max-w-4xl mx-auto w-full pt-12 pb-24 px-4 sm:px-6 relative z-10">
          
          {/* Header */}
                <header className="text-center space-y-3 mb-12 relative z-20">
          {/* Airplane Background */}
          <div className="absolute top-1/2 -translate-y-1/2 right-0 w-full pointer-events-none z-0 flex justify-end">
            <img 
              src="https://res.cloudinary.com/dew39kqhy/image/upload/f_auto,q_auto/v1783408954/pexels-andromeda99-20060374-removebg-preview_nm61m2.png" 
              alt="Airplane"
              className="w-[50%] md:w-[75%] max-w-[600px] opacity-100 object-contain translate-x-[25%] md:translate-x-[15%]"
            />
          </div>
          
          <div className="relative z-10">
            <h1 className="text-3xl sm:text-4xl font-bold font-heading tracking-tight text-white">Messages</h1>
            <p className="text-white/80 text-sm sm:text-base max-w-lg mx-auto mt-3 font-display">
              Share your thoughts, ideas, or questions anonymously on the Public Wall.
            </p>
          </div>
        </header>

        <div className="space-y-16 relative">
          


          {/* Input Form */}
          <div className="max-w-2xl mx-auto relative z-10">
            {success ? (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 animate-in fade-in zoom-in duration-500">
                <CheckCircle2 className="w-16 h-16 text-white" />
                <div>
                  <h3 className="text-xl font-medium text-white font-heading">Message posted!</h3>
                  <p className="text-slate-500 text-sm mt-1">Thank you for sharing your thoughts.</p>
                </div>
                <button 
                  onClick={() => setSuccess(false)}
                  className="mt-4 text-slate-800 text-sm font-medium hover:text-slate-600 transition-colors"
                >
                  Write another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="relative">
                <div className="bg-white/50 backdrop-blur-md rounded-xl border border-slate-300 shadow-sm overflow-hidden focus-within:border-slate-400 focus-within:ring-1 focus-within:ring-slate-400 transition-all">
                  <textarea
                    id="message"
                    rows={4}
                    className="w-full bg-transparent text-slate-900 text-sm sm:text-base placeholder:text-slate-500 focus:outline-none resize-none border-0 p-4 focus:ring-0 leading-relaxed min-h-[120px] font-display"
                    placeholder="What's on your mind? (min. 10 characters)..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    required
                    minLength={10}
                    maxLength={500}
                  />
                  
                  <div className="flex items-center justify-between p-3 border-t border-slate-200/50 bg-white/20">
                    {/* Left: Social Icons */}
                    <div className="flex items-center space-x-4 sm:space-x-5 px-2">
                      <a href="mailto:irfanrizkiaditri@gmail.com" aria-label="Email" className="group">
                        <img src="https://cdn-icons-png.flaticon.com/128/3781/3781605.png" alt="Email" className="w-4 h-4 sm:w-5 sm:h-5 opacity-60 group-hover:opacity-100 transition-opacity" />
                      </a>
                      <a href="https://www.instagram.com/inewnewton?igsh=MWN1aGNobGdibDYzYw==" target="_blank" rel="noreferrer" aria-label="Instagram" className="group">
                        <img src="https://cdn-icons-png.flaticon.com/128/717/717392.png" alt="Instagram" className="w-4 h-4 sm:w-5 sm:h-5 opacity-60 group-hover:opacity-100 transition-opacity" />
                      </a>
                      <a href="https://www.threads.com/@irfanrizkiaditri" target="_blank" rel="noreferrer" aria-label="Threads" className="group">
                        <img src="https://cdn-icons-png.flaticon.com/128/12105/12105336.png" alt="Threads" className="w-4 h-4 sm:w-5 sm:h-5 opacity-60 group-hover:opacity-100 transition-opacity" />
                      </a>
                      <a href="https://www.linkedin.com/in/irfan-rizki-aditri-b12162368?utm_source=share_via&utm_content=profile&utm_medium=member_android" target="_blank" rel="noreferrer" aria-label="LinkedIn" className="group">
                        <img src="https://cdn-icons-png.flaticon.com/128/3128/3128219.png" alt="LinkedIn" className="w-4 h-4 sm:w-5 sm:h-5 opacity-60 group-hover:opacity-100 transition-opacity" />
                      </a>
                    </div>
                    
                    {/* Right: Submit Button & Length */}
                    <div className="flex items-center space-x-3 sm:space-x-4">
                      <span className="text-[11px] font-medium text-slate-500">{content.length}/500</span>
                      <button
                        type="submit"
                        disabled={isSubmitting || content.trim().length < 10 || cooldownTime > 0}
                        className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-slate-800 bg-white/60 backdrop-blur-sm border border-white/80 rounded-lg hover:bg-white/80 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : cooldownTime > 0 ? `Wait ${cooldownTime}s` : "Send"}
                      </button>
                    </div>
                  </div>
                </div>
                {error && <p className="text-red-500 text-xs mt-3 px-2">{error}</p>}
              </form>
            )}
          </div>

          {/* Divider and Privacy Notice */}
          <div className="pt-4 border-t border-slate-200/60 text-center">
            <p className="text-[13px] text-white font-display">
              Your identity remains completely hidden. We value your privacy and encourage open, respectful communication.
            </p>
          </div>

          {/* Messages List */}
          <div>
            {loadingMessages ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">No public messages yet. Be the first!</p>
              </div>
            ) : (
              <div className="columns-1 md:columns-2 gap-4 sm:gap-6">
                {messages.map((msg) => {
                  const isMyMsg = myMessages.find(m => m.id === msg.id);
                  const canDelete = isMyMsg && (now - msg.timestamp) < 5 * 60 * 1000;

                  return (
                    <div key={msg.id} className="relative break-inside-avoid mb-4 sm:mb-6 p-5 sm:p-6 bg-white/40 backdrop-blur-md rounded-2xl border border-white/50 shadow-sm hover:shadow-md hover:border-white/70 transition-all group">
                      <p className="text-slate-700 text-sm sm:text-[15px] whitespace-pre-wrap leading-relaxed mb-4">{msg.content}</p>
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="font-medium text-slate-800">Anonymous</span>
                        <span>{msg.timestamp ? format(msg.timestamp, "MMM d, yyyy h:mm a") : ""}</span>
                      </div>
                      
                      {/* Delete logic */}
                      {canDelete && (
                        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          {deletingId === msg.id ? (
                            <div className="flex items-center space-x-2 bg-white/90 backdrop-blur-sm border border-slate-200 px-2 py-1 rounded-lg shadow-sm">
                              <span className="text-[10px] font-medium text-slate-600">Delete?</span>
                              <button onClick={() => handleDelete(msg.id)} className="text-[10px] text-red-500 hover:text-red-600 font-bold">Yes</button>
                              <button onClick={() => setDeletingId(null)} className="text-[10px] text-slate-400 hover:text-slate-600">No</button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => setDeletingId(msg.id)}
                              className="text-slate-300 hover:text-red-400 transition-colors p-1"
                              aria-label="Delete message"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
      </PageTransition>
    </>
  );
}
