'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import {
  getWsUrl,
  fetchSessionByRoom,
  fetchSessionById,
  appendSessionTranscript,
  updateSessionStatus,
  CallSession,
  TranscriptEntry,
} from '@/app/api/client';

type ConnectionState = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';

interface ChatTurn {
  role: 'agent' | 'callee';
  text: string;
  at: string;
}

function MobileCallContent() {
  const router = useRouter();
  const params = useParams<{ room_id: string }>();
  const searchParams = useSearchParams();

  const routeParam = params?.room_id ? decodeURIComponent(params.room_id) : '';
  const roomId = searchParams.get('room_id') || routeParam;
  const callerName = searchParams.get('caller') || 'Caller';
  const phoneParam = searchParams.get('phone') || '';
  const modeParam = searchParams.get('mode') || 'outbound';
  const isBusy = searchParams.get('busy') === 'true';
  const isInbound = modeParam === 'inbound' || isBusy;

  const [session, setSession] = useState<CallSession | null>(null);
  const [micPermission, setMicPermission] = useState<'prompt' | 'granted' | 'denied' | 'unsupported'>('prompt');
  const [connection, setConnection] = useState<ConnectionState>('idle');
  const [recording, setRecording] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [inputText, setInputText] = useState('');

  const handleSendTextMessage = () => {
    if (!inputText.trim()) return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'message', text: inputText.trim() }));
      setInputText('');
    }
  };

  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const playQueueRef = useRef<ArrayBuffer[]>([]);
  const playingRef = useRef(false);
  const sessionRef = useRef<CallSession | null>(null);
  const mountedRef = useRef(true);
  const vadAnalyserRef = useRef<AnalyserNode | null>(null);
  const vadDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const vadSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const targetPhone = session?.target_number || phoneParam || '';

  // ---- Resolve session (by room_id first, then by internal id from dashboard) ----
  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;
    (async () => {
      try {
        let s: CallSession | null = null;
        try {
          s = await fetchSessionByRoom(roomId);
        } catch {
          // Dashboard navigates with the session id; room lookup may 404.
          s = await fetchSessionById(roomId);
        }
        if (!cancelled) setSession(s);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Call session not found.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  // ---- Microphone permission check ----
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setMicPermission('unsupported');
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        stream.getTracks().forEach((t) => t.stop());
        if (mountedRef.current) setMicPermission('granted');
      })
      .catch((err) => {
        console.warn('Microphone permission check failed:', err);
        if (mountedRef.current) setMicPermission('denied');
      });
  }, []);

  // ---- Call timer ----
  useEffect(() => {
    if (connection !== 'connected') return;
    const iv = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(iv);
  }, [connection]);

  // ---- Unmount cleanup ----
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      try {
        mediaRecorderRef.current?.state !== 'inactive' && mediaRecorderRef.current?.stop();
      } catch {}
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
      wsRef.current?.close();
      audioCtxRef.current?.close().catch(() => {});
    };
  }, []);

  // ---- Audio playback (AudioContext, sequential chunks) ----
  const ensureAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      const Ctor = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new Ctor({ sampleRate: 16000 });
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  }, []);

  const playNextInQueue = useCallback(async () => {
    if (playingRef.current) return;
    const next = playQueueRef.current.shift();
    if (!next) {
      setSpeaking(false);
      return;
    }
    playingRef.current = true;
    setSpeaking(true);
    try {
      const ctx = ensureAudioContext();
      const buf = await ctx.decodeAudioData(next.slice(0));
      // 5ms silence padding between chunks to avoid clicks
      const padMs = 0.005;
      const padLen = Math.max(1, Math.floor(ctx.sampleRate * padMs));
      const padded = ctx.createBuffer(
        1,
        buf.numberOfChannels * padLen + buf.length,
        ctx.sampleRate
      );
      for (let ch = 0; ch < buf.numberOfChannels; ch++) {
        const srcChan = buf.getChannelData(ch);
        const dstChan = padded.getChannelData(ch);
        for (let i = 0; i < srcChan.length; i++) {
          dstChan[i + padLen] = srcChan[i];
        }
      }
      await new Promise<void>((resolve) => {
        const src = ctx.createBufferSource();
        src.buffer = padded;
        src.connect(ctx.destination);
        src.onended = () => resolve();
        src.start();
      });
    } catch (e) {
      console.warn('Audio chunk decode/play failed:', e);
    } finally {
      playingRef.current = false;
      if (mountedRef.current) playNextInQueue();
    }
  }, [ensureAudioContext]);

  const enqueueAudio = useCallback(
    (chunk: ArrayBuffer) => {
      playQueueRef.current.push(chunk);
      playNextInQueue();
    },
    [playNextInQueue]
  );

  // ---- Voice Activity Detection (VAD) ----
  const getVolume = useCallback(() => {
    const analyser = vadAnalyserRef.current;
    const data = vadDataRef.current;
    if (!analyser || !data) return 0;
    analyser.getByteFrequencyData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i];
    return sum / data.length;
  }, []);

  // ---- Mic streaming over WebSocket ----
  const startRecording = useCallback(async () => {
    if (!micPermission || micPermission !== 'granted') {
      setError('Microphone permission is required to speak.');
      return;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : '';
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);

      // Set up VAD analyser on the mic stream
      const ctx = ensureAudioContext();
      if (!vadAnalyserRef.current) {
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        vadAnalyserRef.current = analyser;
        vadDataRef.current = new Uint8Array(analyser.frequencyBinCount);
        const source = ctx.createMediaStreamSource(stream);
        source.connect(analyser);
        vadSourceRef.current = source;
      }

      recorder.ondataavailable = async (ev) => {
        if (!ev.data || ev.data.size === 0) return;
        // Skip chunks below the volume threshold (silence) to reduce noise
        if (getVolume() < 8) return;
        const ws = wsRef.current;
        if (ws && ws.readyState === WebSocket.OPEN) {
          let buf = await ev.data.arrayBuffer();
          // Ensure buf is ArrayBuffer, not SharedArrayBuffer
          if (buf instanceof SharedArrayBuffer) {
            buf = new Uint8Array(buf).buffer;
          }
          ws.send(buf);
        }
      };
      recorder.start(250); // emit a chunk every 250ms
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setError(null);
    } catch (e: any) {
      console.error('Failed to start recording:', e);
      setError('Could not access the microphone.');
    }
  }, [micPermission, ensureAudioContext, getVolume]);

  const stopRecording = useCallback(() => {
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    } catch {}
    mediaRecorderRef.current = null;
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    setRecording(false);
  }, []);

  // ---- WebSocket connect ----
  const connect = useCallback(() => {
    if (!roomId || connection === 'connecting' || connection === 'connected') return;
    setError(null);
    setConnection('connecting');

    const url = getWsUrl(roomId);
    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch (e) {
      setConnection('error');
      setError('Invalid WebSocket URL.');
      return;
    }
    ws.binaryType = 'arraybuffer';
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      setConnection('connected');
      ws.send(
        JSON.stringify({
          type: 'start',
          room_id: roomId,
          session_id: sessionRef.current?.id,
          caller_name: callerName,
        })
      );
      // Automatically activate microphone for seamless two-way voice call
      startRecording();
    };

    ws.onmessage = (event) => {
      if (!mountedRef.current) return;
      if (event.data instanceof ArrayBuffer) {
        enqueueAudio(event.data);
        return;
      }
      try {
        const msg = JSON.parse(event.data as string);
        switch (msg.type) {
          case 'transcript': {
            const entry = msg.data as TranscriptEntry | undefined;
            if (entry?.text) {
              const isAgent = entry.role === 'agent' || (entry.role as string) === 'caller' || (entry.role as string) === 'assistant';
              setTurns((prev) => [
                ...prev,
                {
                  role: isAgent ? 'agent' : 'callee',
                  text: entry.text,
                  at: new Date().toLocaleTimeString(),
                },
              ]);

              // Play speech synthesis as instant high-fidelity audio output
              if (isAgent && typeof window !== 'undefined' && 'speechSynthesis' in window) {
                try {
                  const utterance = new SpeechSynthesisUtterance(entry.text);
                  utterance.lang = 'en-US';
                  utterance.rate = 1.0;
                  window.speechSynthesis.speak(utterance);
                } catch (e) {}
              }
            }
            break;
          }
          case 'audio':
            if (typeof msg.audio_base64 === 'string') {
              const bin = atob(msg.audio_base64);
              const bytes = new Uint8Array(bin.length);
              for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
              enqueueAudio(bytes.buffer);
            }
            break;
          case 'status':
            if (msg.status && sessionRef.current) {
              setSession({ ...sessionRef.current, status: msg.status });
            }
            break;
          case 'summary':
            if (msg.summary && sessionRef.current) {
              setSession({ ...sessionRef.current, summary: msg.summary, status: 'completed' });
            }
            break;
          case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
          case 'error':
            setError(msg.error || 'Server error');
            break;
        }
      } catch (e) {
        console.warn('Unparseable WebSocket message:', e);
      }
    };

    ws.onerror = () => {
      if (mountedRef.current) setError('WebSocket connection error.');
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      wsRef.current = null;
      stopRecording();
      setConnection((prev) => (prev === 'error' ? 'error' : 'disconnected'));

      // Redirect to summary on WebSocket disconnect (if not already redirecting)
      if (!isRedirecting && sessionRef.current?.id) {
        setIsRedirecting(true);
        // Small delay to allow cleanup
        setTimeout(() => {
          router.push(`/summary/${roomId}`);
        }, 500);
      }
    };
  }, [roomId, connection, callerName, enqueueAudio, stopRecording]);

  // ---- End call ----
  const endCall = useCallback(async () => {
    setIsRedirecting(true);

    // 1. Immediately close the audio context
    try {
      audioCtxRef.current?.close();
    } catch {}
    audioCtxRef.current = null;

    // 2. Stop the microphone tracks
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;

    // 3. Stop recording
    stopRecording();

    // 4. Send stop message and close WebSocket
    try {
      wsRef.current?.send(JSON.stringify({ type: 'stop' }));
    } catch {}
    wsRef.current?.close();
    wsRef.current = null;
    playQueueRef.current = [];
    setConnection('disconnected');

    const s = sessionRef.current;
    if (s?.id) {
      try {
        const summary = `Call session ended after ${Math.floor(seconds / 60)}m ${seconds % 60}s.`;
        await updateSessionStatus(s.id, 'completed');
        await appendSessionTranscript(s.id, {
          role: 'agent',
          text: `[Session ended] ${summary}`,
          language: s.language,
        });
      } catch (e) {
        console.warn('Could not persist session end:', e);
      }
    }

    // 5. Redirect to summary page
    router.push(`/summary/${roomId}`);
  }, [router, roomId, seconds, stopRecording]);

  // Fallback link to voice studio preview when mic is blocked
  const micBlocked = micPermission === 'denied' || micPermission === 'unsupported';
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');

  return (
    <div className="w-full min-h-[calc(100vh-120px)] px-4 sm:px-6 py-6 max-w-lg mx-auto space-y-5">
      {/* Header */}
      <div className="text-center space-y-1.5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e2dfff] text-primary text-xs font-semibold">
          <span
            className={`w-2 h-2 rounded-full ${
              connection === 'connected' ? 'bg-emerald-500 animate-pulse' : connection === 'error' ? 'bg-red-500' : 'bg-primary-container'
            }`}
          />
          <span>
            {connection === 'connected'
              ? 'Live • Secure WSS'
              : connection === 'connecting'
              ? 'Connecting securely…'
              : connection === 'disconnected'
              ? 'Disconnected'
              : connection === 'error'
              ? 'Connection failed'
              : 'Ready'}
          </span>
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-[#131b2e] tracking-tight">
          {isInbound
            ? 'AI Assistant Screening'
            : session?.target_name
            ? `Call with ${session.target_name}`
            : `Call ${callerName}`}
        </h1>
        <p className="text-xs text-[#464555] font-mono">
          {session?.target_number || 'Secure Call Room'} · English
        </p>
        <p className="text-sm font-mono font-bold text-[#131b2e] pt-1">
          {mins}:{secs}
        </p>
      </div>

      {isInbound && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-container/10 border border-primary-container/30 text-xs font-semibold text-primary">
          <span className="material-symbols-outlined text-base">phone_in_talk</span>
          <span>Incoming Call — AI Assistant Screening</span>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-slate-700 flex items-start gap-2">
          <span className="material-symbols-outlined text-amber-600 text-base shrink-0">warning</span>
          <span>{error}</span>
        </div>
      )}

      {/* Optimized Call Screen Layout */}
      <div className="flex flex-col items-center space-y-6">
        {/* Avatar and Caller Info Section */}
        <div className="flex flex-col items-center space-y-3">
          {/* Circular Avatar */}
          <div className="w-28 h-28 rounded-full bg-primary-container flex items-center justify-center">
            {session?.target_name ? (
              <span className="text-white text-5xl font-bold">
                {session.target_name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </span>
            ) : (
              <span className="material-symbols-outlined text-white text-5xl">person</span>
            )}
          </div>

          {/* Caller Name */}
          <h2 className="text-2xl font-extrabold text-[#131b2e]">{session?.target_name || callerName}</h2>

          {/* Phone Number */}
          <p className="text-sm text-[#464555] font-mono">
            {session?.target_number || phoneParam}
          </p>
        </div>

        {/* Timer Display */}
        <div className="flex items-center justify-center">
          <span className="font-mono text-lg font-bold text-[#464555]">{mins}:{secs}</span>
        </div>

        {/* Connection State Display */}
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              connection === 'connected' ? 'bg-emerald-500 animate-pulse' : connection === 'error' ? 'bg-red-500' : 'bg-primary-container'
            }`}
          />
          <span className="text-xs text-[#464555]">
            {connection === 'connected'
              ? 'Live • Secure WSS'
              : connection === 'connecting'
              ? 'Connecting securely…'
              : connection === 'disconnected'
              ? 'Disconnected'
              : connection === 'error'
              ? 'Connection failed'
              : 'Ready'}
          </span>
        </div>

        {/* Microphone Permission Status (Simplified) */}
        {micBlocked ? (
          <div
            className={`p-4 rounded-2xl border ${
              micBlocked ? 'bg-amber-50 border-amber-200' : 'bg-[#f2f3ff] border-[#eaedff]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  micBlocked ? 'bg-amber-100 text-amber-700' : 'bg-[#e2dfff] text-primary'
                }`}
              >
                <span className="material-symbols-outlined text-[22px]">
                  {micBlocked ? 'mic_off' : 'mic'}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#131b2e]">
                  {micPermission === 'denied'
                    ? 'Microphone blocked'
                    : 'Microphone unsupported'}
                </p>
                <p className="text-xs text-[#464555] mt-0.5 leading-relaxed">
                  Allow microphone access in your browser site settings to speak.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {/* Call Controls - End Call + Mute Toggle */}
        <div className="w-full max-w-sm flex gap-4">
          {/* Mute Toggle */}
          <button
            type="button"
            onClick={recording ? stopRecording : startRecording}
            disabled={micBlocked || isRedirecting}
            className={`w-14 h-14 rounded-full bg-white border border-[#eaedff] flex items-center justify-center transition-shadow cursor-pointer ${
              recording
                ? 'bg-red-50 border-red-200'
                : 'hover:bg-[#f2f3ff] hover:border-[#e2dfff]'
            } disabled:opacity-60`}
          >
            <span className="material-symbols-outlined text-[#464555] text-xl">
              {recording ? 'mic_off' : 'mic'}
            </span>
          </button>

          {/* End Call Button */}
          <button
            type="button"
            onClick={endCall}
            disabled={isRedirecting}
            className={`flex-1 h-14 rounded-full text-white text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
              isRedirecting
                ? 'bg-red-400 cursor-wait'
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">
              {isRedirecting ? 'hourglass_empty' : 'call_end'}
            </span>
            <span>{isRedirecting ? 'Loading summary…' : 'End Call'}</span>
          </button>
        </div>

        {/* Redirecting indicator */}
        {isRedirecting && (
          <div className="flex items-center justify-center gap-2 text-xs text-primary">
            <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span>Preparing your call summary...</span>
          </div>
        )}

        {/* Audio Level Visualization (for speaking indicator) */}
        {recording && (
          <div className="flex items-center justify-center py-2">
            <div
              className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500 ${
                speaking
                  ? 'bg-primary-container/20 ring-8 ring-primary-container/20 animate-pulse'
                  : 'bg-[#e2dfff] ring-8 ring-primary-container/10'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-primary-container text-white flex items-center justify-center shadow-lg shadow-primary-container/30">
                <span className="material-symbols-outlined text-3xl">
                  {speaking ? 'graphic_eq' : 'mic'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Connection Controls (only when not connected) */}
        {connection !== 'connected' && (
          <button
            type="button"
            onClick={connect}
            disabled={!roomId || connection === 'connecting'}
            className="w-full max-w-sm min-h-[52px] rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-base font-bold flex items-center justify-center gap-2 transition shadow-md shadow-emerald-600/25 disabled:opacity-60 cursor-pointer animate-pulse"
          >
            <span className="material-symbols-outlined text-[24px]">call</span>
            <span>{connection === 'connecting' ? 'Connecting Call…' : 'Answer & Start Voice Call'}</span>
          </button>
        )}

        {/* Live Conversation Transcript (Active during & after call) */}
        {turns.length > 0 && (
          <div className="w-full bg-white rounded-2xl border border-[#e2e7ff] shadow-xl shadow-slate-900/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-lg">record_voice_over</span>
                <h2 className="text-sm font-bold text-[#131b2e]">Live Call Transcript</h2>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Real-time
              </span>
            </div>

            <div className="max-h-[300px] overflow-y-auto space-y-2.5 pr-1">
              {turns.map((t, i) => (
                <div
                  key={i}
                  className={`flex flex-col gap-0.5 p-3 rounded-2xl ${
                    t.role === 'agent'
                      ? 'bg-primary-container text-white ml-6 shadow-xs'
                      : 'bg-[#f2f3ff] text-[#131b2e] mr-6 border border-[#eaedff]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${t.role === 'agent' ? 'text-white/80' : 'text-primary'}`}>
                      {t.role === 'agent' ? callerName : 'You'}
                    </span>
                    <span className={`text-[10px] ${t.role === 'agent' ? 'text-white/60' : 'text-[#777587]'}`}>{t.at}</span>
                  </div>
                  <span className="text-xs sm:text-sm leading-relaxed">{t.text}</span>
                </div>
              ))}
            </div>

            {/* Quick text input for noisy environments */}
            {connection === 'connected' && (
              <div className="pt-2 flex items-center gap-2 border-t border-[#eaedff]">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendTextMessage();
                  }}
                  placeholder="Or type a message to reply..."
                  className="flex-1 min-h-[40px] px-3 bg-[#f2f3ff] border border-[#eaedff] rounded-xl text-xs text-[#131b2e] focus:bg-white focus:ring-2 focus:ring-primary-container/30 outline-none transition"
                />
                <button
                  type="button"
                  onClick={handleSendTextMessage}
                  disabled={!inputText.trim()}
                  className="w-10 h-10 rounded-xl bg-primary-container hover:bg-primary text-white flex items-center justify-center transition cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">send</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Navigation Links */}
        <div className="flex items-center justify-center gap-4 text-xs pt-1">
          <Link href="/call/history" className="text-[#464555] hover:text-primary font-semibold">
            Call history
          </Link>
          <Link href="/dashboard" className="text-[#464555] hover:text-primary font-semibold">
            New call
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function MobileCallPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-[#777587]">
          <span className="material-symbols-outlined text-4xl animate-spin text-primary">refresh</span>
          <p className="mt-2 text-sm font-medium">Preparing secure call…</p>
        </div>
      }
    >
      <MobileCallContent />
    </Suspense>
  );
}
