import React, { useState } from 'react';
import { ArrowLeft, Check, Music2, X } from 'lucide-react';

export interface MusicProfile {
  name: string;
  email: string;
}

interface AccountModalProps {
  mode: 'signup' | 'login';
  savedProfile: MusicProfile | null;
  onClose: () => void;
  onComplete: (profile: MusicProfile) => void;
  onChangeMode: (mode: 'signup' | 'login') => void;
}

const genres = ['Bollywood', 'Punjabi', 'Lo-Fi', 'Indie', 'Classical', 'Pop'];

export const AccountModal: React.FC<AccountModalProps> = ({
  mode,
  savedProfile,
  onClose,
  onComplete,
  onChangeMode,
}) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState(mode === 'login' ? savedProfile?.email || '' : '');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>(['Bollywood']);
  const [error, setError] = useState('');

  const finish = () => {
    const profile = mode === 'signup' ? { name: name.trim(), email: email.trim() } : savedProfile;
    if (!profile || profile.email.toLowerCase() !== email.trim().toLowerCase()) {
      setError('No Sawan profile for this email was found on this device. Create an account first.');
      return;
    }
    onComplete(profile);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="relative max-h-[94dvh] w-full max-w-[520px] overflow-y-auto rounded-2xl border border-zinc-800 bg-[#121212] px-6 py-7 text-white shadow-2xl sm:px-12 sm:py-9">
        <button onClick={onClose} aria-label="Close account dialog" className="absolute right-4 top-4 rounded-full p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white">
          <X size={19} />
        </button>
        <div className="mx-auto mb-6 flex h-11 w-11 items-center justify-center rounded-full bg-[#1db954] text-black">
          <Music2 size={22} />
        </div>

        {mode === 'signup' ? (
          <>
            <div className="mb-7 h-1 overflow-hidden rounded-full bg-zinc-700">
              <div className={`h-full bg-[#1ed760] transition-all ${step === 1 ? 'w-1/2' : 'w-full'}`} />
            </div>
            <p className="text-sm text-zinc-300">Step {step} of 2</p>
            <h1 className="mt-1 text-2xl font-extrabold">{step === 1 ? 'Create your account' : 'Make it yours'}</h1>

            {step === 1 ? (
              <form className="mt-7 space-y-4" onSubmit={(event) => {
                event.preventDefault();
                if (!name.trim() || !email.trim() || !birthDate || !gender) {
                  setError('Please complete each field to continue.');
                  return;
                }
                setError('');
                setStep(2);
              }}>
                <label className="block text-sm font-semibold">Email address
                  <input id="signup-email" name="email" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="account-field mt-2" placeholder="you@example.com" />
                </label>
                <label className="block text-sm font-semibold">Name
                  <span className="mt-1 block text-xs font-normal text-zinc-400">This name will appear on your profile</span>
                  <input id="signup-name" name="name" required value={name} onChange={(event) => setName(event.target.value)} className="account-field mt-2" placeholder="Your name" />
                </label>
                <label className="block text-sm font-semibold">Date of birth
                  <input id="signup-birth-date" name="birthDate" required type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} className="account-field mt-2 [color-scheme:dark]" />
                </label>
                <fieldset>
                  <legend className="mb-2 text-sm font-semibold">Gender</legend>
                  <div className="flex flex-wrap gap-x-5 gap-y-3 text-sm text-zinc-200">
                    {['Woman', 'Man', 'Non-binary', 'Something else', 'Prefer not to say'].map((option) => (
                      <label key={option} className="flex items-center gap-2">
                        <input type="radio" name="gender" value={option} checked={gender === option} onChange={() => setGender(option)} className="accent-[#1ed760]" />
                        {option}
                      </label>
                    ))}
                  </div>
                </fieldset>
                {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
                <button type="submit" className="w-full rounded-full bg-[#1ed760] py-3 font-bold text-black hover:bg-[#3be477]">Next</button>
              </form>
            ) : (
              <div className="mt-6">
                <p className="text-sm text-zinc-300">Choose a few sounds you enjoy. You can change these later.</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {genres.map((genre) => {
                    const selected = selectedGenres.includes(genre);
                    return <button key={genre} onClick={() => setSelectedGenres((current) => selected ? current.filter((item) => item !== genre) : [...current, genre])} className={`rounded-full border px-4 py-2 text-sm font-semibold ${selected ? 'border-[#1ed760] bg-[#1ed760] text-black' : 'border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-zinc-500'}`}>
                      {selected && <Check size={14} className="mr-1 inline" />}{genre}
                    </button>;
                  })}
                </div>
                <p className="mt-5 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs leading-relaxed text-amber-100/80">
                  Account preview: your profile is saved on this device. Secure cloud sign-in is not connected yet.
                </p>
                {error && <p role="alert" className="mt-3 text-sm text-red-400">{error}</p>}
                <div className="mt-6 flex gap-3">
                  <button onClick={() => { setError(''); setStep(1); }} className="flex items-center gap-1 rounded-full border border-zinc-700 px-5 py-3 font-semibold hover:bg-zinc-800"><ArrowLeft size={16} /> Back</button>
                  <button onClick={finish} className="flex-1 rounded-full bg-[#1ed760] py-3 font-bold text-black hover:bg-[#3be477]">Create account</button>
                </div>
              </div>
            )}
          </>
        ) : (
          <form className="mt-3" onSubmit={(event) => { event.preventDefault(); finish(); }}>
            <h1 className="text-center text-2xl font-extrabold">Log in to Sawan - music</h1>
            <p className="mt-2 text-center text-sm text-zinc-400">Continue with a profile saved on this device.</p>
            <label className="mt-7 block text-sm font-semibold">Email address
              <input id="login-email" name="email" required type="email" value={email} onChange={(event) => { setEmail(event.target.value); setError(''); }} className="account-field mt-2" placeholder="you@example.com" />
            </label>
            <p className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs leading-relaxed text-amber-100/80">This is a local account preview. Cloud authentication is not configured.</p>
            {error && <p role="alert" className="mt-3 text-sm text-red-400">{error}</p>}
            <button type="submit" className="mt-6 w-full rounded-full bg-[#1ed760] py-3 font-bold text-black hover:bg-[#3be477]">Continue</button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-zinc-400">
          {mode === 'signup' ? 'Already have a profile?' : 'New to Sawan - music?'}{' '}
          <button onClick={() => { setError(''); onChangeMode(mode === 'signup' ? 'login' : 'signup'); }} className="font-semibold text-white underline underline-offset-2 hover:text-[#1ed760]">{mode === 'signup' ? 'Log in' : 'Sign up'}</button>
        </p>
      </section>
    </div>
  );
};
