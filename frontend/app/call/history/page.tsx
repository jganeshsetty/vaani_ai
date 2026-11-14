'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { listSessions, CallSession } from '@/app/api/client';

interface HistoryItem {
  id: string;
  name: string;
  number: string;
  date: string;
  duration: string;
  language: string;
  status: 'completed' | 'attention' | 'missed' | 'pending' | 'in_progress' | 'failed';
  summary: string;
}

export default function CallHistoryPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'completed' | 'attention' | 'missed'>('all');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const sessions = await listSessions();
        if (sessions && sessions.length > 0) {
          const apiItems: HistoryItem[] = sessions.map((s) => {
            const formattedDate = s.created_at
              ? new Date(s.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Recent';

            return {
              id: s.id,
              name: s.target_name ? `Call to ${s.target_name}` : `Session #${s.id.slice(-6)}`,
              number: s.target_number || 'Telephony Line',
              date: formattedDate,
              duration: '1m 15s',
              language: s.language === 'kannada' ? 'ಕನ್ನಡ' : s.language || 'ಕನ್ನಡ',
              status: s.status === 'completed' ? 'completed' : s.status === 'failed' ? 'missed' : s.status === 'in_progress' ? 'attention' : 'pending',
              summary: s.summary || 'Call session completed.',
            };
          });
          setItems(apiItems);
        } else {
          setItems([]);
        }
      } catch (e) {
        console.warn('Backend call history fetch fallback:', e);
        setItems([]);
      } finally {
        setLoading(false);
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
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#131b2e] tracking-tight">Call History</h1>
          <p className="text-sm text-[#464555] mt-1">Review past conversations, summaries, and recordings</p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-container hover:bg-primary text-white text-xs sm:text-sm font-semibold transition shadow-xs self-start sm:self-center cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">add_call</span>
          <span>New Call</span>
        </Link>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#e2e7ff] shadow-xl shadow-slate-900/5 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#777587] text-[20px]">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search calls, contacts, or summary keywords..."
            className="w-full pl-11 pr-4 py-2.5 bg-[#f2f3ff] rounded-xl text-sm text-[#131b2e] placeholder:text-[#777587] border border-transparent focus:border-primary-container focus:bg-white focus:outline-none transition-all"
          />
        </div>

        {/* Human Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#eaedff]">
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
              className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                filter === tab.id
                  ? 'bg-primary-container text-white shadow-xs'
                  : 'bg-[#f2f3ff] hover:bg-[#eaedff] text-[#464555] hover:text-[#131b2e]'
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
          <div className="bg-white rounded-2xl border border-[#e2e7ff] p-12 text-center text-[#777587]">
            <span className="material-symbols-outlined text-4xl text-[#777587]/60 mb-2">inbox</span>
            <p className="text-sm">No calls found matching your filter criteria.</p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => router.push(`/call/details?id=${item.id}`)}
              className="bg-white rounded-2xl p-5 border border-[#e2e7ff] hover:border-primary-container shadow-xl shadow-slate-900/5 hover:shadow-2xl transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group"
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-[#e2dfff] text-primary flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-primary-container group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-xl">phone_in_talk</span>
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-base text-[#131b2e] group-hover:text-primary transition-colors truncate">
                      {item.name}
                    </h3>
                    <span className="text-xs font-mono text-[#777587]">{item.number}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-[#464555] line-clamp-1">{item.summary}</p>
                  <div className="flex items-center gap-3 text-xs text-[#777587] pt-0.5">
                    <span>{item.date}</span>
                    <span>•</span>
                    <span>{item.duration}</span>
                    <span>•</span>
                    <span className="font-semibold text-primary">{item.language}</span>
                  </div>
                </div>
              </div>

              {/* Status and Action button */}
              <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                    item.status === 'completed'
                      ? 'bg-[#e2dfff] text-primary border border-[#c3c0ff]'
                      : item.status === 'missed'
                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                      : 'bg-blue-50 text-blue-800 border border-blue-200'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      item.status === 'completed'
                        ? 'bg-primary-container'
                        : item.status === 'missed'
                        ? 'bg-amber-600'
                        : 'bg-blue-600'
                    }`}
                  />
                  {item.status === 'completed' ? 'Completed' : item.status === 'missed' ? 'Missed' : 'Pending'}
                </span>

                <button
                  type="button"
                  className="px-3.5 py-1.5 rounded-xl border border-[#e2e7ff] text-xs font-semibold text-[#464555] hover:bg-[#f2f3ff] hover:text-[#131b2e] transition flex items-center gap-1"
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
