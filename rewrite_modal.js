const fs = require('fs');

const code = `
function AddTrackModal({ isOpen, onClose, onAdded }: { isOpen: boolean; onClose: () => void; onAdded: () => void }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ title: '', artist: '', youtubeId: '', coverUrl: '' });

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let finalYtId = formData.youtubeId;
      if (finalYtId.includes('youtube.com') || finalYtId.includes('youtu.be')) {
        try {
          const url = new URL(finalYtId);
          if (url.hostname === 'youtu.be') {
            finalYtId = url.pathname.slice(1);
          } else {
            finalYtId = url.searchParams.get('v') || finalYtId;
          }
        } catch (err) {}
      }
      await addDoc(collection(db, "music_playlist"), {
        title: formData.title,
        artist: formData.artist,
        youtubeId: finalYtId,
        coverUrl: formData.coverUrl,
        order: Date.now()
      });
      onAdded();
      onClose();
      setFormData({ title: '', artist: '', youtubeId: '', coverUrl: '' });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden relative flex flex-col md:flex-row" 
        onClick={e => e.stopPropagation()}
      >
        {/* Image Preview (Left on Desktop, Top on Mobile) */}
        <div className={cn("relative bg-slate-100 flex-shrink-0 flex items-center justify-center", formData.coverUrl ? "" : "hidden md:flex", "h-32 md:h-auto md:w-2/5")}>
          {formData.coverUrl ? (
            <img src={formData.coverUrl} alt="Cover Preview" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/300?text=Invalid+Image'; }} />
          ) : (
            <div className="text-slate-400 flex flex-col items-center justify-center space-y-2 p-4 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-image"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
              <span className="text-xs font-medium">Cover Preview</span>
            </div>
          )}
          {/* Close button for mobile when image is shown (overlay) */}
          <button onClick={onClose} className="md:hidden absolute top-2 right-2 p-1.5 bg-black/40 hover:bg-black/60 rounded-full text-white transition-colors backdrop-blur-md">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Container */}
        <div className="p-5 md:p-6 flex-1 flex flex-col">
          <div className="flex justify-between items-center mb-4 md:mb-5">
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Add Track</h2>
            <button onClick={onClose} className="hidden md:flex p-1.5 hover:bg-slate-200/50 rounded-full text-slate-500 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3.5 flex-1 flex flex-col">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wider">Title</label>
              <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-3 py-1.5 text-sm bg-white/50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition-all placeholder-slate-400" placeholder="Song Title" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wider">Artist</label>
              <input required type="text" value={formData.artist} onChange={e => setFormData({...formData, artist: e.target.value})} className="w-full px-3 py-1.5 text-sm bg-white/50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition-all placeholder-slate-400" placeholder="Artist Name" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wider">YouTube ID/Link</label>
              <input required type="text" value={formData.youtubeId} onChange={e => setFormData({...formData, youtubeId: e.target.value})} className="w-full px-3 py-1.5 text-sm bg-white/50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition-all placeholder-slate-400" placeholder="e.g. dQw4w9WgXcQ" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wider">Cover Image URL</label>
              <input required type="url" value={formData.coverUrl} onChange={e => setFormData({...formData, coverUrl: e.target.value})} className="w-full px-3 py-1.5 text-sm bg-white/50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition-all placeholder-slate-400" placeholder="https://..." />
            </div>
            <div className="pt-3 mt-auto flex justify-end gap-2">
              <button type="button" onClick={onClose} className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100/50 hover:bg-slate-200/50 rounded-full transition-all">Cancel</button>
              <button type="submit" disabled={loading} className="px-5 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-full hover:bg-slate-800 disabled:opacity-50 transition-all shadow-md">
                {loading ? 'Adding...' : 'Add Track'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
}
`;

const path = 'src/pages/Music.tsx';
let content = fs.readFileSync(path, 'utf8');

const regex = /function AddTrackModal\(\{ isOpen, onClose, onAdded \}: \{ isOpen: boolean; onClose: \(\) => void; onAdded: \(\) => void \}\) \{[\s\S]*?(?=export function Music\(\) \{)/;
content = content.replace(regex, code);
fs.writeFileSync(path, content);
