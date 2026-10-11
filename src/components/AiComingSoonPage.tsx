import { ArrowLeft, ArrowUpRight, Headphones, Library, Music2, Sparkles, Tags } from 'lucide-react';

interface AiComingSoonPageProps {
  feature: 'mood' | 'lyrics';
  onGoHome: () => void;
  onOpenLibrary: () => void;
}

const featureDetails = {
  mood: {
    title: 'AI Mood',
    description: 'Find the right music for the way you feel. We’re preparing tools to discover and organize songs by mood.',
    caption: 'Music for every feeling',
    accent: '#fbbf24',
    glow: 'rgba(251, 191, 36, 0.09)',
    iconClass: 'border-amber-300/20 bg-amber-300/10 text-amber-300',
    badgeClass: 'border-amber-300/20 bg-amber-300/[0.08] text-amber-200',
    barClass: 'bg-amber-300/60',
  },
  lyrics: {
    title: 'AI Lyrics',
    description: 'Give your words a little more music. We’re preparing AI tools to explore lyrics and bring your song ideas to life.',
    caption: 'A new space for your song ideas',
    accent: '#c084fc',
    glow: 'rgba(192, 132, 252, 0.09)',
    iconClass: 'border-purple-300/20 bg-purple-300/10 text-purple-300',
    badgeClass: 'border-purple-300/20 bg-purple-300/[0.08] text-purple-200',
    barClass: 'bg-purple-300/60',
  },
};

const waveformHeights = [12, 20, 32, 18, 42, 28, 52, 34, 64, 44, 30, 48, 24, 36, 18, 26, 12];
const focusClass = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1ed760]';

export function AiComingSoonPage({ feature, onGoHome, onOpenLibrary }: AiComingSoonPageProps) {
  const details = featureDetails[feature];
  const FeatureIcon = feature === 'mood' ? Tags : Sparkles;

  return (
    <section
      aria-labelledby="ai-coming-soon-title"
      className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-[#121212]"
      style={{ backgroundImage: `radial-gradient(ellipse at 50% 0%, ${details.glow}, transparent 65%)` }}
    >
      <div className="flex min-h-full w-full flex-col items-center justify-center px-4 py-5 sm:px-8 sm:py-6">
        <div className="w-full max-w-2xl">
          <button
            type="button"
            onClick={onGoHome}
            className={`mb-3 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-medium text-zinc-400 transition-colors hover:text-white ${focusClass}`}
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Back to Home
          </button>

          <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#181818] shadow-2xl shadow-black/20">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-64"
              style={{ background: `radial-gradient(ellipse at 50% 0%, ${details.glow}, transparent 75%)` }}
            />

            <div className="relative flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-4 sm:px-8 sm:py-5">
              <div className="flex items-center gap-2.5 text-sm font-bold text-zinc-200">
                <FeatureIcon size={18} style={{ color: details.accent }} aria-hidden="true" />
                <span>{details.title}</span>
              </div>
              <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${details.badgeClass}`}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
                Coming soon
              </span>
            </div>

            <div className="relative px-5 py-6 text-center sm:px-10 sm:py-8">
              <div aria-hidden="true" className="relative mx-auto mb-4 flex h-24 w-40 items-center justify-center sm:mb-5 sm:h-32 sm:w-44">
                <div className="absolute h-24 w-24 rounded-full border border-white/[0.04] sm:h-28 sm:w-28" />
                <div className="absolute h-20 w-20 rounded-full border border-white/[0.06] sm:h-24 sm:w-24" />
                <div className={`relative flex h-14 w-14 items-center justify-center rounded-2xl border sm:h-16 sm:w-16 ${details.iconClass}`}>
                  <FeatureIcon size={34} strokeWidth={1.5} />
                </div>
                <Music2 size={16} className="absolute left-3 top-6 -rotate-12 text-zinc-500 sm:left-4 sm:top-8" />
                <Sparkles size={16} className="absolute right-4 top-3 text-zinc-500 sm:right-5 sm:top-5" />
                <div className="absolute bottom-0 left-1/2 flex h-8 -translate-x-1/2 items-center gap-1 rounded-full border border-white/[0.06] bg-[#181818] px-3">
                  {waveformHeights.map((height, index) => (
                    <span key={index} className={`w-0.5 rounded-full ${details.barClass}`} style={{ height: `${height / 3}px` }} />
                  ))}
                </div>
              </div>

              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-zinc-400">
                {details.caption}
              </p>
              <h1 id="ai-coming-soon-title" className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
                Coming soon
              </h1>
              <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-zinc-400 sm:text-base">
                {details.description}
              </p>

              <div className="mt-5 flex flex-col items-stretch justify-center gap-3 sm:mt-6 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  onClick={onGoHome}
                  className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#1db954] px-6 py-3 text-sm font-bold text-black transition-colors hover:bg-[#1ed760] ${focusClass}`}
                >
                  <Headphones size={18} aria-hidden="true" />
                  Explore music
                </button>
                <button
                  type="button"
                  onClick={onOpenLibrary}
                  className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.03] px-6 py-3 text-sm font-semibold text-zinc-200 transition-colors hover:border-white/30 hover:bg-white/[0.08] hover:text-white ${focusClass}`}
                >
                  <Library size={17} aria-hidden="true" />
                  Your Library
                  <ArrowUpRight size={15} className="ml-1" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="border-t border-white/[0.06] px-5 py-3 text-center sm:px-8">
              <p className="text-xs leading-5 text-zinc-400">
                Keep enjoying your songs and playlists while we get this feature ready.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
