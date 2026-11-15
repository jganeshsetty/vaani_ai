'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { initiateCall, InitiateCallResponse } from '../api/client';

export default function InitiatePage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [callerName, setCallerName] = useState('');
  const [contextPrompt, setContextPrompt] = useState('');
  const [voiceTone, setVoiceTone] = useState<'natural' | 'professional' | 'urgent' | 'friendly'>('natural');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InitiateCallResponse | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('vaani_user_name');
      if (savedUser) setCallerName(savedUser);
    } catch (e) {}
  }, []);

  const handleInitiate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) {
      setError('Please provide a valid recipient phone number.');
      return;
    }
    if (!contextPrompt.trim()) {
      setError('Please describe what message or context the AI should convey.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await initiateCall({
        target_number: phoneNumber.trim(),
        recipient_name: recipientName.trim() || 'Recipient',
        caller_name: callerName.trim() || 'User',
        context_prompt: contextPrompt.trim(),
        voice_tone: voiceTone,
      });

      // Compute full domain URL on client
      const fullUrl = `${window.location.origin}${res.link}`;
      res.full_url = fullUrl;
      const hostName = res.caller_name || 'My Voice Assistant';
      const targetName = res.recipient_name || 'there';
      res.formatted_sms = `Hello ${targetName}! This is ${hostName}. Please join our secure voice call here:\n\n👉 ${fullUrl}\n\n(No app required • Opens directly in mobile browser)`;

      setResult(res);
    } catch (err: any) {
      console.error('Initiation error:', err);
      setError(err.message || 'Failed to initiate call session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, isMsg = false) => {
    navigator.clipboard.writeText(text);
    if (isMsg) {
      setCopiedMsg(true);
      setTimeout(() => setCopiedMsg(false), 2000);
    } else {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fadeIn">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 mb-3">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Step 1 • Outbound Call Session
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Initiate a Voice Call
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-1">
          Specify target details and the message to convey. We generate a temporary, secure call link that connects the recipient directly to your conversational AI agent.
        </p>
      </div>

      {/* Main Initiation Form */}
      <div className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-sm backdrop-blur-sm space-y-6">
        <form onSubmit={handleInitiate} className="space-y-6">
          {/* Target Number & Recipient Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Target Phone Number *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all min-h-[44px]"
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Include country code (e.g. +91)</p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Recipient Name
              </label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="e.g. Alex Johnson"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all min-h-[44px]"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Person the AI will address on call</p>
            </div>
          </div>

          {/* Caller Identity & Tone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Your Identity (Caller)
              </label>
              <input
                type="text"
                value={callerName}
                onChange={(e) => setCallerName(e.target.value)}
                placeholder="e.g. Your Name"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all min-h-[44px]"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">The agent speaks on your behalf</p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Conversational Tone
              </label>
              <select
                value={voiceTone}
                onChange={(e: any) => setVoiceTone(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all min-h-[44px]"
              >
                <option value="natural">Natural & Conversational</option>
                <option value="professional">Professional & Direct</option>
                <option value="friendly">Warm & Friendly</option>
                <option value="urgent">Urgent & Action-Oriented</option>
              </select>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Guides pacing and persona style</p>
            </div>
          </div>

          {/* Exact Message / Context */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Exact Message & Context to Convey *
              </label>
              <span className="text-[11px] text-slate-400">
                Evon v3.3 system instructions
              </span>
            </div>
            <textarea
              value={contextPrompt}
              onChange={(e) => setContextPrompt(e.target.value)}
              rows={4}
              required
              placeholder="Explain the reason for calling, questions to ask, and key points the AI must confirm..."
              className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all resize-y"
            ></textarea>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Example: &quot;Notify recipient about rescheduled demo tomorrow at 4 PM, confirm attendance, and ask if anyone else is joining.&quot;
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Submit Action */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm shadow-md shadow-emerald-600/20 active:scale-[0.99] transition-all disabled:opacity-60 flex items-center justify-center gap-2 min-h-[48px]"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Generating Temporary Call Link...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <span>Generate Shareable Call Link</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Generated Call Link Result Card */}
      {result && (
        <div className="bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-slate-900/10 dark:from-emerald-950/40 dark:via-slate-900/40 dark:to-teal-950/30 rounded-2xl border-2 border-emerald-500/30 p-6 sm:p-8 space-y-6 animate-slideUp">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Call Session Ready!</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">UUID: {result.room_id}</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
              Active in DB
            </span>
          </div>

          {/* Shareable Link Display */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Shareable Call Link
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                readOnly
                value={result.full_url}
                className="flex-1 px-4 py-2.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs sm:text-sm font-mono focus:outline-none min-h-[44px]"
              />
              <button
                onClick={() => copyToClipboard(result.full_url, false)}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 shadow-sm min-h-[44px] flex-shrink-0"
              >
                {copiedLink ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          </div>

          {/* Formatted SMS Message Preview */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Pre-Formatted SMS / Messaging Template
            </label>
            <div className="relative">
              <pre className="p-4 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 font-mono whitespace-pre-wrap">
                {result.formatted_sms}
              </pre>
              <button
                onClick={() => copyToClipboard(result.formatted_sms, true)}
                className="absolute top-2 right-2 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition-all"
              >
                {copiedMsg ? 'Copied!' : 'Copy Text'}
              </button>
            </div>
          </div>

          {/* Direct Test Action */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <Link
              href={result.link}
              target="_blank"
              className="flex-1 py-3 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-semibold text-sm text-center shadow-sm transition-all flex items-center justify-center gap-2 min-h-[44px]"
            >
              <span>Test Call Directly in Browser</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

