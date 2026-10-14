import { useState, type FormEvent } from 'react';
import { ArrowLeft, LoaderCircle, Music2, Sparkles } from 'lucide-react';

interface SongAnalysis {
  title?: string;
  originalArtist?: string;
  movieOrAlbum?: string;
  keySignature?: string;
  bpm?: number;
  mood?: string;
  genre?: string;
  themeAnalysis?: string;
  timedLyrics?: Array<{ time: number; devanagari: string; romanized: string; english: string }>;
}

export function AiSongAnalyzer({ onBack }: { onBack: () => void }) {
  const [songName, setSongName] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [analysis, setAnalysis] = useState<SongAnalysis | null>(null);
  const [error, setError] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setAnalysis(null);
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/music/analyze-song', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lyrics, songName: songName.trim() || 'Untitled song' }),
      });
      const data = await response.json();
      if (!response.ok || !data.success || !data.analysis) {
        throw new Error(data.error || 'Could not analyze these lyrics.');
      }
      setAnalysis(data.analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not analyze these lyrics.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <section className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-[#121212] text-white">
      <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-8 sm:py-8">
        <button type="button" onClick={onBack} className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-medium text-zinc-400 hover:text-white">
          <ArrowLeft size={16} aria-hidden="true" /> Back to Home
        </button>

        <div className="rounded-3xl border border-purple-300/15 bg-[#181818] p-5 shadow-2xl sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-purple-300/20 bg-purple-300/10 text-purple-300">
              <Sparkles size={23} aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-purple-200">AI Lyrics</p>
              <h1 className="text-2xl font-bold sm:text-3xl">Explore your lyrics</h1>
            </div>
          </div>

          <p className="mb-6 max-w-2xl text-sm leading-6 text-zinc-400">
            Get a lyrical theme, mood, genre, and musical metadata. Song credits and timing are estimates and may need review.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block text-sm font-medium text-zinc-200">
              Song title <span className="font-normal text-zinc-500">(optional)</span>
              <input value={songName} onChange={(event) => setSongName(event.target.value)} maxLength={160} className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-white outline-none focus:border-purple-300/60" placeholder="Give your song a name" />
            </label>
            <label className="block text-sm font-medium text-zinc-200">
              Lyrics
              <textarea required value={lyrics} onChange={(event) => setLyrics(event.target.value)} maxLength={12000} rows={8} className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-black/30 p-3 text-sm leading-6 text-white outline-none focus:border-purple-300/60" placeholder="Paste lyrics you wrote or have permission to analyze" />
            </label>
            <button disabled={isAnalyzing || !lyrics.trim()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-purple-300 px-5 py-2.5 text-sm font-bold text-black transition-colors hover:bg-purple-200 disabled:cursor-not-allowed disabled:opacity-50">
              {isAnalyzing ? <LoaderCircle size={17} className="animate-spin" aria-hidden="true" /> : <Sparkles size={17} aria-hidden="true" />}
              {isAnalyzing ? 'Analyzing…' : 'Analyze lyrics'}
            </button>
          </form>

          {error && <p role="alert" className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}

          {analysis && (
            <div className="mt-7 space-y-5 border-t border-white/10 pt-6">
              <div>
                <h2 className="text-xl font-bold">{analysis.title || songName || 'Song analysis'}</h2>
                <p className="mt-1 text-sm text-zinc-400">{[analysis.originalArtist, analysis.movieOrAlbum].filter(Boolean).join(' · ')}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[['Mood', analysis.mood], ['Genre', analysis.genre], ['Key', analysis.keySignature], ['Tempo', analysis.bpm ? `${analysis.bpm} BPM` : undefined]].filter((item) => item[1]).map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-white/[0.08] bg-black/20 p-3">
                    <p className="text-xs text-zinc-500">{label}</p>
                    <p className="mt-1 text-sm font-semibold text-zinc-100">{value}</p>
                  </div>
                ))}
              </div>
              {analysis.themeAnalysis && <p className="text-sm leading-6 text-zinc-300">{analysis.themeAnalysis}</p>}
              {!!analysis.timedLyrics?.length && (
                <div>
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-200"><Music2 size={16} aria-hidden="true" /> Lyric guide</h3>
                  <div className="space-y-3">
                    {analysis.timedLyrics.map((line, index) => (
                      <div key={`${line.time}-${index}`} className="rounded-xl border border-white/[0.08] bg-black/20 p-3">
                        <p className="mb-1 text-xs text-purple-200">~{Math.round(line.time)} sec</p>
                        {line.devanagari && <p className="text-sm text-white">{line.devanagari}</p>}
                        {line.romanized && <p className="text-sm text-zinc-300">{line.romanized}</p>}
                        {line.english && <p className="text-sm text-zinc-500">{line.english}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
