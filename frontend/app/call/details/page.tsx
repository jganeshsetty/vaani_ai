'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { fetchCall, fetchCalls, fetchTask, Call, Task } from '@/app/api/client';

function CallDetailsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryId = searchParams.get('id');

  const [call, setCall] = useState<Call | null>(null);
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);

  const [isPlaying, setIsPlaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [translationMode, setTranslationMode] = useState<'both' | 'kannada' | 'english'>('both');
  const [callerName, setCallerName] = useState('Ganesh');

  useEffect(() => {
    try {
      const storedName = localStorage.getItem('vaani_caller_name');
      if (storedName) setCallerName(storedName);
    } catch {}

    (async () => {
      try {
        setLoading(true);
        let loadedCall: Call | null = null;

        if (queryId && queryId !== 'details') {
          loadedCall = await fetchCall(queryId);
        } else {
          const allCalls = await fetchCalls();
          if (allCalls && allCalls.length > 0) {
            loadedCall = allCalls[0];
          }
        }

        if (loadedCall) {
          setCall(loadedCall);
          if (loadedCall.task_id) {
            try {
              const loadedTask = await fetchTask(loadedCall.task_id);
              setTask(loadedTask);
            } catch (te) {
              console.warn('Could not load task details:', te);
            }
          }
        }
      } catch (e) {
        console.warn('Could not load call details from backend:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [queryId]);

  const taskDesc = task?.description || '';
  const targetPhone = call?.target_number || task?.target_number || '';

  const recipientName =
    taskDesc.toLowerCase().includes('ganesh') || targetPhone.includes('8660039103')
      ? 'Ganesh'
      : targetPhone
      ? `Contact (${targetPhone})`
      : 'Recipient';

  const callTag = taskDesc ? 'Voice AI Call' : 'Outbound Call';

  const summaryText =
    call?.summary ||
    (call?.status === 'completed'
      ? 'Call completed successfully.'
      : 'Call initiated. Awaiting summary from live conversation.');

  const transcriptTurns =
    call?.transcript && call.transcript.length > 0
      ? call.transcript.map((entry: any) => ({
          role: entry.role === 'caller' || entry.role === 'agent' ? 'caller' : 'receiver',
          speaker:
            entry.speaker ||
            (entry.role === 'caller' || entry.role === 'agent'
              ? `${callerName} (Caller)`
              : recipientName),
          kannada: entry.kannada || entry.text || '',
          english: entry.english || entry.text || '',
        }))
      : [];

  const handleCopy = () => {
    const text = `Call Details & Summary:
- Recipient: ${recipientName} (${targetPhone})
- Speaking As: ${callerName}
- Outcome: ${summaryText}

Transcript:
${transcriptTurns.map((t) => `${t.speaker}: "${t.kannada}" (${t.english})`).join('\n')}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const rawNumber = targetPhone || '';
    const cleanNumber = rawNumber.replace(/[^0-9]/g, '');
    const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://vaani.pages.dev';
    const message = `Call Summary from Vaani AI:\n- Recipient: ${recipientName}\n- Outcome: ${summaryText}\n\nVisit our website: ${siteUrl}`;

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

    const waUrl = cleanNumber
      ? `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    if (typeof window !== 'undefined') {
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const cycleTranslation = () => {
    setTranslationMode((prev) => (prev === 'both' ? 'kannada' : prev === 'kannada' ? 'english' : 'both'));
  };

  const handleAudioPlayback = () => {
    if (typeof window === 'undefined') return;
    if (isPlaying) {
      window.speechSynthesis?.cancel();
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const textToSpeak = transcriptTurns.map((t) => `${t.speaker}: ${t.kannada}`).join('. ');
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.rate = 1.0;
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => setIsPlaying(false), 3000);
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 max-w-5xl mx-auto flex-1 space-y-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/call/history"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#464555] hover:text-primary transition"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          <span>Back to Call History</span>
        </Link>

        <Link
          href="/dashboard"
          className="min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-container hover:bg-primary text-white text-xs sm:text-sm font-semibold shadow-xs transition cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">add_call</span>
          <span>Make Another Call</span>
        </Link>
      </div>

      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-[#e2e7ff] p-5 sm:p-7 shadow-xl shadow-slate-900/5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#e2dfff] flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined text-2xl">
                {recipientName === 'Ganesh' ? 'person' : 'phone_in_talk'}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-[#131b2e] tracking-tight">
                  Call with {recipientName}
                </h1>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#e2dfff] text-primary">
                  {callTag}
                </span>
              </div>
              <div className="text-xs sm:text-sm text-[#464555] font-medium mt-1 flex items-center gap-2 flex-wrap">
                <span className="font-mono text-[#777587]">{targetPhone}</span>
                <span>•</span>
                <span>Spoke as <strong className="text-[#131b2e]">{callerName}</strong></span>
                <span>•</span>
                <span className="text-primary font-semibold">Completed</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5 self-start sm:self-center">
            <button
              type="button"
              onClick={handleAudioPlayback}
              className={`min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                isPlaying
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-[#e2dfff] text-primary hover:bg-[#c3c0ff]'
              }`}
            >
              <span className="material-symbols-outlined text-base">
                {isPlaying ? 'stop' : 'volume_up'}
              </span>
              <span>{isPlaying ? 'Stop Audio' : 'Listen Recording'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="min-h-[44px] px-4 py-2 rounded-xl border border-[#e2e7ff] hover:bg-[#f2f3ff] text-xs sm:text-sm font-semibold text-[#464555] hover:text-[#131b2e] flex items-center gap-1.5 transition cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">
                {copied ? 'check' : 'content_copy'}
              </span>
              <span>{copied ? 'Copied' : 'Copy Summary'}</span>
            </button>

            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-xs sm:text-sm font-semibold text-emerald-800 border border-emerald-300 flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <span className="material-symbols-outlined text-base text-emerald-600">chat</span>
              <span>Send via WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Dynamic Executive Call Summary */}
        <div className="p-4 rounded-xl bg-[#f2f3ff] border border-[#eaedff] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-primary flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base">verified</span>
              <span>Call Outcome &amp; Summary</span>
            </span>
            <span className="text-[11px] text-[#777587]">Directly verified on call</span>
          </div>
          <p className="text-xs sm:text-sm text-[#131b2e] font-medium leading-relaxed">
            {summaryText}
          </p>
        </div>
      </div>

      {/* Transcript with Interactive Translation Button */}
      <div className="bg-white rounded-2xl border border-[#e2e7ff] p-5 sm:p-7 shadow-xl shadow-slate-900/5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#eaedff] gap-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">record_voice_over</span>
            <h2 className="text-base sm:text-lg font-bold text-[#131b2e]">Full Conversation Transcript</h2>
          </div>

          <button
            type="button"
            onClick={cycleTranslation}
            className="min-h-[38px] inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#f2f3ff] hover:bg-[#eaedff] border border-[#dae2fd] text-xs font-semibold text-primary shadow-xs transition active:scale-95 cursor-pointer self-start sm:self-auto"
            title="Cycle Subtitle Translation Mode"
          >
            <span className="material-symbols-outlined text-[15px]">translate</span>
            <span>
              {translationMode === 'both'
                ? 'Subtitles: Dual (ಕನ್ನಡ + Eng)'
                : translationMode === 'kannada'
                ? 'Subtitles: ಕನ್ನಡ ಮಾತ್ರ'
                : 'Subtitles: English Only'}
            </span>
          </button>
        </div>

        <div className="space-y-4 pt-2">
          {transcriptTurns.length === 0 ? (
            <div className="p-8 text-center text-[#777587] bg-[#f2f3ff] rounded-2xl border border-[#eaedff]">
              <span className="material-symbols-outlined text-3xl mb-1 text-primary">mic_none</span>
              <p className="text-sm font-medium">No speech transcript recorded for this call yet.</p>
            </div>
          ) : (
            transcriptTurns.map((turn, idx) => {
              const isCaller = turn.role === 'caller';
              return (
                <div
                  key={idx}
                  className={`flex gap-3.5 max-w-[90%] sm:max-w-[80%] ${
                    isCaller ? 'ml-auto flex-row-reverse' : ''
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-1 shadow-xs ${
                      isCaller
                        ? 'bg-primary-container text-white'
                        : 'bg-white border border-[#e2e7ff] text-[#464555]'
                    }`}
                  >
                    {isCaller ? callerName[0]?.toUpperCase() || 'G' : recipientName[0]?.toUpperCase() || 'R'}
                  </div>

                  <div
                    className={`p-4 rounded-2xl text-xs sm:text-sm space-y-1.5 shadow-xs ${
                      isCaller
                        ? 'bg-primary-container text-white rounded-tr-none'
                        : 'bg-[#f2f3ff] text-[#131b2e] border border-[#eaedff] rounded-tl-none'
                    }`}
                  >
                    <div className="text-[11px] font-semibold opacity-85">{turn.speaker}</div>

                    {(translationMode === 'both' || translationMode === 'kannada') && (
                      <p className="font-medium leading-relaxed">{turn.kannada}</p>
                    )}

                    {(translationMode === 'both' || translationMode === 'english') && (
                      <p
                        className={`text-[12px] leading-relaxed pt-0.5 border-t ${
                          isCaller
                            ? 'text-white/80 border-white/20'
                            : 'text-[#464555] border-[#eaedff]'
                        }`}
                      >
                        {turn.english}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default function StaticCallDetailsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-[#464555]">Loading call details...</div>}>
      <CallDetailsContent />
    </Suspense>
  );
}
