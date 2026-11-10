'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LiveCallContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [seconds, setSeconds] = useState(105);
  const [isMuted, setIsMuted] = useState(false);
  const [takenOver, setTakenOver] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [copied, setCopied] = useState(false);

  // Timer simulation
  useEffect(() => {
    if (callEnded) return;
    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [callEnded]);

  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');

  const handleEndCall = () => {
    setCallEnded(true);
    setTimeout(() => {
      router.push('/call/details');
    }, 800);
  };

  const handleCopyTranscript = () => {
    const text = `VaaniCall: "ನಮಸ್ಕಾರ, ನಾನು ಸುನಿಲ್ ಅವರ ಪರವಾಗಿ ಕರೆ ಮಾಡುತ್ತಿದ್ದೇನೆ. ನನ್ನ ಆರ್ಡರ್ #4892 ಡಿಸ್ಪ್ಯಾಚ್ ಆಗಿದೆಯಾ ತಿಳಿಸಬಹುದೇ?"
Store Representative: "ಹೌದು ಸರ್, ಇವತ್ತು ಬೆಳಗ್ಗೆ ಪ್ಯಾಕ್ ಆಗಿದೆ. ಇವತ್ತು ಸಂಜೆ ಕೊರಿಯರ್‌ಗೆ ಕೊಡುತ್ತೇವೆ."
VaaniCall: "ಧನ್ಯವಾದಗಳು! Expected delivery date ಯಾವಾಗ ಸಿಗಬಹುದು? And what is the courier tracking partner?"
Store Representative: "ನಾಳೆ ಸಂಜೆ ಅಥವಾ Friday morning ಡೆಲಿವರಿ ಆಗುತ್ತೆ. BlueDart ಮುಖಾಂತರ ಕಳಿಸ್ತೀವಿ."
VaaniCall: "ಖಂಡಿತ, ಧನ್ಯವಾದಗಳು. Have a great day!"`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full pt-4 pb-8 px-4 md:px-8 max-w-6xl mx-auto flex flex-col gap-6">
      {/* Streamlined Active Call Bar */}
      <section className="w-full">
        <div className="bg-white rounded-2xl border border-[#eeece8] p-5 md:p-6 shadow-sm flex flex-col gap-5">
          {/* Top Row: Recipient & Call Details */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#eaf2ec] flex items-center justify-center text-[#28543e] shrink-0">
                <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  storefront
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg md:text-xl font-bold text-[#1a1c1a] tracking-tight">
                    Sri Manjunatha Electronics
                  </h1>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#eaf2ec] text-[#28543e]">
                    Vendor
                  </span>
                </div>
                <div className="text-sm text-[#58605c] font-medium mt-0.5">
                  <span className="font-mono text-[#717973]">+91 98450 •••••</span>
                </div>
              </div>
            </div>

            {/* Clean live call status pill */}
            <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-center">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#eaf2ec] border border-[#d2ded5]/40">
                <span className="w-2 h-2 rounded-full bg-[#28543e] animate-pulse" />
                <span className="font-mono text-xs font-semibold text-[#28543e]">
                  {mins}:{secs}
                </span>
                <span className="text-[#717973] text-xs">•</span>
                <span className="text-xs font-semibold text-[#28543e]">ಕನ್ನಡ (Kannada)</span>
              </div>
            </div>
          </div>

          {/* Clean 3-Step Milestone Progress */}
          <div className="pt-2 border-t border-[#eeece8]/60 flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3 text-xs">
              <div className="flex items-center gap-1.5 text-[#28543e] font-medium">
                <span
                  className="material-symbols-outlined text-[17px] text-[#28543e]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check_circle
                </span>
                <span>Dialing</span>
              </div>
              <span className="w-6 h-px bg-[#28543e]/50" />
              <div className="flex items-center gap-1.5 text-[#28543e] font-semibold">
                <span
                  className="material-symbols-outlined text-[17px] text-[#28543e]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check_circle
                </span>
                <span>Connected</span>
              </div>
              <span className="w-6 h-px bg-[#e2e1dd]" />
              <div className="flex items-center gap-1.5 text-[#717973] font-medium">
                <span className="w-3.5 h-3.5 rounded-full border-2 border-[#e2e1dd] inline-block" />
                <span>Finishing up</span>
              </div>
            </div>
            <span className="text-xs text-[#58605c] font-medium hidden sm:inline">Order dispatch inquiry</span>
          </div>
        </div>
      </section>

      {/* 2-Column Conversational Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Soft Organic Waveform & Controls (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* Organic Waveform Stage Card */}
          <div className="bg-white rounded-2xl border border-[#eeece8] p-6 shadow-sm flex flex-col items-center justify-between text-center relative overflow-hidden">
            <div className="w-full flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-[#28543e] bg-[#eaf2ec] px-3 py-1 rounded-full">
                Active Voice
              </span>
              <span className="text-xs text-[#58605c] flex items-center gap-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#28543e] animate-pulse" />
                Live Speaking
              </span>
            </div>

            {/* Organic Pulsing Audio Visualizer */}
            <div className="my-6 relative flex items-center justify-center w-full py-8">
              {/* Gentle pulsing concentric circles */}
              <div className="absolute w-36 h-36 rounded-full bg-[#f3f7f4] animate-gentle-pulse" />
              <div className="absolute w-28 h-28 rounded-full bg-[#eaf2ec] opacity-70" />

              {/* Living organic sound bars */}
              <div className="relative z-10 flex items-center gap-1.5 h-16">
                <span className="w-1.5 rounded-full bg-[#28543e] animate-gentle-wave" />
                <span
                  className="w-1.5 rounded-full bg-[#1d3f2f] animate-gentle-wave"
                  style={{ animationDelay: '0.2s', animationDuration: '1.1s' }}
                />
                <span
                  className="w-1.5 rounded-full bg-[#28543e] animate-gentle-wave"
                  style={{ animationDelay: '0.4s', animationDuration: '1.6s' }}
                />
                <span
                  className="w-1.5 rounded-full bg-[#1d3f2f] animate-gentle-wave"
                  style={{ animationDelay: '0.1s', animationDuration: '1.2s' }}
                />
                <span
                  className="w-1.5 rounded-full bg-[#28543e] animate-gentle-wave"
                  style={{ animationDelay: '0.3s', animationDuration: '1.5s' }}
                />
                <span
                  className="w-1.5 rounded-full bg-[#1d3f2f] animate-gentle-wave"
                  style={{ animationDelay: '0.5s', animationDuration: '1.3s' }}
                />
                <span
                  className="w-1.5 rounded-full bg-[#28543e] animate-gentle-wave"
                  style={{ animationDelay: '0.2s', animationDuration: '1.0s' }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-semibold text-[#1a1c1a]">Speaking with shop manager...</p>
              <p className="text-xs text-[#717973] font-medium">Recipient listening attentively in Kannada</p>
            </div>
          </div>

          {/* Key Highlights / Extracted Note Card */}
          <div className="bg-white rounded-2xl border border-[#eeece8] p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-[#28543e] font-semibold text-sm">
              <span className="material-symbols-outlined text-base text-[#28543e]">check_circle</span>
              <span>Key Details Confirmed</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-[#f3f7f4] text-[#1a1c1a] flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[18px] text-[#28543e] mt-0.5">inventory_2</span>
                <div>
                  <div className="font-semibold text-[#1a1c1a]">Order #4892</div>
                  <div className="text-[#58605c]">Packed this morning, dispatching this evening.</div>
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#f3f7f4] text-[#1a1c1a] flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[18px] text-[#28543e] mt-0.5">local_shipping</span>
                <div>
                  <div className="font-semibold text-[#1a1c1a]">Courier Partner</div>
                  <div className="text-[#58605c]">BlueDart Express (Expected by Friday morning).</div>
                </div>
              </div>
            </div>
          </div>

          {/* Focused Human Controls Card */}
          <div className="bg-white rounded-2xl border border-[#eeece8] p-5 shadow-sm space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className={`inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border font-semibold text-xs transition-colors ${
                  isMuted
                    ? 'bg-[#fdf0ee] text-[#c0392b] border-[#c0392b]/40'
                    : 'border-[#eeece8] bg-white hover:bg-[#f3f7f4] text-[#1a1c1a]'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{isMuted ? 'mic' : 'mic_off'}</span>
                <span>{isMuted ? 'Unmute AI' : 'Mute AI'}</span>
              </button>

              <button
                type="button"
                onClick={() => setTakenOver(!takenOver)}
                className={`inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border font-semibold text-xs transition-colors ${
                  takenOver
                    ? 'bg-[#eaf2ec] text-[#28543e] border-[#28543e]/40'
                    : 'border-[#eeece8] bg-white hover:bg-[#f3f7f4] text-[#1a1c1a]'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">support_agent</span>
                <span>{takenOver ? 'Connected' : 'Take Over'}</span>
              </button>
            </div>

            {/* Warm Terracotta End Call Button */}
            <button
              type="button"
              onClick={handleEndCall}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#c0392b] hover:bg-[#a93226] text-white font-semibold text-sm transition-all shadow-sm active:scale-[0.99]"
            >
              <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                call_end
              </span>
              <span>{callEnded ? 'Call Ended' : 'End Call'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Readable Spacious Transcript (7 cols) */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-2xl border border-[#eeece8] p-5 md:p-7 shadow-sm flex flex-col min-h-[580px]">
            {/* Transcript Header */}
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#eeece8]/60">
              <div>
                <h2 className="text-base md:text-lg font-bold text-[#1a1c1a]">Conversation Transcript</h2>
                <p className="text-xs text-[#717973] mt-0.5">Dual Kannada vernacular with gentle English translations</p>
              </div>
              <button
                type="button"
                onClick={handleCopyTranscript}
                className="p-2 rounded-lg hover:bg-[#f3f7f4] text-[#58605c] hover:text-[#28543e] transition-colors relative"
                title="Copy Conversation"
              >
                <span className="material-symbols-outlined text-[19px]">
                  {copied ? 'check' : 'content_copy'}
                </span>
              </button>
            </div>

            {/* Spacious Readable Transcript Bubbles */}
            <div className="flex-1 space-y-5 overflow-y-auto pr-1">
              {/* Turn 1: VaaniCall */}
              <div className="flex flex-col items-start max-w-lg">
                <span className="text-xs font-semibold text-[#28543e] mb-1 pl-1">VaaniCall</span>
                <div className="bg-[#eaf2ec] rounded-2xl rounded-tl-sm p-4 text-[#1a1c1a] shadow-xs">
                  <p className="text-sm font-semibold leading-relaxed">
                    &ldquo;ನಮಸ್ಕಾರ, ನಾನು ಸುನಿಲ್ ಅವರ ಪರವಾಗಿ ಕರೆ ಮಾಡುತ್ತಿದ್ದೇನೆ. ನನ್ನ ಆರ್ಡರ್ #4892 ಡಿಸ್ಪ್ಯಾಚ್ ಆಗಿದೆಯಾ ತಿಳಿಸಬಹುದೇ?&rdquo;
                  </p>
                  <p className="text-xs text-[#58605c] mt-1.5 leading-relaxed font-normal">
                    Namaskara, I am calling on behalf of Sunil. Could you confirm if order #4892 has been dispatched?
                  </p>
                </div>
              </div>

              {/* Turn 2: Store Representative */}
              <div className="flex flex-col items-end max-w-lg ml-auto">
                <span className="text-xs font-semibold text-[#58605c] mb-1 pr-1">Store Representative</span>
                <div className="bg-[#f6f5f2] rounded-2xl rounded-tr-sm p-4 text-[#1a1c1a] border border-[#e2e1dd]">
                  <p className="text-sm font-semibold leading-relaxed">
                    &ldquo;ಹೌದು ಸರ್, ಇವತ್ತು ಬೆಳಗ್ಗೆ ಪ್ಯಾಕ್ ಆಗಿದೆ. ಇವತ್ತು ಸಂಜೆ ಕೊರಿಯರ್‌ಗೆ ಕೊಡುತ್ತೇವೆ.&rdquo;
                  </p>
                  <p className="text-xs text-[#58605c] mt-1.5 leading-relaxed font-normal">
                    Yes sir, it was packed this morning. We will hand it over to the courier this evening.
                  </p>
                </div>
              </div>

              {/* Turn 3: VaaniCall */}
              <div className="flex flex-col items-start max-w-lg">
                <span className="text-xs font-semibold text-[#28543e] mb-1 pl-1">VaaniCall</span>
                <div className="bg-[#eaf2ec] rounded-2xl rounded-tl-sm p-4 text-[#1a1c1a] shadow-xs">
                  <p className="text-sm font-semibold leading-relaxed">
                    &ldquo;ಧನ್ಯವಾದಗಳು! Expected delivery date ಯಾವಾಗ ಸಿಗಬಹುದು? And what is the courier tracking partner?&rdquo;
                  </p>
                  <p className="text-xs text-[#58605c] mt-1.5 leading-relaxed font-normal">
                    Thank you! When can we expect the delivery date? And who is the courier partner?
                  </p>
                </div>
              </div>

              {/* Turn 4: Store Representative */}
              <div className="flex flex-col items-end max-w-lg ml-auto">
                <span className="text-xs font-semibold text-[#58605c] mb-1 pr-1">Store Representative</span>
                <div className="bg-[#f6f5f2] rounded-2xl rounded-tr-sm p-4 text-[#1a1c1a] border border-[#e2e1dd]">
                  <p className="text-sm font-semibold leading-relaxed">
                    &ldquo;ನಾಳೆ ಸಂಜೆ ಅಥವಾ Friday morning ಡೆಲಿವರಿ ಆಗುತ್ತೆ. BlueDart ಮುಖಾಂತರ ಕಳಿಸ್ತೀವಿ.&rdquo;
                  </p>
                  <p className="text-xs text-[#58605c] mt-1.5 leading-relaxed font-normal">
                    Delivery will be tomorrow evening or Friday morning via BlueDart.
                  </p>
                </div>
              </div>

              {/* Turn 5: VaaniCall (Active Speaking) */}
              <div className="flex flex-col items-start max-w-lg">
                <div className="flex items-center gap-1.5 mb-1 pl-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#28543e] animate-pulse" />
                  <span className="text-xs font-semibold text-[#28543e]">VaaniCall</span>
                  <span className="text-[11px] text-[#717973]">• Speaking now</span>
                </div>
                <div className="bg-[#eaf2ec] rounded-2xl rounded-tl-sm p-4 text-[#1a1c1a] border-l-4 border-[#28543e] shadow-xs">
                  <p className="text-sm font-semibold leading-relaxed">
                    &ldquo;ಖಂಡಿತ, ಧನ್ಯವಾದಗಳು. Have a great day!&rdquo;
                  </p>
                  <p className="text-xs text-[#58605c] mt-1.5 leading-relaxed font-normal">
                    Certainly, thank you. Have a great day!
                  </p>
                </div>
              </div>
            </div>

            {/* Subtle bottom status hint */}
            <div className="pt-4 mt-4 border-t border-[#eeece8]/60 flex items-center justify-between text-xs text-[#717973]">
              <span>Connected in real time</span>
              <span className="text-[#28543e] font-medium">Automatic transcript sync active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LiveCallScreen() {
  return (
    <Suspense
      fallback={
        <div className="w-full py-20 text-center text-[#717973] flex flex-col items-center gap-2">
          <span className="w-6 h-6 border-2 border-[#28543e]/30 border-t-[#28543e] rounded-full animate-spin" />
          <span className="text-sm font-medium">Connecting live call view...</span>
        </div>
      }
    >
      <LiveCallContent />
    </Suspense>
  );
}


