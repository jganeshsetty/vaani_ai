'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [callerName, setCallerName] = useState('Ganesh');

  useEffect(() => {
    try {
      const savedName = localStorage.getItem('vaani_caller_name');
      if (savedName) setCallerName(savedName);
    } catch (e) {}
  }, []);

  // Landing page and Authentication page have their own complete layouts
  if (pathname === '/' || pathname === '/login') {
    return <main className="w-full min-h-screen bg-[#faf8ff] text-[#131b2e]">{children}</main>;
  }

  const isDashboard = pathname === '/dashboard' || pathname === '/new-call';
  const isLiveCall = pathname === '/dashboard/live' || pathname === '/call/live';
  const isHistory = pathname === '/call/history' || pathname === '/dashboard/history';
  const isDetails = pathname?.startsWith('/call/') && !isLiveCall && !isHistory;
  const isStudio = pathname?.startsWith('/voice-studio');

  const initials =
    callerName
      .split(' ')
      .filter(Boolean)
      .map((p) => p[0].toUpperCase())
      .slice(0, 2)
      .join('') || 'G';

  return (
    <div className="min-h-screen bg-[#faf8ff] text-[#131b2e] font-sans antialiased">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-64 bg-white z-50 flex-col py-6 px-4 border-r border-slate-200 shadow-sm">
        {/* Brand / Logo */}
        <Link href="/dashboard" className="px-3 mb-8 flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-primary-container flex items-center justify-center text-white shadow-md shadow-primary-container/20 group-hover:bg-primary transition-all">
            <span className="material-symbols-outlined text-[20px]">phone_in_talk</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[17px] font-bold text-[#131b2e] tracking-tight">VaaniCall AI</span>
            <span className="text-[11px] text-slate-500 font-normal">Multilingual Voice Agent</span>
          </div>
        </Link>

        {/* Navigation List */}
        <nav className="flex-1 space-y-1.5">
          <Link
            href="/dashboard"
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[14px] min-h-[44px] transition-all ${
              isDashboard
                ? 'bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200/60 shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">add_call</span>
            <span>New Call</span>
          </Link>

          <Link
            href="/dashboard/live"
            className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[14px] min-h-[44px] transition-all ${
              isLiveCall
                ? 'bg-primary-container text-white font-semibold shadow-md shadow-primary-container/25'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium'
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className="material-symbols-outlined text-[20px]"
                style={isLiveCall ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                podcasts
              </span>
              <span>Live Call</span>
            </div>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                isLiveCall ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-700'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full mr-1 ${
                  isLiveCall ? 'bg-cyan-300 animate-pulse' : 'bg-indigo-600'
                }`}
              />
              Active
            </span>
          </Link>

          <Link
            href="/call/history"
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[14px] min-h-[44px] transition-all ${
              isHistory
                ? 'bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200/60 shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">history</span>
            <span>Call History</span>
          </Link>

          <Link
            href="/call/details"
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[14px] min-h-[44px] transition-all ${
              isDetails
                ? 'bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200/60 shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">description</span>
            <span>Call Details</span>
          </Link>

          <Link
            href="/voice-studio/settings"
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[14px] min-h-[44px] transition-all ${
              isStudio
                ? 'bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200/60 shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">tune</span>
            <span>Voice Studio</span>
          </Link>
        </nav>

        {/* Engine status pill */}
        <div className="px-2 pt-4 border-t border-slate-200 mb-3">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[12px] font-semibold text-slate-800 leading-tight">Kannada Voice Engine</span>
              <span className="text-[10.5px] text-slate-500 truncate">Casual & Informal Mode</span>
            </div>
          </div>
        </div>

        {/* Profile Card & Logout */}
        <div className="pt-2 px-2 flex items-center justify-between border-t border-slate-100">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center justify-center font-bold text-xs shrink-0">
              {initials}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[13px] font-semibold text-slate-800 truncate leading-tight">{callerName}</span>
              <span className="text-[11px] text-slate-500 truncate">Personal Account</span>
            </div>
          </div>
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                localStorage.removeItem('vaani_jwt');
                document.cookie = 'vaani_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                window.location.href = '/login';
              }
            }}
            title="Log out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
          </button>
        </div>
      </aside>

      {/* Main View Area */}
      <div className="md:pl-64 flex flex-col min-h-screen bg-[#faf8ff]">
        {/* Top Header */}
        <header className="h-16 px-4 md:px-8 bg-white/90 backdrop-blur sticky top-0 z-40 flex items-center justify-between border-b border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-3">
            {/* Mobile Logo */}
            <Link href="/dashboard" className="md:hidden flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center text-white">
                <span className="material-symbols-outlined text-[18px]">phone_in_talk</span>
              </div>
              <span className="font-bold text-[16px] text-slate-900">VaaniCall</span>
            </Link>

            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
              {isLiveCall ? 'Live Call In Progress' : 'Ready to assist'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-[13px] text-slate-700 shadow-xs">
              <span className="material-symbols-outlined text-[16px] text-indigo-600">translate</span>
              <span className="font-semibold text-slate-900">ಕನ್ನಡ</span>
              <span className="text-slate-300">|</span>
              <span>English</span>
            </div>

            <div className="h-4 w-px bg-slate-200 hidden sm:block" />

            <div className="flex items-center gap-2">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-semibold text-slate-900 leading-tight">{callerName}</div>
                <div className="text-[11px] text-slate-500 leading-tight">+91 98450 •••••</div>
              </div>
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 font-semibold text-xs flex items-center justify-center">
                {initials}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 pb-20 md:pb-8">{children}</main>
      </div>

      {/* Mobile Bottom Navigation with Min 44px Touch Targets */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-t border-slate-200 z-50 flex items-center justify-around px-2 shadow-lg">
        <Link
          href="/dashboard"
          className={`min-h-[48px] min-w-[54px] flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-lg transition-colors ${
            isDashboard ? 'text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <span className="material-symbols-outlined text-xl">add_call</span>
          <span className="text-[11px] font-medium">New</span>
        </Link>
        <Link
          href="/dashboard/live"
          className={`min-h-[48px] min-w-[54px] flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-lg transition-colors ${
            isLiveCall ? 'text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <span
            className="material-symbols-outlined text-xl"
            style={isLiveCall ? { fontVariationSettings: "'FILL' 1" } : undefined}
          >
            podcasts
          </span>
          <span className="text-[11px] font-medium">Live</span>
        </Link>
        <Link
          href="/call/history"
          className={`min-h-[48px] min-w-[54px] flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-lg transition-colors ${
            isHistory ? 'text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <span className="material-symbols-outlined text-xl">history</span>
          <span className="text-[11px] font-medium">History</span>
        </Link>
        <Link
          href="/call/details"
          className={`min-h-[48px] min-w-[54px] flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-lg transition-colors ${
            isDetails ? 'text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <span className="material-symbols-outlined text-xl">description</span>
          <span className="text-[11px] font-medium">Details</span>
        </Link>
        <Link
          href="/voice-studio/settings"
          className={`min-h-[48px] min-w-[54px] flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-lg transition-colors ${
            isStudio ? 'text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <span className="material-symbols-outlined text-xl">tune</span>
          <span className="text-[11px] font-medium">Studio</span>
        </Link>
      </nav>
    </div>
  );
}
