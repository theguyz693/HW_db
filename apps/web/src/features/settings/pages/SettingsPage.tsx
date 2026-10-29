import { useState, useEffect } from 'react';
import {
  Settings,
  Trash2,
  Download,
  Upload,
  AlertTriangle,
  Sparkles,
  Database,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Copy,
} from 'lucide-react';
import { mockDb } from '@/lib/mockDb.ts';
import { isSupabaseConfigured, testSupabaseConnection } from '@/lib/supabase.ts';
import { Button } from '@/components/ui/Button.tsx';
import { useTheme, ACCENT_COLORS, ALL_THEMES, type AccentName, type Theme } from '@/providers/ThemeProvider.tsx';
import toast from 'react-hot-toast';

export function SettingsPage() {
  const { theme: appTheme, setTheme: setAppTheme, accentColor, setAccentColor } = useTheme();
  
  const [theme, setTheme] = useState<Theme>('dark');
  const [defaultView, setDefaultView] = useState<'gallery' | 'compact' | 'shelf'>('gallery');
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Supabase Connection Status State
  const [supabaseConnected, setSupabaseConnected] = useState<boolean>(isSupabaseConfigured());
  const [isTestingSupabase, setIsTestingSupabase] = useState(false);
  const [supabaseStatusMsg, setSupabaseStatusMsg] = useState<string>('');

  useEffect(() => {
    setTheme(appTheme);
    const user = mockDb.getUser();
    if (user) {
      setDefaultView((user.preferences.defaultView as any) || 'gallery');
    }
    checkSupabase();
  }, [appTheme]);

  const checkSupabase = async () => {
    setIsTestingSupabase(true);
    try {
      const res = await testSupabaseConnection();
      setSupabaseConnected(res.ok);
      setSupabaseStatusMsg(res.message);
    } catch (err: any) {
      setSupabaseConnected(false);
      setSupabaseStatusMsg(err.message || 'Connection test failed');
    } finally {
      setIsTestingSupabase(false);
    }
  };

  const handleSavePreferences = () => {
    try {
      setAppTheme(theme);
      mockDb.updatePreferences(theme as any, defaultView);
      toast.success('Preferences saved successfully!');
    } catch {
      toast.error('Failed to save preferences.');
    }
  };

  const handleResetDatabase = () => {
    try {
      mockDb.resetDb();
      toast.success('Database has been reset to defaults!');
      setIsResetConfirmOpen(false);
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch {
      toast.error('Failed to reset database.');
    }
  };

  // --- EXPORT JSON BACKUP ---
  const handleExportBackup = () => {
    try {
      const collections = localStorage.getItem('collectorhub_collections');
      const items = localStorage.getItem('collectorhub_items');
      const user = localStorage.getItem('collectorhub_user');

      const backupObj = {
        collections: collections ? JSON.parse(collections) : [],
        items: items ? JSON.parse(items) : [],
        user: user ? JSON.parse(user) : {},
        exportedAt: new Date().toISOString(),
        version: '2.0.0',
        backend: isSupabaseConfigured() ? 'supabase' : 'local_storage',
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupObj, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `collectorhub_backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast.success('JSON Database backup exported!');
    } catch {
      toast.error('Export failed.');
    }
  };

  // --- IMPORT JSON BACKUP ---
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        
        if (!parsed.collections || !parsed.items || !parsed.user) {
          toast.error('Invalid backup file structure.');
          return;
        }

        localStorage.setItem('collectorhub_collections', JSON.stringify(parsed.collections));
        localStorage.setItem('collectorhub_items', JSON.stringify(parsed.items));
        localStorage.setItem('collectorhub_user', JSON.stringify(parsed.user));
        
        toast.success('Database successfully restored!');
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } catch (err) {
        toast.error('Failed to parse JSON backup file.');
      }
    };
    reader.readAsText(file);
  };

  const copySqlSchema = () => {
    navigator.clipboard.writeText(`-- Run schema from supabase/migrations/001_initial_schema.sql in Supabase SQL Editor`);
    toast.success('Schema reference copied! Check supabase/migrations/001_initial_schema.sql');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold">Preferences & Database Settings</h1>
        <p className="text-text-secondary mt-1">Configure layout, themes, Supabase backend connectivity, and data backups.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* --- LEFT: FORMS & BACKEND --- */}
        <div className="md:col-span-2 space-y-6">
          {/* Supabase Backend Integration Card */}
          <div className="p-6 rounded-3xl bg-bg-elevated border border-border space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Database size={17} className="text-emerald" /> Supabase Backend Status
              </h3>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${supabaseConnected ? 'bg-emerald/10 text-emerald border-emerald/20' : 'bg-amber/10 text-amber border-amber/20'}`}>
                {supabaseConnected ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                {supabaseConnected ? 'Supabase Active' : 'Offline / Demo Mode'}
              </span>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed">
              {supabaseStatusMsg || (isSupabaseConfigured()
                ? 'Connected to your remote Supabase PostgreSQL database and Storage.'
                : 'Running in offline demo mode using browser storage. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to connect to live Supabase.')}
            </p>

            <div className="p-4 rounded-2xl bg-bg-surface/70 border border-border text-xs space-y-2">
              <div className="font-semibold text-text-primary flex items-center justify-between">
                <span>Migration Script: <code>001_initial_schema.sql</code></span>
                <button
                  onClick={copySqlSchema}
                  className="text-accent hover:underline flex items-center gap-1 text-xs cursor-pointer"
                >
                  <Copy size={12} /> Copy Reference
                </button>
              </div>
              <p className="text-text-muted text-[11px]">
                Contains PostgreSQL tables (<code>profiles</code>, <code>collections</code>, <code>collection_items</code>), Row Level Security (RLS) policies, and <code>item-images</code> storage bucket setup.
              </p>
            </div>

            <div className="flex gap-3 pt-1">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<RefreshCw size={14} className={isTestingSupabase ? 'animate-spin' : ''} />}
                onClick={checkSupabase}
                isLoading={isTestingSupabase}
              >
                Test Connection
              </Button>
            </div>
          </div>

          {/* Preferences */}
          <div className="p-6 rounded-3xl bg-bg-elevated border border-border space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-1.5">
                <Settings size={16} className="text-accent" /> Visual Themes & Interface
              </h3>
              <span className="text-[11px] font-bold text-accent px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 capitalize">
                Active: {theme}
              </span>
            </div>

            {/* 7 Visual Theme Cards */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-text-secondary">Select Global Theme (7 Themes Available):</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {ALL_THEMES.map((t) => {
                  const isSelected = theme === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setTheme(t.id);
                        setAppTheme(t.id);
                      }}
                      className={`p-3 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between gap-2.5 relative overflow-hidden ${isSelected ? 'bg-bg-surface border-accent shadow-lg ring-2 ring-accent/30 scale-[1.02]' : 'bg-bg-surface/50 hover:bg-bg-surface border-border hover:border-border-hover'}`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-text-primary flex items-center gap-1.5">
                            {t.name}
                            {isSelected && <CheckCircle2 size={13} className="text-accent" />}
                          </span>
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-bg-elevated border border-border/80 text-text-muted">
                            {t.tag}
                          </span>
                        </div>
                        <p className="text-[10px] text-text-secondary mt-1 leading-snug">
                          {t.description}
                        </p>
                      </div>

                      {/* Swatches */}
                      <div className="flex items-center gap-1.5 pt-1 border-t border-border/40">
                        {t.colors.map((c, idx) => (
                          <span
                            key={idx}
                            className="w-3.5 h-3.5 rounded-full border border-black/20 shadow-sm"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/60">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-text-secondary">Quick Theme Dropdown</label>
                <select
                  value={theme}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                    const newTheme = e.target.value as Theme;
                    setTheme(newTheme);
                    setAppTheme(newTheme);
                  }}
                  className="w-full h-11 px-4 rounded-xl text-sm bg-bg-surface border border-border focus:border-accent focus:outline-none"
                >
                  <option value="dark">1. Dark Theme (Obsidian Default)</option>
                  <option value="light">2. Light Theme (Crisp Porcelain)</option>
                  <option value="industrial">3. Industrial (Factory Spec & Orange)</option>
                  <option value="punk">4. Punk (Vaporwave & Neon Magenta)</option>
                  <option value="windowsxp">5. Windows XP (Retro 2001 & Luna Blue)</option>
                  <option value="brutal">6. Brutal (Neo-Brutalist & Hard Shadows)</option>
                  <option value="max">7. Max (Maximalism & Y2K Hyperpop)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-text-secondary">Default Grid Layout</label>
                <select
                  value={defaultView}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setDefaultView(e.target.value as any)}
                  className="w-full h-11 px-4 rounded-xl text-sm bg-bg-surface border border-border focus:border-accent focus:outline-none"
                >
                  <option value="gallery">Gallery Grid</option>
                  <option value="compact">Compact List</option>
                  <option value="shelf">Wooden Shelf View</option>
                </select>
              </div>

              {/* Accent Color picker */}
              <div className="flex flex-col gap-1.5 sm:col-span-2 mt-2">
                <label className="text-xs font-semibold text-text-secondary">App Accent Customization</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {Object.keys(ACCENT_COLORS).map((name) => {
                    const isSelected = accentColor === name;
                    const nameCapitalized = name.charAt(0).toUpperCase() + name.slice(1);
                    
                    const bgClassMap: Record<string, string> = {
                      racing: 'bg-[#e3262f] hover:bg-[#e3262f]/90',
                      indigo: 'bg-indigo hover:bg-indigo/90',
                      cyan: 'bg-cyan hover:bg-cyan/90 text-text-inverse',
                      emerald: 'bg-emerald hover:bg-emerald/90',
                      amber: 'bg-amber hover:bg-amber/90 text-text-inverse',
                      rose: 'bg-rose hover:bg-rose/90',
                      violet: 'bg-violet hover:bg-violet/90',
                    };
                    
                    const bgClass = bgClassMap[name as AccentName] || 'bg-accent';

                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setAccentColor(name as AccentName)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${bgClass} ${isSelected ? 'ring-4 ring-offset-2 ring-offset-bg-elevated ring-accent scale-105' : 'opacity-70'}`}
                      >
                        {nameCapitalized}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Button variant="accent" onClick={handleSavePreferences}>
                Save Preferences
              </Button>
            </div>
          </div>

          {/* Backup Management */}
          <div className="p-6 rounded-3xl bg-bg-elevated border border-border space-y-4">
            <div>
              <h3 className="text-sm font-bold flex items-center gap-1.5">
                <Sparkles size={16} className="text-violet" /> Data Export & Import
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                Export a full JSON snapshot of your collections and items, or restore from a previous backup file.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                variant="secondary"
                leftIcon={<Download size={16} />}
                onClick={handleExportBackup}
                className="flex-1"
              >
                Export JSON Backup
              </Button>

              <label className="flex-1">
                <div className="h-10 px-4 rounded-xl border border-border bg-bg-surface hover:bg-bg-hover hover:border-border-hover transition-colors font-medium text-sm flex items-center justify-center gap-2 cursor-pointer select-none">
                  <Upload size={16} className="text-text-secondary" />
                  <span>Import JSON Backup</span>
                </div>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* --- RIGHT: DANGER ZONE --- */}
        <div className="space-y-4">
          <div className="p-6 rounded-3xl bg-error/5 border border-error/20 space-y-4">
            <h3 className="text-sm font-bold text-error flex items-center gap-1.5">
              <AlertTriangle size={16} /> Danger Zone
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Resetting will completely wipe all local collections, items, achievements, and configurations from this device's memory.
            </p>

            {!isResetConfirmOpen ? (
              <Button
                variant="danger"
                fullWidth
                onClick={() => setIsResetConfirmOpen(true)}
                leftIcon={<Trash2 size={16} />}
              >
                Reset Local Database
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="text-[10px] text-error font-bold uppercase tracking-wider">Are you absolutely sure?</p>
                <div className="flex gap-2">
                  <Button variant="danger" size="sm" className="flex-1" onClick={handleResetDatabase}>
                    Yes, Reset
                  </Button>
                  <Button variant="secondary" size="sm" className="flex-1" onClick={() => setIsResetConfirmOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
