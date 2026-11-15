'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchSetupProfile, saveSetupProfile, fetchRecentSessions, SetupResponse } from '../api/client';

export default function SetupPage() {
  const [userName, setUserName] = useState('Ganesh');
  const [persona, setPersona] = useState('Personal autonomous voice assistant representing Ganesh');
  const [baseInstructions, setBaseInstructions] = useState(
    'Speak politely and warmly on behalf of Ganesh. Greet the caller, identify why they called, answer common questions, take a detailed message, and let them know Ganesh will get back to them if urgent.'
  );
  const [voiceId, setVoiceId] = useState('Aarohi');
  const [speakerId, setSpeakerId] = useState('');
  const [phone, setPhone] = useState('+91 8660039103');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedData, setSavedData] = useState<SetupResponse | null>(null);
  const [recentCalls, setRecentCalls] = useState<any[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedTemplate, setCopiedTemplate] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      try {
        const [data, calls] = await Promise.all([
          fetchSetupProfile(),
          fetchRecentSessions(10),
        ]);
        if (data && data.profile) {
          setUserName(data.profile.user_name || 'Ganesh');
          setPersona(data.profile.persona || '');
          setBaseInstructions(data.profile.base_instructions || '');
          setVoiceId(data.profile.voice_id || 'Aarohi');
          setSpeakerId(data.profile.speaker_id || '');
          setPhone(data.profile.phone || '');
          setSavedData(data);
        }
        if (calls) {
          setRecentCalls(calls);
        }
      } catch (err) {
        console.warn('Using default setup state:', err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setNotification(null);
    try {
      const res = await saveSetupProfile({
        user_name: userName.trim(),
        persona: persona.trim(),
        base_instructions: baseInstructions.trim(),
        voice_id: voiceId,
        speaker_id: speakerId.trim() || null,
        phone: phone.trim(),
      });

      // Cache user name locally for persistent app shell
      try {
        localStorage.setItem('vaani_user_name', userName.trim());
      } catch (e) {}

      // Update full domain URLs on client
      const fullPermanentUrl = `${window.location.origin}${res.permanent_link}`;
      res.auto_responder_template = `Hi! I'm unavailable to take calls right now. Please join a quick voice call with my AI assistant here:\n\n👉 ${fullPermanentUrl}\n\n(It will speak directly with you and record your message for me.)`;

      setSavedData(res);
      setNotification('Profile & Permanent Link saved successfully!');
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      console.error('Error saving profile:', err);
      setNotification('Failed to save profile. Please verify your connection.');
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string, isTemplate = false) => {
    navigator.clipboard.writeText(text);
    if (isTemplate) {
      setCopiedTemplate(true);
      setTimeout(() => setCopiedTemplate(false), 2000);
    } else {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const permanentUrl = savedData
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}${savedData.permanent_link}`
    : `${typeof window !== 'undefined' ? window.location.origin : ''}/call/p-${userName.toLowerCase()}`;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 mb-3">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          Step 2 • One-Time Profile Setup
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Agent Profile & Permanent Link
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-1">
          Configure your permanent AI persona once. Generate a persistent link you can place in your phone&apos;s auto-responder to screen incoming calls when you&apos;re busy.
        </p>
      </div>

      {/* 4-Step Instructions Guide */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          {
            step: '1',
            title: 'Set Identity',
            desc: 'Provide your name and phone number so the agent introduces itself accurately.',
          },
          {
            step: '2',
            title: 'Define Behavior',
            desc: 'Give base instructions for how the AI answers when callers reach out to you.',
          },
          {
            step: '3',
            title: 'Pick Voice',
            desc: 'Select a default voice or enter a cloned Speaker ID from Gnani Speech.',
          },
          {
            step: '4',
            title: 'Set Auto-Reply',
            desc: 'Copy your permanent link into your phone’s default auto-responder message.',
          },
        ].map((item) => (
          <div
            key={item.step}
            className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1.5"
          >
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-xs flex items-center justify-center">
              {item.step}
            </div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">{item.title}</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>

      {notification && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
          <span>{notification}</span>
        </div>
      )}

      {/* Setup Form */}
      <div className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
        <form onSubmit={handleSave} className="space-y-6">
          {/* User Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Your Full Name *
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                required
                placeholder="e.g. Ganesh"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Used to personalize agent greetings</p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Your Mobile Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 8660039103"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Where callers normally reach you</p>
            </div>
          </div>

          {/* Persona Role */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Agent Persona Definition
            </label>
            <input
              type="text"
              value={persona}
              onChange={(e) => setPersona(e.target.value)}
              placeholder="e.g. Personal autonomous voice assistant representing Ganesh"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">How the AI describes its relationship to you</p>
          </div>

          {/* Base System Instructions */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Base System Instructions (AI Behavior) *
              </label>
              <span className="text-[11px] text-slate-400">Fed to Evon v3.3</span>
            </div>
            <textarea
              value={baseInstructions}
              onChange={(e) => setBaseInstructions(e.target.value)}
              rows={4}
              required
              placeholder="Detail how you want the agent to converse with callers when you are busy..."
              className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all resize-y"
            ></textarea>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Example: &quot;Always greet callers warmly. If they ask about project status, assure them we are on track. Take note of any urgent messages.&quot;
            </p>
          </div>

          {/* Voice & Speaker ID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Default Voice (Gnani Timbre)
              </label>
              <select
                value={voiceId}
                onChange={(e) => setVoiceId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
              >
                <option value="Aarohi">Aarohi (Natural Female Voice)</option>
                <option value="Kabir">Kabir (Warm Male Voice)</option>
                <option value="Tarun">Tarun (Professional Male Voice)</option>
                <option value="Meera">Meera (Clear Female Voice)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Voice Cloning Speaker ID (Optional)
              </label>
              <input
                type="text"
                value={speakerId}
                onChange={(e) => setSpeakerId(e.target.value)}
                placeholder="e.g. spk_gnani_custom_9812"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Used if you have a cloned voice profile</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3">Want a voice that sounds exactly like you? Create your custom voice clone.</p>
              <Link
                href="/voice-cloning"
                className="mt-3 inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-all shadow-md shadow-blue-600/20 min-h-[44px]"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Create Voice Clone
              </Link>
            </div>
          </div>

          {/* Save Button */}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3.5 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-semibold text-sm shadow-md transition-all disabled:opacity-60 flex items-center justify-center gap-2 min-h-[48px]"
          >
            {saving ? (
              <span>Saving Profile...</span>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Save Profile & Update Permanent Link</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Permanent Link & Auto-Responder Box */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 sm:p-8 space-y-6 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-2">
              Persistent Auto-Responder Link
            </div>
            <h3 className="text-xl font-bold">Your Permanent Screening Call Link</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              This link never expires. When anyone opens it, your configured AI assistant answers automatically.
            </p>
          </div>

          <Link
            href={savedData ? savedData.permanent_link : `/call/p-${userName.toLowerCase()}`}
            target="_blank"
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-all flex items-center gap-2 self-start sm:self-center shadow-sm min-h-[44px]"
          >
            <span>Test Permanent Call</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </Link>
        </div>

        {/* Permanent URL input */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={permanentUrl}
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-emerald-300 text-sm font-mono focus:outline-none"
          />
          <button
            onClick={() => copyToClipboard(permanentUrl, false)}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all min-h-[44px] flex items-center gap-1.5"
          >
            {copiedLink ? 'Copied!' : 'Copy Link'}
          </button>
        </div>

        {/* Auto-Responder Copy Box */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Default Auto-Responder SMS Message Template
            </span>
            <button
              onClick={() =>
                copyToClipboard(
                  savedData?.auto_responder_template ||
                    `Hi! I'm unavailable to take calls right now. Please join a quick voice call with my AI assistant here:\n\n👉 ${permanentUrl}\n\n(It will speak directly with you and record your message for me.)`,
                  true
                )
              }
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium underline"
            >
              {copiedTemplate ? 'Copied to Clipboard!' : 'Copy Message'}
            </button>
          </div>
          <pre className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 text-xs text-slate-300 font-mono whitespace-pre-wrap">
            {savedData?.auto_responder_template ||
              `Hi! I'm unavailable to take calls right now. Please join a quick voice call with my AI assistant here:\n\n👉 ${permanentUrl}\n\n(It will speak directly with you and record your message for me.)`}
          </pre>
        </div>

        {/* Instructions for Phone Setup */}
        <div className="border-t border-slate-800 pt-4 space-y-2 text-xs text-slate-400">
          <p className="font-semibold text-slate-300">How to add this to your phone:</p>
          <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
            <li><strong className="text-slate-300">Android:</strong> Open Phone App &gt; Settings &gt; Quick Decline Messages &gt; Paste the copied template.</li>
            <li><strong className="text-slate-300">iOS (iPhone):</strong> Go to Settings &gt; Phone &gt; Respond with Text &gt; Paste into one of the default auto-replies.</li>
          </ul>
        </div>
      </div>

      {/* Recent Call Summaries (Messages Left by Callers) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Recent Call Summaries</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Messages and calls captured by your AI agent</p>
            </div>
          </div>
          <button
            onClick={async () => {
              const calls = await fetchRecentSessions(10);
              setRecentCalls(calls);
            }}
            className="text-xs text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 font-semibold flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh</span>
          </button>
        </div>

        {recentCalls.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            No call sessions recorded yet. Test your link above to see summaries here!
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            {recentCalls.map((c) => (
              <div
                key={c.id || c.room_id}
                className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80 hover:border-emerald-500/40 dark:hover:border-emerald-500/40 bg-slate-50/50 dark:bg-slate-950/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {c.target_name || 'Participant'}
                    </span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      {c.status}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {c.created_at ? new Date(c.created_at).toLocaleDateString() : ''}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                    {c.summary || 'Call completed. Discussion saved in transcript.'}
                  </p>
                </div>

                <Link
                  href={`/summary/${encodeURIComponent(c.room_id)}`}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs whitespace-nowrap self-start sm:self-center transition-all shadow-xs"
                >
                  View Summary
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

