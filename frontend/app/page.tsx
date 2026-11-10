'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createTask, startCall } from '@/app/api/client';

export default function NewCallDashboard() {
  const router = useRouter();

  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('98450 82194');
  const [instructions, setInstructions] = useState(
    'Call Sri Manjunatha Electronics in Malleshwaram. Ask if order #4892 with dry fruits and Mysore Pak is dispatched today.'
  );
  const [languageMode, setLanguageMode] = useState<'auto' | 'kannada' | 'english' | 'kanglish'>('kannada');
  const [voiceProfile, setVoiceProfile] = useState('aarohi');
  const [consent, setConsent] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSuggestion = (promptText: string) => {
    setInstructions(promptText);
  };

  const handleInitiateCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) {
      setError('Please enter a valid phone number');
      return;
    }
    if (!instructions.trim()) {
      setError('Please specify what the assistant should ask');
      return;
    }

    setLoading(true);
    setError(null);

    const fullNumber = phoneNumber.startsWith('+') ? phoneNumber : `${countryCode}${phoneNumber.replace(/\s+/g, '')}`;

    try {
      // 1. Create the task in FastAPI backend
      const task = await createTask({
        user_id: 'sunil_kumar',
        description: instructions,
        language: languageMode === 'auto' ? 'kannada' : languageMode,
        target_number: fullNumber,
        constraints: ['be polite and clear in Kannada/English'],
        questions_to_ask: [instructions],
      });

      // 2. Start call
      const call = await startCall({
        task_id: task.id,
        target_number: fullNumber,
        language: task.language,
      });

      // 3. Navigate to live call screen
      router.push(`/call/live?call_id=${call.id}`);
    } catch (err: any) {
      console.warn('Backend call trigger failed or mock fallback:', err);
      // Even if mock Exotel keys are not configured, navigate to live screen for full demonstration
      router.push(`/call/live?mock=true&phone=${encodeURIComponent(fullNumber)}&desc=${encodeURIComponent(instructions)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 md:py-12 max-w-3xl mx-auto">
      {/* Friendly Hero */}
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1a1c1a] tracking-tight">
          What would you like me to take care of?
        </h1>
        <p className="text-[15px] text-[#58605c] mt-2 max-w-lg mx-auto leading-relaxed">
          Type your instructions and recipient number. I&apos;ll make the call, speak naturally in Kannada or English, and share a summary.
        </p>
      </div>

      {/* Humanly Crafted Main Card */}
      <div className="bg-white rounded-2xl border border-[#eeece8] shadow-[0_4px_24px_rgba(40,84,62,0.04)] p-6 sm:p-8">
        <form className="space-y-6" onSubmit={handleInitiateCall}>
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
              <span className="material-symbols-outlined text-red-600 text-base">error</span>
              <span>{error}</span>
            </div>
          )}

          {/* Phone Number Input */}
          <div>
            <label className="block text-[14px] font-semibold text-[#1a1c1a] mb-2" htmlFor="phone-input">
              Phone Number
            </label>
            <div className="flex gap-2.5">
              <div className="relative w-36 flex-shrink-0">
                <select
                  id="country-code"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="w-full h-11 pl-3.5 pr-8 bg-[#f6f5f2] border-0 rounded-xl text-[14px] font-medium text-[#1a1c1a] focus:bg-white focus:ring-2 focus:ring-[#28543e]/20 outline-none transition cursor-pointer appearance-none"
                >
                  <option value="+91">🇮🇳 +91 (IN)</option>
                  <option value="+1">🇺🇸 +1 (US)</option>
                  <option value="+44">🇬🇧 +44 (UK)</option>
                  <option value="+971">🇦🇪 +971 (UAE)</option>
                </select>
                <span className="material-symbols-outlined absolute right-2.5 top-3 text-[#717973] pointer-events-none text-[18px]">
                  expand_more
                </span>
              </div>
              <div className="relative flex-1">
                <input
                  id="phone-input"
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="98450 12345"
                  className="w-full h-11 px-3.5 bg-[#f6f5f2] border-0 rounded-xl text-[14px] font-medium text-[#1a1c1a] placeholder-[#717973] focus:bg-white focus:ring-2 focus:ring-[#28543e]/20 outline-none transition tracking-wide"
                />
              </div>
            </div>
          </div>

          {/* Task Instructions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[14px] font-semibold text-[#1a1c1a]" htmlFor="task-instructions">
                What should I ask or say?
              </label>
            </div>
            <textarea
              id="task-instructions"
              required
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Describe what you want me to ask or confirm..."
              className="w-full p-3.5 bg-[#f6f5f2] border-0 rounded-xl text-[14px] leading-relaxed text-[#1a1c1a] placeholder-[#717973] focus:bg-white focus:ring-2 focus:ring-[#28543e]/20 outline-none transition resize-none"
            />

            {/* Gentle Prompt Suggestions */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-[12px] text-[#717973]">Suggestions:</span>
              <button
                type="button"
                onClick={() =>
                  handleSuggestion('Call Sri Manjunatha Electronics and check if order #4892 has been dispatched.')
                }
                className="px-3 py-1 rounded-full bg-[#f6f5f2] hover:bg-[#eaf2ec] text-[#4d5550] hover:text-[#28543e] text-[12px] font-medium transition-colors"
              >
                Check delivery status
              </button>
              <button
                type="button"
                onClick={() =>
                  handleSuggestion('Call the clinic and confirm my 5:30 PM appointment slot with the doctor.')
                }
                className="px-3 py-1 rounded-full bg-[#f6f5f2] hover:bg-[#eaf2ec] text-[#4d5550] hover:text-[#28543e] text-[12px] font-medium transition-colors"
              >
                Confirm appointment
              </button>
              <button
                type="button"
                onClick={() =>
                  handleSuggestion('Call the store and ask what time they close this evening.')
                }
                className="px-3 py-1 rounded-full bg-[#f6f5f2] hover:bg-[#eaf2ec] text-[#4d5550] hover:text-[#28543e] text-[12px] font-medium transition-colors"
              >
                Store opening hours
              </button>
            </div>
          </div>

          {/* Language Selector (Clean segmented pills) */}
          <div>
            <label className="block text-[14px] font-semibold text-[#1a1c1a] mb-2">Language</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1 bg-[#f6f5f2] rounded-xl">
              {[
                { id: 'auto', label: 'Auto' },
                { id: 'kannada', label: 'ಕನ್ನಡ' },
                { id: 'english', label: 'English' },
                { id: 'kanglish', label: 'Kanglish' },
              ].map((lang) => (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => setLanguageMode(lang.id as any)}
                  className={`w-full py-2 text-center rounded-lg text-[13px] transition-all ${
                    languageMode === lang.id
                      ? 'bg-white text-[#28543e] font-semibold shadow-xs'
                      : 'text-[#58605c] hover:text-[#1a1c1a] font-medium'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          {/* Voice Selection */}
          <div>
            <label className="block text-[14px] font-semibold text-[#1a1c1a] mb-2">Voice</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Voice 1 */}
              <div
                onClick={() => setVoiceProfile('aarohi')}
                className={`relative flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition ${
                  voiceProfile === 'aarohi'
                    ? 'border-[#28543e] bg-[#eaf2ec]/40'
                    : 'border-[#eeece8] bg-[#f6f5f2]/40 hover:bg-[#f6f5f2]'
                }`}
              >
                <div className="flex flex-col">
                  <span className="text-[13px] font-semibold text-[#1a1c1a]">Friendly Voice</span>
                  <span className="text-[12px] text-[#717973]">Aarohi (Warm)</span>
                </div>
                <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-[#28543e] shadow-xs">
                  <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                </div>
              </div>

              {/* Voice 2 */}
              <div
                onClick={() => setVoiceProfile('sunil')}
                className={`relative flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition ${
                  voiceProfile === 'sunil'
                    ? 'border-[#28543e] bg-[#eaf2ec]/40'
                    : 'border-[#eeece8] bg-[#f6f5f2]/40 hover:bg-[#f6f5f2]'
                }`}
              >
                <div className="flex flex-col">
                  <span className="text-[13px] font-semibold text-[#1a1c1a]">My Voice</span>
                  <span className="text-[12px] text-[#717973]">Personal Clone</span>
                </div>
                <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-[#58605c] shadow-xs">
                  <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                </div>
              </div>

              {/* Voice 3: Add Voice link */}
              <button
                type="button"
                onClick={() => router.push('/voice-studio/settings')}
                className="flex items-center justify-center gap-1.5 p-3.5 rounded-xl border border-dashed border-[#c1c9c1] hover:border-[#28543e] hover:bg-[#f6f5f2] text-[#28543e] text-[13px] font-medium transition text-center"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                <span>Add Voice</span>
              </button>
            </div>
          </div>

          {/* Reassuring Confirmation Checkbox */}
          <div className="pt-2">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                required
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-[#28543e] focus:ring-[#28543e] border-[#c1c9c1] accent-[#28543e] cursor-pointer"
              />
              <span className="text-[13px] text-[#58605c] leading-relaxed select-none group-hover:text-[#1a1c1a] transition-colors">
                Call on my behalf and provide a summary when done
              </span>
            </label>
          </div>

          {/* Main Call Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-xl bg-[#28543e] hover:bg-[#1d3f2f] text-white text-[15px] font-semibold shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Connecting AI Call...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">call</span>
                  <span>Make Call (ಕರೆ ಮಾಡಿ)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
