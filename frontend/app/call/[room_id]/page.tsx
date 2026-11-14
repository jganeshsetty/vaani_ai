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

  const [session, setSession] = useState<CallSession | null>(null);
  const [waSent, setWaSent] = useState(false);
  const [micPermission, setMicPermission] = useState<'prompt' | 'granted' | 'denied' | 'unsupported'>('prompt');
  const [connection, setConnection] = useState<ConnectionState>('idle');
  const [recording, setRecording] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const playQueueRef = useRef<ArrayBuffer[]>([]);
  const playingRef = useRef(false);
  const sessionRef = useRef<CallSession | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const targetPhone = session?.target_number || phoneParam || '';

  const sendWebsiteLinkToWhatsApp = useCallback((customText?: string) => {
    const rawNumber = targetPhone || '';
    const cleanNumber = rawNumber.replace(/[^0-9]/g, '');
    const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://vaani.pages.dev';
    const message = customText
      ? `${customText}\n\nVaani AI Website: ${siteUrl}`
      : `Hi! Thank you for speaking with Vaani AI. Here is our website link: ${siteUrl}`;

    // 1. Background n8n webhook notification
    const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;
    if (webhookUrl && cleanNumber) {
      try {
        fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'outbound',
            phone: cleanNumber,
            link: siteUrl,
            message: message,
          }),
        }).catch(() => {});
      } catch {}
    }

    // 2. Direct WhatsApp Click-to-Chat (wa.me) - 100% free, no business account needed
    const waUrl = cleanNumber
      ? `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    if (typeof window !== 'undefined') {
      window.open(waUrl, '_blank', 'noopener,noreferrer');
      setWaSent(true);
      setTimeout(() => setWaSent(false), 3000);
    }
  }, [targetPhone]);

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
      await new Promise<void>((resolve) => {
        const src = ctx.createBufferSource();
        src.buffer = buf;
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
      recorder.ondataavailable = async (ev) => {
        if (!ev.data || ev.data.size === 0) return;
        const ws = wsRef.current;
        if (ws && ws.readyState === WebSocket.OPEN) {
          const buf = await ev.data.arrayBuffer();
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
  }, [micPermission]);

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

    const url = `${getWsUrl().replace(/\/$/, '')}/ws/${encodeURIComponent(roomId)}`;
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
              setTurns((prev) => [
                ...prev,
                {
                  role: entry.role === 'agent' || (entry.role as string) === 'caller' ? 'agent' : 'callee',
                  text: entry.text,
                  at: new Date().toLocaleTimeString(),
                },
              ]);
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
    };
  }, [roomId, connection, callerName, enqueueAudio, stopRecording]);

  // ---- End call ----
  const endCall = useCallback(async () => {
    stopRecording();
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
    router.push(s?.id ? `/call/details?id=${s.id}` : '/call/history');
  }, [router, seconds, stopRecording]);

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
          {session?.target_name ? `Call with ${session.target_name}` : `Call ${callerName}`}
        </h1>
        <p className="text-xs text-[#464555] font-mono">
          {session?.target_number || 'Room'} · {session?.language === 'english' ? 'English' : 'ಕನ್ನಡ'}
        </p>
        <p className="text-sm font-mono font-bold text-[#131b2e] pt-1">
          {mins}:{secs}
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-slate-700 flex items-start gap-2">
          <span className="material-symbols-outlined text-amber-600 text-base shrink-0">warning</span>
          <span>{error}</span>
        </div>
      )}

      {/* Mic permission */}
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
              {micPermission === 'granted'
                ? 'Microphone ready'
                : micPermission === 'denied'
                ? 'Microphone blocked'
                : micPermission === 'unsupported'
                ? 'Microphone unsupported'
                : 'Requesting microphone…'}
            </p>
            <p className="text-xs text-[#464555] mt-0.5 leading-relaxed">
              {micPermission === 'granted'
                ? 'Audio is streamed over an encrypted WebSocket (WSS).'
                : 'Allow microphone access in your browser site settings to speak.'}
            </p>
          </div>
        </div>
      </div>

      {/* Orb / radar */}
      <div className="flex items-center justify-center py-2">
        <div
          className={`relative w-32 h-32 sm:w-40 sm:h-40 rounded-full flex items-center justify-center transition-all duration-500 ${
            speaking
              ? 'bg-primary-container/20 ring-8 ring-primary-container/20 animate-pulse'
              : recording
              ? 'bg-emerald-50 ring-8 ring-emerald-200/60'
              : 'bg-[#e2dfff] ring-8 ring-primary-container/10'
          }`}
        >
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-primary-container text-white flex items-center justify-center shadow-lg shadow-primary-container/30">
            <span className="material-symbols-outlined text-4xl sm:text-5xl">
              {speaking ? 'graphic_eq' : recording ? 'mic' : 'phone_in_talk'}
            </span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 gap-3">
        {connection !== 'connected' ? (
          <button
            type="button"
            onClick={connect}
            disabled={!roomId || connection === 'connecting'}
            className="w-full min-h-[48px] rounded-2xl bg-primary-container hover:bg-primary text-white text-sm font-bold flex items-center justify-center gap-2 transition disabled:opacity-60 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">link</span>
            <span>{connection === 'connecting' ? 'Connecting…' : 'Connect to AI Call'}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={recording ? stopRecording : startRecording}
            disabled={micBlocked}
            className={`w-full min-h-[48px] rounded-2xl text-white text-sm font-bold flex items-center justify-center gap-2 transition disabled:opacity-60 cursor-pointer ${
              recording ? 'bg-slate-700 hover:bg-slate-800' : 'bg-primary-container hover:bg-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">{recording ? 'stop_circle' : 'mic'}</span>
            <span>{recording ? 'Stop speaking' : 'Push to speak'}</span>
          </button>
        )}

        <button
          type="button"
          onClick={endCall}
          className="w-full min-h-[48px] rounded-2xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">call_end</span>
          <span>End call</span>
        </button>
      </div>

      {/* Live conversation & WhatsApp Link Dispatch */}
      <div className="bg-white rounded-2xl border border-[#e2e7ff] shadow-xl shadow-slate-900/5 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-lg">record_voice_over</span>
            <h2 className="text-sm font-bold text-[#131b2e]">Live conversation</h2>
          </div>

          {/* Quick WhatsApp website link dispatch */}
          <button
            type="button"
            onClick={() => sendWebsiteLinkToWhatsApp()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition border border-emerald-300 shadow-xs cursor-pointer active:scale-95"
            title="Send website link to this person's WhatsApp"
          >
            <span className="material-symbols-outlined text-[16px] text-emerald-600">chat</span>
            <span>{waSent ? 'Link Dispatched!' : 'Send Link via WhatsApp'}</span>
          </button>
        </div>

        {targetPhone && (
          <div className="flex items-center justify-between text-[11px] text-[#777587] bg-[#f8f9ff] px-3 py-1.5 rounded-lg border border-[#eaedff]">
            <span>Recipient: <strong className="font-mono text-[#131b2e]">{targetPhone}</strong></span>
            <span>Click any message below to send via WhatsApp</span>
          </div>
        )}

        <div className="max-h-[340px] overflow-y-auto space-y-2.5">
          {turns.length === 0 ? (
            <div className="p-6 text-center text-[#777587] bg-[#f2f3ff] rounded-xl border border-[#eaedff]">
              <span className="material-symbols-outlined text-2xl mb-1 text-primary">mic_none</span>
              <p className="text-xs font-medium">Conversation will appear here once the call starts.</p>
            </div>
          ) : (
            turns.map((t, i) => (
              <div
                key={i}
                onClick={() => sendWebsiteLinkToWhatsApp(`Call note: "${t.text}"`)}
                title="Click to send this message and website link to WhatsApp"
                className={`flex flex-col gap-0.5 p-2.5 rounded-xl cursor-pointer hover:ring-2 hover:ring-emerald-400/60 transition group ${
                  t.role === 'agent'
                    ? 'bg-primary-container text-white ml-6'
                    : 'bg-[#f2f3ff] text-[#131b2e] mr-6 border border-[#eaedff]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-semibold ${t.role === 'agent' ? 'text-white/70' : 'text-[#777587]'}`}>
                    {t.role === 'agent' ? 'AI caller' : 'You'} · {t.at}
                  </span>
                  <span className={`text-[10px] opacity-75 group-hover:opacity-100 flex items-center gap-0.5 font-medium ${t.role === 'agent' ? 'text-emerald-200' : 'text-emerald-700'}`}>
                    <span className="material-symbols-outlined text-[13px]">share</span> WhatsApp
                  </span>
                </div>
                <span className="text-xs sm:text-sm leading-relaxed">{t.text}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 text-xs pt-1">
        <Link href="/call/history" className="text-[#464555] hover:text-primary font-semibold">
          Call history
        </Link>
        <Link href="/dashboard" className="text-[#464555] hover:text-primary font-semibold">
          New call
        </Link>
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
