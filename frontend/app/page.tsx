'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createTask, startCall } from '@/app/api/client';

export default function NewCallDashboard() {
  const router = useRouter();

  const [callerName, setCallerName] = useState('Ganesh');
  const [callerTone, setCallerTone] = useState<'informal' | 'formal'>('informal');
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [instructions, setInstructions] = useState('');
  const [languageMode, setLanguageMode] = useState<'auto' | 'kannada' | 'english' | 'kanglish'>('kannada');
  const [voiceProfile, setVoiceProfile] = useState('aarohi');
  const [customVoices, setCustomVoices] = useState<any[]>([]);
  const [consent, setConsent] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);

  // Sync with localStorage on mount
  useEffect(() => {
    try {
      const savedName = localStorage.getItem('vaani_caller_name');
      if (savedName) setCallerName(savedName);

      const savedTone = localStorage.getItem('vaani_caller_tone');
      if (savedTone === 'formal' || savedTone === 'informal') setCallerTone(savedTone);

      const savedVoices = localStorage.getItem('vaani_custom_voices');
      if (savedVoices) {
        const parsed = JSON.parse(savedVoices);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCustomVoices(parsed);
        }
      }
    } catch (e) {
      // Ignore local storage error
    }
  }, []);

  const handleCallerNameChange = (name: string) => {
    setCallerName(name);
    try {
      localStorage.setItem('vaani_caller_name', name);
    } catch (e) {}
  };

  const handleCallerToneChange = (tone: 'informal' | 'formal') => {
    setCallerTone(tone);
    try {
      localStorage.setItem('vaani_caller_tone', tone);
    } catch (e) {}
  };

  const handleSuggestion = (promptText: string) => {
    setInstructions(promptText);
  };

  // Real browser sound preview (Web Audio melodic tone + Speech)
  const playSampleAudio = (voiceId: string) => {
    try {
      if (playingVoice === voiceId) {
        window.speechSynthesis?.cancel();
        setPlayingVoice(null);
        return;
      }

      setPlayingVoice(voiceId);

      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = voiceId === 'sunil' ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(voiceId === 'sunil' ? 220 : 340, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);

      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const text =
          voiceId === 'sunil' || voiceId === 'custom'
            ? `ಹೇ, ನಮಸ್ತೆ! ನಾನು ${callerName}. ಆರಾಮಾಗಿದ್ದೀರಾ?`
            : `ನಮಸ್ಕಾರ, ನಾನು ಆರೋಹಿ. ನಿಮ್ಮ ಕೆಲಸವನ್ನು ನಾನು ಮಾತನಾಡುತ್ತೇನೆ.`;

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = voiceId === 'sunil' ? 0.9 : 1.15;
        utterance.onend = () => setPlayingVoice(null);
        utterance.onerror = () => setPlayingVoice(null);
        window.speechSynthesis.speak(utterance);
      } else {
        setTimeout(() => setPlayingVoice(null), 1200);
      }
    } catch (e) {
      console.warn('Audio preview error:', e);
      setPlayingVoice(null);
    }
  };

  const handleInitiateCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) {
      setError('Please enter a valid phone number');
      return;
    }
    if (!instructions.trim()) {
      setError('Please specify what the caller should ask');
      return;
    }

    setLoading(true);
    setError(null);

    const fullNumber = phoneNumber.startsWith('+') ? phoneNumber : `${countryCode}${phoneNumber.replace(/\s+/g, '')}`;

    // Persona-injected instructions ensuring informal conversational flow as the human
    const personaInstruction =
      callerTone === 'informal'
        ? `[CALLER_PERSONA: Speak informally as ${callerName}. NEVER introduce as an AI or VaaniCall. Chat casually and naturally.] ${instructions}`
        : `[CALLER_PERSONA: Speak politely as ${callerName}.] ${instructions}`;

    try {
      // 1. Create task in FastAPI backend
      const task = await createTask({
        user_id: callerName.toLowerCase().replace(/\s+/g, '_'),
        description: personaInstruction,
        language: languageMode === 'auto' ? 'kannada' : languageMode,
        target_number: fullNumber,
        constraints: [
          callerTone === 'informal'
            ? 'speak casually without robotic words, never mention AI'
            : 'be polite and clear in Kannada/English',
        ],
        questions_to_ask: [instructions],
      });

      // 2. Start call
      const call = await startCall({
        task_id: task.id,
        target_number: fullNumber,
        language: task.language,
      });

      // 3. Navigate to live call screen with full context
      router.push(
        `/call/live?call_id=${call.id}&caller=${encodeURIComponent(callerName)}&phone=${encodeURIComponent(
          fullNumber
        )}&desc=${encodeURIComponent(instructions)}`
      );
    } catch (err: any) {
      console.warn('Backend call trigger failed or fallback:', err);
      // Fallback navigation with complete state
      router.push(
        `/call/live?mock=true&phone=${encodeURIComponent(fullNumber)}&desc=${encodeURIComponent(
          personaInstruction
        )}&caller=${encodeURIComponent(callerName)}`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full px-3.5 sm:px-6 lg:px-8 py-6 sm:py-10 max-w-3xl mx-auto">
      {/* Friendly Hero */}
      <div className="text-center mb-6 sm:mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#eaf2ec] text-[#28543e] text-xs font-semibold mb-3">
          <span className="w-2 h-2 rounded-full bg-[#28543e] animate-pulse" />
          <span>Informal Persona • Converses as You</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1a1c1a] tracking-tight">
          What call would you like me to make?
        </h1>
        <p className="text-sm sm:text-[15px] text-[#58605c] mt-2 max-w-lg mx-auto leading-relaxed">
          Speaks directly as you in natural, informal Kannada or English without any AI robotic clichés.
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl border border-[#eeece8] shadow-[0_4px_24px_rgba(40,84,62,0.04)] p-4 sm:p-7 md:p-8">
        <form className="space-y-6" onSubmit={handleInitiateCall}>
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
              <span className="material-symbols-outlined text-red-600 text-base">error</span>
              <span>{error}</span>
            </div>
          )}

          {/* Caller Identity & Informal Tone Settings */}
          <div className="p-4 rounded-xl bg-[#faf9f6] border border-[#e2e1dd] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="text-sm font-bold text-[#1a1c1a] flex items-center gap-1.5" htmlFor="caller-name">
                  <span className="material-symbols-outlined text-[#28543e] text-[18px]">person</span>
                  <span>Speak As (Your Name)</span>
                </label>
                <p className="text-xs text-[#717973] mt-0.5">
                  The assistant introduces directly as this name and never says it is an AI.
                </p>
              </div>
              <input
                id="caller-name"
                type="text"
                required
                value={callerName}
                onChange={(e) => handleCallerNameChange(e.target.value)}
                placeholder="Enter your name (e.g. Ganesh)"
                className="w-full sm:w-48 min-h-[44px] px-3.5 bg-white border border-[#eeece8] rounded-xl text-sm font-semibold text-[#1a1c1a] focus:ring-2 focus:ring-[#28543e]/20 outline-none transition"
              />
            </div>

            {/* Conversational Tone */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-[#eeece8]">
              <span className="text-xs font-semibold text-[#58605c]">Tone & Vocabulary</span>
              <div className="grid grid-cols-2 gap-2 sm:w-72">
                <button
                  type="button"
                  onClick={() => handleCallerToneChange('informal')}
                  className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    callerTone === 'informal'
                      ? 'bg-[#28543e] text-white shadow-xs'
                      : 'bg-white border border-[#eeece8] text-[#58605c] hover:bg-[#f6f5f2]'
                  }`}
                >
                  ⚡ Informal & Casual
                </button>
                <button
                  type="button"
                  onClick={() => handleCallerToneChange('formal')}
                  className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    callerTone === 'formal'
                      ? 'bg-[#28543e] text-white shadow-xs'
                      : 'bg-white border border-[#eeece8] text-[#58605c] hover:bg-[#f6f5f2]'
                  }`}
                >
                  Formal / Polite
                </button>
              </div>
            </div>
          </div>

          {/* Phone Number Input */}
          <div>
            <label className="block text-sm font-semibold text-[#1a1c1a] mb-2" htmlFor="phone-input">
              Target Phone Number
            </label>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative w-full sm:w-36 flex-shrink-0">
                <select
                  id="country-code"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="w-full min-h-[44px] pl-3.5 pr-8 bg-[#f6f5f2] border-0 rounded-xl text-sm font-medium text-[#1a1c1a] focus:bg-white focus:ring-2 focus:ring-[#28543e]/20 outline-none transition cursor-pointer appearance-none"
                >
                  <option value="+91">🇮🇳 +91 (IN)</option>
                  <option value="+1">🇺🇸 +1 (US)</option>
                  <option value="+44">🇬🇧 +44 (UK)</option>
                  <option value="+971">🇦🇪 +971 (UAE)</option>
                </select>
                <span className="material-symbols-outlined absolute right-2.5 top-3 text-[#717973] pointer-events-none text-[18px]">
                  expand_more
                </span>
              </div>
              <div className="relative flex-1">
                <input
                  id="phone-input"
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Enter number (e.g. 98450 12345)"
                  className="w-full min-h-[44px] px-3.5 bg-[#f6f5f2] border-0 rounded-xl text-sm font-medium text-[#1a1c1a] placeholder-[#717973] focus:bg-white focus:ring-2 focus:ring-[#28543e]/20 outline-none transition tracking-wide"
                />
              </div>
            </div>
          </div>

          {/* Task Instructions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-[#1a1c1a]" htmlFor="task-instructions">
                What should I ask or confirm?
              </label>
            </div>
            <textarea
              id="task-instructions"
              required
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Enter what to talk (e.g. Ask if my laptop is ready for pickup)..."
              className="w-full p-3.5 bg-[#f6f5f2] border-0 rounded-xl text-sm leading-relaxed text-[#1a1c1a] placeholder-[#717973] focus:bg-white focus:ring-2 focus:ring-[#28543e]/20 outline-none transition resize-none"
            />
          </div>

          {/* Language Selector */}
          <div>
            <label className="block text-sm font-semibold text-[#1a1c1a] mb-2">Language</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1 bg-[#f6f5f2] rounded-xl">
              {[
                { id: 'auto', label: 'Auto' },
                { id: 'kannada', label: 'ಕನ್ನಡ' },
                { id: 'english', label: 'English' },
                { id: 'kanglish', label: 'Kanglish' },
              ].map((lang) => (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => setLanguageMode(lang.id as any)}
                  className={`w-full min-h-[40px] py-2 text-center rounded-lg text-xs sm:text-sm transition-all ${
                    languageMode === lang.id
                      ? 'bg-white text-[#28543e] font-bold shadow-xs'
                      : 'text-[#58605c] hover:text-[#1a1c1a] font-medium'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          {/* Voice Selection with Live Previews */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-[#1a1c1a]">Voice Selection</label>
              <span className="text-xs text-[#717973]">Click play to listen</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Voice 1 */}
              <div
                onClick={() => setVoiceProfile('aarohi')}
                className={`min-h-[56px] flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition ${
                  voiceProfile === 'aarohi'
                    ? 'border-[#28543e] bg-[#eaf2ec]/40'
                    : 'border-[#eeece8] bg-[#f6f5f2]/40 hover:bg-[#f6f5f2]'
                }`}
              >
                <div className="flex flex-col">
                  <span className="text-xs sm:text-sm font-semibold text-[#1a1c1a]">Aarohi</span>
                  <span className="text-xs text-[#717973]">Warm & Expressive</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    playSampleAudio('aarohi');
                  }}
                  className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#28543e] shadow-xs hover:scale-105 transition"
                  title="Preview Aarohi voice"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {playingVoice === 'aarohi' ? 'stop' : 'play_arrow'}
                  </span>
                </button>
              </div>

              {/* Voice 2 */}
              <div
                onClick={() => setVoiceProfile('sunil')}
                className={`min-h-[56px] flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition ${
                  voiceProfile === 'sunil'
                    ? 'border-[#28543e] bg-[#eaf2ec]/40'
                    : 'border-[#eeece8] bg-[#f6f5f2]/40 hover:bg-[#f6f5f2]'
                }`}
              >
                <div className="flex flex-col">
                  <span className="text-xs sm:text-sm font-semibold text-[#1a1c1a]">{callerName}&apos;s Voice</span>
                  <span className="text-xs text-[#717973]">Cloned Profile</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    playSampleAudio('sunil');
                  }}
                  className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#28543e] shadow-xs hover:scale-105 transition"
                  title="Preview Voice Clone"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {playingVoice === 'sunil' ? 'stop' : 'play_arrow'}
                  </span>
                </button>
              </div>

              {/* Voice 3: Add / Manage in Studio */}
              <button
                type="button"
                onClick={() => router.push('/voice-studio/settings')}
                className="min-h-[56px] flex items-center justify-center gap-1.5 p-3.5 rounded-xl border border-dashed border-[#c1c9c1] hover:border-[#28543e] hover:bg-[#f6f5f2] text-[#28543e] text-xs sm:text-sm font-medium transition text-center"
              >
                <span className="material-symbols-outlined text-[18px]">record_voice_over</span>
                <span>Voice Studio</span>
              </button>
            </div>
          </div>

          {/* Consent Checkbox */}
          <div className="pt-2">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                required
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-[#28543e] focus:ring-[#28543e] border-[#c1c9c1] accent-[#28543e] cursor-pointer"
              />
              <span className="text-xs sm:text-sm text-[#58605c] leading-relaxed select-none group-hover:text-[#1a1c1a] transition-colors">
                Call on my behalf as <strong className="text-[#1a1c1a]">{callerName}</strong>, record and summarize the call for me.
              </span>
            </label>
          </div>

          {/* Main Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[48px] py-3.5 px-6 rounded-xl bg-[#28543e] hover:bg-[#1d3f2f] text-white text-sm sm:text-base font-semibold shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Connecting Phone Call...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">call</span>
                  <span>Make Call as {callerName} (ಕರೆ ಮಾಡಿ)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
