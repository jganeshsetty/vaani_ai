'use client';

import React, { useState, useEffect, useRef } from 'react';
import { cloneVoice, saveVoiceClone } from '../api/client';

type Tab = 'upload' | 'record';
type Step = 'idle' | 'uploading' | 'processing' | 'complete' | 'error';
const stepOrder = ['uploading', 'processing', 'complete'] as const;

const RECORDING_SCRIPT = `Hi, this is a sample recording for my voice clone. I'm reading this passage so the system can learn my natural speaking style, tone, and rhythm.

My typical day starts early, around 6 AM, with a quick walk and a cup of coffee. I usually check my emails and messages while having breakfast, then dive into my most important work by 8 AM.

Around noon, I take a proper lunch break away from screens — sometimes reading, sometimes just thinking. The afternoon is for meetings, collaboration, and creative work. I wrap up around 6 PM, then unwind with some exercise or time with family.

Weekends are for longer walks, reading, and catching up on personal projects. I speak naturally, with pauses and varying pace — this is how I sound in real conversations.`;

export default function VoiceCloningPage() {
  // Tab state
  const [activeTab, setActiveTab] = useState<Tab>('upload');

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedPreviewUrl, setRecordedPreviewUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // API state
  const [step, setStep] = useState<Step>('idle');
  const [speakerId, setSpeakerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
      if (recordedPreviewUrl) URL.revokeObjectURL(recordedPreviewUrl);
    };
  }, [filePreviewUrl, recordedPreviewUrl]);

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } else {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, [isRecording]);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Start recording
  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm;codecs=opus' });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setRecordedPreviewUrl(url);
        setAudioChunks(chunks);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setRecordingTime(0);
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Microphone permission denied. Please allow microphone access in your browser settings.');
      } else {
        setError(`Failed to start recording: ${err.message}`);
      }
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Handle file selection
  const handleFileSelect = (file: File) => {
    setError(null);
    // Validate file type
    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/webm', 'audio/mp3', 'audio/x-wav'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|webm)$/i)) {
      setError('Invalid file format. Please upload an MP3, WAV, or WebM audio file.');
      return;
    }
    // Validate file size (max 25MB)
    if (file.size > 25 * 1024 * 1024) {
      setError('File too large. Maximum size is 25MB.');
      return;
    }
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setFilePreviewUrl(url);
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  // Trigger file input
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  // Clear file selection
  const clearFile = () => {
    setSelectedFile(null);
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    setFilePreviewUrl(null);
  };

  // Clear recording
  const clearRecording = () => {
    setRecordedBlob(null);
    setRecordedPreviewUrl(null);
    setAudioChunks([]);
  };

  // Get the audio file to submit
  const getAudioFile = (): File | null => {
    if (activeTab === 'upload' && selectedFile) return selectedFile;
    if (activeTab === 'record' && recordedBlob) {
      // Convert blob to File
      return new File([recordedBlob], 'voice-clone.webm', { type: 'audio/webm' });
    }
    return null;
  };

  // Submit voice clone
  const handleSubmit = async () => {
    const audioFile = getAudioFile();
    if (!audioFile) {
      setError('Please select or record an audio file first.');
      return;
    }

    setError(null);
    setStep('uploading');

    try {
      const result = await cloneVoice(audioFile);
      setSpeakerId(result.speaker_id);
      setStep('processing');
      // Small delay to show processing state
      await new Promise((r) => setTimeout(r, 800));
      setStep('complete');
    } catch (err: any) {
      console.error('Voice cloning error:', err);
      setStep('error');
      setError(err.message || 'Voice cloning failed. Please try again.');
    }
  };

  // Save to profile
  const handleSaveToProfile = async () => {
    if (!speakerId) return;
    setSaving(true);
    try {
      await saveVoiceClone(speakerId);
      setError(null);
      // Could add a success toast here
    } catch (err: any) {
      setError('Failed to save voice clone to profile: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Reset to start over
  const handleReset = () => {
    setSpeakerId(null);
    setStep('idle');
    setError(null);
    clearFile();
    clearRecording();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-4 sm:py-8 animate-fadeIn">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center gap-2">
          <span className="glass-badge">Create Your Custom Voice</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Voice Cloning
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
          Create a personalized voice clone using a short audio sample. Your cloned voice will be available for use in
          autonomous calls and your permanent auto-responder link.
        </p>
      </div>

      {/* Description Card */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
            <p className="font-semibold text-slate-900 dark:text-white">What you&apos;ll need:</p>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li>A 30&ndash;60 second audio sample of your voice</li>
              <li>Clear speech with minimal background noise</li>
              <li>Natural speaking pace &mdash; read the provided script or use your own</li>
            </ul>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Supported formats: MP3, WAV, WebM (max 25MB). The sample is processed securely and used only to generate
              your Speaker ID.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="glass-card p-1 rounded-xl" role="tablist" aria-label="Voice cloning input method">
        <button
          role="tab"
          aria-selected={activeTab === 'upload'}
          aria-controls="upload-panel"
          id="upload-tab"
          onClick={() => setActiveTab('upload')}
          className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'upload'
              ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          Upload Audio File
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'record'}
          aria-controls="record-panel"
          id="record-tab"
          onClick={() => setActiveTab('record')}
          className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'record'
              ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          Record Live
        </button>
      </div>

      {/* Upload Tab Panel */}
      <div
        role="tabpanel"
        id="upload-panel"
        aria-labelledby="upload-tab"
        hidden={activeTab !== 'upload'}
        className="animate-fadeIn"
      >
        <div className="glass-card p-6 space-y-6">
          {/* Drag & Drop Zone */}
          <div
            className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
              selectedFile
                ? 'border-blue-400 bg-blue-50/50 dark:border-blue-600 dark:bg-blue-900/20'
                : 'border-slate-300 dark:border-slate-600 hover:border-blue-400 hover:bg-blue-50/30 dark:hover:bg-blue-900/10'
            }`}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={triggerFileInput}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,.mp3,.wav,.webm"
              onChange={handleFileInputChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              aria-label="Upload audio file"
            />
            <div className="relative z-10 space-y-3">
              {!selectedFile && (
                <>
                  <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center mx-auto">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <p className="text-base font-semibold text-slate-900 dark:text-white">Drag & drop audio file here</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">or click to browse</p>
                  </div>
                  <p className="text-xs text-slate-400 dark:text-slate-500">MP3, WAV, WebM &bull; Max 25MB</p>
                </>
              )}
              {selectedFile && (
                <div className="space-y-3 text-left max-w-md mx-auto">
                  <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{selectedFile.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB &bull; {selectedFile.type || 'audio'}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        clearFile();
                      }}
                      className="text-slate-400 hover:text-red-500 p-1"
                      aria-label="Remove file"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Audio Preview */}
                  {filePreviewUrl && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">Preview</p>
                      <audio controls src={filePreviewUrl} className="w-full" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={!selectedFile || step !== 'idle'}
            className="glass-button-primary w-full py-3.5 px-6 text-sm min-h-[48px] disabled:opacity-50"
          >
            {step === 'uploading' && (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Uploading...</span>
              </>
            )}
            {step === 'processing' && (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Processing voice sample...</span>
              </>
            )}
            {step === 'idle' && selectedFile && (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Create Voice Clone</span>
              </>
            )}
            {!selectedFile && step === 'idle' && <span>Select a file to begin</span>}
          </button>
        </div>
      </div>

      {/* Record Tab Panel */}
      <div
        role="tabpanel"
        id="record-panel"
        aria-labelledby="record-tab"
        hidden={activeTab !== 'record'}
        className="animate-fadeIn"
      >
        <div className="glass-card p-6 space-y-6">
          {/* Script to Read */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Read This Script
            </p>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 max-h-64 overflow-y-auto">
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed font-mono text-[12px]">
                {RECORDING_SCRIPT}
              </p>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              <strong>Tip:</strong> Speak naturally at a comfortable pace. The recording should be 30&ndash;60 seconds. You can
              re-record as many times as needed.
            </p>
          </div>

          {/* Recording Controls */}
          <div className="space-y-4">
            {/* Timer Display */}
            <div className="text-center">
              <div
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-lg font-semibold ${
                  isRecording
                    ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {isRecording && (
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" aria-hidden="true" />
                )}
                <span>{formatTime(recordingTime)}</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {isRecording ? 'Recording in progress...' : 'Ready to record'}
              </p>
            </div>

            {/* Record/Stop Button */}
            <div className="flex justify-center">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={step !== 'idle'}
                className={`inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-semibold text-base min-w-[200px] transition-all ${
                  isRecording
                    ? 'glass-button-danger hover:scale-105'
                    : 'glass-button-primary hover:scale-105'
                }`}
                aria-label={isRecording ? 'Stop recording' : 'Start recording'}
                aria-pressed={isRecording}
              >
                {isRecording ? (
                  <>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="6" y="6" width="12" height="12" rx="2" />
                    </svg>
                    <span>Stop Recording</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    <span>Start Recording</span>
                  </>
                )}
              </button>
            </div>

            {/* Audio Preview After Recording */}
            {recordedPreviewUrl && !isRecording && (
              <div className="space-y-3 p-4 rounded-xl bg-green-50 dark:bg-emerald-950/20 border border-green-200 dark:border-emerald-900">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Recording Complete</p>
                <audio controls src={recordedPreviewUrl} className="w-full" />
                <div className="flex gap-2">
                  <button
                    onClick={clearRecording}
                    className="glass-button-secondary text-xs px-3 py-1.5"
                  >
                    Re-record
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={!recordedBlob || step !== 'idle'}
            className="glass-button-primary w-full py-3.5 px-6 text-sm min-h-[48px] disabled:opacity-50"
          >
            {step === 'uploading' && (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Uploading...</span>
              </>
            )}
            {step === 'processing' && (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Processing voice sample...</span>
              </>
            )}
            {step === 'idle' && recordedBlob && (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Create Voice Clone</span>
              </>
            )}
            {!recordedBlob && step === 'idle' && <span>Record audio first</span>}
          </button>
        </div>
      </div>

      {/* Progress Steps Indicator */}
      {(step === 'uploading' || step === 'processing') && (
        <div className="glass-card p-6 space-y-4" role="status" aria-live="polite">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white text-center">Creating Your Voice Clone</h3>
          <div className="flex items-center justify-center gap-4">
            {stepOrder.map((s, i) => (
              <React.Fragment key={s}>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      step === s
                        ? 'bg-blue-600 text-white'
                        : step === 'processing' && i === 0
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                    }`}
                  >
                    {i + 1}
                  </div>
                  <span className="text-[10px] font-semibold mt-1.5 text-slate-600 dark:text-slate-400 text-center w-20">
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </span>
                </div>
                {i < 2 && (
                  <div
                    className={`w-16 h-1 mx-auto mt-5 transition-all ${
                      step === 'processing' ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
          <p className="text-center text-sm text-slate-600 dark:text-slate-400">
            {step === 'uploading' && 'Uploading your audio sample...'}
            {step === 'processing' && 'Processing voice characteristics with Gnani Speech...'}
          </p>
        </div>
      )}

      {/* Error State */}
      {error && step !== 'complete' && (
        <div
          className="glass-card border-red-200 dark:border-red-900/50 p-4"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-sm text-red-700 dark:text-red-400 flex-1">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-600 dark:text-red-400 hover:underline text-sm"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Success State */}
      {step === 'complete' && speakerId && (
        <div className="glass-card border-blue-200 dark:border-blue-800/50 p-6 space-y-6 animate-slideUp">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Voice Cloned Successfully!</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Your custom voice is ready to use</p>
              </div>
            </div>
            <span className="glass-badge">Complete</span>
          </div>

          {/* Speaker ID Display */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Speaker ID</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={speakerId}
                className="glass-input flex-1 font-mono text-sm"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(speakerId);
                }}
                className="glass-button-secondary px-4 py-2.5 text-xs min-h-[44px]"
                aria-label="Copy Speaker ID"
              >
                Copy
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Use this Speaker ID in your profile setup or outbound calls to use your cloned voice.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleSaveToProfile}
              disabled={saving}
              className="glass-button-primary flex-1 py-3 px-5 text-sm min-h-[48px]"
            >
              {saving ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Saving to Profile...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Save to Profile</span>
                </>
              )}
            </button>
            <a
              href="/setup"
              className="glass-button-secondary flex-1 py-3 px-5 text-sm min-h-[48px] text-center"
            >
              <span>Go to Setup</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>

          <button
            onClick={handleReset}
            className="glass-button-ghost w-full py-2.5 px-5 text-sm"
          >
            Create Another Voice Clone
          </button>
        </div>
      )}
    </div>
  );
}