'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { fetchCall, Call } from '@/app/api/client';

export default function CallDetailsScreen({ params }: { params?: Promise<{ id: string }> }) {
  const router = useRouter();
  const [call, setCall] = useState<Call | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!params) return;
    (async () => {
      try {
        const resolved = await params;
        if (resolved?.id && resolved.id !== 'details') {
          const c = await fetchCall(resolved.id);
          setCall(c);
        }
      } catch (e) {
        console.warn('Could not load specific call details, using showcase view:', e);
      }
    })();
  }, [params]);

  const handleCopy = () => {
    const text = `Order #4892 Delivery Confirmation Summary:
- Outcome: Order packed and scheduled for delivery by Friday morning.
- Dispatch: Today by 6:00 PM IST
- Courier: BlueDart Express
- Contact: Girish (Store Operations Manager)`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full px-4 md:px-8 py-6 max-w-5xl mx-auto flex-1 space-y-6">
      {/* Back button and breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/call/history"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#58605c] hover:text-[#28543e] transition-colors"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          <span>Back to Call History</span>
        </Link>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100/90 text-emerald-800 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
          Call Completed
        </span>
      </div>

      {/* HEADER TITLE & CALL META */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#28543e] tracking-tight">
            Order #4892 Delivery Confirmation
          </h1>
          <p className="text-sm text-[#58605c] mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1 text-[#1a1c1a] font-medium">
              <span className="material-symbols-outlined text-base text-[#28543e]">store</span>
              Sri Manjunatha Electronics, Bangalore
            </span>
            <span className="text-[#e2e1dd]">•</span>
            <span className="inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-base text-[#58605c]">calendar_today</span>
              Today at 11:24 AM
            </span>
            <span className="text-[#e2e1dd]">•</span>
            <span className="inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-base text-[#58605c]">timer</span>
              1 min 54 sec
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center bg-[#eaf2ec] px-3 py-1.5 rounded-xl border border-[#d2ded5]/80">
          <span className="material-symbols-outlined text-base text-[#28543e]">translate</span>
          <span className="text-xs font-semibold text-[#28543e]">Bilingual Call:</span>
          <span className="text-xs text-[#58605c] font-medium">Kannada &amp; English</span>
        </div>
      </div>

      {/* 1. CLEAR & PROMINENT TAKEAWAY BANNER */}
      <div className="bg-gradient-to-r from-[#28543e] to-[#1e4431] text-white rounded-2xl p-6 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-white/90 text-xs font-medium tracking-wide uppercase">
              <span className="material-symbols-outlined text-sm">verified</span>
              Summary &amp; Outcome
            </div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white pt-1">
              Order packed and scheduled for delivery by Friday morning.
            </h2>
            <p className="text-sm text-white/85">
              The store manager confirmed that parcel will be picked up by courier today by 6:00 PM.
            </p>
          </div>
          <div className="shrink-0 flex items-center">
            <span className="px-4 py-2 rounded-xl bg-white text-[#28543e] text-sm font-bold shadow-sm inline-flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base text-emerald-700">task_alt</span>
              No action required
            </span>
          </div>
        </div>
      </div>

      {/* 2. FOUR CLEAN KEY TAKEAWAYS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-white p-4 rounded-xl border border-[#eeece8] shadow-xs flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#eaf2ec] text-[#28543e] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-xl">local_shipping</span>
          </div>
          <div>
            <span className="text-xs font-medium text-[#58605c] uppercase tracking-wider block">Dispatch</span>
            <span className="text-base font-bold text-[#1a1c1a]">Today</span>
            <span className="text-xs text-[#58605c] block mt-0.5">By 6:00 PM IST</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-4 rounded-xl border border-[#eeece8] shadow-xs flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#eaf2ec] text-[#28543e] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-xl">event_available</span>
          </div>
          <div>
            <span className="text-xs font-medium text-[#58605c] uppercase tracking-wider block">Courier</span>
            <span className="text-base font-bold text-[#1a1c1a]">BlueDart Express</span>
            <span className="text-xs text-[#58605c] block mt-0.5">Air Transit</span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white p-4 rounded-xl border border-[#eeece8] shadow-xs flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#eaf2ec] text-[#28543e] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-xl">person</span>
          </div>
          <div>
            <span className="text-xs font-medium text-[#58605c] uppercase tracking-wider block">Spoke With</span>
            <span className="text-base font-bold text-[#1a1c1a]">Girish</span>
            <span className="text-xs text-[#58605c] block mt-0.5">Store Operations Manager</span>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white p-4 rounded-xl border border-[#eeece8] shadow-xs flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#eaf2ec] text-[#28543e] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-xl">sms</span>
          </div>
          <div>
            <span className="text-xs font-medium text-[#58605c] uppercase tracking-wider block">Next Step</span>
            <span className="text-base font-bold text-[#28543e]">SMS Tracking</span>
            <span className="text-xs text-[#58605c] block mt-0.5">Will receive tracking link</span>
          </div>
        </div>
      </div>

      {/* 3. AUDIO PLAYBACK BAR */}
      <div className="bg-white rounded-2xl border border-[#eeece8] p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-11 h-11 rounded-full bg-[#28543e] hover:bg-[#1d3f2f] text-white flex items-center justify-center transition shadow-sm shrink-0"
          >
            <span className="material-symbols-outlined text-2xl">
              {isPlaying ? 'pause' : 'play_arrow'}
            </span>
          </button>
          <div>
            <div className="text-sm font-semibold text-[#1a1c1a]">Original Call Recording</div>
            <div className="text-xs text-[#58605c]">Stereo Recording • 1 min 54 sec</div>
          </div>
        </div>

        {/* Progress scrub bar */}
        <div className="flex items-center gap-3 w-full sm:flex-1 max-w-md">
          <span className="text-xs text-[#717973] font-mono">0:42</span>
          <div className="flex-1 h-2 bg-[#f6f5f2] rounded-full overflow-hidden relative cursor-pointer">
            <div className="h-full bg-[#28543e] rounded-full w-[38%]" />
          </div>
          <span className="text-xs text-[#717973] font-mono">1:54</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="px-3.5 py-1.5 rounded-xl border border-[#eeece8] text-xs font-semibold text-[#58605c] hover:bg-[#f6f5f2] transition flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">{copied ? 'check' : 'content_copy'}</span>
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="px-3.5 py-1.5 rounded-xl bg-[#28543e] text-white text-xs font-semibold hover:bg-[#1d3f2f] transition flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">add_call</span>
            <span>New Call</span>
          </button>
        </div>
      </div>

      {/* 4. VERIFIED QUESTION CHECKLIST & TRANSCRIPT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Questions Checklist */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-[#eeece8] p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-[#28543e] font-semibold text-sm">
              <span className="material-symbols-outlined text-lg">checklist</span>
              <span>Questions Verified</span>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-[#f3f7f4] border border-[#d2ded5]/60 flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[#28543e] text-base shrink-0 mt-0.5">check_circle</span>
                <div className="text-xs">
                  <div className="font-semibold text-[#1a1c1a]">Is order #4892 dispatched?</div>
                  <div className="text-[#58605c] mt-0.5">Yes, packed this morning and leaving today.</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#f3f7f4] border border-[#d2ded5]/60 flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[#28543e] text-base shrink-0 mt-0.5">check_circle</span>
                <div className="text-xs">
                  <div className="font-semibold text-[#1a1c1a]">Expected delivery date &amp; courier?</div>
                  <div className="text-[#58605c] mt-0.5">Friday morning via BlueDart Express.</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Full Transcript */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-2xl border border-[#eeece8] p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#eeece8]/60">
              <h3 className="text-base font-bold text-[#1a1c1a]">Full Conversation Transcript</h3>
              <span className="text-xs text-[#717973]">5 Dialogue Turns</span>
            </div>

            <div className="space-y-4">
              {/* Turn 1 */}
              <div className="space-y-1">
                <span className="text-xs font-semibold text-[#28543e]">VaaniCall (Assistant)</span>
                <div className="p-3.5 rounded-2xl rounded-tl-sm bg-[#eaf2ec] text-[#1a1c1a]">
                  <p className="text-sm font-semibold leading-relaxed">
                    &ldquo;ನಮಸ್ಕಾರ, ನಾನು ಸುನಿಲ್ ಅವರ ಪರವಾಗಿ ಕರೆ ಮಾಡುತ್ತಿದ್ದೇನೆ. ನನ್ನ ಆರ್ಡರ್ #4892 ಡಿಸ್ಪ್ಯಾಚ್ ಆಗಿದೆಯಾ ತಿಳಿಸಬಹುದೇ?&rdquo;
                  </p>
                  <p className="text-xs text-[#58605c] mt-1 leading-relaxed">
                    Hello, I am calling on behalf of Sunil. Could you confirm if order #4892 has been dispatched?
                  </p>
                </div>
              </div>

              {/* Turn 2 */}
              <div className="space-y-1 text-right">
                <span className="text-xs font-semibold text-[#58605c]">Girish (Store Manager)</span>
                <div className="p-3.5 rounded-2xl rounded-tr-sm bg-[#f6f5f2] border border-[#e2e1dd] text-[#1a1c1a] text-left">
                  <p className="text-sm font-semibold leading-relaxed">
                    &ldquo;ಹೌದು ಸರ್, ಇವತ್ತು ಬೆಳಗ್ಗೆ ಪ್ಯಾಕ್ ಆಗಿದೆ. ಇವತ್ತು ಸಂಜೆ ಕೊರಿಯರ್‌ಗೆ ಕೊಡುತ್ತೇವೆ.&rdquo;
                  </p>
                  <p className="text-xs text-[#58605c] mt-1 leading-relaxed">
                    Yes sir, it was packed this morning. We will hand it over to the courier this evening.
                  </p>
                </div>
              </div>

              {/* Turn 3 */}
              <div className="space-y-1">
                <span className="text-xs font-semibold text-[#28543e]">VaaniCall (Assistant)</span>
                <div className="p-3.5 rounded-2xl rounded-tl-sm bg-[#eaf2ec] text-[#1a1c1a]">
                  <p className="text-sm font-semibold leading-relaxed">
                    &ldquo;ಧನ್ಯವಾದಗಳು! Expected delivery date ಯಾವಾಗ ಸಿಗಬಹುದು? And what is the courier tracking partner?&rdquo;
                  </p>
                  <p className="text-xs text-[#58605c] mt-1 leading-relaxed">
                    Thank you! When can we expect the delivery date? And who is the courier partner?
                  </p>
                </div>
              </div>

              {/* Turn 4 */}
              <div className="space-y-1 text-right">
                <span className="text-xs font-semibold text-[#58605c]">Girish (Store Manager)</span>
                <div className="p-3.5 rounded-2xl rounded-tr-sm bg-[#f6f5f2] border border-[#e2e1dd] text-[#1a1c1a] text-left">
                  <p className="text-sm font-semibold leading-relaxed">
                    &ldquo;ನಾಳೆ ಸಂಜೆ ಅಥವಾ Friday morning ಡೆಲಿವರಿ ಆಗುತ್ತೆ. BlueDart ಮುಖಾಂತರ ಕಳಿಸ್ತೀವಿ.&rdquo;
                  </p>
                  <p className="text-xs text-[#58605c] mt-1 leading-relaxed">
                    Delivery will be tomorrow evening or Friday morning via BlueDart.
                  </p>
                </div>
              </div>

              {/* Turn 5 */}
              <div className="space-y-1">
                <span className="text-xs font-semibold text-[#28543e]">VaaniCall (Assistant)</span>
                <div className="p-3.5 rounded-2xl rounded-tl-sm bg-[#eaf2ec] text-[#1a1c1a]">
                  <p className="text-sm font-semibold leading-relaxed">
                    &ldquo;ಖಂಡಿತ, ಧನ್ಯವಾದಗಳು. Have a great day!&rdquo;
                  </p>
                  <p className="text-xs text-[#58605c] mt-1 leading-relaxed">
                    Certainly, thank you. Have a great day!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
