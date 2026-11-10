'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { fetchCalls, fetchTasks, Call, Task } from '@/app/api/client';

interface HistoryItem {
  id: string;
  name: string;
  number: string;
  date: string;
  duration: string;
  language: string;
  status: 'completed' | 'attention' | 'missed';
  summary: string;
}

const mockHistory: HistoryItem[] = [
  {
    id: 'call-1',
    name: 'Sri Manjunatha Electronics',
    number: '+91 98450 82194',
    date: 'Today, 11:24 AM',
    duration: '1m 54s',
    language: 'ಕನ್ನಡ / ENG',
    status: 'completed',
    summary: 'Order #4892 packed, expected dispatch by Friday morning via BlueDart.',
  },
  {
    id: 'call-2',
    name: 'Dr. Ramesh Clinic',
    number: '+91 94481 02931',
    date: 'Yesterday, 4:15 PM',
    duration: '48s',
    language: 'ಕನ್ನಡ',
    status: 'completed',
    summary: 'Confirmed consultation appointment for Thursday 5:30 PM slot.',
  },
  {
    id: 'call-3',
    name: 'Green Trends Salon (Jayanagar)',
    number: '+91 98860 11422',
    date: 'Oct 21, 2:30 PM',
    duration: '35s',
    language: 'English',
    status: 'completed',
    summary: 'Confirmed haircut slot at 3:00 PM with senior stylist.',
  },
  {
    id: 'call-4',
    name: 'Bangalore Water Supply (BWSSB)',
    number: '+91 80 2294 5100',
    date: 'Oct 19, 10:10 AM',
    duration: '12s',
    language: 'ಕನ್ನಡ',
    status: 'missed',
    summary: 'Line was busy, assistant scheduled an automatic follow-up.',
  },
];

export default function CallHistoryPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'completed' | 'attention' | 'missed'>('all');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<HistoryItem[]>(mockHistory);

  useEffect(() => {
    (async () => {
      try {
        const calls = await fetchCalls();
        if (calls && calls.length > 0) {
          const apiItems: HistoryItem[] = calls.map((c) => ({
            id: c.id,
            name: c.task_id ? `Task #${c.task_id.slice(-6)}` : 'Outbound Assistant Call',
            number: c.exotel_call_sid ? `SID: ${c.exotel_call_sid.slice(0, 10)}...` : '+91 98450 •••••',
            date: 'Recent',
            duration: '1m 20s',
            language: c.language_detected === 'kannada' ? 'ಕನ್ನಡ' : c.language_detected || 'ಕನ್ನಡ',
            status: c.status === 'completed' ? 'completed' : 'attention',
            summary: c.summary || 'Call successfully completed by VaaniCall AI.',
          }));
          // Prepend api items
          setItems([...apiItems, ...mockHistory]);
        }
      } catch (e) {
        console.warn('Backend call history fetch fallback:', e);
      }
    })();
  }, []);

  const filteredItems = items.filter((item) => {
    if (filter !== 'all' && item.status !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.number.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="w-full pt-4 pb-12 px-4 sm:px-8 max-w-5xl mx-auto space-y-6">
      {/* Title & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1a1c1a] tracking-tight">Call History</h1>
          <p className="text-sm text-[#58605c] mt-1">Review past conversations, summaries, and recordings</p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#28543e] hover:bg-[#1d3f2f] text-white text-xs sm:text-sm font-semibold transition shadow-xs self-start sm:self-center"
        >
          <span className="material-symbols-outlined text-[18px]">add_call</span>
          <span>New Call</span>
        </Link>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#eeece8] shadow-xs space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#717973] text-[20px]">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search calls, contacts, or summary keywords..."
            className="w-full pl-11 pr-4 py-2.5 bg-[#f6f5f2] rounded-xl text-sm text-[#1a1c1a] placeholder:text-[#717973] border border-transparent focus:border-[#d2ded5] focus:bg-white focus:outline-none transition-all"
          />
        </div>

        {/* Human Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#eeece8]/60">
          {[
            { id: 'all', label: 'All Calls' },
            { id: 'completed', label: 'Completed' },
            { id: 'attention', label: 'Needs Attention' },
            { id: 'missed', label: 'Missed' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id as any)}
              className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors ${
                filter === tab.id
                  ? 'bg-[#28543e] text-white font-semibold shadow-xs'
                  : 'bg-[#f6f5f2] hover:bg-[#eaf2ec] text-[#58605c] hover:text-[#28543e]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Call History Card List */}
      <div className="space-y-4">
        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#eeece8] p-12 text-center text-[#717973]">
            <span className="material-symbols-outlined text-4xl text-[#717973]/60 mb-2">inbox</span>
            <p className="text-sm">No calls found matching your filter criteria.</p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => router.push(`/call/details`)}
              className="bg-white rounded-2xl p-5 border border-[#eeece8] hover:border-[#28543e]/40 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group"
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-[#eaf2ec] text-[#28543e] flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-[#28543e] group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-xl">phone_in_talk</span>
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-base text-[#1a1c1a] group-hover:text-[#28543e] transition-colors truncate">
                      {item.name}
                    </h3>
                    <span className="text-xs font-mono text-[#717973]">{item.number}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-[#58605c] line-clamp-1">{item.summary}</p>
                  <div className="flex items-center gap-3 text-xs text-[#717973] pt-0.5">
                    <span>{item.date}</span>
                    <span>•</span>
                    <span>{item.duration}</span>
                    <span>•</span>
                    <span className="font-semibold text-[#28543e]">{item.language}</span>
                  </div>
                </div>
              </div>

              {/* Status and Action button */}
              <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                    item.status === 'completed'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : item.status === 'missed'
                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                      : 'bg-blue-50 text-blue-800 border border-blue-200'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      item.status === 'completed'
                        ? 'bg-emerald-600'
                        : item.status === 'missed'
                        ? 'bg-amber-600'
                        : 'bg-blue-600'
                    }`}
                  />
                  {item.status === 'completed' ? 'Completed' : item.status === 'missed' ? 'Missed' : 'Pending'}
                </span>

                <button
                  type="button"
                  className="px-3.5 py-1.5 rounded-xl border border-[#eeece8] text-xs font-semibold text-[#58605c] hover:bg-[#eaf2ec] hover:text-[#28543e] transition flex items-center gap-1"
                >
                  <span>Details</span>
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
