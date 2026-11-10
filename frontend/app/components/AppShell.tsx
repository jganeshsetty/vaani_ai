'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

  const isNewCall = pathname === '/' || pathname === '/new-call';
  const isLiveCall = pathname === '/call/live';
  const isHistory = pathname === '/call/history';
  const isDetails = pathname?.startsWith('/call/') && !isLiveCall && !isHistory;
  const isStudio = pathname?.startsWith('/voice-studio');

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#1a1c1a] font-sans antialiased">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-64 bg-white z-50 flex-col py-6 px-4 border-r border-[#eeece8]">
        {/* Brand / Logo */}
        <Link href="/" className="px-3 mb-8 flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-[#28543e] flex items-center justify-center text-white shadow-sm group-hover:bg-[#1d3f2f] transition-colors">
            <span className="material-symbols-outlined text-[20px]">phone_in_talk</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[17px] font-semibold text-[#1a1c1a] tracking-tight">VaaniCall</span>
            <span className="text-[12px] text-[#717973] font-normal">Personal voice assistant</span>
          </div>
        </Link>

        {/* Navigation List */}
        <nav className="flex-1 space-y-1.5">
          <Link
            href="/"
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[14px] transition-all ${
              isNewCall
                ? 'bg-[#eaf2ec] text-[#28543e] font-semibold'
                : 'text-[#58605c] hover:bg-[#f6f5f2] hover:text-[#1a1c1a] font-medium'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">add_call</span>
            <span>New Call</span>
          </Link>

          <Link
            href="/call/live"
            className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[14px] transition-all ${
              isLiveCall
                ? 'bg-[#28543e] text-white font-semibold shadow-sm'
                : 'text-[#58605c] hover:bg-[#f6f5f2] hover:text-[#1a1c1a] font-medium'
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
                isLiveCall ? 'bg-white/20 text-white' : 'bg-[#eaf2ec] text-[#28543e]'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full mr-1 ${
                  isLiveCall ? 'bg-emerald-300 animate-pulse' : 'bg-[#28543e]'
                }`}
              />
              Active
            </span>
          </Link>

          <Link
            href="/call/history"
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[14px] transition-all ${
              isHistory
                ? 'bg-[#eaf2ec] text-[#28543e] font-semibold'
                : 'text-[#58605c] hover:bg-[#f6f5f2] hover:text-[#1a1c1a] font-medium'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">history</span>
            <span>Call History</span>
          </Link>

          <Link
            href="/call/details"
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[14px] transition-all ${
              isDetails
                ? 'bg-[#eaf2ec] text-[#28543e] font-semibold'
                : 'text-[#58605c] hover:bg-[#f6f5f2] hover:text-[#1a1c1a] font-medium'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">description</span>
            <span>Call Details</span>
          </Link>

          <Link
            href="/voice-studio/settings"
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[14px] transition-all ${
              isStudio
                ? 'bg-[#eaf2ec] text-[#28543e] font-semibold'
                : 'text-[#58605c] hover:bg-[#f6f5f2] hover:text-[#1a1c1a] font-medium'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">tune</span>
            <span>Voice Studio</span>
          </Link>
        </nav>

        {/* Engine status pill */}
        <div className="px-2 pt-4 border-t border-[#eeece8] mb-3">
          <div className="p-3 rounded-xl bg-[#f3f7f4] border border-[#d2ded5]/60 flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-[#28543e] animate-pulse shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[12px] font-semibold text-[#28543e] leading-tight">Kannada Voice Engine</span>
              <span className="text-[10.5px] text-[#717973] truncate">Natural conversational flow</span>
            </div>
          </div>
        </div>

        {/* Profile Card */}
        <div className="pt-2 px-2 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#eaf2ec] text-[#28543e] flex items-center justify-center font-bold text-xs ring-2 ring-[#eaf2ec] shrink-0">
            SK
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[13px] font-medium text-[#1a1c1a] truncate leading-tight">Sunil Kumar</span>
            <span className="text-[11px] text-[#717973] truncate">Personal Account</span>
          </div>
        </div>
      </aside>

      {/* Main View Area */}
      <div className="md:pl-64 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="h-16 px-4 md:px-8 bg-[#faf9f6]/90 backdrop-blur sticky top-0 z-40 flex items-center justify-between border-b border-[#eeece8]/80">
          <div className="flex items-center gap-3">
            {/* Mobile Logo */}
            <Link href="/" className="md:hidden flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#28543e] flex items-center justify-center text-white">
                <span className="material-symbols-outlined text-[18px]">phone_in_talk</span>
              </div>
              <span className="font-bold text-[16px] text-[#1a1c1a]">VaaniCall</span>
            </Link>

            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium bg-[#eaf2ec] text-[#28543e]">
              <span className="w-2 h-2 rounded-full bg-[#28543e]" />
              {isLiveCall ? 'Live Call In Progress' : 'Ready to assist'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#e2e1dd] text-[13px] text-[#4d5550] shadow-2xs">
              <span className="material-symbols-outlined text-[16px] text-[#28543e]">translate</span>
              <span className="font-semibold text-[#1a1c1a]">ಕನ್ನಡ</span>
              <span className="text-[#c1c9c1]">|</span>
              <span>English</span>
            </div>

            <div className="h-4 w-px bg-[#e2e1dd] hidden sm:block" />

            <div className="flex items-center gap-2">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-semibold text-[#1a1c1a] leading-tight">Sunil Kumar</div>
                <div className="text-[11px] text-[#717973] leading-tight">+91 98450 •••••</div>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#eaf2ec] text-[#28543e] font-semibold text-xs flex items-center justify-center border border-[#d2ded5]">
                SK
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 pb-20 md:pb-8">{children}</main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-t border-[#eeece8] z-50 flex items-center justify-around px-2">
        <Link
          href="/"
          className={`flex flex-col items-center gap-0.5 py-1 px-2 ${
            isNewCall ? 'text-[#28543e] font-bold' : 'text-[#58605c]'
          }`}
        >
          <span className="material-symbols-outlined text-xl">add_call</span>
          <span className="text-[11px] font-medium">New</span>
        </Link>
        <Link
          href="/call/live"
          className={`flex flex-col items-center gap-0.5 py-1 px-2 ${
            isLiveCall ? 'text-[#28543e] font-bold' : 'text-[#58605c]'
          }`}
        >
          <span className="material-symbols-outlined text-xl" style={isLiveCall ? { fontVariationSettings: "'FILL' 1" } : undefined}>
            podcasts
          </span>
          <span className="text-[11px] font-medium">Live</span>
        </Link>
        <Link
          href="/call/history"
          className={`flex flex-col items-center gap-0.5 py-1 px-2 ${
            isHistory ? 'text-[#28543e] font-bold' : 'text-[#58605c]'
          }`}
        >
          <span className="material-symbols-outlined text-xl">history</span>
          <span className="text-[11px] font-medium">History</span>
        </Link>
        <Link
          href="/call/details"
          className={`flex flex-col items-center gap-0.5 py-1 px-2 ${
            isDetails ? 'text-[#28543e] font-bold' : 'text-[#58605c]'
          }`}
        >
          <span className="material-symbols-outlined text-xl">description</span>
          <span className="text-[11px] font-medium">Details</span>
        </Link>
        <Link
          href="/voice-studio/settings"
          className={`flex flex-col items-center gap-0.5 py-1 px-2 ${
            isStudio ? 'text-[#28543e] font-bold' : 'text-[#58605c]'
          }`}
        >
          <span className="material-symbols-outlined text-xl">tune</span>
          <span className="text-[11px] font-medium">Studio</span>
        </Link>
      </nav>
    </div>
  );
}

