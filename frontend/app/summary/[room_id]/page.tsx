'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { fetchSessionByRoom, fetchSessionById } from '@/app/api/client';

interface CallSummary {
  summary: string | null;
  transcript: Array<{ role: 'agent' | 'callee'; text: string; language: string }>;
}

export default function RoomSummaryPage() {
  const routeParams = useParams<{ room_id: string }>();
  const searchParams = useSearchParams();
  const roomId = routeParams?.room_id ? decodeURIComponent(routeParams.room_id) : searchParams?.get('room_id');

  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(false);

  useEffect(() => {
    if (!roomId) {
      setError('Room ID not found');
      setLoading(false);
      return;
    }

    (async () => {
      try {
        let fetchedSession: any = null;
        try {
          fetchedSession = await fetchSessionByRoom(roomId);
        } catch {
          fetchedSession = await fetchSessionById(roomId);
        }
        setSession(fetchedSession);
      } catch (e: any) {
        setError(e?.message || 'Failed to fetch session data');
      } finally {
        setLoading(false);
      }
    })();
  }, [roomId]);

  if (loading) {
    return (
      <Suspense fallback={
        <div className="p-12 text-center text-[#777587]">
          <span className="material-symbols-outlined text-4xl animate-spin text-primary">refresh</span>
          <p className="mt-2 text-sm font-medium">Loading call summary…</p>
        </div>
      }>
        <div className="p-12 text-center text-[#777587]">
          <span className="material-symbols-outlined text-4xl animate-spin text-primary">refresh</span>
          <p className="mt-2 text-sm font-medium">Loading call summary…</p>
        </div>
      </Suspense>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-surface p-8 text-center">
        <div className="bg-white rounded-2xl border border-[#e2e7ff] p-8 shadow-xl shadow-slate-900/5">
          <span className="material-symbols-outlined text-3xl text-amber-600 mb-3">error</span>
          <h2 className="text-2xl font-bold text-[#131b2e] mb-3">Session Not Found</h2>
          <p className="text-[#464555] mb-4">{error}</p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-container hover:bg-primary text-white text-sm font-semibold transition cursor-pointer"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-surface p-8 text-center">
        <div className="bg-white rounded-2xl border border-[#e2e7ff] p-8 shadow-xl shadow-slate-900/5">
          <span className="material-symbols-outlined text-3xl text-amber-600 mb-3">error</span>
          <h2 className="text-2xl font-bold text-[#131b2e] mb-3">Session Not Found</h2>
          <p className="text-[#464555] mb-4">No session data available for this room.</p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-container hover:bg-primary text-white text-sm font-semibold transition cursor-pointer"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const callSummary = session.summary || '';
  const transcript = session.transcript || [];

  // Extract action items from summary text
  const actionItems: string[] = callSummary
    ?.split('. ')
    .filter((line: string) =>
      /(ask|confirm|verify|check|follow up|request|contact|reach out)/i.test(line)
    )
    .map((line: string) => line.trim())
    .filter((line: string) => line.length > 0) || [];

  return (
    <div className="min-h-screen bg-surface p-8">
      <div className="bg-white rounded-2xl border border-[#e2e7ff] shadow-xl shadow-slate-900/5 max-w-3xl mx-auto p-6 sm:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-container hover:bg-primary text-white text-sm font-semibold transition cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span>Back to Dashboard</span>
            </Link>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-container hover:bg-primary text-white text-sm font-semibold transition cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add_call</span>
            <span>Make Another Call</span>
          </Link>
        </div>

        {/* Call Summary */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-[#131b2e] mb-3">Call Summary</h2>
          <p className="text-[#131b2e] leading-relaxed">
            {callSummary || 'No summary available.'}
          </p>
        </div>

        {/* Full Text Transcript */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-[#131b2e] mb-3">
            Full Text Transcript
            {transcript.length > 0 && (
              <button
                type="button"
                onClick={() => setIsTranscriptExpanded((prev) => !prev)}
                className="min-h-[38px] inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#f2f3ff] hover:bg-[#eaedff] border border-[#dae2fd] text-xs font-semibold text-primary shadow-xs transition active:scale-95 cursor-pointer self-start sm:self-auto"
                title="Toggle transcript collapse/expand"
              >
                <span className="material-symbols-outlined text-[15px]">visibility</span>
                <span>{isTranscriptExpanded ? 'Less' : 'More'}</span>
              </button>
            )}
          </h2>

          <div className={isTranscriptExpanded ? 'max-h-[400px] overflow-y-auto' : ''}>
            {transcript.map((entry: any, idx: number) => (
              <div
                key={idx}
                className={`flex gap-3.5 rounded-2xl p-3.5 mb-3 ${
                  entry.role === 'agent'
                    ? 'bg-primary-container text-white'
                    : 'bg-[#f2f3ff] text-[#131b2e] border border-[#eaedff]'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${entry.role === 'agent' ? 'text-white' : 'text-[#464555]'}`}
                >
                  {entry.role === 'agent' ? 'AI' : 'You'}
                </div>

                <div className={`p-3 rounded-xl text-sm leading-relaxed ${
                  entry.role === 'agent'
                    ? 'text-white'
                    : 'text-[#131b2e]'
                }`}
                >
                  {entry.text}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Items */}
        {actionItems.length > 0 && (
          <div className="mt-6 p-4 rounded-2xl bg-primary-container/10 border border-primary-container/30 space-y-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg">star</span>
              <span className="text-sm font-semibold text-primary">Action Items</span>
            </div>
            <ul className="space-y-1 text-sm text-[#131b2e]">
              {actionItems.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-primary text-[12px] mt-0.5">task</span>
                  <span className="flex-1">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Status info */}
        <div className="mt-6 pt-4 border-t border-[#e2e7ff]">
          <div className="flex items-center gap-2 text-xs text-[#464555]">
            <span className="material-symbols-outlined text-[12px]">access_time</span>
            <span>
              {session.created_at
                ? new Date(session.created_at).toLocaleString()
                : 'Unknown date'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}