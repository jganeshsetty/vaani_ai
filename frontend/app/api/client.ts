/** API client for communicating with the VaaniCall AI backend. */

export function getApiBase(): string {
  if (typeof window !== 'undefined') {
    // 1. LocalStorage manual override if configured
    const custom = localStorage.getItem('vaani_backend_url')?.trim();
    if (custom) {
      const clean = custom.replace(/\/+$/, '');
      return clean.endsWith('/api') ? clean : `${clean}/api`;
    }

    // 2. If running on deployed domain (not localhost)
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

    if (!isLocalhost) {
      if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
        const clean = envUrl.replace(/\/+$/, '');
        return clean.endsWith('/api') ? clean : `${clean}/api`;
      }

      // Auto-detect Render deployment pair (e.g. vaani-frontend.onrender.com -> vaani-backend.onrender.com)
      if (window.location.hostname.includes('.onrender.com')) {
        const backendHost = window.location.hostname.replace('frontend', 'backend');
        return `https://${backendHost}/api`;
      }

      // Proxied through Next.js rewrites to backend
      return `${window.location.origin}/api`;
    }
  }

  const rawBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').trim().replace(/\/+$/, '');
  return rawBase.endsWith('/api') ? rawBase : `${rawBase}/api`;
}

/** Get WebSocket URL for real-time voice session */
export function getWsUrl(): string {
  const base = getApiBase();
  // Convert HTTP to HTTPS/WSS
  let wsBase = base.replace(/^http/, 'ws');
  // Remove /api suffix for WebSocket path
  wsBase = wsBase.replace(/\/api$/, '');
  return `${wsBase}/ws`;
}

export interface Task {
  id: string;
  user_id: string;
  description: string;
  language: 'kannada' | 'english' | 'kanglish';
  target_number: string | null;
  constraints: string[];
  questions_to_ask: string[];
  status: 'pending' | 'calling' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface Call {
  id: string;
  task_id: string;
  status: 'initiated' | 'in_progress' | 'completed' | 'failed';
  target_number?: string | null;
  call_sid: string | null;
  media_sid: string | null;
  transcript: TranscriptEntry[];
  summary: string | null;
  created_at: string;
  updated_at: string;
  verification?: Record<string, 'confirmed' | 'unclear' | 'not_asked'>;
  language_detected: 'kannada' | 'english' | 'kanglish' | null;
}

export interface TranscriptEntry {
  role: 'agent' | 'callee';
  text: string;
  language: string;
}

// --- CallSession Types for Dual-Mode Voice AI ---

export type CallMode = 'outbound' | 'inbound';

export type CallSessionStatus = 'pending' | 'initiated' | 'in_progress' | 'completed' | 'failed' | 'ringing';

export interface CallSession {
  id: string;
  room_id: string;
  mode: CallMode;
  target_number?: string | null;
  target_name?: string | null;
  context_prompt: string;
  status: CallSessionStatus;
  transcript: TranscriptEntry[];
  summary?: string | null;
  recording_url?: string | null;
  language: 'kannada' | 'english' | 'kanglish';
  created_at: string;
  updated_at: string;
}

// Session WebSocket message types
export interface WsIncomingMessage {
  type: 'transcript' | 'audio' | 'status' | 'summary' | 'error' | 'connected' | 'ping';
  data?: TranscriptEntry | string | Uint8Array;
  room_id?: string;
  session_id?: string;
  done?: boolean;
  summary?: string;
  error?: string;
}

export interface WsOutgoingMessage {
  type: 'start' | 'audio_data' | 'ping' | 'stop';
  room_id?: string;
  session_id?: string;
  audio?: Uint8Array;
  data?: string;
}

export async function fetchTasks(userId?: string): Promise<Task[]> {
  const base = getApiBase();
  const url = userId ? `${base}/tasks?user_id=${userId}` : `${base}/tasks`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch tasks');
  return res.json();
}

export async function createTask(data: {
  user_id: string;
  description: string;
  language?: 'kannada' | 'english' | 'kanglish';
  target_number?: string;
  constraints?: string[];
  questions_to_ask?: string[];
}): Promise<Task> {
  const base = getApiBase();
  const res = await fetch(`${base}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create task');
  return res.json();
}

export async function startCall(data: {
  task_id: string;
  language?: 'kannada' | 'english' | 'kanglish';
  target_number?: string;
}): Promise<Call> {
  const base = getApiBase();
  const res = await fetch(`${base}/calls/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to start call');
  return res.json();
}

export async function fetchCalls(taskId?: string): Promise<Call[]> {
  const base = getApiBase();
  const url = taskId ? `${base}/calls?task_id=${taskId}` : `${base}/calls`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch calls');
  return res.json();
}

export async function fetchCall(callId: string): Promise<Call> {
  const base = getApiBase();
  const res = await fetch(`${base}/calls/${callId}`);
  if (!res.ok) throw new Error('Failed to fetch call');
  return res.json();
}

export async function fetchTask(taskId: string): Promise<Task> {
  const base = getApiBase();
  const res = await fetch(`${base}/tasks/${taskId}`);
  if (!res.ok) throw new Error('Failed to fetch task');
  return res.json();
}

export async function completeCall(callId: string, summary: string): Promise<any> {
  const base = getApiBase();
  const res = await fetch(`${base}/calls/${callId}/complete?summary=${encodeURIComponent(summary)}`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to complete call');
  return res.json();
}

export async function postTranscriptEntry(callId: string, entry: any): Promise<any> {
  const base = getApiBase();
  const res = await fetch(`${base}/calls/${callId}/transcript`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  });
  if (!res.ok) throw new Error('Failed to post transcript');
  return res.json();
}

// --- CallSession API Endpoints ---

export async function createSession(data: {
  mode?: 'outbound' | 'inbound';
  target_number?: string;
  target_name?: string;
  context_prompt: string;
  language?: 'kannada' | 'english' | 'kanglish';
}): Promise<CallSession> {
  const base = getApiBase();
  const res = await fetch(`${base}/call-sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create session: ${err}`);
  }
  return res.json();
}

export async function fetchSessionByRoom(roomId: string): Promise<CallSession> {
  const base = getApiBase();
  const res = await fetch(`${base}/call-sessions/room/${roomId}`);
  if (!res.ok) throw new Error('Failed to fetch session by room');
  return res.json();
}

export async function fetchSessionById(sessionId: string): Promise<CallSession> {
  const base = getApiBase();
  const res = await fetch(`${base}/call-sessions/${sessionId}`);
  if (!res.ok) throw new Error('Failed to fetch session');
  return res.json();
}

export async function listSessions(): Promise<CallSession[]> {
  const base = getApiBase();
  const res = await fetch(`${base}/call-sessions`);
  if (!res.ok) throw new Error('Failed to fetch sessions');
  return res.json();
}

export async function updateSessionStatus(sessionId: string, status: CallSessionStatus): Promise<CallSession> {
  const base = getApiBase();
  const res = await fetch(`${base}/call-sessions/${sessionId}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error('Failed to update session status');
  return res.json();
}

export async function appendSessionTranscript(sessionId: string, entry: TranscriptEntry): Promise<CallSession> {
  const base = getApiBase();
  const res = await fetch(`${base}/call-sessions/${sessionId}/transcript`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  });
  if (!res.ok) throw new Error('Failed to append transcript');
  return res.json();
}

export async function completeSession(sessionId: string, summary: string): Promise<CallSession> {
  const base = getApiBase();
  const res = await fetch(`${base}/call-sessions/${sessionId}/complete?summary=${encodeURIComponent(summary)}`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to complete session');
  return res.json();
}

/**
 * Create WebSocket connection for real-time voice session.
 * Returns the WebSocket instance for handling audio streaming.
 */
export function connectToCallSession(roomId: string, onMessage: (msg: WsIncomingMessage) => void): WebSocket {
  const wsUrl = getWsUrl().replace(/\/$/, '') + `/ws/${roomId}`;
  const ws = new WebSocket(wsUrl);

  ws.onmessage = (event) => {
    try {
      if (typeof event.data === 'string') {
        const msg: WsIncomingMessage = JSON.parse(event.data);
        onMessage(msg);
      } else if (event.data instanceof ArrayBuffer) {
        // Binary audio data
        onMessage({ type: 'audio', data: event.data as unknown as Uint8Array, room_id: roomId });
      }
    } catch (e) {
      console.warn('WebSocket message parse error:', e);
    }
  };

  return ws;
}
