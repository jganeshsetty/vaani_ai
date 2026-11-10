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
      // Proxied through Next.js rewrites to backend
      return `${window.location.origin}/api`;
    }
  }

  const rawBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').trim().replace(/\/+$/, '');
  return rawBase.endsWith('/api') ? rawBase : `${rawBase}/api`;
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
  exotel_call_sid: string | null;
  exotel_media_sid: string | null;
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
