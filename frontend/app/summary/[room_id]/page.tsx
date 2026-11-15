'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchSummary, SummaryData } from '../../api/client';

export default function CallSummaryPage() {
  const router = useRouter();
  const params = useParams<{ room_id: string }>();
  const roomId = params?.room_id ? decodeURIComponent(params.room_id) : '';

  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [completedItems, setCompletedItems] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;

    async function loadSummary() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchSummary(roomId);
        if (!cancelled && data) {
          setSummaryData(data);
        }
      } catch (err: any) {
        console.error('Error fetching summary:', err);
        if (!cancelled) {
          setError(err.message || 'Failed to load call summary.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSummary();
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  const toggleActionItem = (index: number) => {
    setCompletedItems((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const handleCopySummary = () => {
    if (!summaryData) return;
    const textToCopy = `=== VAANICALL AI CALL SUMMARY ===\nParticipants: ${summaryData.caller_name} & ${summaryData.recipient_name}\nRoom ID: ${summaryData.room_id}\nDuration: ${summaryData.duration_seconds}s\n\nEXECUTIVE SUMMARY:\n${summaryData.summary}\n\nACTION ITEMS:\n${summaryData.action_items.map((it, i) => `${i + 1}. ${it}`).join('\n')}\n`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainingSecs = sec % 60;
    if (mins === 0) return `${remainingSecs} sec`;
    return `${mins}m ${remainingSecs}s`;
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
          Extracting AI summary & action items from MongoDB...
        </p>
      </div>
    );
  }

  if (error || !summaryData) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Summary Unavailable</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">{error || 'Session document could not be located.'}</p>
        <div className="pt-2">
          <Link
            href="/initiate"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-sm"
          >
            Initiate a New Call
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
      {/* Page Title & Status Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Page 4 • Post-Call Intelligence
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Call Summary & Insights
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Auto-synthesized by Evon v3.3 from conversation transcript
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleCopySummary}
            className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-2 min-h-[44px]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
          </button>

          <Link
            href="/initiate"
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-2 min-h-[44px]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>New Call</span>
          </Link>
        </div>
      </div>

      {/* Metadata KPI Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Caller</span>
          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{summaryData.caller_name}</p>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Recipient</span>
          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{summaryData.recipient_name}</p>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Duration</span>
          <p className="text-sm font-bold text-slate-900 dark:text-white">{formatDuration(summaryData.duration_seconds)}</p>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</span>
          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
            {summaryData.status}
          </p>
        </div>
      </div>

      {/* Executive Summary Card */}
      <div className="p-6 sm:p-7 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Executive Call Summary</h2>
        </div>
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal bg-slate-50/70 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800">
          {summaryData.summary}
        </p>
      </div>

      {/* Extracted Action Items Checklist */}
      <div className="p-6 sm:p-7 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Extracted Action Items</h2>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {summaryData.action_items.length} items detected
          </span>
        </div>

        <div className="space-y-2.5">
          {summaryData.action_items.map((item, idx) => {
            const isDone = completedItems[idx];
            return (
              <div
                key={idx}
                onClick={() => toggleActionItem(idx)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 select-none ${
                  isDone
                    ? 'bg-slate-50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800/80 opacity-60'
                    : 'bg-white dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-600'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-md mt-0.5 flex items-center justify-center text-xs transition-colors ${
                    isDone
                      ? 'bg-emerald-600 text-white'
                      : 'border-2 border-slate-400 dark:border-slate-600 hover:border-emerald-500'
                  }`}
                >
                  {isDone && (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className={`text-xs sm:text-sm ${isDone ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
                  {item}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Full Conversation Transcript */}
      <div className="p-6 sm:p-7 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Full Conversation Transcript</h2>
        </div>

        <div className="space-y-3 pt-2">
          {summaryData.transcript.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">No transcript turns recorded for this call.</p>
          ) : (
            summaryData.transcript.map((t, idx) => {
              const isAgent = t.role === 'agent' || t.role === 'assistant';
              return (
                <div
                  key={idx}
                  className={`flex flex-col ${isAgent ? 'items-start' : 'items-end'}`}
                >
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                      {t.speaker || (isAgent ? summaryData.caller_name : summaryData.recipient_name)}
                    </span>
                    {t.timestamp && (
                      <span className="text-[9px] text-slate-400 font-mono">
                        {t.timestamp.includes('T') ? t.timestamp.split('T')[1].slice(0, 8) : t.timestamp}
                      </span>
                    )}
                  </div>
                  <div
                    className={`p-3.5 rounded-2xl max-w-[85%] text-xs sm:text-sm leading-relaxed ${
                      isAgent
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-200 border border-emerald-200/80 dark:border-emerald-900'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200/60 dark:border-slate-700'
                    }`}
                  >
                    {t.text}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
