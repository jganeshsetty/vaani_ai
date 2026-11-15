'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getApiBase } from '@/app/api/client';

export default function CallMessageSetupPage() {
  const router = useRouter();

  // 1. Sender setup (Your identity)
  const [callerName, setCallerName] = useState('Ganesh');
  const [callerTone, setCallerTone] = useState<'informal' | 'formal'>('informal');

  // 2. Recipient setup (Whom to send)
  const [recipientName, setRecipientName] = useState('Ganesh');
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('8660039103');

  // 3. Dynamic link & room state
  const [customRoomId, setCustomRoomId] = useState('');
  const [origin, setOrigin] = useState('https://vaani.pages.dev');
  const [copied, setCopied] = useState(false);
  const [dispatched, setDispatched] = useState(false);
  const [loading, setLoading] = useState(false);

  const rawNumber = phoneNumber.replace(/\D/g, '');
  const cleanFullNumber = countryCode.replace('+', '') + (rawNumber.startsWith('91') && countryCode === '+91' ? rawNumber.slice(2) : rawNumber);

  // Initialize unique room ID and browser origin on client mount
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.origin) {
      setOrigin(window.location.origin);
    }
    const randomSlug = 'call_' + Math.random().toString(36).substring(2, 9);
    setCustomRoomId(randomSlug);

    try {
      const savedName = localStorage.getItem('vaani_caller_name');
      if (savedName) setCallerName(savedName);
    } catch {}
  }, []);

  const handleCallerNameChange = (name: string) => {
    setCallerName(name);
    try {
      localStorage.setItem('vaani_caller_name', name);
    } catch {}
  };

  // Generate dynamic URL containing sender and recipient parameters
  const getFullCallLink = () => {
    const baseOrigin = origin || 'https://vaani.pages.dev';
    const params = new URLSearchParams({
      caller: callerName || 'Ganesh',
      recipient: recipientName || 'Friend',
      phone: `${countryCode}${rawNumber}`,
      tone: callerTone,
    });
    return `${baseOrigin}/call/${customRoomId || 'room'}?${params.toString()}`;
  };

  const fullCallLink = getFullCallLink();

  // Natural invitation text message
  const personalizedGreeting = recipientName.trim()
    ? `Hello ${recipientName.trim()}!`
    : 'Hello!';

  const fullCallingMessage = `${personalizedGreeting} This is ${callerName || 'Ganesh'}. Please join our secure voice call session by tapping this link:\n\n👉 ${fullCallLink}\n\n(No app download required • Opens directly in mobile browser)`;

  const [copiedMessage, setCopiedMessage] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(fullCallLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyFullMessage = () => {
    navigator.clipboard.writeText(fullCallingMessage);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2500);
  };

  // Direct SMS / Mobile messaging trigger with backend dispatch logging
  const handleSendSMS = async () => {
    setLoading(true);
    try {
      // 1. Notify backend message pipeline
      try {
        await fetch(`${getApiBase()}/messages/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: cleanFullNumber,
            recipient_name: recipientName || 'Ganesh',
            caller: callerName,
            link: fullCallLink,
            message: fullCallingMessage,
            instructions: `Call setup for ${recipientName || 'Ganesh'}`,
          }),
        });
      } catch (err) {
        console.warn('Backend message pipeline dispatch note:', err);
      }

      // 2. Open native SMS application on device
      const smsUrl = rawNumber
        ? `sms:${cleanFullNumber}?body=${encodeURIComponent(fullCallingMessage)}`
        : `sms:?body=${encodeURIComponent(fullCallingMessage)}`;

      if (typeof window !== 'undefined') {
        window.open(smsUrl, '_self');
      }

      handleCopyFullMessage();
      setDispatched(true);
      setTimeout(() => setDispatched(false), 4000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-10 max-w-5xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="pb-4 border-b border-[#e2e7ff]">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-primary-container animate-pulse" />
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#131b2e] tracking-tight">
            Call Message &amp; Direct Link Setup
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-[#464555] mt-1">
          Set up your sender identity, recipient details, and generate a secure instant web call link.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Setup Options & Instructions */}
        <div className="lg:col-span-7 space-y-5">
          {/* Instructions on How to Make this Setup */}
          <div className="bg-gradient-to-br from-indigo-50/80 to-white rounded-2xl border border-indigo-200/80 p-5 sm:p-6 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-primary-container text-white flex items-center justify-center text-sm shadow-xs">
                <span className="material-symbols-outlined text-[18px]">help_outline</span>
              </span>
              <h2 className="text-sm sm:text-base font-extrabold text-[#131b2e] tracking-tight">
                How to Make This Setup
              </h2>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Follow these simple steps to configure your personal call message and share it with any recipient:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs">
              <div className="p-2.5 rounded-xl bg-white border border-indigo-100/80 flex items-start gap-2 shadow-xs">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <span className="font-bold text-slate-900 block">Sender &amp; Recipient</span>
                  <span className="text-slate-500 text-[11px] leading-tight">Enter your name and who you are sending the call message to.</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white border border-indigo-100/80 flex items-start gap-2 shadow-xs">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <span className="font-bold text-slate-900 block">Select Tone</span>
                  <span className="text-slate-500 text-[11px] leading-tight">Choose between informal casual speech or formal polite tone.</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white border border-indigo-100/80 flex items-start gap-2 shadow-xs">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <span className="font-bold text-slate-900 block">Send or Copy</span>
                  <span className="text-slate-500 text-[11px] leading-tight">Click Send SMS or copy the invitation message to send via any chat.</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white border border-indigo-100/80 flex items-start gap-2 shadow-xs">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                  4
                </span>
                <div>
                  <span className="font-bold text-slate-900 block">Instant Web Call</span>
                  <span className="text-slate-500 text-[11px] leading-tight">When they open the link, your AI voice assistant talks directly with them.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Setup Form Card */}
          <div className="bg-white rounded-2xl border border-[#e2e7ff] p-5 sm:p-7 shadow-xl shadow-slate-900/5 space-y-5">
            {/* 1. User Name (Sender Identity) */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-[#131b2e] flex items-center gap-1.5" htmlFor="msg-caller">
                <span className="material-symbols-outlined text-primary text-base">badge</span>
                <span>User Name (Your Identity)</span>
              </label>
              <input
                id="msg-caller"
                type="text"
                value={callerName}
                onChange={(e) => handleCallerNameChange(e.target.value)}
                placeholder="Enter your name (e.g. Ganesh)"
                className="w-full min-h-[42px] px-3.5 bg-[#f2f3ff] border border-[#eaedff] rounded-xl text-xs font-semibold text-[#131b2e] focus:bg-white focus:ring-2 focus:ring-primary-container/30 outline-none transition"
              />
            </div>

            {/* 2. Conversational Tone Selector */}
            <div className="p-3.5 rounded-xl bg-[#f2f3ff] border border-[#eaedff] space-y-2">
              <span className="text-xs font-bold text-[#131b2e] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-base">record_voice_over</span>
                <span>Conversational Tone</span>
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCallerTone('informal')}
                  className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    callerTone === 'informal'
                      ? 'bg-primary-container text-white shadow-xs'
                      : 'bg-white border border-[#c7c4d8] text-[#464555] hover:text-[#131b2e] hover:bg-slate-50'
                  }`}
                >
                  <span>⚡ Informal &amp; Casual</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCallerTone('formal')}
                  className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    callerTone === 'formal'
                      ? 'bg-primary-container text-white shadow-xs'
                      : 'bg-white border border-[#c7c4d8] text-[#464555] hover:text-[#131b2e] hover:bg-slate-50'
                  }`}
                >
                  <span>Formal / Polite</span>
                </button>
              </div>
            </div>

            {/* 3. Others (Recipient Details) */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#131b2e] flex items-center gap-1.5" htmlFor="recipient-name">
                  <span className="material-symbols-outlined text-primary text-base">people</span>
                  <span>Others (Recipient Details)</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setRecipientName('Ganesh');
                    setPhoneNumber('8660039103');
                  }}
                  className="text-xs font-semibold text-primary hover:text-primary-container flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">verified</span>
                  <span>Quick Fill (Ganesh • 8660039103)</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  id="recipient-name"
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Recipient Name (e.g. Ganesh)"
                  className="w-full min-h-[42px] px-3.5 bg-[#f2f3ff] border border-[#eaedff] rounded-xl text-xs font-medium text-[#131b2e] focus:bg-white focus:ring-2 focus:ring-primary-container/30 outline-none transition"
                />

                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="w-24 min-h-[42px] px-2 bg-[#f2f3ff] border border-[#eaedff] rounded-xl text-xs font-mono font-medium text-[#131b2e] focus:bg-white focus:ring-2 focus:ring-primary-container/30 outline-none cursor-pointer"
                  >
                    <option value="+91">IN (+91)</option>
                    <option value="+1">US (+1)</option>
                    <option value="+44">UK (+44)</option>
                    <option value="+971">UAE (+971)</option>
                    <option value="+65">SG (+65)</option>
                  </select>
                  <input
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Recipient phone number"
                    className="flex-1 min-h-[42px] px-3 bg-[#f2f3ff] border border-[#eaedff] rounded-xl text-xs font-mono font-medium text-[#131b2e] focus:bg-white focus:ring-2 focus:ring-primary-container/30 outline-none transition"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[#eaedff]">
              <button
                type="button"
                onClick={handleSendSMS}
                disabled={loading}
                className="min-h-[46px] px-4 py-2.5 rounded-xl bg-primary-container hover:bg-primary active:scale-[0.99] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition cursor-pointer disabled:opacity-70"
              >
                <span className="material-symbols-outlined text-lg">sms</span>
                <span>Send SMS to Recipient</span>
              </button>

              <button
                type="button"
                onClick={handleCopyFullMessage}
                className="min-h-[46px] px-4 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-[#131b2e] text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">{copiedMessage ? 'done' : 'content_copy'}</span>
                <span>{copiedMessage ? 'Copied to Clipboard!' : 'Copy Message & Link'}</span>
              </button>
            </div>

            {dispatched && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2 animate-fade-in">
                <span className="material-symbols-outlined text-base text-emerald-600">check_circle</span>
                <span>Setup message generated and copied! Ready to send to {recipientName || 'recipient'}.</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Mobile Handset Preview */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-6">
          <div className="bg-white rounded-3xl border border-[#e2e7ff] p-5 sm:p-6 shadow-xl shadow-slate-900/5">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#eaedff]">
              <span className="text-xs font-bold text-[#131b2e] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-base">smartphone</span>
                <span>Recipient Message Preview</span>
              </span>
              <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                Live Handset View
              </span>
            </div>

            {/* Mock Smartphone Frame */}
            <div className="w-full rounded-2xl bg-slate-100 border border-slate-200 p-3 sm:p-4 space-y-3 font-sans">
              {/* Message App Header */}
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200 bg-slate-800 text-white p-2.5 -m-3 -mt-4 rounded-t-2xl mb-3">
                <div className="w-8 h-8 rounded-full bg-indigo-500/80 flex items-center justify-center font-bold text-xs text-white">
                  {callerName[0] || 'G'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold truncate">{callerName} (Direct Call Link)</div>
                  <div className="text-[10px] text-slate-300">Active Now</div>
                </div>
              </div>

              {/* Message Bubble */}
              <div className="bg-white rounded-xl rounded-tl-none p-3 shadow-xs max-w-[94%] space-y-2 border border-slate-200/60">
                <div className="text-xs text-[#131b2e] whitespace-pre-wrap leading-relaxed">
                  {personalizedGreeting} This is {callerName}. Please join our secure voice call session by tapping this link:
                </div>

                {/* Call Link Preview Card inside Bubble */}
                <a
                  suppressHydrationWarning
                  href={fullCallLink}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-lg bg-[#f2f3ff] border border-[#dae2fd] p-2.5 space-y-1 hover:bg-[#e2dfff]/40 transition group"
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                    <span className="material-symbols-outlined text-[16px]">phone_in_talk</span>
                    <span>Join Voice Call Session</span>
                  </div>
                  <div suppressHydrationWarning className="text-[11px] text-slate-600 line-clamp-1 font-mono">
                    {fullCallLink}
                  </div>
                  <div className="text-[10px] text-indigo-700 font-semibold flex items-center gap-1 pt-1">
                    <span className="material-symbols-outlined text-[12px]">check_circle</span>
                    <span>Tap to connect instantly in browser</span>
                  </div>
                </a>

                <div className="flex items-center justify-end gap-1 text-[10px] text-slate-400 pt-1">
                  <span>Just now</span>
                  <span className="material-symbols-outlined text-[13px] text-indigo-600">done_all</span>
                </div>
              </div>
            </div>

            {/* Test Link Button */}
            <div className="pt-4">
              <a
                suppressHydrationWarning
                href={fullCallLink}
                target="_blank"
                rel="noreferrer"
                className="w-full min-h-[42px] px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#131b2e] text-xs font-bold flex items-center justify-center gap-2 transition"
              >
                <span className="material-symbols-outlined text-base">open_in_new</span>
                <span>Test Call Room as Recipient</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
