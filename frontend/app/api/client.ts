/**
 * VaaniCall AI Streamlined API Client
 * Manages communication between Next.js frontend and FastAPI backend.
 */

export function getApiBase(): string {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('vaani_backend_url')?.trim();
    if (custom) {
      const clean = custom.replace(/\/+$/, '');
      return clean.endsWith('/api') ? clean : `${clean}/api`;
    }

    const host = window.location.hostname;
    const isLocalOrLan =
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host.startsWith('192.168.') ||
      host.startsWith('10.') ||
      host.startsWith('172.');

    // If running on local machine or local Wi-Fi network, backend is on port 8000
    if (isLocalOrLan) {
      return `http://${host}:8000/api`;
    }

    const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
    if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
      const clean = envUrl.replace(/\/+$/, '');
      return clean.endsWith('/api') ? clean : `${clean}/api`;
    }

    if (host.includes('.onrender.com')) {
      const backendHost = host.replace('frontend', 'backend');
      return `https://${backendHost}/api`;
    }

    return `${window.location.origin}/api`;
  }

  const rawBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').trim().replace(/\/+$/, '');
  return rawBase.endsWith('/api') ? rawBase : `${rawBase}/api`;
}

export function getWsUrl(roomId: string): string {
  const base = getApiBase();
  const wsBase = base.replace(/^http/, 'ws').replace(/\/api$/, '');
  return `${wsBase}/ws/call/${encodeURIComponent(roomId)}`;
}

// --- Data Types ---

export interface InitiateCallRequest {
  target_number: string;
  recipient_name?: string;
  caller_name?: string;
  context_prompt: string;
  voice_tone?: 'natural' | 'professional' | 'urgent' | 'friendly';
  speaker_id?: string | null;
  language?: 'english';
}

export interface InitiateCallResponse {
  status: string;
  session_uuid: string;
  room_id: string;
  link: string;
  full_url: string;
  target_number: string;
  recipient_name: string;
  caller_name: string;
  context_prompt: string;
  voice_tone: string;
  formatted_sms: string;
}

export interface SetupProfile {
  user_name: string;
  persona: string;
  base_instructions: string;
  voice_id: string;
  speaker_id?: string | null;
  phone?: string;
  permanent_room_id?: string;
}

export interface SetupResponse {
  status: string;
  profile: SetupProfile;
  permanent_room_id: string;
  permanent_link: string;
  auto_responder_template: string;
}

export interface TranscriptEntry {
  role: 'agent' | 'callee' | 'user' | 'assistant';
  speaker?: string;
  text: string;
  language?: string;
  timestamp?: string;
}

export interface SessionData {
  id: string;
  room_id: string;
  mode: string;
  target_number?: string | null;
  target_name?: string | null;
  caller_name?: string;
  context_prompt: string;
  voice_tone?: string;
  status: string;
  transcript: TranscriptEntry[];
  summary?: string | null;
  action_items?: string[];
  language: string;
  created_at: string;
  updated_at: string;
}

export interface SummaryData {
  room_id: string;
  status: string;
  caller_name: string;
  recipient_name: string;
  summary: string;
  action_items: string[];
  transcript: TranscriptEntry[];
  duration_seconds: number;
  created_at: string;
  updated_at: string;
}

/** Voice cloning API methods */
export async function cloneVoice(audioFile: File): Promise<{ speaker_id: string; message: string }> {
  const base = getApiBase();
  const formData = new FormData();
  formData.append('file', audioFile);
  const res = await fetch(`${base}/voice/clone`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Voice cloning failed: ${errorText}`);
  }
  return res.json();
}

export async function saveVoiceClone(speakerId: string, voiceId?: string): Promise<any> {
  const base = getApiBase();
  const savedName = typeof window !== 'undefined' ? localStorage.getItem('vaani_user_name') || 'User' : 'User';
  const res = await fetch(`${base}/setup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_name: savedName,
      persona: `Personal autonomous voice assistant representing ${savedName}`,
      base_instructions: 'Speak politely and warmly on behalf of the user.',
      voice_id: voiceId || 'Aarohi',
      speaker_id: speakerId,
      phone: '',
    }),
  });
  if (!res.ok) throw new Error('Failed to save voice clone');
  return res.json();
}

// --- API Methods ---

/** Page 1: Initiate dynamic outbound call session */
export async function initiateCall(data: InitiateCallRequest): Promise<InitiateCallResponse> {
  const base = getApiBase();
  const res = await fetch(`${base}/initiate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to initiate call session: ${errorText}`);
  }
  return res.json();
}

/** Page 2: Fetch current setup profile */
export async function fetchSetupProfile(): Promise<SetupResponse> {
  const base = getApiBase();
  const res = await fetch(`${base}/setup`);
  if (!res.ok) throw new Error('Failed to fetch setup profile');
  return res.json();
}

/** Page 2: Save one-time profile & generate permanent auto-responder link */
export async function saveSetupProfile(profile: Partial<SetupProfile>): Promise<SetupResponse> {
  const base = getApiBase();
  const res = await fetch(`${base}/setup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  });
  if (!res.ok) throw new Error('Failed to save setup profile');
  return res.json();
}

/** Page 3: Fetch active session metadata */
export async function fetchSession(roomId: string): Promise<SessionData> {
  const base = getApiBase();
  const res = await fetch(`${base}/sessions/room/${encodeURIComponent(roomId)}`);
  if (!res.ok) throw new Error(`Failed to load call session: ${roomId}`);
  return res.json();
}

/** Page 3: End active call */
export async function endCall(roomId: string): Promise<any> {
  const base = getApiBase();
  const res = await fetch(`${base}/calls/${encodeURIComponent(roomId)}/end`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to end call session');
  return res.json();
}

/** Page 4: Fetch post-call summary, action items, and full transcript */
export async function fetchSummary(roomId: string): Promise<SummaryData> {
  const base = getApiBase();
  const res = await fetch(`${base}/summary/${encodeURIComponent(roomId)}`);
  if (!res.ok) throw new Error(`Failed to fetch summary for session: ${roomId}`);
  return res.json();
}

/** Spawn fresh temporary session when caller opens permanent screening link */
export async function spawnSessionFromPermanent(permanentRoomId: string): Promise<{ room_id: string; permanent_id: string; caller_name: string }> {
  const base = getApiBase();
  const res = await fetch(`${base}/sessions/spawn-permanent/${encodeURIComponent(permanentRoomId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`Failed to spawn session for ${permanentRoomId}`);
  return res.json();
}

/** Fetch recent call summaries to display in dashboard/setup */
export async function fetchRecentSessions(limit: number = 20): Promise<any[]> {
  const base = getApiBase();
  const res = await fetch(`${base}/sessions/recent?limit=${limit}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.sessions || [];
}
