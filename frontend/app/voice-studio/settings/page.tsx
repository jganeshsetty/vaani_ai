'use client';

import { useState } from 'react';

export default function VoiceStudioSettingsPage() {
  const [activeTab, setActiveTab] = useState<'profiles' | 'language' | 'advanced'>('profiles');
  const [selectedVoice, setSelectedVoice] = useState('aarohi');
  const [speakingSpeed, setSpeakingSpeed] = useState(1.0);
  const [naturalPause, setNaturalPause] = useState('medium');
  const [codeSwitching, setCodeSwitching] = useState(true);
  const [playingPreview, setPlayingPreview] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [saved, setSaved] = useState(false);

  const handlePlaySample = () => {
    setPlayingPreview(true);
    setTimeout(() => setPlayingPreview(false), 2500);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="w-full pt-4 pb-12 px-4 sm:px-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1a1c1a] tracking-tight">Voice Studio &amp; Settings</h1>
          <p className="text-sm text-[#58605c] mt-1">
            Manage synthesis profiles, language priorities, natural conversational pauses, and voice cloning
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#28543e] hover:bg-[#1d3f2f] text-white text-xs sm:text-sm font-semibold transition shadow-xs self-start sm:self-center"
        >
          <span className="material-symbols-outlined text-base">
            {saved ? 'check' : 'save'}
          </span>
          <span>{saved ? 'Saved Successfully!' : 'Save Changes'}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#eeece8] gap-4">
        {[
          { id: 'profiles', label: 'Voice Profiles', icon: 'graphic_eq' },
          { id: 'language', label: 'Language & Vernacular', icon: 'translate' },
          { id: 'advanced', label: 'Speech Tuning', icon: 'tune' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === tab.id
                ? 'border-[#28543e] text-[#28543e]'
                : 'border-transparent text-[#58605c] hover:text-[#1a1c1a]'
            }`}
          >
            <span className="material-symbols-outlined text-lg">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Active Voice Engine Banner */}
      <div className="bg-white rounded-2xl p-6 border border-[#eeece8] shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#eaf2ec] text-[#28543e] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl">mic</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[#1a1c1a]">Gnani Timbre v2.5 Kannada Neural Engine</h2>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                Connected
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#58605c] mt-0.5">
              High-fidelity acoustic model optimized for native Karnataka Kannada dialects with zero robotic jitter.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handlePlaySample}
          className="shrink-0 px-4 py-2.5 rounded-xl border border-[#d2ded5] bg-[#f3f7f4] hover:bg-[#eaf2ec] text-[#28543e] text-xs font-semibold transition flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">
            {playingPreview ? 'volume_up' : 'play_circle'}
          </span>
          <span>{playingPreview ? 'Playing Kannada sample...' : 'Test Voice Sample'}</span>
        </button>
      </div>

      {/* Tab: Voice Profiles */}
      {activeTab === 'profiles' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Aarohi */}
            <div
              onClick={() => setSelectedVoice('aarohi')}
              className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                selectedVoice === 'aarohi'
                  ? 'border-[#28543e] bg-white ring-2 ring-[#28543e]/20 shadow-xs'
                  : 'border-[#eeece8] bg-white hover:border-[#d2ded5]'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#eaf2ec] text-[#28543e]">
                  Default Voice
                </span>
                <span className="material-symbols-outlined text-[#28543e]">
                  {selectedVoice === 'aarohi' ? 'check_circle' : 'radio_button_unchecked'}
                </span>
              </div>
              <h3 className="font-bold text-base text-[#1a1c1a]">Aarohi</h3>
              <p className="text-xs text-[#58605c] mt-1 leading-relaxed">
                Warm, polite, and reassuring tone. Ideal for vendor confirmations and order enquiries.
              </p>
              <div className="mt-4 pt-3 border-t border-[#eeece8] flex items-center justify-between text-xs text-[#717973]">
                <span>Kannada + English</span>
                <span className="font-medium text-[#28543e]">Female • Natural</span>
              </div>
            </div>

            {/* Sunil Clone */}
            <div
              onClick={() => setSelectedVoice('sunil')}
              className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                selectedVoice === 'sunil'
                  ? 'border-[#28543e] bg-white ring-2 ring-[#28543e]/20 shadow-xs'
                  : 'border-[#eeece8] bg-white hover:border-[#d2ded5]'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#f3f7f4] text-[#1a1c1a]">
                  Cloned Voice
                </span>
                <span className="material-symbols-outlined text-[#28543e]">
                  {selectedVoice === 'sunil' ? 'check_circle' : 'radio_button_unchecked'}
                </span>
              </div>
              <h3 className="font-bold text-base text-[#1a1c1a]">Sunil (Personal Clone)</h3>
              <p className="text-xs text-[#58605c] mt-1 leading-relaxed">
                Personalized clone from your 30s sample. Sounds like you making the call directly.
              </p>
              <div className="mt-4 pt-3 border-t border-[#eeece8] flex items-center justify-between text-xs text-[#717973]">
                <span>Kannada Native</span>
                <span className="font-medium text-[#28543e]">Male • Personalized</span>
              </div>
            </div>

            {/* Kiran */}
            <div
              onClick={() => setSelectedVoice('kiran')}
              className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                selectedVoice === 'kiran'
                  ? 'border-[#28543e] bg-white ring-2 ring-[#28543e]/20 shadow-xs'
                  : 'border-[#eeece8] bg-white hover:border-[#d2ded5]'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#f6f5f2] text-[#58605c]">
                  Business
                </span>
                <span className="material-symbols-outlined text-[#28543e]">
                  {selectedVoice === 'kiran' ? 'check_circle' : 'radio_button_unchecked'}
                </span>
              </div>
              <h3 className="font-bold text-base text-[#1a1c1a]">Kiran</h3>
              <p className="text-xs text-[#58605c] mt-1 leading-relaxed">
                Crisp, formal, and authoritative. Best suited for utility calls, clinics, and official requests.
              </p>
              <div className="mt-4 pt-3 border-t border-[#eeece8] flex items-center justify-between text-xs text-[#717973]">
                <span>Kannada + English</span>
                <span className="font-medium text-[#28543e]">Male • Crisp</span>
              </div>
            </div>
          </div>

          {/* Voice Cloning Studio Box */}
          <div className="bg-white rounded-2xl p-6 border border-[#eeece8] shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-lg text-[#28543e]">record_voice_over</span>
              <h3 className="font-bold text-base text-[#1a1c1a]">Clone a New Voice</h3>
            </div>
            <p className="text-xs sm:text-sm text-[#58605c]">
              Record 30 seconds of clear speech reading the Kannada sample passage below. The Gnani engine will generate your instant voice model.
            </p>
            <div className="p-4 rounded-xl bg-[#f6f5f2] text-sm text-[#1a1c1a] italic leading-relaxed border border-[#e2e1dd]">
              &ldquo;ನಮಸ್ಕಾರ, ನಾನು ಪ್ರತಿದಿನ ಬೆಳಗ್ಗೆ ಕಚೇರಿಗೆ ಹೋಗುವ ಮುನ್ನ ದಿನಪತ್ರಿಕೆ ಓದುತ್ತೇನೆ. ಬೆಂಗಳೂರಿನ ಸುಂದರ ವಾತಾವರಣ ನನಗೆ ತುಂಬಾ ಇಷ್ಟ.&rdquo;
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsRecording(!isRecording)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
                  isRecording
                    ? 'bg-[#c0392b] text-white animate-pulse'
                    : 'bg-[#28543e] text-white hover:bg-[#1d3f2f]'
                }`}
              >
                <span className="material-symbols-outlined text-base">
                  {isRecording ? 'stop' : 'mic'}
                </span>
                <span>{isRecording ? 'Stop Recording' : 'Start 30s Recording'}</span>
              </button>
              {isRecording && <span className="text-xs text-[#c0392b] font-mono font-medium">Recording: 00:14 / 00:30</span>}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Language & Vernacular */}
      {activeTab === 'language' && (
        <div className="bg-white rounded-2xl p-6 border border-[#eeece8] shadow-xs space-y-6">
          <div className="space-y-1">
            <h3 className="font-bold text-base text-[#1a1c1a]">Vernacular Language Modes</h3>
            <p className="text-xs sm:text-sm text-[#58605c]">Configure how the assistant greets and switches between languages</p>
          </div>

          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between p-4 rounded-xl bg-[#f6f5f2] border border-[#e2e1dd]">
              <div>
                <div className="text-sm font-bold text-[#1a1c1a]">Seamless Kanglish Code-Switching</div>
                <div className="text-xs text-[#58605c] mt-0.5">
                  Allows speaking natural Bangalore-style Kannada with common English terms (&ldquo;dispatched&rdquo;, &ldquo;courier&rdquo;, &ldquo;expected date&rdquo;).
                </div>
              </div>
              <input
                type="checkbox"
                checked={codeSwitching}
                onChange={(e) => setCodeSwitching(e.target.checked)}
                className="w-5 h-5 rounded text-[#28543e] accent-[#28543e] cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[#1a1c1a]">Default Vernacular Greeting</label>
              <input
                type="text"
                defaultValue="ನಮಸ್ಕಾರ, ನಾನು ಸುನಿಲ್ ಅವರ ಪರವಾಗಿ ಕರೆ ಮಾಡುತ್ತಿದ್ದೇನೆ."
                className="w-full p-3 bg-[#f6f5f2] rounded-xl text-sm text-[#1a1c1a] border border-[#e2e1dd] focus:bg-white focus:outline-none focus:border-[#28543e]"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab: Speech Tuning */}
      {activeTab === 'advanced' && (
        <div className="bg-white rounded-2xl p-6 border border-[#eeece8] shadow-xs space-y-6">
          <div className="space-y-1">
            <h3 className="font-bold text-base text-[#1a1c1a]">Cadence &amp; Prosody Tuning</h3>
            <p className="text-xs sm:text-sm text-[#58605c]">Fine-tune speaking rate and human-like pause intervals</p>
          </div>

          <div className="space-y-6 pt-2">
            {/* Speed slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm font-semibold text-[#1a1c1a]">
                <span>Speaking Rate</span>
                <span className="font-mono text-[#28543e]">{speakingSpeed.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.8"
                max="1.3"
                step="0.05"
                value={speakingSpeed}
                onChange={(e) => setSpeakingSpeed(parseFloat(e.target.value))}
                className="w-full accent-[#28543e] cursor-pointer"
              />
              <div className="flex justify-between text-xs text-[#717973]">
                <span>0.8x (Deliberate)</span>
                <span>1.0x (Standard)</span>
                <span>1.3x (Brisk)</span>
              </div>
            </div>

            {/* Natural Pause selection */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[#1a1c1a]">Conversational Pause Interval</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'short', label: 'Brief (300ms)' },
                  { id: 'medium', label: 'Natural (500ms)' },
                  { id: 'relaxed', label: 'Relaxed (800ms)' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setNaturalPause(p.id)}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition ${
                      naturalPause === p.id
                        ? 'border-[#28543e] bg-[#eaf2ec] text-[#28543e]'
                        : 'border-[#eeece8] bg-white text-[#58605c] hover:bg-[#f6f5f2]'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
