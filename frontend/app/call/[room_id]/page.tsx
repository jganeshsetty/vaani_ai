'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { getWsUrl, fetchSession, endCall, spawnSessionFromPermanent, SessionData, TranscriptEntry } from '../../api/client';

export default function CallPageWrapper() {
  return (
    <Suspense fallback={<CallLoadingState />}>
      <NativeDialerCallPage />
    </Suspense>
  );
}

function CallLoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-4">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-slate-400">Connecting to secure voice room...</p>
      </div>
    </div>
  );
}

function NativeDialerCallPage() {
  const router = useRouter();
  const params = useParams<{ room_id: string }>();
  const searchParams = useSearchParams();

  const routeParam = params?.room_id ? decodeURIComponent(params.room_id) : '';
  const roomId = searchParams.get('room_id') || routeParam;
  const callerParam = searchParams.get('caller');
  const recipientParam = searchParams.get('recipient');
  const phoneParam = searchParams.get('phone');

  const [session, setSession] = useState<SessionData | null>(null);
  const [callState, setCallState] = useState<'ringing' | 'connected' | 'ended'>('ringing');
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [showKeypad, setShowKeypad] = useState(false);
  const [showTranscript, setShowTranscript] = useState(true);
  const [dialedDigits, setDialedDigits] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [inputText, setInputText] = useState('');
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  const wsRef = useRef<WebSocket | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize theme
  useEffect(() => {
    try {
      const isDark = localStorage.getItem('vaani_theme') !== 'light';
      setDarkMode(isDark);
    } catch (e) {}
  }, []);

  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    try {
      localStorage.setItem('vaani_theme', next ? 'dark' : 'light');
    } catch (e) {}
  };

  // 1. Fetch Session Metadata from Backend (or spawn fresh temporary session if permanent link)
  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;
    (async () => {
      try {
        if (roomId.startsWith('p-')) {
          const spawn = await spawnSessionFromPermanent(roomId);
          if (spawn && spawn.room_id) {
            router.replace(`/call/${spawn.room_id}?from=${roomId}`);
            return;
          }
        }

        const s = await fetchSession(roomId);
        if (!cancelled && s) {
          setSession(s);
          if (s.transcript && s.transcript.length > 0) {
            setTranscripts(s.transcript);
          }
        }
      } catch (err) {
        console.warn('Session auto-provisioning fallback:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [roomId, router]);

  // 2. Play Audio via Web Audio API or SpeechSynthesis fallback
  const playAudioBytes = useCallback(async (buffer: ArrayBuffer) => {
    if (!isSpeakerOn) return;
    try {
      if (!audioContextRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioCtx();
      }
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      const audioBuffer = await audioContextRef.current.decodeAudioData(buffer.slice(0));
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      setIsAgentSpeaking(true);
      source.onended = () => setIsAgentSpeaking(false);
      source.start(0);
    } catch (e) {
      console.warn('Audio decoding fallback:', e);
    }
  }, [isSpeakerOn]);

  // 3. Connect to Real-Time Voice WebSocket
  const connectCall = useCallback(async () => {
    if (!roomId || wsRef.current) return;

    try {
      const wsUrl = getWsUrl(roomId);
      const ws = new WebSocket(wsUrl);
      ws.binaryType = 'arraybuffer';
      wsRef.current = ws;

      ws.onopen = () => {
        setCallState('connected');
        // Start call duration timer
        timerRef.current = setInterval(() => {
          setSeconds((prev) => prev + 1);
        }, 1000);
      };

      ws.onmessage = async (event) => {
        if (typeof event.data === 'string') {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'transcript') {
              const entry: TranscriptEntry = {
                role: msg.data?.role || 'agent',
                speaker: msg.data?.speaker || (msg.data?.role === 'agent' ? 'AI Voice Agent' : 'You'),
                text: msg.data?.text || '',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              };
              setTranscripts((prev) => [...prev, entry]);

              // Voice fallback via SpeechSynthesis
              if (msg.data?.role === 'agent' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
                try {
                  window.speechSynthesis.cancel();
                  const utter = new SpeechSynthesisUtterance(msg.data.text);
                  utter.rate = 1.0;
                  utter.pitch = 1.0;
                  setIsAgentSpeaking(true);
                  utter.onend = () => setIsAgentSpeaking(false);
                  utter.onerror = () => setIsAgentSpeaking(false);
                  window.speechSynthesis.speak(utter);
                } catch (e) {}
              }
            } else if (msg.type === 'ready') {
              setCallState('connected');
            }
          } catch (e) {}
        } else if (event.data instanceof ArrayBuffer) {
          playAudioBytes(event.data);
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket connection error:', err);
      };

      ws.onclose = () => {
        if (callState === 'connected') {
          handleEndCall();
        }
      };

      // Start Microphone Capture
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            sampleRate: 16000,
            echoCancellation: true,
            noiseSuppression: true,
          },
        });
        micStreamRef.current = stream;

        const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';

        const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN && !isMuted) {
            e.data.arrayBuffer().then((ab) => {
              wsRef.current?.send(ab);
            });
          }
        };

        recorder.start(1000);
      } catch (micErr) {
        console.warn('Microphone permission not granted or unsupported:', micErr);
      }
    } catch (err) {
      console.error('Call connection failed:', err);
    }
  }, [roomId, playAudioBytes, isMuted, callState]);

  // Auto-connect after 1.5s ringing simulation for native phone feel
  useEffect(() => {
    const autoConnectTimer = setTimeout(() => {
      if (callState === 'ringing') {
        connectCall();
      }
    }, 1500);

    return () => clearTimeout(autoConnectTimer);
  }, [callState, connectCall]);

  // 4. Toggle Mute
  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    if (micStreamRef.current) {
      micStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !next;
      });
    }
  };

  // 5. Send In-Call Text Message
  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'message', text: inputText.trim() }));
      setTranscripts((prev) => [
        ...prev,
        {
          role: 'callee',
          speaker: 'You (Text)',
          text: inputText.trim(),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setInputText('');
    }
  };

  // 6. Handle End Call -> Auto-Navigate to /summary/[room_id]
  const handleEndCall = async () => {
    setCallState('ended');
    if (timerRef.current) clearInterval(timerRef.current);

    if (wsRef.current) {
      try {
        wsRef.current.send(JSON.stringify({ type: 'hangup' }));
        wsRef.current.close();
      } catch (e) {}
      wsRef.current = null;
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    try {
      if (roomId) await endCall(roomId);
    } catch (e) {}

    // Navigate to Page 4: Call Summary
    router.push(`/summary/${encodeURIComponent(roomId)}`);
  };

  // Keypad dial button press
  const handleKeypadPress = (val: string) => {
    setDialedDigits((prev) => prev + val);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'dtmf', digit: val }));
    }
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const callerName = callerParam || session?.caller_name || 'Ganesh';
  const recipientName = recipientParam || session?.target_name || 'Recipient';
  const phoneDisplay = phoneParam || session?.target_number || '+91 8660039103';

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-3 sm:p-6 transition-colors duration-200 ${
      darkMode ? 'bg-[#060913] text-white' : 'bg-slate-100 text-slate-900'
    }`}>
      {/* Dialer Container with Native Phone Frame */}
      <div className={`w-full max-w-sm sm:max-w-md rounded-[2.5rem] border backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col transition-colors duration-200 ${
        darkMode ? 'bg-slate-900/90 border-slate-800 shadow-slate-950/80' : 'bg-white/95 border-slate-200/90 shadow-slate-400/20'
      }`}>
        {/* Phone Top Status Bar */}
        <div className="px-6 pt-4 pb-2 flex items-center justify-between text-xs font-semibold opacity-60">
          <span>VaaniCall HD Voice</span>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              title="Toggle Dial Theme"
              className="p-1 rounded-full hover:bg-slate-500/20 transition-all text-xs"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            <span>5G</span>
            <span>100%</span>
          </div>
        </div>

        {/* Caller Header Card */}
        <div className="pt-6 pb-4 px-6 flex flex-col items-center text-center space-y-3">
          {/* Avatar with Animated Voice Waveform Pulse */}
          <div className="relative">
            <div
              className={`w-24 h-24 rounded-full flex items-center justify-center text-3xl font-extrabold shadow-lg transition-all duration-300 ${
                isAgentSpeaking
                  ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 text-white scale-105 ring-4 ring-emerald-500/40 animate-pulse'
                  : 'bg-gradient-to-tr from-slate-700 to-slate-600 dark:from-slate-800 dark:to-slate-700 text-emerald-400'
              }`}
            >
              {callerName.charAt(0).toUpperCase()}
            </div>
            {isAgentSpeaking && (
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
              </span>
            )}
          </div>

          <div>
            <h2 className="text-2xl font-bold tracking-tight">{callerName}</h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">{phoneDisplay}</p>
          </div>

          {/* Call Status Badge & Timer */}
          <div>
            {callState === 'ringing' ? (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                <span>Ringing & Connecting...</span>
              </div>
            ) : callState === 'connected' ? (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-sm font-mono font-medium tracking-wider text-emerald-500">
                  {formatTimer(seconds)}
                </span>
                <span className="text-[11px] text-slate-400">• Gnani HD Audio</span>
              </div>
            ) : (
              <span className="text-xs text-red-400 font-medium">Call Ended</span>
            )}
          </div>
        </div>

        {/* Interactive Keypad Overlay (if open) */}
        {showKeypad && (
          <div className="px-6 py-4 animate-slideDown border-y border-slate-700/40">
            {dialedDigits && (
              <div className="text-center font-mono text-xl font-bold tracking-widest text-emerald-400 mb-3">
                {dialedDigits}
              </div>
            )}
            <div className="grid grid-cols-3 gap-2.5 max-w-[240px] mx-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((digit) => (
                <button
                  key={digit}
                  onClick={() => handleKeypadPress(digit)}
                  className={`h-11 rounded-full font-bold text-base transition-all active:scale-95 flex items-center justify-center ${
                    darkMode
                      ? 'bg-slate-800/80 hover:bg-slate-700 text-white'
                      : 'bg-slate-200/80 hover:bg-slate-300 text-slate-900'
                  }`}
                >
                  {digit}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Live Conversation Transcript Drawer (Collapsible) */}
        <div className="flex-1 px-4 sm:px-6 py-2 overflow-hidden flex flex-col min-h-[160px] max-h-[220px]">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-1.5">
            <span className="uppercase tracking-wider text-[10px]">Live Call Captions</span>
            <button
              onClick={() => setShowTranscript(!showTranscript)}
              className="text-[11px] text-emerald-500 hover:underline"
            >
              {showTranscript ? 'Hide' : 'Show'}
            </button>
          </div>

          {showTranscript && (
            <div className={`flex-1 overflow-y-auto p-3 rounded-2xl border text-xs space-y-2.5 transition-colors ${
              darkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              {transcripts.length === 0 ? (
                <div className="h-full flex items-center justify-center text-center text-slate-400 text-xs py-4">
                  <span>Listening... AI agent will speak upon connection.</span>
                </div>
              ) : (
                transcripts.map((t, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${t.role === 'agent' ? 'items-start' : 'items-end'}`}
                  >
                    <span className="text-[10px] text-slate-400 font-semibold mb-0.5">
                      {t.speaker || (t.role === 'agent' ? callerName : recipientName)}
                    </span>
                    <div
                      className={`px-3 py-2 rounded-2xl max-w-[85%] text-xs leading-relaxed ${
                        t.role === 'agent'
                          ? 'bg-emerald-600/15 text-emerald-300 border border-emerald-500/30'
                          : darkMode
                          ? 'bg-slate-800 text-slate-100'
                          : 'bg-white text-slate-900 border border-slate-200'
                      }`}
                    >
                      {t.text}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Quick Text Response Input (For Noisy Environments) */}
        {callState === 'connected' && (
          <form onSubmit={handleSendText} className="px-6 py-2 flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type message to agent..."
              className={`flex-1 px-3.5 py-2 rounded-xl text-xs border focus:outline-none transition-colors ${
                darkMode
                  ? 'bg-slate-950/80 border-slate-800 text-white placeholder-slate-500'
                  : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
              }`}
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold transition-all"
            >
              Send
            </button>
          </form>
        )}

        {/* Native Phone Control Buttons Grid */}
        <div className="p-6 pt-3 pb-8 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {/* Mute Button */}
            <div className="flex flex-col items-center gap-1.5">
              <button
                onClick={handleToggleMute}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-md active:scale-95 ${
                  isMuted
                    ? 'bg-amber-500 text-white ring-4 ring-amber-500/30'
                    : darkMode
                    ? 'bg-slate-800 hover:bg-slate-700 text-white'
                    : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                }`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isMuted ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  )}
                </svg>
              </button>
              <span className="text-[11px] font-medium text-slate-400">{isMuted ? 'Unmute' : 'Mute'}</span>
            </div>

            {/* Keypad Toggle Button */}
            <div className="flex flex-col items-center gap-1.5">
              <button
                onClick={() => setShowKeypad(!showKeypad)}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-md active:scale-95 ${
                  showKeypad
                    ? 'bg-emerald-600 text-white ring-4 ring-emerald-500/30'
                    : darkMode
                    ? 'bg-slate-800 hover:bg-slate-700 text-white'
                    : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                }`}
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2a2 2 0 100 4 2 2 0 000-4zM6 2a2 2 0 100 4 2 2 0 000-4zM18 2a2 2 0 100 4 2 2 0 000-4zM12 8a2 2 0 100 4 2 2 0 000-4zM6 8a2 2 0 100 4 2 2 0 000-4zM18 8a2 2 0 100 4 2 2 0 000-4zM12 14a2 2 0 100 4 2 2 0 000-4zM6 14a2 2 0 100 4 2 2 0 000-4zM18 14a2 2 0 100 4 2 2 0 000-4zM12 20a2 2 0 100 4 2 2 0 000-4z" />
                </svg>
              </button>
              <span className="text-[11px] font-medium text-slate-400">Keypad</span>
            </div>

            {/* Speaker Toggle Button */}
            <div className="flex flex-col items-center gap-1.5">
              <button
                onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-md active:scale-95 ${
                  isSpeakerOn
                    ? 'bg-emerald-600 text-white ring-4 ring-emerald-500/30'
                    : darkMode
                    ? 'bg-slate-800 hover:bg-slate-700 text-white'
                    : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                }`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              </button>
              <span className="text-[11px] font-medium text-slate-400">{isSpeakerOn ? 'Speaker On' : 'Speaker Off'}</span>
            </div>
          </div>

          {/* Answer Call / End Call Big Action */}
          <div className="pt-2 flex justify-center">
            {callState === 'ringing' ? (
              <button
                onClick={connectCall}
                className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base shadow-lg shadow-emerald-600/30 active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M20 15.5c-1.25 0-2.45-.2-3.57-.57a1.02 1.02 0 00-1.02.24l-2.2 2.2a15.045 15.045 0 01-6.59-6.59l2.2-2.21a.96.96 0 00.25-1A11.36 11.36 0 018.5 4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 9.39 9.39 17 17 17 17 .55 0 1-.45 1-1v-3.5c0-.55-.45-1-1-1z" />
                  </svg>
                </div>
                <span>Answer & Start Voice Call</span>
              </button>
            ) : (
              <button
                onClick={handleEndCall}
                className="w-full py-4 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold text-base shadow-lg shadow-red-600/30 active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                  <svg className="w-4 h-4 fill-current transform rotate-[135deg]" viewBox="0 0 24 24">
                    <path d="M20 15.5c-1.25 0-2.45-.2-3.57-.57a1.02 1.02 0 00-1.02.24l-2.2 2.2a15.045 15.045 0 01-6.59-6.59l2.2-2.21a.96.96 0 00.25-1A11.36 11.36 0 018.5 4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 9.39 9.39 17 17 17 17 .55 0 1-.45 1-1v-3.5c0-.55-.45-1-1-1z" />
                  </svg>
                </div>
                <span>End Call</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
