'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface Scenario {
  title: string;
  lang: string;
  dialogue: { speaker: string; text: string; role?: 'agent' | 'resp' | 'summary' }[];
}

const SCENARIOS: Record<string, Scenario> = {
  logistics: {
    title: 'Courier Delivery Confirmation',
    lang: 'Kanglish Dialect',
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
    lang: 'Pure Kannada',
    dialogue: [
      {
        speaker: 'VaaniCall',
        text: 'ನಮಸ್ಕಾರ, ಡಾಕ್ಟರ್ ರಾವ್ ಅವರ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಶುಕ್ರವಾರ ಬೆಳಿಗ್ಗೆ 10 ಗಂಟೆಗೆ ಬದಲಾಯಿಸಬಹುದೇ?',
        role: 'agent',
      },
      {
        speaker: 'Receptionist',
        text: 'ಹೌದು, ಶುಕ್ರವಾರ 10:30 AM ಸ್ಲಾಟ್ ಖಾಲಿ ಇದೆ. ಬುಕ್ ಮಾಡಿದ್ದೀವಿ.',
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
  const [activeScenario, setActiveScenario] = useState<string>('logistics');
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

  const scenarioData = SCENARIOS[activeScenario] || SCENARIOS.logistics;

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
              Multilingual Voice AI
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-[#464555] hover:text-[#131b2e] text-sm font-medium transition-colors">
              Features
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
              Get Started
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
                  <span className="font-semibold">Autonomous Multilingual Voice Engine • Powered by Gnani AI</span>
                </div>

                {/* Main Headline */}
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#131b2e] mb-6 leading-[1.12]">
                  Your Autonomous <br className="hidden sm:inline" />
                  <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    Multilingual
                  </span>{' '}
                  Calling Assistant
                </h1>

                {/* Subheadline */}
                <p className="text-base sm:text-lg text-[#464555] max-w-2xl mb-8 leading-relaxed">
                  Delegate your phone calls to an intelligent AI agent that speaks fluent Kannada, English, and natural
                  Kanglish. Give it a task, and receive verified summaries in seconds.
                </p>

                {/* CTA Action Buttons */}
                <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
                  <Link
                    href="/login"
                    className="group inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-semibold text-base bg-primary-container text-white hover:bg-primary transition-all duration-200 shadow-md hover:shadow-lg hover:shadow-primary-container/20 active:scale-[0.99] cursor-pointer"
                  >
                    <span>Get Started Free</span>
                    <span className="material-symbols-outlined text-[20px] transition-transform duration-200 group-hover:translate-x-1">
                      arrow_forward
                    </span>
                  </Link>
                  <button
                    onClick={scrollToHowItWorks}
                    type="button"
                    className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-semibold text-base bg-[#f2f3ff] text-[#131b2e] hover:bg-[#eaedff] transition-colors shadow-xs cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-primary text-[22px]">play_circle</span>
                    <span>See How It Calls</span>
                  </button>
                </div>

                {/* Micro Metrics */}
                <div className="mt-10 pt-8 border-t border-[#dae2fd] flex flex-wrap items-center gap-8 w-full">
                  <div className="flex flex-col">
                    <span className="text-2xl sm:text-3xl font-bold text-[#131b2e]">&lt;280ms</span>
                    <span className="text-xs uppercase tracking-wider text-[#464555] mt-0.5">Real-Time Turn Latency</span>
                  </div>
                  <div className="w-px h-8 bg-[#dae2fd]"></div>
                  <div className="flex flex-col">
                    <span className="text-2xl sm:text-3xl font-bold text-[#131b2e]">3-Way</span>
                    <span className="text-xs uppercase tracking-wider text-[#464555] mt-0.5">Dynamic Code-Mixing</span>
                  </div>
                  <div className="w-px h-8 bg-[#dae2fd]"></div>
                  <div className="flex flex-col">
                    <span className="text-2xl sm:text-3xl font-bold text-[#131b2e]">100%</span>
                    <span className="text-xs uppercase tracking-wider text-[#464555] mt-0.5">Autonomous Resolution</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Live Phone Call Simulator Card */}
              <div className="lg:col-span-5 relative w-full">
                <div className="absolute -inset-1 rounded-3xl bg-gradient-to-tr from-primary-container/15 to-secondary-container/15 blur-xl opacity-80 pointer-events-none"></div>

                <div className="relative w-full rounded-2xl bg-white border border-[#e2e7ff] p-6 shadow-xl shadow-slate-900/5">
                  {/* Call Header */}
                  <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#eaedff]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#e2dfff] flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined text-[20px]">storefront</span>
                      </div>
                      <div>
                        <div className="font-bold text-sm sm:text-base text-[#131b2e] leading-tight">
                          Sri Manjunatha Electronics
                        </div>
                        <div className="text-xs text-[#464555]">+91 98450 ••••• • Indiranagar</div>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#c9e6ff] text-[#004c6e]">
                      <span className="w-2 h-2 rounded-full bg-[#006591] animate-pulse"></span>
                      <span>Kanglish AI</span>
                    </span>
                  </div>

                  {/* Telemetry Stream */}
                  <div className="rounded-xl bg-[#f2f3ff] p-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-[18px]">
                          record_voice_over
                        </span>
                        <span className="text-xs uppercase font-semibold text-primary">
                          Live Synthetic Stream
                        </span>
                      </div>
                      <span className="text-xs font-mono text-[#464555]">
                        {minsStr}:{secsStr}
                      </span>
                    </div>

                    {/* Animated Audio Visualizer */}
                    <div className="h-10 flex items-center justify-between gap-1 px-2 bg-white rounded-lg border border-[#e2e7ff]/60">
                      <div className="w-1.5 bg-primary-container rounded-full h-3 animate-pulse"></div>
                      <div className="w-1.5 bg-primary-container rounded-full h-6 animate-pulse" style={{ animationDelay: '100ms' }}></div>
                      <div className="w-1.5 bg-tertiary-container rounded-full h-8 animate-pulse" style={{ animationDelay: '200ms' }}></div>
                      <div className="w-1.5 bg-primary rounded-full h-4 animate-pulse" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-1.5 bg-secondary rounded-full h-7 animate-pulse" style={{ animationDelay: '300ms' }}></div>
                      <div className="w-1.5 bg-primary-container rounded-full h-9 animate-pulse" style={{ animationDelay: '250ms' }}></div>
                      <div className="w-1.5 bg-tertiary rounded-full h-5 animate-pulse" style={{ animationDelay: '180ms' }}></div>
                      <div className="w-1.5 bg-primary-container rounded-full h-8 animate-pulse" style={{ animationDelay: '320ms' }}></div>
                      <div className="w-1.5 bg-secondary-container rounded-full h-6 animate-pulse" style={{ animationDelay: '90ms' }}></div>
                      <div className="w-1.5 bg-primary rounded-full h-3 animate-pulse" style={{ animationDelay: '210ms' }}></div>
                      <div className="w-1.5 bg-primary-container rounded-full h-7 animate-pulse" style={{ animationDelay: '140ms' }}></div>
                      <div className="w-1.5 bg-tertiary-container rounded-full h-4 animate-pulse" style={{ animationDelay: '280ms' }}></div>
                    </div>
                  </div>

                  {/* Dialogue Stream */}
                  <div className="space-y-3 mb-5">
                    {/* Agent Bubble */}
                    <div className="p-3.5 rounded-xl bg-[#f2f3ff] border-l-4 border-tertiary-container">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-primary">VaaniCall Agent</span>
                        <span className="text-xs text-[#464555]">00:18</span>
                      </div>
                      <p className="text-sm text-[#131b2e] leading-snug">
                        &ldquo;ನಮಸ್ಕಾರ, ನಾನು ಸುನಿಲ್ ಅವರ ಪರವಾಗಿ ಕರೆ ಮಾಡುತ್ತಿದ್ದೇನೆ. Order #4892 dispatch ಆಗಿದೆಯಾ ಅಂತ verify ಮಾಡೋದಿಕ್ಕೆ.&rdquo;
                      </p>
                      <p className="text-xs text-[#464555] italic mt-1">
                        (Namaskara, calling on behalf of Sunil to verify if order #4892 was dispatched.)
                      </p>
                    </div>

                    {/* Respondent Bubble */}
                    <div className="p-3.5 rounded-xl bg-white border border-[#e2e7ff] shadow-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-[#131b2e]">Store Manager</span>
                        <span className="text-xs text-[#464555]">00:34</span>
                      </div>
                      <p className="text-sm text-[#131b2e] leading-snug">
                        &ldquo;ಹೌದು ಸರ್, BlueDart courier ge handover maadidivi. Friday 1:00 PM olage deliver aagutthe.&rdquo;
                      </p>
                    </div>
                  </div>

                  {/* Verified Structured Outcome */}
                  <div className="p-3.5 rounded-xl bg-[#e2dfff]/40 border border-[#e2dfff] flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary-container flex items-center justify-center flex-shrink-0 text-white mt-0.5">
                      <span className="material-symbols-outlined text-[16px]">done_all</span>
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-primary">Objective Verified</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary text-white">
                          Dispatched
                        </span>
                      </div>
                      <p className="text-xs text-[#131b2e] mt-1 font-medium">
                        Carrier: BlueDart (AWB: #BD-991204) • ETA: Friday 1:00 PM
                      </p>
                    </div>
                  </div>

                  {/* Footer Strip */}
                  <div className="mt-4 pt-3 flex items-center justify-between text-xs text-[#464555] border-t border-[#eaedff]">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-secondary text-[16px]">verified_user</span>
                      <span>Encrypted Audio Recording</span>
                    </div>
                    <Link href="/login" className="font-semibold text-primary hover:underline">
                      Try Calling Demo →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Real-World Operations Strip */}
        <section className="w-full bg-[#f2f3ff] border-y border-[#e2e7ff] py-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-[28px]">graphic_eq</span>
              <div>
                <h4 className="font-bold text-base text-[#131b2e]">Engineered for Indian Telephony Standards</h4>
                <p className="text-xs sm:text-sm text-[#464555]">
                  Trained on thousands of Indian ambient phone conversations and accents.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="px-3.5 py-1.5 rounded-xl bg-white border border-[#e2e7ff] text-[#131b2e] text-xs sm:text-sm font-medium shadow-xs">
                Telecom IVR Bypass
              </span>
              <span className="px-3.5 py-1.5 rounded-xl bg-white border border-[#e2e7ff] text-[#131b2e] text-xs sm:text-sm font-medium shadow-xs">
                Background Noise Filtering
              </span>
              <span className="px-3.5 py-1.5 rounded-xl bg-white border border-[#e2e7ff] text-[#131b2e] text-xs sm:text-sm font-medium shadow-xs">
                Indian Accent Prosody
              </span>
            </div>
          </div>
        </section>

        {/* "How It Works" Section */}
        <section className="w-full py-20 lg:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-12" id="how-it-works">
          <div className="flex flex-col items-center text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs uppercase tracking-wider text-primary font-bold mb-2">
              Automated Workflow
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#131b2e] tracking-tight">How It Works</h2>
            <p className="text-base text-[#464555] mt-2">
              Three simple steps to autonomous telephonic workflows without dialing or waiting on hold.
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
              <h3 className="text-xl font-bold text-[#131b2e] mb-3">1. Set the Objective</h3>
              <p className="text-sm text-[#464555] mb-6 leading-relaxed flex-1">
                Type what you need done in plain language. Whether asking for order dispatch, confirming a doctor&apos;s
                appointment, or checking store hours.
              </p>
              <div className="rounded-xl bg-[#f2f3ff] p-3.5">
                <div className="text-[11px] uppercase tracking-wider text-[#464555] mb-1 font-bold">Prompt Example</div>
                <p className="text-xs text-[#131b2e] italic font-medium">
                  &ldquo;Ask when order #4892 will arrive and get the courier tracking ID.&rdquo;
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="group flex flex-col rounded-2xl bg-white border border-[#e2e7ff] p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-14 h-14 rounded-2xl bg-primary-container text-white flex items-center justify-center mb-6 shadow-xs group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[28px]">phone_in_talk</span>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">Step 02</span>
                <div className="h-px flex-1 bg-[#eaedff]"></div>
              </div>
              <h3 className="text-xl font-bold text-[#131b2e] mb-3">2. AI Makes the Call</h3>
              <p className="text-sm text-[#464555] mb-6 leading-relaxed flex-1">
                Our voice agent dials the number and speaks with human cadence, seamlessly code-switching between Kannada,
                English, or conversational Kanglish based on the respondent.
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                <span className="px-2.5 py-1 rounded-md bg-[#c9e6ff] text-[#004c6e] text-xs font-medium">
                  Natural Prosody
                </span>
                <span className="px-2.5 py-1 rounded-md bg-[#e2dfff] text-primary text-xs font-medium">
                  &lt;300ms Latency
                </span>
                <span className="px-2.5 py-1 rounded-md bg-[#e9ddff] text-[#5516be] text-xs font-medium">
                  Dual Dialect
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
              <h3 className="text-xl font-bold text-[#131b2e] mb-3">3. Get the Results</h3>
              <p className="text-sm text-[#464555] mb-6 leading-relaxed flex-1">
                Receive an instant structured executive summary, verified dispatch dates, audio replay, and complete
                bilingual transcript with zero guesswork.
              </p>
              <div className="rounded-xl bg-[#e2dfff]/50 p-3.5 flex items-center gap-2.5">
                <span className="material-symbols-outlined text-primary text-[20px]">notifications_active</span>
                <span className="text-xs font-semibold text-primary">Instant Summary &amp; Audio Replay</span>
              </div>
            </div>
          </div>
        </section>

        {/* Features Bento Section */}
        <section className="w-full bg-[#f2f3ff] border-y border-[#e2e7ff] py-20 lg:py-28" id="features">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
              <div className="max-w-xl">
                <span className="text-xs uppercase tracking-wider text-primary font-bold mb-2 block">
                  Core Capabilities
                </span>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-[#131b2e] tracking-tight">
                  Engineered for Real-World Conversations
                </h2>
              </div>
              <p className="text-sm sm:text-base text-[#464555] max-w-md">
                Not just a basic speech synthesizer. VaaniCall AI combines custom neural acoustic models with real-time
                reasoning to handle chaotic telephone environments.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="rounded-2xl bg-white border border-[#e2e7ff] p-8 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-[#e2dfff] text-primary flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-[26px]">bolt</span>
                  </div>
                  <h3 className="text-lg font-bold text-[#131b2e] mb-3">Autonomous Execution</h3>
                  <p className="text-sm text-[#464555] leading-relaxed">
                    Handles real interactive phone trees, busy lines, hold music, and store managers. Adapts dynamically to
                    unexpected questions and completes the objective without human intervention.
                  </p>
                </div>
                <div className="mt-8 pt-6 border-t border-[#eaedff] flex items-center justify-between text-[#464555] text-xs">
                  <span>IVR Keypress Support</span>
                  <span className="material-symbols-outlined text-primary text-[18px]">dialpad</span>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="rounded-2xl bg-white border border-[#e2e7ff] p-8 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-[#c9e6ff] text-secondary flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-[26px]">translate</span>
                  </div>
                  <h3 className="text-lg font-bold text-[#131b2e] mb-3">Seamless Code-Mixing (Kanglish)</h3>
                  <p className="text-sm text-[#464555] leading-relaxed">
                    Native-level understanding of South Indian bilingual speech. Fluidly transitions between Kannada and
                    Indian English mid-sentence just like a local resident.
                  </p>
                </div>
                <div className="mt-8 pt-6 border-t border-[#eaedff] flex items-center justify-between text-[#464555] text-xs">
                  <span>Dynamic Token Merging</span>
                  <span className="material-symbols-outlined text-secondary text-[18px]">swap_horiz</span>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="rounded-2xl bg-white border border-[#e2e7ff] p-8 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-[#e9ddff] text-[#5516be] flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-[26px]">mic</span>
                  </div>
                  <h3 className="text-lg font-bold text-[#131b2e] mb-3">Custom Voice Cloning</h3>
                  <p className="text-sm text-[#464555] leading-relaxed">
                    Calibrate and authorize your own voice profile in 20 seconds. The AI speaks on your behalf with
                    authorized consent and statutory AI disclosure built-in.
                  </p>
                </div>
                <div className="mt-8 pt-6 border-t border-[#eaedff] flex items-center justify-between text-[#464555] text-xs">
                  <span>Compliant AI Disclosures</span>
                  <span className="material-symbols-outlined text-primary text-[18px]">security</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Interactive Live Demo Playground Section */}
        <section className="w-full py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-12" id="playground">
          <div className="rounded-3xl bg-[#e2e7ff]/60 border border-[#dae2fd] p-6 sm:p-10 lg:p-12 relative overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Left Column: Selectors */}
              <div className="lg:col-span-6">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary-container text-white mb-4 inline-block">
                  Interactive Simulation
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#131b2e] mb-4">Try a Sample Voice Task</h2>
                <p className="text-sm text-[#464555] mb-6">
                  Select a common everyday call scenario to see how VaaniCall AI structures intent, dials, and extracts
                  reliable intelligence.
                </p>

                <div className="flex flex-col gap-3">
                  {[
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
                <div className="rounded-2xl bg-white border border-[#e2e7ff] p-6 shadow-md">
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#eaedff]">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-primary-container"></span>
                      <span className="font-bold text-sm sm:text-base text-[#131b2e]">{scenarioData.title}</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#e2dfff] text-primary">
                      {scenarioData.lang}
                    </span>
                  </div>

                  {/* Dialogue Script */}
                  <div className="space-y-3 min-h-[220px]">
                    <div className="p-3.5 rounded-lg bg-[#f2f3ff] text-sm text-[#131b2e]">
                      <span className="font-bold text-primary block text-xs mb-1">
                        {scenarioData.dialogue[0].speaker}:
                      </span>
                      &ldquo;{scenarioData.dialogue[0].text}&rdquo;
                    </div>

                    <div className="p-3.5 rounded-lg bg-[#eaedff]/60 text-sm text-[#131b2e]">
                      <span className="font-bold text-[#464555] block text-xs mb-1">
                        {scenarioData.dialogue[1].speaker}:
                      </span>
                      &ldquo;{scenarioData.dialogue[1].text}&rdquo;
                    </div>

                    <div className="p-3.5 rounded-lg bg-[#e2dfff]/40 text-sm text-[#131b2e]">
                      <span className="font-bold text-primary block text-xs mb-1">
                        {scenarioData.dialogue[2].speaker}:
                      </span>
                      {scenarioData.dialogue[2].text}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#eaedff] flex items-center justify-between text-xs text-[#464555]">
                    <span>Extracted in 28 seconds</span>
                    <Link href="/login" className="font-semibold text-primary hover:underline">
                      Try Real Voice Call →
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
                <span>Zero Human Phone Tag</span>
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 tracking-tight">Ready to automate your calls?</h2>
              <p className="text-base sm:text-lg text-indigo-100 mb-8 max-w-xl leading-relaxed">
                Join innovators delegating everyday phone tasks to VaaniCall AI. Experience fluent Kanglish phone agent
                workflows today.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <Link
                  href="/login"
                  className="px-7 py-3.5 rounded-xl font-bold text-sm sm:text-base bg-white text-[#131b2e] hover:bg-slate-100 transition-all shadow-lg active:scale-[0.99]"
                >
                  Start Free Trial
                </Link>
                <Link
                  href="/login"
                  className="px-7 py-3.5 rounded-xl font-semibold text-sm sm:text-base bg-white/15 text-white hover:bg-white/25 transition-colors backdrop-blur-md"
                >
                  Login with Demo
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
            <p className="text-xs text-[#464555]">© 2025 VaaniCall AI Systems Inc. All rights reserved.</p>
          </div>
          <div className="flex items-center gap-6 text-xs text-[#464555]">
            <Link href="/login" className="hover:text-[#131b2e] transition-colors">
              Platform
            </Link>
            <Link href="/login" className="hover:text-[#131b2e] transition-colors">
              Documentation
            </Link>
            <Link href="/login" className="hover:text-[#131b2e] transition-colors">
              API
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
