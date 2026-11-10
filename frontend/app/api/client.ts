/** API client for communicating with the VaaniCall AI backend. */

const rawBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').trim().replace(/\/+$/, '');
const API_BASE = rawBase.endsWith('/api') ? rawBase : `${rawBase}/api`;

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
  const url = userId ? `${API_BASE}/tasks?user_id=${userId}` : `${API_BASE}/tasks`;
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
  const res = await fetch(`${API_BASE}/tasks`, {
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
  const res = await fetch(`${API_BASE}/calls/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to start call');
  return res.json();
}

export async function fetchCall(callId: string): Promise<Call> {
  const res = await fetch(`${API_BASE}/calls/${callId}`);
  if (!res.ok) throw new Error('Failed to fetch call');
  return res.json();
}

export async function fetchCalls(taskId?: string): Promise<Call[]> {
  const url = taskId ? `${API_BASE}/calls?task_id=${taskId}` : `${API_BASE}/calls`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch calls');
  return res.json();
}