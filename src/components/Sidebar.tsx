import React from 'react';
import { ViewMode } from '../types/music';
import {
  Home,
  Youtube,
  Sparkles,
  Download,
  Music2,
  PanelLeftClose,
  PanelLeftOpen,
  Tags,
  Zap,
} from 'lucide-react';

interface SidebarProps {
  currentView: ViewMode;
  onSelectView: (view: ViewMode) => void;
  onOpenSystemScanner: () => void;
  onBrowseCatalog: () => void;
  onOpenAiStudio: () => void;
  onOpenMoodTagger?: () => void;
  onOpenDolbyModal?: () => void;
  systemMediaCount: number;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  onOpenSystemScanner,
  onBrowseCatalog,
  onOpenAiStudio,
  onOpenMoodTagger,
  onOpenDolbyModal,
  systemMediaCount,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const options = [
    { id: 'home', label: 'Home', icon: Home, onClick: () => onSelectView('all-songs'), active: currentView === 'all-songs', color: 'text-zinc-200' },
    { id: 'catalog', label: 'Song Catalog', icon: Youtube, onClick: onBrowseCatalog, active: currentView === 'youtube-explore', color: 'text-red-500' },
    { id: 'garba', label: 'Garba Dandiya', icon: Music2, onClick: () => onSelectView('garba'), active: currentView === 'garba', color: 'text-amber-400' },
    { id: 'downloads', label: 'Catch Download', icon: Download, onClick: onOpenSystemScanner, active: currentView === 'system-downloads', color: 'text-cyan-400', count: systemMediaCount },
    { id: 'dolby', label: 'Dolby Sound', icon: Zap, onClick: onOpenDolbyModal, active: false, color: 'text-emerald-400' },
    { id: 'mood', label: 'AI Mood', icon: Tags, onClick: onOpenMoodTagger, active: currentView === 'ai-mood', color: 'text-amber-400' },
    { id: 'lyrics', label: 'AI Lyrics', icon: Sparkles, onClick: onOpenAiStudio, active: currentView === 'ai-studio', color: 'text-purple-400' },
  ].filter(option => Boolean(option.onClick));

  const renderOptions = (compact: boolean) => options.map(option => {
    const Icon = option.icon;
    return (
      <button
        key={option.id}
        type="button"
        onClick={option.onClick}
        title={option.label}
        aria-label={option.label}
        aria-current={option.active ? 'page' : undefined}
        className={compact
          ? `flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${option.active ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-white'}`
          : `flex min-w-0 items-center gap-4 rounded-lg px-3 py-2.5 transition-colors ${option.active ? 'bg-white/5 text-white' : 'text-[#b3b3b3] hover:bg-zinc-800/40 hover:text-white'}`}
      >
        <Icon size={compact ? 20 : 22} className={`shrink-0 ${option.color}`} aria-hidden="true" />
        {!compact && <span>{option.label}</span>}
        {!compact && option.count !== undefined && option.count > 0 && <span className="ml-auto rounded-full bg-cyan-950 px-1.5 py-0.5 text-[10px] font-bold text-cyan-300">{option.count}</span>}
      </button>
    );
  });

  // If collapsed: render compact vertical icon rail
  if (isCollapsed) {
    return (
      <aside className="w-[72px] h-full flex flex-col gap-2 p-2 select-none shrink-0 bg-black text-[#b3b3b3] transition-all duration-300">
        {/* Top Rail Card */}
        <div className="flex-1 min-h-0 overflow-y-auto bg-[#121212] rounded-xl p-2.5 flex flex-col items-center gap-3">
          {/* Bar Icon to Expand Panel */}
          <button
            onClick={onToggleCollapse}
            className="w-10 h-10 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-[#1db954] hover:text-[#1ed760] flex items-center justify-center transition-all shadow-md group relative"
            title="Expand left panel (Ctrl+B)"
          >
            <PanelLeftOpen size={20} className="group-hover:scale-110 transition-transform" />
          </button>

          {/* Logo Icon */}
          <div
            onClick={() => onSelectView('all-songs')}
            className="w-10 h-10 rounded-full bg-[#1db954] flex items-center justify-center text-black font-extrabold cursor-pointer hover:scale-105 transition-transform shadow-lg shadow-[#1db954]/20"
            title="Sawan Music Home"
          >
            <Music2 size={18} strokeWidth={2.5} />
          </div>

          <div className="w-8 h-[1px] bg-zinc-800 my-0.5" />

          <nav aria-label="Sidebar navigation" className="flex flex-col gap-2">{renderOptions(true)}</nav>
        </div>

      </aside>
    );
  }

  return (
    <aside className="w-72 h-full flex flex-col gap-2 p-2 select-none shrink-0 bg-black text-[#b3b3b3] transition-all duration-300">
      {/* Navigation Card */}
      <div className="flex-1 min-h-0 overflow-y-auto bg-[#121212] rounded-xl p-4 flex flex-col gap-4">
        {/* Logo Branding + Bar Icon to Close Left Panel */}
        <div className="flex items-center justify-between px-1">
          <div
            onClick={() => onSelectView('all-songs')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-full bg-[#1db954] flex items-center justify-center text-black font-extrabold shadow-lg shadow-[#1db954]/20 group-hover:scale-105 transition-transform">
              <Music2 size={18} strokeWidth={2.5} />
            </div>
            <div>
              <span className="text-base font-extrabold tracking-tight text-white flex items-center gap-1.5">
                Sawan Music
                <span className="text-[10px] bg-[#1db954]/20 text-[#1db954] font-bold px-1.5 py-0.2 rounded-full border border-[#1db954]/30">
                  Spotify
                </span>
              </span>
              <p className="text-[10px] text-zinc-400 font-devanagari">बॉलीवुड म्यूजिक प्लेयर</p>
            </div>
          </div>

          {/* Bar Icon Button to Close/Collapse Left Panel */}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              title="Close left panel (Ctrl+B)"
            >
              <PanelLeftClose size={19} />
            </button>
          )}
        </div>

        <nav aria-label="Sidebar navigation" className="flex flex-col gap-1 text-sm font-bold">{renderOptions(false)}</nav>
      </div>

    </aside>
  );
};
