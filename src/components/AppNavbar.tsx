import React, { useEffect, useId, useRef, useState } from 'react';
import { Home, Library, Search, X } from 'lucide-react';
import type { MusicProfile } from './AccountModal';
import type { ViewMode } from '../types/music';

interface AppNavbarProps {
  profile: MusicProfile | null;
  currentView: ViewMode;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onOpenLibrary: () => void;
  onHome: () => void;
  onOpenAccount: (mode: 'signup' | 'login') => void;
  onSignOut: () => void;
}

export const AppNavbar: React.FC<AppNavbarProps> = ({
  profile,
  currentView,
  searchQuery,
  onSearchChange,
  onOpenLibrary,
  onHome,
  onOpenAccount,
  onSignOut,
}) => {
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const accountButtonRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const accountMenuId = useId();
  const isLibraryView = [
    'library', 'favorites', 'playlists', 'playlist-detail', 'system-downloads', 'artists', 'albums',
  ].includes(currentView);

  useEffect(() => {
    if (!isAccountMenuOpen) return;

    const handleOutsideClick = (event: PointerEvent) => {
      if (event.target instanceof Node && !accountRef.current?.contains(event.target)) {
        setIsAccountMenuOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsAccountMenuOpen(false);
        accountButtonRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isAccountMenuOpen]);

  useEffect(() => {
    setIsAccountMenuOpen(false);
  }, [currentView, profile?.email]);

  const goHome = () => {
    setIsAccountMenuOpen(false);
    onHome();
  };

  return (
    <header className="app-navbar sticky top-0 z-40 shrink-0 border-b border-zinc-800/60 bg-[#121212]/95 px-3 py-3 text-zinc-100 backdrop-blur-md sm:px-6" style={{ containerType: 'inline-size' }}>
      <style>{`
        .app-navbar .app-navbar-row {
          display: grid;
          grid-template-columns: 40px minmax(0, 1fr);
          align-items: center;
          gap: 10px 12px;
        }
        .app-navbar .app-navbar-search {
          grid-column: 1 / -1;
          grid-row: 2;
        }
        .app-navbar .app-navbar-actions {
          grid-column: 2;
          grid-row: 1;
          justify-self: end;
        }
        @container (min-width: 500px) {
          .app-navbar .app-navbar-row {
            grid-template-columns: 40px minmax(0, 1fr) auto;
          }
          .app-navbar .app-navbar-search {
            grid-column: 2;
            grid-row: 1;
          }
          .app-navbar .app-navbar-actions {
            grid-column: 3;
          }
        }
      `}</style>
      <div className="app-navbar-row min-w-0">
        <button
          type="button"
          aria-label="Home"
          aria-current={currentView === 'all-songs' ? 'page' : undefined}
          onClick={goHome}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-zinc-300 transition hover:bg-zinc-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1ed760]"
        >
          <Home size={19} aria-hidden="true" />
        </button>

        <div className="app-navbar-search relative min-w-0">
          <Search size={18} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            ref={searchRef}
            id="library-search"
            name="librarySearch"
            type="text"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            data-catalog-search
            aria-label="Search available songs"
            placeholder="Search songs, artists, albums..."
            className="h-10 w-full min-w-0 rounded-full border border-transparent bg-[#242424] pl-10 pr-10 text-xs text-white placeholder-zinc-400 transition hover:bg-[#2a2a2a] focus:border-zinc-600 focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              aria-label="Clear song search"
              onClick={() => {
                onSearchChange('');
                searchRef.current?.focus();
              }}
              className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-zinc-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1ed760]"
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </div>

        <nav className="app-navbar-actions flex min-w-0 items-center gap-2" aria-label="Main navigation">
          <button
            type="button"
            onClick={() => {
              setIsAccountMenuOpen(false);
              onOpenLibrary();
            }}
            aria-current={isLibraryView ? 'page' : undefined}
            className={`flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1ed760] ${isLibraryView ? 'border-emerald-500/40 bg-emerald-500/15 text-[#1ed760]' : 'border-zinc-700 bg-zinc-800/60 text-zinc-200 hover:border-zinc-500 hover:bg-zinc-800 hover:text-white'}`}
          >
            <Library size={16} aria-hidden="true" />
            <span>Library</span>
          </button>

          {profile ? (
            <div ref={accountRef} className="relative shrink-0">
              <button
                ref={accountButtonRef}
                type="button"
                onClick={() => setIsAccountMenuOpen((open) => !open)}
                aria-label="Open account menu"
                aria-expanded={isAccountMenuOpen}
                aria-controls={accountMenuId}
                className="flex h-10 items-center gap-2 rounded-full bg-zinc-800 p-1 text-white transition hover:bg-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1ed760] sm:pr-3"
              >
                <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-[#1db954] to-emerald-300 text-xs font-extrabold text-black">
                  {profile.name.trim().slice(0, 1).toUpperCase() || 'S'}
                </span>
                <span className="hidden max-w-24 truncate text-xs font-semibold sm:inline">{profile.name}</span>
              </button>
              {isAccountMenuOpen && (
                <div id={accountMenuId} aria-label="Account menu" className="absolute right-0 top-12 z-50 w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-zinc-700 bg-[#282828] p-2 text-sm text-zinc-100 shadow-2xl">
                  <div className="border-b border-zinc-700 px-3 py-2">
                    <p className="truncate font-bold text-white">{profile.name}</p>
                    <p className="truncate text-xs text-zinc-400">{profile.email}</p>
                  </div>
                  <button type="button" onClick={goHome} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1ed760]">Recently played</button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAccountMenuOpen(false);
                      onSignOut();
                    }}
                    className="mt-1 block w-full rounded-lg border-t border-zinc-700 px-3 pb-2 pt-3 text-left hover:text-[#1ed760] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1ed760]"
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex shrink-0 items-center gap-2">
              <button type="button" onClick={() => onOpenAccount('signup')} className="hidden rounded-full px-3 py-2 text-xs font-bold text-zinc-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1ed760] sm:block">Sign up</button>
              <button type="button" onClick={() => onOpenAccount('login')} className="h-10 rounded-full bg-white px-4 text-xs font-extrabold text-black transition hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1ed760]">Log in</button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};
