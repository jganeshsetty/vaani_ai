'use client';

import { useState, useRef, useEffect } from 'react';

interface VoiceProfile {
  id: string;
  name: string;
  tag: string;
  description: string;
  languages: string;
  gender: string;
  audioUrl?: string;
  isCustom?: boolean;
}

const DEFAULT_PROFILES: VoiceProfile[] = [
  {
    id: 'aarohi',
    name: 'Aarohi (Studio Kannada)',
    tag: 'Native Studio',
    description: 'Warm, natural Bangalore Kannada tone. Great for vendor confirmations and inquiries.',
    languages: 'Kannada + English',
    gender: 'Female • Expressive',
  },
  {
    id: 'sunil',
    name: 'Personal Voice Clone',
    tag: 'Cloned Voice',
    description: 'Your personalized voice model. Speaks naturally as you on any phone call.',
    languages: 'Kannada Native',
    gender: 'Male • Personalized',
  },
  {
    id: 'kiran',
    name: 'Kiran (Direct & Casual)',
    tag: 'Casual Male',
    description: 'Friendly peer-to-peer tone. Sounds like a friend or colleague calling.',
    languages: 'Kannada + Kanglish',
    gender: 'Male • Crisp',
  },
];

export default function VoiceStudioSettingsPage() {
  const [activeTab, setActiveTab] = useState<'profiles' | 'persona' | 'tuning'>('profiles');
  const [selectedVoice, setSelectedVoice] = useState('sunil');
  const [callerName, setCallerName] = useState('Ganesh');
  const [conversationalTone, setConversationalTone] = useState<'informal' | 'formal'>('informal');
  const [hideAiIdentity, setHideAiIdentity] = useState(true);
  const [speakingSpeed, setSpeakingSpeed] = useState(1.0);
  const [saved, setSaved] = useState(false);

  // Audio preview state
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [customVoiceName, setCustomVoiceName] = useState('');
  const [cloneCreated, setCloneCreated] = useState(false);

  // Voice profiles list (defaults + custom)
  const [voiceProfiles, setVoiceProfiles] = useState<VoiceProfile[]>(DEFAULT_PROFILES);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load saved preferences and custom cloned profiles from localStorage
  useEffect(() => {
    try {
      const savedName = localStorage.getItem('vaani_caller_name');
      if (savedName) setCallerName(savedName);

      const savedVoice = localStorage.getItem('vaani_selected_voice');
      if (savedVoice) setSelectedVoice(savedVoice);

      const savedTone = localStorage.getItem('vaani_caller_tone');
      if (savedTone === 'formal' || savedTone === 'informal') setConversationalTone(savedTone);

      const savedHideAi = localStorage.getItem('vaani_hide_ai');
      if (savedHideAi !== null) setHideAiIdentity(savedHideAi === 'true');

      const savedVoices = localStorage.getItem('vaani_custom_voices');
      if (savedVoices) {
        const parsed = JSON.parse(savedVoices);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setVoiceProfiles([...parsed, ...DEFAULT_PROFILES]);
        }
      }
    } catch {
      // Ignore
    }
  }, []);

  // Save general settings
  const handleSave = () => {
    try {
      localStorage.setItem('vaani_caller_name', callerName);
      localStorage.setItem('vaani_selected_voice', selectedVoice);
      localStorage.setItem('vaani_caller_tone', conversationalTone);
      localStorage.setItem('vaani_hide_ai', String(hideAiIdentity));
    } catch {}
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  // Play audio preview for a specific voice profile
  const handlePlayVoicePreview = (profile: VoiceProfile) => {
    // If currently playing, stop it
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    if (playingVoiceId === profile.id) {
      setPlayingVoiceId(null);
      return;
    }

    setPlayingVoiceId(profile.id);

    // 1. If profile has a real recorded audio URL, play it directly!
    if (profile.audioUrl) {
      const audio = new Audio(profile.audioUrl);
      activeAudioRef.current = audio;
      audio.onended = () => setPlayingVoiceId(null);
      audio.onerror = () => setPlayingVoiceId(null);
      audio.play().catch((err) => {
        console.warn('Audio playback error:', err);
        setPlayingVoiceId(null);
      });
      return;
    }

    // 2. Otherwise play melodic tone + browser speech preview
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const ctx = new AudioContextClass();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = profile.id === 'sunil' ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(profile.id === 'sunil' ? 220 : 440, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }

      if ('speechSynthesis' in window) {
        const text =
          profile.id === 'sunil' || profile.isCustom
            ? `ಹಲೋ, ನಮಸ್ತೆ! ನಾನು ${callerName}. ಆರಾಮಾಗಿದ್ದೀರಾ?`
            : `ಹಲೋ, ನಮಸ್ಕಾರ! ನಾನು ಆರೋಹಿ. ನಿಮ್ಮ ಕೆಲಸವನ್ನು ನಾನು ಮಾತನಾಡುತ್ತೇನೆ.`;

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = speakingSpeed;
        utterance.pitch = profile.id === 'sunil' ? 0.95 : 1.1;
        utterance.onend = () => setPlayingVoiceId(null);
        utterance.onerror = () => setPlayingVoiceId(null);
        window.speechSynthesis.speak(utterance);
      } else {
        setTimeout(() => setPlayingVoiceId(null), 1800);
      }
    } catch {
      setTimeout(() => setPlayingVoiceId(null), 1200);
    }
  };

  // Start Live Microphone Recording
  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          setRecordedAudioUrl(base64data);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordSeconds((prev) => {
          if (prev >= 30) {
            stopRecording();
            return 30;
          }
          return prev + 1;
        });
      }, 1000);
    } catch {
      alert('Microphone access was denied or is not supported. You can upload an audio file below.');
    }
  };

  // Stop Live Recording
  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  // Save Recorded Voice as New Profile in state & localStorage
  const handleSaveClone = () => {
    if (!recordedAudioUrl) {
      alert('Please record your voice or upload an audio sample first.');
      return;
    }

    const name = customVoiceName.trim() || `${callerName || 'Ganesh'}'s Custom Voice`;
    const newId = `clone_${Date.now()}`;
    const newProfile: VoiceProfile = {
      id: newId,
      name,
      tag: 'My Voice Clone',
      description: `Cloned voice model for ${callerName}. Speaks naturally with native cadence.`,
      languages: 'Kannada + Kanglish',
      gender: 'Personal Clone',
      audioUrl: recordedAudioUrl,
      isCustom: true,
    };

    const updated = [newProfile, ...voiceProfiles.filter((p) => p.id !== newId)];
    setVoiceProfiles(updated);
    setSelectedVoice(newId);

    try {
      const customOnly = updated.filter((p) => p.isCustom);
      localStorage.setItem('vaani_custom_voices', JSON.stringify(customOnly));
      localStorage.setItem('vaani_selected_voice', newId);
    } catch {}

    setCloneCreated(true);
    setTimeout(() => setCloneCreated(false), 3500);
  };

  // Handle Audio File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        setRecordedAudioUrl(base64data);
        setCustomVoiceName(file.name.replace(/\.[^/.]+$/, ''));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="w-full pt-4 pb-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1a1c1a] tracking-tight">Voice Studio &amp; Persona</h1>
          <p className="text-xs sm:text-sm text-[#58605c] mt-1">
            Configure your personal voice clone, conversational identity, and informal tone
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4f46e5] hover:bg-[#3730a3] active:scale-[0.98] text-white text-xs sm:text-sm font-semibold transition-all shadow-xs self-start sm:self-center cursor-pointer"
        >
          <span className="material-symbols-outlined text-base">
            {saved ? 'check' : 'save'}
          </span>
          <span>{saved ? 'Settings Saved!' : 'Save Changes'}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#eeece8] gap-4 sm:gap-6 overflow-x-auto scrollbar-none">
        {[
          { id: 'profiles', label: 'Voice Profiles & Cloning', icon: 'graphic_eq' },
          { id: 'persona', label: 'Caller Persona & Identity', icon: 'person' },
          { id: 'tuning', label: 'Speech Tuning', icon: 'tune' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`min-h-[44px] flex items-center gap-2 pb-3 px-1 text-xs sm:text-sm font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? 'border-[#4f46e5] text-[#4f46e5]'
                : 'border-transparent text-[#717973] hover:text-[#1a1c1a]'
            }`}
          >
            <span className="material-symbols-outlined text-lg">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab 1: Profiles & Voice Cloning */}
      {activeTab === 'profiles' && (
        <div className="space-y-6">
          {/* Real Voice Clone Recorder Card */}
          <div className="bg-white rounded-2xl border border-[#e2e8f0] p-5 sm:p-7 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#eef2ff] text-[#4f46e5] text-xs font-semibold mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4f46e5] animate-pulse" />
                  <span>Real Microphone Recording &amp; Voice Clone</span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-[#1a1c1a]">Clone Your Voice</h2>
                <p className="text-xs sm:text-sm text-[#58605c] mt-0.5">
                  Record 10–30 seconds of your voice speaking naturally in Kannada or English to generate your personal clone.
                </p>
              </div>
              {cloneCreated && (
                <div className="px-3.5 py-1.5 rounded-xl bg-cyan-50 border border-cyan-300 text-xs font-semibold text-cyan-800 flex items-center gap-1.5 animate-bounce">
                  <span className="material-symbols-outlined text-base text-cyan-600">check_circle</span>
                  <span>Voice Clone Created &amp; Saved!</span>
                </div>
              )}
            </div>

            {/* Script Suggestion */}
            <div className="p-4 rounded-xl bg-[#faf9f6] border border-[#e2e1dd] text-xs sm:text-sm text-[#4d5550] leading-relaxed">
              <span className="font-semibold text-[#1a1c1a] block mb-1">Suggested Kannada Recording Script:</span>
              &ldquo;ಹಲೋ ನಮಸ್ಕಾರ, ನಾನು {callerName}. ನಾನು ಬೆಂಗಳೂರಿನಲ್ಲಿ ವಾಸವಾಗಿದ್ದೇನೆ. ನನಗೆ ಕನ್ನಡದಲ್ಲಿ ಮಾತನಾಡಲು ತುಂಬಾ ಇಷ್ಟ. ನನ್ನ ಎಲ್ಲಾ ಕಾಲ್‌ಗಳನ್ನು ನನ್ನ ಧ್ವನಿಯಲ್ಲೇ ಮಾಡಿ.&rdquo;
            </div>

            {/* Recording Controls */}
            <div className="flex flex-col sm:flex-row items-center gap-4 pt-1">
              {!isRecording ? (
                <button
                  type="button"
                  onClick={startRecording}
                  className="w-full sm:w-auto min-h-[48px] px-6 py-3 rounded-xl bg-[#4f46e5] hover:bg-[#3730a3] text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-xs transition"
                >
                  <span className="material-symbols-outlined text-xl text-red-300">mic</span>
                  <span>Start Recording Microphone</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="w-full sm:w-auto min-h-[48px] px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-sm animate-pulse transition"
                >
                  <span className="w-3 h-3 rounded-xs bg-white" />
                  <span>Stop Recording ({recordSeconds}s / 30s)</span>
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full sm:w-auto min-h-[48px] px-5 py-3 rounded-xl border border-[#c1c9c1] hover:bg-[#f6f5f2] text-[#4d5550] text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition"
              >
                <span className="material-symbols-outlined text-lg">upload_file</span>
                <span>Upload Audio File</span>
              </button>
            </div>

            {/* Audio Playback of Recorded Sample */}
            {recordedAudioUrl && (
              <div className="p-4 rounded-xl bg-[#eef2ff]/40 border border-[#4f46e5]/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#4f46e5] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base">audio_file</span>
                    <span>Recorded Voice Sample Ready</span>
                  </span>
                  <span className="text-[11px] text-[#717973]">Listen before creating clone</span>
                </div>

                <audio controls src={recordedAudioUrl} className="w-full h-10 rounded-lg outline-none" />

                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <input
                    type="text"
                    value={customVoiceName}
                    onChange={(e) => setCustomVoiceName(e.target.value)}
                    placeholder={`${callerName}'s Personal Clone Name`}
                    className="flex-1 min-h-[44px] px-3.5 bg-white border border-[#c1c9c1] rounded-xl text-xs sm:text-sm font-medium outline-none focus:ring-2 focus:ring-[#4f46e5]/20"
                  />
                  <button
                    type="button"
                    onClick={handleSaveClone}
                    className="min-h-[44px] px-6 py-2.5 rounded-xl bg-[#4f46e5] hover:bg-[#3730a3] text-white text-xs sm:text-sm font-semibold shadow-xs transition"
                  >
                    Save &amp; Activate Voice Clone
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Available Voice Profiles Grid */}
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#1a1c1a] mb-3">Available Voice Profiles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {voiceProfiles.map((profile) => (
                <div
                  key={profile.id}
                  onClick={() => setSelectedVoice(profile.id)}
                  className={`p-4 sm:p-5 rounded-2xl border transition cursor-pointer flex flex-col justify-between gap-3 ${
                    selectedVoice === profile.id
                      ? 'border-[#4f46e5] bg-[#eef2ff]/30 shadow-xs'
                      : 'border-[#eeece8] bg-white hover:border-[#4f46e5]/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-sm sm:text-base text-[#1a1c1a]">{profile.name}</h3>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#f6f5f2] text-[#4f46e5]">
                          {profile.tag}
                        </span>
                      </div>
                      <p className="text-xs text-[#58605c] mt-1 leading-relaxed">{profile.description}</p>
                    </div>

                    {/* Preview Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlayVoicePreview(profile);
                      }}
                      className="w-10 h-10 rounded-full bg-white border border-[#eeece8] hover:border-[#4f46e5] text-[#4f46e5] flex items-center justify-center shadow-xs shrink-0 hover:scale-105 transition"
                      title="Preview this voice"
                    >
                      <span className="material-symbols-outlined text-xl">
                        {playingVoiceId === profile.id ? 'stop' : 'play_arrow'}
                      </span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#717973] pt-2 border-t border-[#eeece8]/60">
                    <span>{profile.languages}</span>
                    <span className="font-semibold text-[#4f46e5]">
                      {selectedVoice === profile.id ? '✓ Selected Voice' : 'Click to Select'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Caller Persona & Identity */}
      {activeTab === 'persona' && (
        <div className="bg-white rounded-2xl border border-[#eeece8] p-5 sm:p-7 shadow-xs space-y-6">
          <div>
            <h2 className="text-lg font-bold text-[#1a1c1a]">Who should the assistant speak as?</h2>
            <p className="text-xs sm:text-sm text-[#58605c] mt-0.5">
              The assistant will introduce itself as you and converse naturally as a human caller.
            </p>
          </div>

          <div className="space-y-4 max-w-xl">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-[#1a1c1a] mb-1.5" htmlFor="caller-name-input">
                Your Display / Call Name
              </label>
              <input
                id="caller-name-input"
                type="text"
                value={callerName}
                onChange={(e) => setCallerName(e.target.value)}
                placeholder="e.g. Ganesh, Sunil Kumar..."
                className="w-full min-h-[44px] px-3.5 bg-[#f6f5f2] border-0 rounded-xl text-sm font-semibold text-[#1a1c1a] focus:bg-white focus:ring-2 focus:ring-[#4f46e5]/20 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-[#1a1c1a] mb-1.5">
                Conversational Tone
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setConversationalTone('informal')}
                  className={`min-h-[48px] p-3 rounded-xl border text-left text-xs sm:text-sm font-medium transition cursor-pointer ${
                    conversationalTone === 'informal'
                      ? 'border-[#4f46e5] bg-[#eef2ff]/40 text-[#4f46e5] font-semibold'
                      : 'border-[#eeece8] bg-[#f6f5f2] text-[#58605c]'
                  }`}
                >
                  <div className="font-bold">⚡ Informal &amp; Casual (Recommended)</div>
                  <div className="text-[11px] text-[#717973] mt-0.5">
                    Speaks like a friend or customer: &ldquo;ಹೇ, ನಮಸ್ತೆ! ಸಣ್ಣ ವಿಷಯ ಕೇಳ್ಬೇಕಿತ್ತು...&rdquo;
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setConversationalTone('formal')}
                  className={`min-h-[48px] p-3 rounded-xl border text-left text-xs sm:text-sm font-medium transition cursor-pointer ${
                    conversationalTone === 'formal'
                      ? 'border-[#4f46e5] bg-[#eef2ff]/40 text-[#4f46e5] font-semibold'
                      : 'border-[#eeece8] bg-[#f6f5f2] text-[#58605c]'
                  }`}
                >
                  <div className="font-bold">Formal / Corporate</div>
                  <div className="text-[11px] text-[#717973] mt-0.5">
                    Polite, reserved tone: &ldquo;ನಮಸ್ಕಾರ, ನಾನು ಈ ವಿಷಯದ ಬಗ್ಗೆ ವಿಚಾರಿಸಲು ಕರೆ ಮಾಡಿದ್ದೇನೆ.&rdquo;
                  </div>
                </button>
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hideAiIdentity}
                  onChange={(e) => setHideAiIdentity(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-[#4f46e5] focus:ring-[#4f46e5] border-[#c1c9c1] accent-[#4f46e5]"
                />
                <span className="text-xs sm:text-sm text-[#58605c] leading-relaxed select-none">
                  <strong className="text-[#1a1c1a] block">Never introduce as an AI or VaaniCall</strong>
                  Strictly speak as {callerName || 'the caller'}, avoiding robotic words like &ldquo;I am an AI assistant&rdquo;.
                </span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Speech Tuning */}
      {activeTab === 'tuning' && (
        <div className="bg-white rounded-2xl border border-[#eeece8] p-5 sm:p-7 shadow-xs space-y-6">
          <div>
            <h2 className="text-lg font-bold text-[#1a1c1a]">Speech Rate &amp; Natural Pauses</h2>
            <p className="text-xs sm:text-sm text-[#58605c] mt-0.5">
              Tune pacing and audio flow for native Kannada delivery.
            </p>
          </div>

          <div className="space-y-5 max-w-xl">
            <div>
              <div className="flex justify-between text-xs sm:text-sm font-semibold mb-2">
                <span>Speaking Rate</span>
                <span className="text-[#4f46e5] font-mono">{speakingSpeed.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.8"
                max="1.3"
                step="0.05"
                value={speakingSpeed}
                onChange={(e) => setSpeakingSpeed(parseFloat(e.target.value))}
                className="w-full accent-[#4f46e5] cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-[#717973] mt-1">
                <span>0.8x (Deliberate)</span>
                <span>1.0x (Natural)</span>
                <span>1.3x (Fast)</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
