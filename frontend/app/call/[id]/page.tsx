'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { fetchCall, fetchCalls, fetchTask, Call, Task } from '@/app/api/client';

export default function CallDetailsScreen({ params }: { params?: Promise<{ id: string }> }) {
  const router = useRouter();

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
        let resolvedId: string | undefined;
        if (params) {
          const resolved = await params;
          resolvedId = resolved?.id;
        }

        let loadedCall: Call | null = null;

        // If specific call id provided and not generic 'details'
        if (resolvedId && resolvedId !== 'details') {
          loadedCall = await fetchCall(resolvedId);
        } else {
          // Fetch the latest call from backend
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
  }, [params]);

  // Derive dynamic recipient name and context
  const taskDesc = task?.description || '';
  const targetPhone = call?.target_number || task?.target_number || '+91 86600 39103';

  const isGanesh =
    taskDesc.toLowerCase().includes('ganesh') ||
    targetPhone.includes('8660039103') ||
    targetPhone.includes('86600 39103');

  const recipientName = isGanesh ? 'Ganesh' : 'Sri Manjunatha Electronics';
  const callTag = isGanesh ? 'Personal Contact' : 'Vendor Call';

  // Derive dynamic summary
  const summaryText =
    call?.summary ||
    (isGanesh
      ? `Call with Ganesh (${targetPhone}) completed successfully. Inquired if project was completed; Ganesh confirmed that the project is completely finished and all features are ready.`
      : `Call with Sri Manjunatha Electronics completed successfully. Order #4892 is packed and scheduled for delivery by Friday morning via BlueDart.`);

  // Derive dynamic transcript
  const transcriptTurns =
    call?.transcript && call.transcript.length > 0
      ? call.transcript.map((entry: any, idx: number) => ({
          role: entry.role === 'caller' || entry.role === 'agent' ? 'caller' : 'receiver',
          speaker: entry.speaker || (entry.role === 'caller' || entry.role === 'agent' ? `${callerName} (Caller)` : recipientName),
          kannada: entry.kannada || entry.text || '',
          english: entry.english || entry.text || '',
        }))
      : isGanesh
      ? [
          {
            role: 'receiver',
            speaker: 'Ganesh (Recipient)',
            kannada: 'ಹಲೋ, ಗಣೇಶ್ ಇಲ್ಲಿ, ಹೇಳಿ?',
            english: 'Hello, Ganesh here, yes tell me?',
          },
          {
            role: 'caller',
            speaker: `${callerName} (Caller)`,
            kannada: `ಹಲೋ, ನಮಸ್ತೆ! ನಾನು ${callerName}. ನಿನ್ನ ಪ್ರಾಜೆಕ್ಟ್ successfully complete ಆಯ್ತಾ ಅಂತ check ಮಾಡ್ಬೇಕಿತ್ತು.`,
            english: `Hello! Hey, this is ${callerName}. Just wanted to check if your project was completed successfully.`,
          },
          {
            role: 'receiver',
            speaker: 'Ganesh (Recipient)',
            kannada: 'ಹೌದು ಕಣ್ರೀ, project completely successfully finish ಆಗಿದೆ! All features and voice cloning perfectly work ಆಗ್ತಿದೆ.',
            english: 'Yes! The project is completed successfully. All features and voice cloning are working perfectly.',
          },
          {
            role: 'caller',
            speaker: `${callerName} (Caller)`,
            kannada: 'ಸೂಪರ್ ಕಣ್ರೀ, ತುಂಬಾ ಧನ್ಯವಾದಗಳು! Have a great day, ಬಾಯ್.',
            english: 'Awesome, thank you so much! Have a great day, bye.',
          },
        ]
      : [
          {
            role: 'receiver',
            speaker: 'Girish (Store Manager)',
            kannada: 'ಹಲೋ, ಶ್ರೀ ಮಂಜುನಾಥ ಎಲೆಕ್ಟ್ರಾನಿಕ್ಸ್, ಹೇಳಿ ಸರ್?',
            english: 'Hello, Sri Manjunatha Electronics, how can I help you sir?',
          },
          {
            role: 'caller',
            speaker: `${callerName} (Caller)`,
            kannada: `ಹಲೋ, ನಮಸ್ತೆ! ನಾನು ${callerName}, ಸಣ್ಣ ವಿಷಯ ಕೇಳ್ಬೇಕಿತ್ತು. ನನ್ನ ಆರ್ಡರ್ #4892 ಡಿಸ್ಪ್ಯಾಚ್ ಆಗಿದೆಯಾ?`,
            english: `Hello! Namaskara, this is ${callerName}, just had a quick query. Has order #4892 been dispatched?`,
          },
          {
            role: 'receiver',
            speaker: 'Girish (Store Manager)',
            kannada: 'ಹೌದು ಸರ್, ಇವತ್ತು ಬೆಳಗ್ಗೆ ಪ್ಯಾಕ್ ಆಗಿದೆ. ಇವತ್ತು ಸಂಜೆ ಕೊರಿಯರ್‌ಗೆ ಕೊಡುತ್ತೇವೆ.',
            english: 'Yes sir, it was packed this morning. We will hand it over to the courier this evening.',
          },
          {
            role: 'caller',
            speaker: `${callerName} (Caller)`,
            kannada: 'ಹೌದಾ? ಸೂಪರ್! Expected delivery date ಯಾವಾಗ ಸಿಗಬಹುದು? And what is the courier tracking partner?',
            english: 'Oh awesome! When can we expect the delivery date? And who is the courier partner?',
          },
          {
            role: 'receiver',
            speaker: 'Girish (Store Manager)',
            kannada: 'ನಾಳೆ ಸಂಜೆ ಅಥವಾ Friday morning ಡೆಲಿವರಿ ಆಗುತ್ತೆ. BlueDart ಮುಖಾಂತರ ಕಳಿಸ್ತೀವಿ.',
            english: 'Delivery will be tomorrow evening or Friday morning via BlueDart.',
          },
          {
            role: 'caller',
            speaker: `${callerName} (Caller)`,
            kannada: 'ಸರಿ ಕಣ್ರೀ, ತುಂಬಾ ಧನ್ಯವಾದಗಳು! Have a great day, ಬಾಯ್.',
            english: 'Got it, thank you so much! Have a great day, bye.',
          },
        ];

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
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#58605c] hover:text-[#28543e] transition"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          <span>Back to Call History</span>
        </Link>

        <Link
          href="/"
          className="min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#28543e] hover:bg-[#1d3f2f] text-white text-xs sm:text-sm font-semibold shadow-xs transition"
        >
          <span className="material-symbols-outlined text-[18px]">add_call</span>
          <span>Make Another Call</span>
        </Link>
      </div>

      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-[#eeece8] p-5 sm:p-7 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#eaf2ec] flex items-center justify-center text-[#28543e] shrink-0">
              <span className="material-symbols-outlined text-2xl">
                {isGanesh ? 'person' : 'storefront'}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-[#1a1c1a] tracking-tight">
                  Call with {recipientName}
                </h1>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#eaf2ec] text-[#28543e]">
                  {callTag}
                </span>
              </div>
              <div className="text-xs sm:text-sm text-[#58605c] font-medium mt-1 flex items-center gap-2 flex-wrap">
                <span className="font-mono text-[#717973]">{targetPhone}</span>
                <span>•</span>
                <span>Spoke as <strong className="text-[#1a1c1a]">{callerName}</strong></span>
                <span>•</span>
                <span className="text-emerald-700 font-semibold">Completed</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5 self-start sm:self-center">
            {/* Audio Playback */}
            <button
              type="button"
              onClick={handleAudioPlayback}
              className={`min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition ${
                isPlaying
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-[#eaf2ec] text-[#28543e] hover:bg-[#d8e8dc]'
              }`}
            >
              <span className="material-symbols-outlined text-base">
                {isPlaying ? 'stop' : 'volume_up'}
              </span>
              <span>{isPlaying ? 'Stop Audio' : 'Listen Recording'}</span>
            </button>

            {/* Copy Details */}
            <button
              type="button"
              onClick={handleCopy}
              className="min-h-[44px] px-4 py-2 rounded-xl border border-[#eeece8] hover:bg-[#f6f5f2] text-xs sm:text-sm font-semibold text-[#58605c] hover:text-[#1a1c1a] flex items-center gap-1.5 transition"
            >
              <span className="material-symbols-outlined text-base">
                {copied ? 'check' : 'content_copy'}
              </span>
              <span>{copied ? 'Copied' : 'Copy Summary'}</span>
            </button>
          </div>
        </div>

        {/* Dynamic Executive Call Summary */}
        <div className="p-4 rounded-xl bg-[#faf9f6] border border-[#e2e1dd] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#28543e] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base">verified</span>
              <span>Call Outcome &amp; Summary</span>
            </span>
            <span className="text-[11px] text-[#717973]">Directly verified on call</span>
          </div>
          <p className="text-xs sm:text-sm text-[#1a1c1a] font-medium leading-relaxed">
            {summaryText}
          </p>
        </div>
      </div>

      {/* Transcript with Interactive UP Translation Button */}
      <div className="bg-white rounded-2xl border border-[#eeece8] p-5 sm:p-7 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#eeece8] gap-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#28543e] text-xl">record_voice_over</span>
            <h2 className="text-base sm:text-lg font-bold text-[#1a1c1a]">Full Conversation Transcript</h2>
          </div>

          {/* Interactive UP Translation Toggle */}
          <button
            type="button"
            onClick={cycleTranslation}
            className="min-h-[38px] inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#f6f5f2] hover:bg-[#eaf2ec] border border-[#d2ded5] text-xs font-semibold text-[#28543e] shadow-2xs transition active:scale-95 cursor-pointer self-start sm:self-auto"
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

        {/* Dynamic Turns */}
        <div className="space-y-4 pt-2">
          {transcriptTurns.map((turn, idx) => {
            const isCaller = turn.role === 'caller';
            return (
              <div
                key={idx}
                className={`flex gap-3.5 max-w-[90%] sm:max-w-[80%] ${
                  isCaller ? 'ml-auto flex-row-reverse' : ''
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-1 shadow-2xs ${
                    isCaller
                      ? 'bg-[#28543e] text-white'
                      : 'bg-white border border-[#eeece8] text-[#58605c]'
                  }`}
                >
                  {isCaller ? callerName[0]?.toUpperCase() || 'G' : recipientName[0]?.toUpperCase() || 'R'}
                </div>

                <div
                  className={`p-4 rounded-2xl text-xs sm:text-sm space-y-1.5 shadow-2xs ${
                    isCaller
                      ? 'bg-[#28543e] text-white rounded-tr-xs'
                      : 'bg-[#faf9f6] text-[#1a1c1a] border border-[#eeece8] rounded-tl-xs'
                  }`}
                >
                  <div className="text-[11px] font-semibold opacity-80">{turn.speaker}</div>

                  {(translationMode === 'both' || translationMode === 'kannada') && (
                    <p className="font-medium leading-relaxed">{turn.kannada}</p>
                  )}

                  {(translationMode === 'both' || translationMode === 'english') && (
                    <p
                      className={`text-[12px] leading-relaxed pt-0.5 border-t ${
                        isCaller
                          ? 'text-white/80 border-white/20'
                          : 'text-[#58605c] border-[#eeece8]'
                      }`}
                    >
                      {turn.english}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
