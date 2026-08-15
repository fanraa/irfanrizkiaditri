import React, { useState, useEffect } from 'react';
import { Settings, Save, Check } from 'lucide-react';

export function SettingsTab() {
  const [apiKey, setApiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(res => res.json())
      .then(data => {
        if (data.key) setApiKey(data.key);
      });
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ geminiApiKey: apiKey })
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch(e) {
      console.error(e);
    }
    setIsSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="p-2 bg-white rounded-lg border border-slate-200 shrink-0">
            <Settings className="w-5 h-5 text-slate-700" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">AI Configuration</h3>
            <p className="text-xs text-slate-500 mt-1">Configure Gemini AI API key to enable rich song descriptions. If empty, the system will fallback to Wikipedia.</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Gemini API Key</label>
            <input 
              type="password" 
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..." 
              className="w-full text-sm px-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
            />
          </div>
          
          <div className="flex justify-end">
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {isSaved ? 'Saved' : isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
