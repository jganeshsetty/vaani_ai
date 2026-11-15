'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface Scenario {
  title: string;
  lang: string;
  badge: string;
  dialogue: { speaker: string; text: string; role?: 'agent' | 'resp' | 'summary' }[];
}

const SCENARIOS: Record<string, Scenario> = {
  call_message: {
    title: 'Call Message & Direct Link',
    lang: 'Direct Link Dispatch',
    badge: 'Feature 2',
    dialogue: [
      {
        speaker: 'Message Dispatcher',
        text: 'Hi Ramesh! Ganesh has a voice call ready for you: https://vaani.pages.dev/call/room_492 (Tap to join in browser)',
        role: 'agent',
      },
      {
        speaker: 'Recipient (on Handset)',
        text: 'Opens link on phone browser without downloading any app: "Hello, is the laptop repair completed?"',
        role: 'resp',
      },
      {
        speaker: 'AI Assistant',
        text: 'Outcome Verified: Laptop motherboard repaired • Pickup Ready Today 5 PM • Summary Saved',
        role: 'summary',
      },
    ],
  },
  logistics: {
    title: 'Courier Delivery Confirmation',
    lang: 'Kanglish Dialect',
    badge: 'Manual Call',
    dialogue: [
      {
        speaker: 'VaaniCall',
        text: 'Hello, order #4892 dispatch aagidya? Delivery timing yavaga?',
        role: 'agent',
      },
      {
        speaker: 'Respondent',
        text: 'Ha sir, already dispatched through BlueDart. Tomorrow afternoon 1 PM deliver aagutthe.',
        role: 'resp',
      },
      {
        speaker: 'Structured Extraction',
        text: 'Status: In Transit • ETA: Tomorrow 13:00 • Courier: BlueDart',
        role: 'summary',
      },
    ],
  },
  doctor: {
    title: 'Clinic Slot Rescheduling',
    lang: 'English Consultation',
    badge: 'Scheduled Call',
    dialogue: [
      {
        speaker: 'VaaniCall',
        text: 'Hello, could we reschedule Dr. Rao’s consultation to Friday morning at 10:00 AM?',
        role: 'agent',
      },
      {
        speaker: 'Receptionist',
        text: 'Yes, the 10:30 AM slot on Friday is available. We have confirmed the booking.',
        role: 'resp',
      },
      {
        speaker: 'Structured Extraction',
        text: 'Clinic: Dr. Rao • New Slot: Friday 10:30 AM • Confirmed: Yes',
        role: 'summary',
      },
    ],
  },
  hardware: {
    title: 'Store Inventory Check',
    lang: 'Indian English',
    badge: 'Manual Call',
    dialogue: [
      {
        speaker: 'VaaniCall',
        text: 'Hi, calling to verify if you have 50 bags of Ultratech Cement in ready stock?',
        role: 'agent',
      },
      {
        speaker: 'Shop Owner',
        text: 'Yes sir, stock is available in our main warehouse. Can dispatch in 2 hours.',
        role: 'resp',
      },
      {
        speaker: 'Structured Extraction',
        text: 'Item: Ultratech Cement • Quantity: 50+ Bags • Dispatch: Ready',
        role: 'summary',
      },
    ],
  },
};

export default function LandingPage() {
  const [activeScenario, setActiveScenario] = useState<string>('call_message');
  const [seconds, setSeconds] = useState(42);

  // Live seconds ticker for simulation card
  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const minsStr = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secsStr = String(seconds % 60).padStart(2, '0');

  const scenarioData = SCENARIOS[activeScenario] || SCENARIOS.call_message;

  const scrollToHowItWorks = () => {
    const el = document.getElementById('how-it-works');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#faf8ff] text-[#131b2e] font-sans selection:bg-primary-container selection:text-white">
      {/* Fixed Sticky Header */}
      <header className="fixed top-0 left-0 right-0 w-full z-50 bg-[#faf8ff]/90 backdrop-blur-xl border-b border-[#e2e7ff] shadow-[0_1px_8px_rgba(15,23,42,0.04)]">
        <div className="h-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-shrink-0">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center text-white shadow-md shadow-primary-container/20 group-hover:bg-primary transition-all">
                <span className="material-symbols-outlined text-[22px]">phone_in_talk</span>
              </div>
              <span className="font-extrabold text-xl tracking-tight text-[#131b2e]">VaaniCall AI</span>
            </Link>
            <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#e2dfff] text-primary">
              Voice Calling &amp; Direct Call Links
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-[#464555] hover:text-[#131b2e] text-sm font-medium transition-colors">
              Two Calling Modes
            </a>
            <a href="#how-it-works" className="text-[#464555] hover:text-[#131b2e] text-sm font-medium transition-colors">
              How It Works
            </a>
            <a href="#playground" className="text-[#464555] hover:text-[#131b2e] text-sm font-medium transition-colors">
              Simulation
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl text-sm font-semibold text-[#131b2e] hover:bg-[#e2e7ff] transition-colors"
            >
              Login
            </Link>
            <Link
              href="/login"
              className="px-4 sm:px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary-container hover:bg-primary text-white shadow-md shadow-primary-container/20 transition-all active:scale-[0.98]"
            >
              Open Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full pt-20">
        {/* Hero Section */}
        <div className="relative w-full overflow-hidden">
          {/* Subtle Ambient Glow */}
          <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-b from-indigo-200/40 via-blue-100/30 to-transparent blur-3xl opacity-80"></div>

          <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 pt-10 pb-20 lg:pt-16 lg:pb-28">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
              {/* Left Column: Copy & Actions */}
              <div className="lg:col-span-7 flex flex-col items-start text-left">
                {/* Top Badge */}
                <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#e2dfff] text-primary text-xs sm:text-sm font-medium mb-6 shadow-xs">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-container opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary-container"></span>
                  </span>
                  <span className="font-semibold">Autonomous Multilingual AI Engine • Zero Telephony Barriers</span>
                </div>

                {/* Main Headline */}
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#131b2e] mb-6 leading-[1.12]">
                  Autonomous <br className="hidden sm:inline" />
                  <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    Voice Calling
                  </span>{' '}
                  &amp; Smart Direct Links
                </h1>

                {/* Subheadline */}
                <p className="text-base sm:text-lg text-[#464555] max-w-2xl mb-8 leading-relaxed">
                  Two powerful features in one platform: <strong>1) Manual Voice Calling</strong> with natural conversational voice
                  personas, and <strong>2) Call Message Setup</strong> with 1-click Direct Call Links
                  so recipients can join real-time voice calls directly in their mobile browser without downloading any apps.
                </p>

                {/* Dual Feature CTA Action Buttons */}
                <div className="flex flex-wrap items-center gap-3.5 w-full sm:w-auto">
                  <Link
                    href="/login"
                    className="group inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm sm:text-base bg-primary-container text-white hover:bg-primary transition-all duration-200 shadow-md hover:shadow-lg hover:shadow-primary-container/20 active:scale-[0.99] cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">add_call</span>
                    <span>1. Manual Voice Calling</span>
                    <span className="material-symbols-outlined text-[18px] transition-transform duration-200 group-hover:translate-x-1">
                      arrow_forward
                    </span>
                  </Link>

                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm sm:text-base bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 transition-colors shadow-xs cursor-pointer active:scale-[0.99]"
                  >
                    <span className="material-symbols-outlined text-primary text-[20px]">chat</span>
                    <span>2. Call Message Setup</span>
                  </Link>

                  <button
                    onClick={scrollToHowItWorks}
                    type="button"
                    className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm bg-[#f2f3ff] text-[#131b2e] hover:bg-[#eaedff] transition-colors shadow-xs cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-primary text-[20px]">play_circle</span>
                    <span>Watch Demo</span>
                  </button>
                </div>

                {/* Micro Metrics */}
                <div className="mt-10 pt-8 border-t border-[#dae2fd] flex flex-wrap items-center gap-8 w-full">
                  <div className="flex flex-col">
                    <span className="text-2xl sm:text-3xl font-bold text-[#131b2e]">2 Modes</span>
                    <span className="text-xs uppercase tracking-wider text-[#464555] mt-0.5">Manual &amp; Direct Links</span>
                  </div>
                  <div className="w-px h-8 bg-[#dae2fd]"></div>
                  <div className="flex flex-col">
                    <span className="text-2xl sm:text-3xl font-bold text-[#131b2e]">&lt;280ms</span>
                    <span className="text-xs uppercase tracking-wider text-[#464555] mt-0.5">Real-Time Turn Latency</span>
                  </div>
                  <div className="w-px h-8 bg-[#dae2fd]"></div>
                  <div className="flex flex-col">
                    <span className="text-2xl sm:text-3xl font-bold text-[#131b2e]">100% Web</span>
                    <span className="text-xs uppercase tracking-wider text-[#464555] mt-0.5">Zero App Install Required</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Live Phone Call & Direct Link Simulator Card */}
              <div className="lg:col-span-5 relative w-full">
                <div className="absolute -inset-1 rounded-3xl bg-gradient-to-tr from-primary-container/15 to-indigo-500/15 blur-xl opacity-80 pointer-events-none"></div>

                <div className="relative w-full rounded-2xl bg-white border border-[#e2e7ff] p-6 shadow-xl shadow-slate-900/5 space-y-4">
                  {/* Call Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-[#eaedff]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#e2dfff] flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined text-[20px]">smartphone</span>
                      </div>
                      <div>
                        <div className="font-bold text-sm sm:text-base text-[#131b2e] leading-tight">
                          Live Call &amp; Direct Link Dispatch
                        </div>
                        <div className="text-xs text-[#464555]">Recipient: +91 86600 39103</div>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>Active Session</span>
                    </span>
                  </div>

                  {/* Message Preview Bubble */}
                  <div className="rounded-xl bg-slate-100 p-3.5 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-800">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm text-primary">chat</span>
                        <span>Outbound Call Link Message</span>
                      </span>
                      <span className="text-[10px] text-slate-500">Delivered</span>
                    </div>

                    <div className="bg-white rounded-lg p-2.5 text-xs text-[#131b2e] space-y-1.5 shadow-xs border border-slate-200/60">
                      <p className="font-medium">
                        Hello! This is Ganesh. Please click this link to join our direct voice call:
                      </p>
                      <div className="p-2 rounded bg-indigo-50/70 text-[11px] font-mono text-primary flex items-center justify-between border border-indigo-100">
                        <span>https://vaani.pages.dev/call/room_492</span>
                        <span className="material-symbols-outlined text-xs">open_in_new</span>
                      </div>
                    </div>
                  </div>

                  {/* Real-time Bidirectional Dialogue */}
                  <div className="rounded-xl bg-[#f2f3ff] p-3.5 space-y-2 border border-[#eaedff]">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-primary flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">record_voice_over</span>
                        <span>Live Voice Stream (Vaani AI)</span>
                      </span>
                      <span className="font-mono text-[#777587] text-[11px]">{minsStr}:{secsStr}</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-primary-container text-white text-xs leading-relaxed">
                      &ldquo;Hello, is Ganesh&apos;s laptop repair completed? Can it be picked up today?&rdquo;
                    </div>

                    <div className="p-2.5 rounded-lg bg-white border border-[#eaedff] text-xs text-[#131b2e] leading-relaxed">
                      &ldquo;Yes sir, the motherboard service is complete. You can pick it up by 5:00 PM today.&rdquo;
                    </div>
                  </div>

                  {/* Verified Summary */}
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-emerald-600 text-lg shrink-0 mt-0.5">verified</span>
                    <div className="text-xs">
                      <span className="font-bold text-emerald-900 block">Automatic Call Outcome Captured:</span>
                      <span className="text-emerald-800">Motherboard Ready • Pickup: Today 5:00 PM • Confirmed</span>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="pt-2 flex items-center justify-between text-xs text-[#464555] border-t border-[#eaedff]">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-emerald-600 text-sm">lock</span>
                      <span>End-to-End Encrypted</span>
                    </span>
                    <Link href="/login" className="font-bold text-primary hover:underline">
                      Launch Call Dashboard →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Two Core Pillars Section */}
        <section className="w-full bg-[#f2f3ff] border-y border-[#e2e7ff] py-16 lg:py-24" id="features">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="text-xs uppercase tracking-wider text-primary font-bold mb-2 block">
                Two Core Calling Features
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#131b2e] tracking-tight">
                Complete Freedom to Call or Message
              </h2>
              <p className="text-sm sm:text-base text-[#464555] mt-2">
                Choose the workflow that suits your context: direct autonomous dialing or 1-click direct call links.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Feature 1 Pillar */}
              <div className="rounded-3xl bg-white border border-[#e2e7ff] p-8 sm:p-10 shadow-lg shadow-slate-900/5 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#e2dfff] text-primary text-xs font-bold">
                    <span className="material-symbols-outlined text-[16px]">add_call</span>
                    <span>Feature 1</span>
                  </div>
                  <h3 className="text-2xl font-extrabold text-[#131b2e]">
                    Manual Voice Calling
                  </h3>
                  <p className="text-sm text-[#464555] leading-relaxed">
                    Set up custom voice calls where Vaani AI speaks on your behalf with human-like cadence. The assistant
                    introduces itself naturally as your specified name without revealing robotic AI identity.
                  </p>

                  <ul className="space-y-2.5 pt-2 text-xs sm:text-sm text-[#131b2e]">
                    <li className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-primary text-base">check_circle</span>
                      <span><strong>Persona Identity:</strong> Speak casually or formally as your chosen name</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-primary text-base">check_circle</span>
                      <span><strong>Call Scheduler:</strong> Dispatch calls immediately or pick future date/time</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-primary text-base">check_circle</span>
                      <span><strong>Natural Voice Synthesis:</strong> Crystal-clear, human-like voice in simple, fluent English</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-primary text-base">check_circle</span>
                      <span><strong>Voice Profile Selection:</strong> Choose from Aarohi, Sunil, or custom voices</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-4 border-t border-[#eaedff]">
                  <Link
                    href="/login"
                    className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-primary-container hover:bg-primary text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
                  >
                    <span>Launch Manual Calling</span>
                    <span className="material-symbols-outlined text-base">arrow_forward</span>
                  </Link>
                </div>
              </div>

              {/* Feature 2 Pillar */}
              <div className="rounded-3xl bg-white border border-[#e2e7ff] p-8 sm:p-10 shadow-lg shadow-slate-900/5 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-900 border border-indigo-200 text-xs font-bold">
                    <span className="material-symbols-outlined text-[16px]">chat</span>
                    <span>Feature 2</span>
                  </div>
                  <h3 className="text-2xl font-extrabold text-[#131b2e]">
                    Call Message &amp; Direct Link
                  </h3>
                  <p className="text-sm text-[#464555] leading-relaxed">
                    Set up a custom message and generate a fresh, secure call room link. When sent to the recipient,
                    they click the link and converse with your project right on their mobile browser.
                  </p>

                  <ul className="space-y-2.5 pt-2 text-xs sm:text-sm text-[#131b2e]">
                    <li className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-primary text-base">check_circle</span>
                      <span><strong>Direct Web Link:</strong> 100% free, zero mobile app installation needed</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-primary text-base">check_circle</span>
                      <span><strong>n8n Webhook Integration:</strong> Background dispatch and automated logging</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-primary text-base">check_circle</span>
                      <span><strong>Zero App Downloads:</strong> Recipient talks immediately via browser mic &amp; speaker</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-primary text-base">check_circle</span>
                      <span><strong>Instant Copy &amp; Share:</strong> Copy complete message and link with one click</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-4 border-t border-[#eaedff]">
                  <Link
                    href="/login"
                    className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-primary-container hover:bg-primary text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
                  >
                    <span>Launch Call Message Setup</span>
                    <span className="material-symbols-outlined text-base">arrow_forward</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="w-full py-20 lg:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-12" id="how-it-works">
          <div className="flex flex-col items-center text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs uppercase tracking-wider text-primary font-bold mb-2">
              Automated Flow
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#131b2e] tracking-tight">How It Works</h2>
            <p className="text-base text-[#464555] mt-2">
              Three simple steps to autonomous calling and instant direct link sharing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="group flex flex-col rounded-2xl bg-white border border-[#e2e7ff] p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-14 h-14 rounded-2xl bg-[#e2dfff] text-primary flex items-center justify-center mb-6 shadow-xs group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[28px]">edit_note</span>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">Step 01</span>
                <div className="h-px flex-1 bg-[#eaedff]"></div>
              </div>
              <h3 className="text-xl font-bold text-[#131b2e] mb-3">1. Choose Calling Mode</h3>
              <p className="text-sm text-[#464555] mb-6 leading-relaxed flex-1">
                Select <strong>Manual Calling</strong> to trigger voice calls with scheduled timings, or choose{' '}
                <strong>Call Message Setup</strong> to craft a direct call link with your prompt.
              </p>
              <div className="rounded-xl bg-[#f2f3ff] p-3.5">
                <div className="text-[11px] uppercase tracking-wider text-[#464555] mb-1 font-bold">Config Options</div>
                <p className="text-xs text-[#131b2e] font-medium">
                  Name, target phone number, language mode, instructions &amp; custom schedule time.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="group flex flex-col rounded-2xl bg-white border border-[#e2e7ff] p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-14 h-14 rounded-2xl bg-primary-container text-white flex items-center justify-center mb-6 shadow-xs group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[28px]">record_voice_over</span>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">Step 02</span>
                <div className="h-px flex-1 bg-[#eaedff]"></div>
              </div>
              <h3 className="text-xl font-bold text-[#131b2e] mb-3">2. Bidirectional AI Speech</h3>
              <p className="text-sm text-[#464555] mb-6 leading-relaxed flex-1">
                The agent conducts the conversation with real-time speech recognition (Gnani STT) and natural voice synthesis
                (TTS) with smooth code-switching between Kannada and English.
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                <span className="px-2.5 py-1 rounded-md bg-[#c9e6ff] text-[#004c6e] text-xs font-medium">
                  Natural Prosody
                </span>
                <span className="px-2.5 py-1 rounded-md bg-[#e2dfff] text-primary text-xs font-medium">
                  &lt;280ms Latency
                </span>
                <span className="px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-900 text-xs font-medium">
                  Direct Call Link
                </span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="group flex flex-col rounded-2xl bg-white border border-[#e2e7ff] p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-14 h-14 rounded-2xl bg-secondary text-white flex items-center justify-center mb-6 shadow-xs group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[28px]">task_alt</span>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-secondary">Step 03</span>
                <div className="h-px flex-1 bg-[#eaedff]"></div>
              </div>
              <h3 className="text-xl font-bold text-[#131b2e] mb-3">3. Extract Verified Outcome</h3>
              <p className="text-sm text-[#464555] mb-6 leading-relaxed flex-1">
                Receive structured call summaries, bilingual transcripts, and verified dates. Share outcomes directly
                or copy summaries with one click.
              </p>
              <div className="rounded-xl bg-[#e2dfff]/50 p-3.5 flex items-center gap-2.5">
                <span className="material-symbols-outlined text-primary text-[20px]">notifications_active</span>
                <span className="text-xs font-semibold text-primary">Instant Summary &amp; Audio Replay</span>
              </div>
            </div>
          </div>
        </section>

        {/* Interactive Simulation Playground */}
        <section className="w-full py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-12" id="playground">
          <div className="rounded-3xl bg-[#e2e7ff]/60 border border-[#dae2fd] p-6 sm:p-10 lg:p-12 relative overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Left Column: Selectors */}
              <div className="lg:col-span-6">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary-container text-white mb-4 inline-block">
                  Live Interactive Simulation
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#131b2e] mb-4">Test Both Calling Scenarios</h2>
                <p className="text-sm text-[#464555] mb-6">
                  Select between direct call link dispatch and manual voice calls to see how VaaniCall AI coordinates
                  bilingual speech and extraction.
                </p>

                <div className="flex flex-col gap-3">
                  {[
                    {
                      id: 'call_message',
                      icon: 'chat',
                      title: 'Call Message & Direct Link',
                      desc: 'Instant browser voice link • Zero app downloads',
                    },
                    {
                      id: 'logistics',
                      icon: 'local_shipping',
                      title: 'Courier Delivery Confirmation',
                      desc: 'Kanglish • Tracking verification',
                    },
                    {
                      id: 'doctor',
                      icon: 'medical_services',
                      title: 'Clinic Slot Rescheduling',
                      desc: 'Kannada • Morning clinic queue',
                    },
                    {
                      id: 'hardware',
                      icon: 'hardware',
                      title: 'Store Inventory Check',
                      desc: 'English • Cement & paint availability',
                    },
                  ].map((sc) => (
                    <button
                      key={sc.id}
                      type="button"
                      onClick={() => setActiveScenario(sc.id)}
                      className={`text-left p-4 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                        activeScenario === sc.id
                          ? 'bg-white border-primary-container shadow-md shadow-primary-container/10'
                          : 'bg-white/70 border-[#e2e7ff] hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`material-symbols-outlined ${
                            activeScenario === sc.id ? 'text-primary' : 'text-[#777587]'
                          }`}
                        >
                          {sc.icon}
                        </span>
                        <div>
                          <div className="font-semibold text-sm text-[#131b2e]">{sc.title}</div>
                          <div className="text-xs text-[#464555]">{sc.desc}</div>
                        </div>
                      </div>
                      <span
                        className={`material-symbols-outlined text-lg ${
                          activeScenario === sc.id ? 'text-primary' : 'text-[#777587]'
                        }`}
                      >
                        {activeScenario === sc.id ? 'radio_button_checked' : 'radio_button_unchecked'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Right Column: Display Screen */}
              <div className="lg:col-span-6">
                <div className="rounded-2xl bg-white border border-[#e2e7ff] p-6 shadow-md space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#eaedff]">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-primary-container"></span>
                      <span className="font-bold text-sm sm:text-base text-[#131b2e]">{scenarioData.title}</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#e2dfff] text-primary">
                      {scenarioData.badge}
                    </span>
                  </div>

                  {/* Dialogue Script */}
                  <div className="space-y-3 min-h-[220px]">
                    <div className="p-3.5 rounded-lg bg-[#f2f3ff] text-xs sm:text-sm text-[#131b2e]">
                      <span className="font-bold text-primary block text-[11px] mb-1">
                        {scenarioData.dialogue[0].speaker}:
                      </span>
                      &ldquo;{scenarioData.dialogue[0].text}&rdquo;
                    </div>

                    <div className="p-3.5 rounded-lg bg-[#eaedff]/60 text-xs sm:text-sm text-[#131b2e]">
                      <span className="font-bold text-[#464555] block text-[11px] mb-1">
                        {scenarioData.dialogue[1].speaker}:
                      </span>
                      &ldquo;{scenarioData.dialogue[1].text}&rdquo;
                    </div>

                    <div className="p-3.5 rounded-lg bg-[#e2dfff]/40 text-xs sm:text-sm text-[#131b2e]">
                      <span className="font-bold text-primary block text-[11px] mb-1">
                        {scenarioData.dialogue[2].speaker}:
                      </span>
                      {scenarioData.dialogue[2].text}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#eaedff] flex items-center justify-between text-xs text-[#464555]">
                    <span>Verified in &lt;30 seconds</span>
                    <Link href="/login" className="font-semibold text-primary hover:underline">
                      Try Real Session →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="w-full pb-20 lg:pb-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
          <div className="relative rounded-3xl bg-primary-container text-white p-8 sm:p-12 lg:p-16 overflow-hidden shadow-2xl">
            <div className="absolute -right-20 -bottom-20 w-96 h-96 rounded-full bg-primary blur-3xl opacity-60 pointer-events-none"></div>
            <div className="absolute -left-20 -top-20 w-80 h-80 rounded-full bg-secondary blur-3xl opacity-40 pointer-events-none"></div>
            <div className="relative z-10 max-w-3xl">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-white backdrop-blur-md mb-6">
                <span className="material-symbols-outlined text-[16px]">call</span>
                <span>Both Features Ready in One Place</span>
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 tracking-tight">
                Ready to automate your calls &amp; message links?
              </h2>
              <p className="text-base sm:text-lg text-indigo-100 mb-8 max-w-xl leading-relaxed">
                Start making voice calls or dispatching direct call links with zero setup immediately.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <Link
                  href="/login"
                  className="px-6 py-3 rounded-xl font-bold text-sm sm:text-base bg-white text-[#131b2e] hover:bg-slate-100 transition-all shadow-lg active:scale-[0.99]"
                >
                  Get Started Free
                </Link>
                <Link
                  href="/login"
                  className="px-6 py-3 rounded-xl font-semibold text-sm sm:text-base bg-white/15 text-white hover:bg-white/25 transition-colors backdrop-blur-md"
                >
                  Login to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full bg-[#f2f3ff] border-t border-[#eaedff] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center md:items-start gap-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-[#131b2e]">VaaniCall AI</span>
              <span className="text-[#464555]">•</span>
              <span className="text-xs text-[#464555]">Your AI. Your Voice. Your Calls.</span>
            </div>
            <p className="text-xs text-[#464555]">© 2025–2026 VaaniCall AI Systems. All rights reserved.</p>
          </div>
          <div className="flex items-center gap-6 text-xs text-[#464555]">
            <Link href="/login" className="hover:text-[#131b2e] transition-colors">
              1. Manual Calling
            </Link>
            <Link href="/login" className="hover:text-[#131b2e] transition-colors">
              2. Call Message Setup
            </Link>
            <Link href="/login" className="hover:text-[#131b2e] transition-colors">
              Documentation
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
