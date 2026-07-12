import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, setDoc, getDocs, updateDoc, deleteDoc, addDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Settings, Image as ImageIcon, Link as LinkIcon, Activity, Plus, Trash2, Edit2, Loader2, Save, X, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageTransition } from '@/components/PageTransition';
import { SEO } from '@/components/SEO';
import { useAuth } from '@/context/AuthContext';

const MOCK_DATA = [
  { name: 'Mon', visits: 120 },
  { name: 'Tue', visits: 180 },
  { name: 'Wed', visits: 150 },
  { name: 'Thu', visits: 220 },
  { name: 'Fri', visits: 200 },
  { name: 'Sat', visits: 280 },
  { name: 'Sun', visits: 250 },
];

export function Admin() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'assets' | 'projects'>('dashboard');
  const { isAdmin } = useAuth();
  
  if (!isAdmin) {
    return (
      <>
        <SEO title="Access Denied" description="You do not have permission to access this page." />
        <PageTransition>
          <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 pt-24">
            <div className="text-center">
              <h1 className="text-2xl font-bold font-heading text-slate-900 mb-2">Akses Ditolak</h1>
              <p className="text-slate-500 mb-6">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
              <Link to="/" className="inline-flex items-center text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 px-6 py-2 rounded-full transition-colors">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Kembali ke Beranda
              </Link>
            </div>
          </div>
        </PageTransition>
      </>
    );
  }

  return (
    <>
      <SEO title="Admin Settings" description="Manage site content and settings." />
      <PageTransition>
        <div className="min-h-screen bg-slate-50 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <Link to="/" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors mb-4 group">
                  <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                  Kembali ke Beranda
                </Link>
                <h1 className="text-3xl font-bold font-heading text-slate-900 tracking-tight">Admin Settings</h1>
                <p className="text-slate-500 mt-1">Kelola konten situs, aset, dan analitik Anda.</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="flex overflow-x-auto border-b border-slate-100 hide-scrollbar">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'dashboard' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                  <Activity className="w-4 h-4" />
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveTab('assets')}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'assets' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                  <ImageIcon className="w-4 h-4" />
                  Assets
                </button>
                <button
                  onClick={() => setActiveTab('projects')}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'projects' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                  <LinkIcon className="w-4 h-4" />
                  Projects & Links
                </button>
              </div>

              <div className="p-6">
                {activeTab === 'dashboard' && <DashboardTab />}
                {activeTab === 'assets' && <AssetsTab />}
                {activeTab === 'projects' && <ProjectsTab />}
              </div>
            </div>
          </div>
        </div>
      </PageTransition>
    </>
  );
}

function DashboardTab() {
  const [stats, setStats] = useState({ visitors: 0, messages: 0 });
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    // Total visitors
    const unsubVisits = onSnapshot(doc(db, 'analytics_counts', 'total'), (docSnap) => {
      if (docSnap.exists()) {
        setStats(prev => ({ ...prev, visitors: docSnap.data().visits || 0 }));
      }
    });

    // Messages count
    const qMessages = query(collection(db, 'messages'));
    const unsubMessages = onSnapshot(qMessages, (snapshot) => {
      setStats(prev => ({ ...prev, messages: snapshot.size }));
    });

    // Chart data (last 7 days)
    const qChart = query(collection(db, 'analytics_daily'), orderBy('date', 'desc'));
    const unsubChart = onSnapshot(qChart, (snapshot) => {
      const data = snapshot.docs
        .filter(doc => doc.id !== 'total')
        .map(doc => ({
          name: new Date(doc.id).toLocaleDateString('id-ID', { weekday: 'short' }),
          visits: doc.data().visits || 0,
          rawDate: doc.id
        }))
        .slice(0, 7)
        .reverse();
      
      // Fill missing days if needed or just use available
      
      if (data.length > 0) {
        setChartData(data);
      } else {
        const fallback = Array.from({length: 7}).map((_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          return { name: d.toLocaleDateString('id-ID', { weekday: 'short' }), visits: 0 };
        });
        setChartData(fallback);
      }

    });

    return () => {
      unsubVisits();
      unsubMessages();
      unsubChart();
    };
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-sm font-medium">Total Visitors</p>
            <p className="text-3xl font-bold font-heading text-slate-900 mt-1">{stats.visitors}</p>
          </div>
          <Activity className="w-8 h-8 text-slate-300" />
        </div>
        <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-sm font-medium">Messages</p>
            <p className="text-3xl font-bold font-heading text-slate-900 mt-1">{stats.messages}</p>
          </div>
          <Activity className="w-8 h-8 text-slate-300" />
        </div>
      </div>
      <div className="h-[300px] w-full mt-8">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0f172a" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#0f172a" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              itemStyle={{ color: '#0f172a', fontWeight: 600 }}
            />
            <Area type="monotone" dataKey="visits" stroke="#0f172a" strokeWidth={2} fillOpacity={1} fill="url(#colorVisits)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function AssetsTab() {
  const [characterImages, setCharacterImages] = useState<string[]>([]);
  const [contactImage, setContactImage] = useState('');
  const [musicImage, setMusicImage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newImage, setNewImage] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'site_content', 'assets'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCharacterImages(data.characterImages || []);
        setContactImage(data.contactImage || '');
        setMusicImage(data.musicImage || '');
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'site_content', 'assets'), {
        characterImages,
        contactImage,
        musicImage
      }, { merge: true });
      alert('Assets saved successfully!');
    } catch (error) {
      console.error(error);
      alert('Failed to save assets.');
    } finally {
      setSaving(false);
    }
  };

  const addCharacterImage = () => {
    if (newImage && !characterImages.includes(newImage)) {
      setCharacterImages([...characterImages, newImage]);
      setNewImage('');
    }
  };

  const removeCharacterImage = (index: number) => {
    setCharacterImages(characterImages.filter((_, i) => i !== index));
  };

  if (loading) return <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-4">
        <h3 className="font-bold text-slate-800">Home Character Images (Randomized)</h3>
        <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 space-y-4">
          <div className="flex gap-2">
            <input 
              type="text" 
              value={newImage}
              onChange={(e) => setNewImage(e.target.value)}
              className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
              placeholder="Add image URL (https://res.cloudinary.com/...)"
            />
            <button onClick={addCharacterImage} className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
            {characterImages.map((img, idx) => (
              <div key={idx} className="relative group w-full aspect-square rounded-lg bg-slate-200 overflow-hidden border border-slate-200">
                <img src={img} alt="" className="w-full h-full object-cover" />
                <button 
                  onClick={() => removeCharacterImage(idx)}
                  className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
            {characterImages.length === 0 && <p className="text-xs text-slate-500 col-span-full">No images added. Using defaults.</p>}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-bold text-slate-800">Specific Page Characters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 space-y-3">
            <label className="text-sm font-bold text-slate-800">Contact Message Icon</label>
            <div className="flex gap-4 items-center">
               <input 
                  type="text" 
                  value={contactImage}
                  onChange={(e) => setContactImage(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-900"
                  placeholder="Image URL"
                />
               {contactImage && <img src={contactImage} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />}
            </div>
          </div>
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 space-y-3">
            <label className="text-sm font-bold text-slate-800">Music Page Header</label>
            <div className="flex gap-4 items-center">
               <input 
                  type="text" 
                  value={musicImage}
                  onChange={(e) => setMusicImage(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-900"
                  placeholder="Image URL"
                />
               {musicImage && <img src={musicImage} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />}
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end pt-4">
        <button 
          onClick={handleSave}
          disabled={saving}
          className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save All Assets
        </button>
      </div>
    </div>
  );
}

function ProjectsTab() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [formData, setFormData] = useState({ title: '', description: '', tags: '', icon: '', link: '' });

  useEffect(() => {
    const q = query(collection(db, 'projects_custom'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...formData,
      tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
      updatedAt: Date.now(),
    };

    try {
      if (editingProject) {
        await updateDoc(doc(db, 'projects_custom', editingProject.id), data);
      } else {
        await addDoc(collection(db, 'projects_custom'), { ...data, createdAt: Date.now() });
      }
      setIsModalOpen(false);
      setEditingProject(null);
      setFormData({ title: '', description: '', tags: '', icon: '', link: '' });
    } catch (error) {
      console.error(error);
      alert('Error saving project');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    try {
      await deleteDoc(doc(db, 'projects_custom', id));
    } catch (error) {
      console.error(error);
      alert('Error deleting project');
    }
  };

  const openEdit = (proj: any) => {
    setEditingProject(proj);
    setFormData({
      title: proj.title || '',
      description: proj.description || '',
      tags: (proj.tags || []).join(', '),
      icon: proj.icon || '',
      link: proj.link || ''
    });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
       <div className="flex justify-between items-center">
         <h3 className="font-bold text-slate-800">Featured Projects</h3>
         <button 
           onClick={() => {
             setEditingProject(null);
             setFormData({ title: '', description: '', tags: '', icon: '', link: '' });
             setIsModalOpen(true);
           }}
           className="flex items-center gap-1 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg transition-colors font-medium"
         >
           <Plus className="w-4 h-4" /> Add Project
         </button>
       </div>
       
       {loading ? (
         <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
       ) : (
         <div className="space-y-3">
           {projects.length === 0 ? (
             <p className="text-slate-500 text-sm py-4 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">No projects found. Add one to display on the Home and Projects page.</p>
           ) : (
             projects.map(proj => (
               <div key={proj.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl">
                 <div className="flex items-center gap-4">
                   {proj.icon && <img src={proj.icon} alt="" className="w-10 h-10 rounded-full object-cover border border-slate-200" />}
                   <div>
                     <h4 className="font-bold text-slate-900">{proj.title}</h4>
                     <p className="text-sm text-slate-500 truncate max-w-[200px] sm:max-w-md">{proj.description}</p>
                   </div>
                 </div>
                 <div className="flex items-center gap-2">
                   <button onClick={() => openEdit(proj)} className="p-2 text-slate-400 hover:text-slate-800 transition-colors"><Edit2 className="w-4 h-4" /></button>
                   <button onClick={() => handleDelete(proj.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                 </div>
               </div>
             ))
           )}
         </div>
       )}

       {isModalOpen && (
         <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl animate-in zoom-in-95 duration-200">
             <div className="flex justify-between items-center mb-4">
               <h3 className="font-bold text-lg text-slate-900">{editingProject ? 'Edit Project' : 'Add Project'}</h3>
               <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-900"><X className="w-5 h-5" /></button>
             </div>
             <form onSubmit={handleSubmit} className="space-y-4">
               <div>
                 <label className="text-xs font-bold text-slate-700 mb-1 block">Title</label>
                 <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-900" />
               </div>
               <div>
                 <label className="text-xs font-bold text-slate-700 mb-1 block">Description</label>
                 <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-900 h-24 resize-none" />
               </div>
               <div>
                 <label className="text-xs font-bold text-slate-700 mb-1 block">Tags (comma separated)</label>
                 <input type="text" value={formData.tags} onChange={e => setFormData({...formData, tags: e.target.value})} placeholder="React, Node, etc..." className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-900" />
               </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div>
                   <label className="text-xs font-bold text-slate-700 mb-1 block">Icon URL</label>
                   <input type="text" value={formData.icon} onChange={e => setFormData({...formData, icon: e.target.value})} placeholder="https://..." className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-900" />
                 </div>
                 <div>
                   <label className="text-xs font-bold text-slate-700 mb-1 block">Project Link URL</label>
                   <input type="url" value={formData.link} onChange={e => setFormData({...formData, link: e.target.value})} placeholder="https://..." className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-900" />
                 </div>
               </div>
               <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2 rounded-lg text-sm font-bold mt-2 transition-colors">
                 Save Project
               </button>
             </form>
           </div>
         </div>
       )}
    </div>
  );
}
