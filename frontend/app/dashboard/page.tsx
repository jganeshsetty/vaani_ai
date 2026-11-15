'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createOutboundCall } from '@/app/api/client';

export default function NewCallDashboard() {
  const router = useRouter();

  const [callerName, setCallerName] = useState('Ganesh');
  const [callerTone, setCallerTone] = useState<'informal' | 'formal'>('informal');
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [instructions, setInstructions] = useState('');
  const [languageMode, setLanguageMode] = useState<'auto' | 'kannada' | 'english' | 'kanglish'>('english');
  const [voiceProfile, setVoiceProfile] = useState('aarohi');
  const [customVoices, setCustomVoices] = useState<any[]>([]);
  const [consent, setConsent] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [scheduleTime, setScheduleTime] = useState('');

  // Sync with localStorage on mount & verify JWT auth token
  useEffect(() => {
    try {
      const token = localStorage.getItem('vaani_jwt');
      if (!token) {
        if (typeof document !== 'undefined' && !document.cookie.includes('vaani_token=')) {
          router.replace('/login');
          return;
        }
      }

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
  }, [router]);

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
            ? `Hello! This is ${callerName}. How are you doing today?`
            : `Hello, I am Aarohi. I am calling to assist you with your request.`;

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
      const result = await createOutboundCall({
        target_number: fullNumber,
        target_name: 'Recipient',
        context_prompt: personaInstruction,
        schedule_time: scheduleTime || null,
      });

      if (!result.room_id) {
        setError('Failed to create call session');
        return;
      }

      // Navigate to mobile call interface with room_id
      router.replace(`/call/${result.room_id}?mode=outbound`);
    } catch (err: any) {
      console.warn('Backend call trigger failed:', err);
      const errMsg = err?.message || 'Failed to connect to backend server.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-10 max-w-3xl mx-auto space-y-6">
      {/* Friendly Hero */}
      <div className="text-center mb-6 sm:mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#e2dfff] text-primary text-xs font-semibold mb-3">
          <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse" />
          <span>Informal Persona • Converses as You</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#131b2e] tracking-tight">
          What call would you like me to make?
        </h1>
        <p className="text-sm sm:text-[15px] text-[#464555] mt-2 max-w-lg mx-auto leading-relaxed">
          Speaks directly as you in natural, conversational, and easy-to-understand English without robotic clichés.
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl border border-[#e2e7ff] shadow-xl shadow-slate-900/5 p-5 sm:p-7 md:p-8">
        <form className="space-y-6" onSubmit={handleInitiateCall}>
          {error && (
            <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-sm text-slate-800 space-y-3">
              <div className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-amber-600 text-xl shrink-0 mt-0.5">warning</span>
                <div className="space-y-1">
                  <p className="font-semibold text-slate-900">
                    {error.includes('KYC') ? 'Telecom Provider (Exotel) Notice' : 'Call Initiation Notice'}
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed">{error}</p>
                </div>
              </div>

              {(error.includes('KYC') || error.includes('verified')) && (
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-amber-200/60">
                  <button
                    type="button"
                    onClick={() => {
                      setPhoneNumber('8660039103');
                      setError(null);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-primary-container text-white text-xs font-semibold hover:opacity-90 transition cursor-pointer shadow-xs flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">verified</span>
                    <span>Switch to Verified Number (8660039103)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const fullNumber = `${countryCode}${phoneNumber.replace(/\D/g, '')}`;
                      const personaInstruction =
                        callerTone === 'informal'
                          ? `Speak casually as ${callerName} in friendly conversational style: ${instructions}`
                          : `Speak politely as ${callerName}: ${instructions}`;
                      router.push(
                        `/dashboard/live?mock=true&phone=${encodeURIComponent(fullNumber)}&desc=${encodeURIComponent(
                          personaInstruction
                        )}&caller=${encodeURIComponent(callerName)}`
                      );
                    }}
                    className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
                  >
                    Test Online Simulation
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Caller Identity & Informal Tone Settings */}
          <div className="p-4 rounded-xl bg-[#f2f3ff] border border-[#eaedff] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="text-sm font-bold text-[#131b2e] flex items-center gap-1.5" htmlFor="caller-name">
                  <span className="material-symbols-outlined text-primary text-[18px]">person</span>
                  <span>Speak As (Your Name)</span>
                </label>
                <p className="text-xs text-[#464555] mt-0.5">
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
                className="w-full sm:w-48 min-h-[44px] px-3.5 bg-white border border-[#c7c4d8] rounded-xl text-sm font-semibold text-[#131b2e] focus:ring-2 focus:ring-primary-container/30 focus:border-primary-container outline-none transition"
              />
            </div>

            {/* Conversational Tone */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-[#eaedff]">
              <span className="text-xs font-semibold text-[#464555]">Tone & Vocabulary</span>
              <div className="grid grid-cols-2 gap-2 sm:w-72">
                <button
                  type="button"
                  onClick={() => handleCallerToneChange('informal')}
                  className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    callerTone === 'informal'
                      ? 'bg-primary-container text-white shadow-xs'
                      : 'bg-white border border-[#c7c4d8] text-[#464555] hover:text-[#131b2e] hover:bg-slate-50'
                  }`}
                >
                  ⚡ Informal & Casual
                </button>
                <button
                  type="button"
                  onClick={() => handleCallerToneChange('formal')}
                  className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    callerTone === 'formal'
                      ? 'bg-primary-container text-white shadow-xs'
                      : 'bg-white border border-[#c7c4d8] text-[#464555] hover:text-[#131b2e] hover:bg-slate-50'
                  }`}
                >
                  Formal / Polite
                </button>
              </div>
            </div>
          </div>

          {/* Phone Number Input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-[#131b2e]" htmlFor="phone-input">
                Target Phone Number
              </label>
              <button
                type="button"
                onClick={() => setPhoneNumber('8660039103')}
                className="text-xs font-semibold text-primary hover:text-primary-container flex items-center gap-1 cursor-pointer transition"
              >
                <span className="material-symbols-outlined text-[15px]">verified</span>
                <span>Use Verified Number (8660039103)</span>
              </button>
            </div>
            <div className="text-[11px] text-[#464555] mt-1.5 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-amber-600">info</span>
              <span>
                <strong>Call Source:</strong> Your calls are handled through the secure backend call sessions system.
              </span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative w-full sm:w-36 flex-shrink-0">
                <select
                  id="country-code"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="w-full min-h-[44px] pl-3.5 pr-8 bg-[#f2f3ff] border border-[#eaedff] rounded-xl text-sm font-medium text-[#131b2e] focus:bg-white focus:ring-2 focus:ring-primary-container/30 focus:border-primary-container outline-none transition cursor-pointer appearance-none"
                >
                  <option value="+91">🇮🇳 +91 (IN)</option>
                  <option value="+1">🇺🇸 +1 (US)</option>
                  <option value="+44">🇬🇧 +44 (UK)</option>
                  <option value="+971">🇦🇪 +971 (UAE)</option>
                </select>
                <span className="material-symbols-outlined absolute right-2.5 top-3 text-[#777587] pointer-events-none text-[18px]">
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
                  className="w-full min-h-[44px] px-3.5 bg-[#f2f3ff] border border-[#eaedff] rounded-xl text-sm font-medium text-[#131b2e] placeholder-[#777587] focus:bg-white focus:ring-2 focus:ring-primary-container/30 focus:border-primary-container outline-none transition tracking-wide"
                />
              </div>
            </div>
            <p className="text-[11px] text-[#464555] mt-1.5 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-amber-600">info</span>
              <span>
                <strong>Secure Connection:</strong> Join the web-based voice session directly through your browser — no app or telephony required.
              </span>
            </p>
          </div>

          {/* Task Instructions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-[#131b2e] flex items-center gap-1.5" htmlFor="task-instructions">
                <span className="material-symbols-outlined text-primary text-[18px]">forum</span>
                <span>What should I ask or confirm?</span>
              </label>
              <span className="text-xs text-[#777587]">Natural conversational style</span>
            </div>
            <textarea
              id="task-instructions"
              required
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Type instructions (e.g. Call store and ask if laptop service order #4892 is ready for pickup today)..."
              className="w-full p-3.5 bg-[#f2f3ff] border border-[#eaedff] rounded-xl text-sm leading-relaxed text-[#131b2e] placeholder-[#777587] focus:bg-white focus:ring-2 focus:ring-primary-container/30 focus:border-primary-container outline-none transition resize-y min-h-[90px]"
            />
            {/* Gentle Prompt Suggestions from Stitch Design */}
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-[#777587] mr-1">Suggestions:</span>
              <button
                type="button"
                onClick={() => setInstructions('Call the store and ask if my laptop service order #4892 is ready for pickup today.')}
                className="px-2.5 py-1 rounded-full bg-[#f2f3ff] hover:bg-[#e2dfff] text-[#464555] hover:text-primary text-xs font-medium transition cursor-pointer border border-[#eaedff]"
              >
                Service status
              </button>
              <button
                type="button"
                onClick={() => setInstructions('Call the clinic and confirm my 5:30 PM appointment slot with the doctor.')}
                className="px-2.5 py-1 rounded-full bg-[#f2f3ff] hover:bg-[#e2dfff] text-[#464555] hover:text-primary text-xs font-medium transition cursor-pointer border border-[#eaedff]"
              >
                Confirm appointment
              </button>
              <button
                type="button"
                onClick={() => setInstructions('Call the merchant and inquire about today\'s store closing hours.')}
                className="px-2.5 py-1 rounded-full bg-[#f2f3ff] hover:bg-[#e2dfff] text-[#464555] hover:text-primary text-xs font-medium transition cursor-pointer border border-[#eaedff]"
              >
                Store hours
              </button>
            </div>
          </div>

          {/* Schedule Call Option */}
          <div className="p-3.5 rounded-xl bg-[#f2f3ff]/60 border border-[#eaedff] space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="text-sm font-semibold text-[#131b2e] flex items-center gap-1.5" htmlFor="schedule-time">
                  <span className="material-symbols-outlined text-primary text-[18px]">schedule</span>
                  <span>Schedule Call for Later (Optional)</span>
                </label>
                <p className="text-xs text-[#464555] mt-0.5">Leave blank to make the call immediately, or set a future date and time.</p>
              </div>
              <input
                id="schedule-time"
                type="datetime-local"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)}
                className="w-full sm:w-auto min-h-[40px] px-3 bg-white border border-[#c7c4d8] rounded-xl text-xs font-medium text-[#131b2e] focus:ring-2 focus:ring-primary-container/30 outline-none transition cursor-pointer"
              />
            </div>
            {scheduleTime && (
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#eaedff] text-xs">
                <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                  <span className="material-symbols-outlined text-sm">event_available</span>
                  <span>Will trigger at {new Date(scheduleTime).toLocaleString()}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setScheduleTime('')}
                  className="text-xs text-rose-600 hover:underline font-semibold cursor-pointer"
                >
                  Clear schedule
                </button>
              </div>
            )}
          </div>

          {/* Language Selector */}
          <div>
            <label className="block text-sm font-semibold text-[#131b2e] mb-2">Language</label>
            <div className="grid grid-cols-2 gap-2 p-1.5 bg-[#f2f3ff] border border-[#eaedff] rounded-xl">
              {[
                { id: 'english', label: 'Conversational English' },
                { id: 'auto', label: 'Natural English (Auto)' },
              ].map((lang) => (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => setLanguageMode(lang.id as any)}
                  className={`w-full min-h-[40px] py-2 text-center rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    languageMode === lang.id
                      ? 'bg-primary-container text-white shadow-xs'
                      : 'text-[#464555] hover:text-[#131b2e] hover:bg-white/60'
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
              <label className="text-sm font-semibold text-[#131b2e]">Voice Selection</label>
              <span className="text-xs text-[#777587]">Click play to listen</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Voice 1 */}
              <div
                onClick={() => setVoiceProfile('aarohi')}
                className={`min-h-[56px] flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition ${
                  voiceProfile === 'aarohi'
                    ? 'border-primary-container bg-[#e2dfff]/30 shadow-xs'
                    : 'border-[#eaedff] bg-[#f2f3ff]/60 hover:bg-[#f2f3ff]'
                }`}
              >
                <div className="flex flex-col">
                  <span className="text-xs sm:text-sm font-semibold text-[#131b2e]">Aarohi</span>
                  <span className="text-xs text-[#464555]">Warm & Expressive</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    playSampleAudio('aarohi');
                  }}
                  className="w-8 h-8 rounded-full bg-white text-primary flex items-center justify-center shadow-xs hover:scale-105 transition cursor-pointer"
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
                    ? 'border-primary-container bg-[#e2dfff]/30 shadow-xs'
                    : 'border-[#eaedff] bg-[#f2f3ff]/60 hover:bg-[#f2f3ff]'
                }`}
              >
                <div className="flex flex-col">
                  <span className="text-xs sm:text-sm font-semibold text-[#131b2e]">{callerName}&apos;s Voice</span>
                  <span className="text-xs text-[#464555]">Cloned Profile</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    playSampleAudio('sunil');
                  }}
                  className="w-8 h-8 rounded-full bg-white text-primary flex items-center justify-center shadow-xs hover:scale-105 transition cursor-pointer"
                  title="Preview Voice Clone"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {playingVoice === 'sunil' ? 'stop' : 'play_arrow'}
                  </span>
                </button>
              </div>
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
                className="mt-0.5 w-4 h-4 rounded text-primary-container focus:ring-primary-container border-[#c7c4d8] bg-white accent-primary-container cursor-pointer"
              />
              <span className="text-xs sm:text-sm text-[#464555] leading-relaxed select-none group-hover:text-[#131b2e] transition-colors">
                Call on my behalf as <strong className="text-[#131b2e]">{callerName}</strong>, record and summarize the call for me.
              </span>
            </label>
          </div>

          {/* Main Action Buttons */}
          <div className="pt-2 space-y-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[48px] py-3.5 px-6 rounded-xl bg-primary-container hover:bg-primary text-white text-sm sm:text-base font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Connecting Phone Call...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">call</span>
                  <span>Make Call as {callerName}</span>
                </>
              )}
            </button>

            {/* Secondary Feature Link to Call Message Setup */}
            <div className="pt-2 text-center">
              <Link
                href="/dashboard/message"
                className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-primary hover:text-primary-container transition py-1 px-3 rounded-lg hover:bg-[#f2f3ff]"
              >
                <span className="material-symbols-outlined text-[18px]">chat</span>
                <span>Want to send a call message invitation instead? Go to Call Message Setup &rarr;</span>
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
