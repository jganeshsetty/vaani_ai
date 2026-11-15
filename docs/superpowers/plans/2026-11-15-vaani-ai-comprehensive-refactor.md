# Vaani AI Comprehensive Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul the Vaani AI frontend design language (remove AI tropes, implement glassmorphic UI), add a Voice Cloning page, and integrate cloned voices into the active call pipeline.

**Architecture:** The refactor spans three areas: (1) Frontend theme system overhaul in Tailwind CSS + globals.css with new professional blue palette and glassmorphic utilities; (2) New `/voice-cloning` page with MediaRecorder API for browser recording and file upload, integrated with existing `/api/voice/clone` backend; (3) WebSocket call pipeline updated to pass user's `speaker_id` to Gnani TTS for voice-cloned synthesis, with fallback to default voice.

**Tech Stack:** Next.js 15 (React 19), Tailwind CSS 3.4, FastAPI (Python), MongoDB Atlas (Motor), Gnani AI Speech APIs (STT/TTS/Voice Cloning), Evon v3.3 LLM via Hugging Face.

**Spec:** User request in conversation context.

## Global Constraints

- Default theme: Light, professional blue accent (#2563EB / #1E40AF), not neon purple/cyan
- Dark mode: Clean, grounded (slate-900 base), not futuristic/glowing
- Typography: Editorial, highly readable — "Plus Jakarta Sans" for headings, "Inter" for body
- Glassmorphism: Subtle translucency (`backdrop-blur-xl`, `bg-white/80`, `border-slate-200/60`), delicate borders, no harsh glowing shadows
- No AI tropes: Remove emerald/teal gradients, pulsing rings, neon glows, dark-mode-default
- Voice cloning: Uses existing `/api/voice/clone` endpoint (Gnani Timbre v3.0), saves `speaker_id` to user profile
- Call pipeline: WebSocket `/ws/call/{room_id}` uses `session.speaker_id` for TTS `speaker_id` parameter
- All pages must be responsive, accessible, reduced-motion respecting

## Review Focus

1. **Legacy color leakage** — Any remaining `emerald-`, `teal-`, `indigo-` gradient/pulse/glow classes on buttons, cards, badges, or backgrounds
2. **Dark mode default** — Pages that default to dark backgrounds without respecting system/user preference
3. **Glassmorphism inconsistency** — Cards/panels missing `backdrop-blur`, translucent backgrounds, or delicate borders
4. **Voice cloning API failure handling** — Upload/recording errors not surfaced to user, no progress feedback
5. **TTS speaker_id not passed** — WebSocket call pipeline uses hardcoded voice instead of `session.speaker_id`

---

### Task 1: Frontend Theme System Overhaul (Tailwind Config + Globals CSS)

**Files:**
- Modify: `frontend/tailwind.config.js`
- Modify: `frontend/app/globals.css`
- Modify: `frontend/app/layout.tsx` (ensure font loading)

**Interfaces:**
- Produces: New color palette tokens (`primary`, `primary-dark`, `surface`, `glass`, `glass-dark`, etc.), glassmorphic utility classes (`.glass`, `.glass-dark`, `.glass-card`), updated font families

- [ ] **Step 1: Update tailwind.config.js with new professional blue palette and glassmorphic tokens**

Replace the entire color system with:
- Primary: Blue 600 (#2563EB) / Blue 700 (#1D4ED8) / Blue 50 (#EFF6FF)
- Surface: Slate 50 (#F8FAFC) light / Slate 900 (#0F172A) dark
- Glass: White/80 with backdrop-blur-xl, border-slate-200/60 (light) / Slate-800/80 with backdrop-blur-xl, border-slate-700/60 (dark)
- Semantic: success (emerald-600), warning (amber-600), error (red-600) — muted, not neon
- Remove: All emerald/teal/indigo gradient tokens, pulse animations, neon glows
- Font: Keep Plus Jakarta Sans for headings, Inter for body

- [ ] **Step 2: Update globals.css with glassmorphic utilities and base styles**

Add `.glass`, `.glass-card`, `.glass-input`, `.glass-button` utility classes using `@apply` with backdrop-blur, translucent backgrounds, delicate borders. Set light theme as default on `html`/`body`. Remove emerald/teal badge styles.

- [ ] **Step 3: Verify layout.tsx loads fonts correctly**

Ensure `Plus Jakarta Sans` and `Inter` are loaded via `next/font` or Google Fonts import.

- [ ] **Step 4: Test build and verify no Tailwind errors**

Run: `cd frontend && npm run build`
Expected: PASS with new color tokens available

---

### Task 2: Landing Page Redesign (`/`)

**Files:**
- Modify: `frontend/app/page.tsx`

**Interfaces:**
- Consumes: New Tailwind tokens (`primary`, `glass`, `glass-card`, etc.)
- Produces: Clean, minimal hero with two primary action cards

- [ ] **Step 1: Rewrite hero section with editorial typography, no gradient text**

Replace gradient headline with solid `primary` color. Remove pulsing status badge. Use clean badge with `primary` background.

- [ ] **Step 2: Redesign two action cards as glassmorphic cards**

Use `.glass-card` with subtle hover elevation. Icons in `primary` colored circles. Remove emerald/teal colored borders and glows. Links to `/initiate` and `/setup`.

- [ ] **Step 3: Redesign architecture banner as subtle glass panel**

Replace dark slate-900 background with `.glass-dark` or muted surface. Use `primary` colored accent dots instead of emerald/teal/indigo/amber.

- [ ] **Step 4: Verify responsive and accessible**

Check mobile layout, focus states, reduced motion.

---

### Task 3: Initiate Page Redesign (`/initiate`)

**Files:**
- Modify: `frontend/app/initiate/page.tsx`

**Interfaces:**
- Consumes: New Tailwind tokens, glassmorphic utilities
- Produces: Clean form with glassmorphic card, professional blue CTAs

- [ ] **Step 1: Update header badge and styling**

Replace emerald badge with `primary` badge. Remove pulse animation.

- [ ] **Step 2: Redesign form card as `.glass-card`**

Form inputs use `.glass-input` style. Labels in slate-700/300. Focus rings in `primary`.

- [ ] **Step 3: Update CTA button to `primary` gradient (subtle)**

Replace emerald-teal gradient with `from-primary to-primary-dark`. Remove shadow-emerald.

- [ ] **Step 4: Redesign result card as glassmorphic success panel**

Use `.glass-card` with `primary` border accent. Copy buttons use `primary` styling. Test link uses `primary` button.

- [ ] **Step 5: Verify form validation and submission still work**

---

### Task 4: Setup Page Redesign (`/setup`) + Voice Cloning Link

**Files:**
- Modify: `frontend/app/setup/page.tsx`

**Interfaces:**
- Consumes: New Tailwind tokens, glassmorphic utilities
- Produces: Clean profile form, permanent link display, recent calls — all glassmorphic

- [ ] **Step 1: Update header, step indicators, notification badge**

Replace emerald with `primary`. Step badges use `primary` circles.

- [ ] **Step 2: Redesign form sections as glassmorphic cards**

Each section (Identity, Persona, Instructions, Voice) in `.glass-card`. Inputs use `.glass-input`.

- [ ] **Step 3: Update voice selector and speaker ID field**

Default voice dropdown styled with `.glass-input`. Speaker ID field with helper text.

- [ ] **Step 4: Add "Create Voice Clone" link/button to Voice Cloning page**

Prominent CTA in Voice section linking to `/voice-cloning`. Use `primary` button style.

- [ ] **Step 5: Redesign permanent link panel as glassmorphic**

Replace dark gradient with `.glass-dark` or muted surface. Copy buttons in `primary`.

- [ ] **Step 6: Redesign recent calls list as glassmorphic cards**

Each call summary in `.glass-card` with subtle hover. Status badges use semantic colors (emerald-600 for completed, etc.)

- [ ] **Step 7: Verify profile save/load and link copying work**

---

### Task 5: Call Dialer Page Redesign (`/call/[room_id]`)

**Files:**
- Modify: `frontend/app/call/[room_id]/page.tsx`

**Interfaces:**
- Consumes: New Tailwind tokens, glassmorphic utilities
- Produces: Native phone UI with glassmorphic dialer frame, clean controls

- [ ] **Step 1: Update dialer frame to glassmorphic**

Replace dark/light hardcoded backgrounds with `.glass` frame that adapts to theme. Border: `border-slate-200/60` light / `border-slate-700/60` dark.

- [ ] **Step 2: Redesign status bar, avatar, call status**

Status badge uses `primary` for connecting, semantic green for connected. Avatar ring uses `primary` when agent speaking (no pulse glow).

- [ ] **Step 3: Redesign transcript drawer as glass panel**

Background: `.glass` with subtle border. Agent bubbles: `primary` tinted background. User bubbles: slate-100/800.

- [ ] **Step 4: Redesign control buttons (mute, keypad, speaker, end)**

Use `.glass-button` base. Active state: `primary` background with white text. Inactive: translucent with subtle border. Remove emerald/teal/amber rings and glows.

- [ ] **Step 5: Update theme toggle to use new icons/colors**

Sun/moon icons in `primary` when active.

- [ ] **Step 6: Verify WebSocket connection, audio, transcript still work**

---

### Task 6: Summary Page Redesign (`/summary/[room_id]`)

**Files:**
- Modify: `frontend/app/summary/[room_id]/page.tsx`

**Interfaces:**
- Consumes: New Tailwind tokens, glassmorphic utilities
- Produces: Clean summary with glassmorphic cards for metrics, summary, actions, transcript

- [ ] **Step 1: Update header badge and controls**

Replace emerald with `primary`. Copy summary button uses `primary`.

- [ ] **Step 2: Redesign KPI metric cards as glassmorphic**

Four metric cards in `.glass-card` with `primary` accent icons.

- [ ] **Step 3: Redesign executive summary and action items as glass cards**

Summary in `.glass-card`. Action items as checkable list items with `primary` checkboxes.

- [ ] **Step 4: Redesign transcript with glassmorphic bubbles**

Agent bubbles: `primary` tint. User bubbles: slate tint. Timestamps in slate-400.

- [ ] **Step 5: Verify copy summary and new call navigation work**

---

### Task 7: Not Found Page Redesign (`/not-found`)

**Files:**
- Modify: `frontend/app/not-found.tsx`

**Interfaces:**
- Consumes: New Tailwind tokens
- Produces: Clean 404 with primary-styled links

- [ ] **Step 1: Update badge, icon, links to use `primary`**

Remove emerald. Links use `primary` button and outline button.

---

### Task 8: AppShell Navigation Redesign

**Files:**
- Modify: `frontend/app/components/AppShell.tsx`

**Interfaces:**
- Consumes: New Tailwind tokens, theme context
- Produces: Glassmorphic header, primary-styled nav links, clean theme toggle

- [ ] **Step 1: Update header to glassmorphic**

`backdrop-blur-xl`, `bg-white/80` light / `bg-slate-900/80` dark, subtle border.

- [ ] **Step 2: Update nav links active/hover states**

Active: `primary` background tint. Hover: subtle slate tint. Remove emerald.

- [ ] **Step 3: Update logo badge to `primary` gradient**

Subtle `from-primary to-primary-dark` instead of emerald-teal.

- [ ] **Step 4: Update theme toggle icon colors**

Use `primary` for sun, slate for moon.

- [ ] **Step 5: Update footer styling**

Subtle border, slate text.

---

### Task 9: Voice Cloning Page (NEW) (`/voice-cloning`)

**Files:**
- Create: `frontend/app/voice-cloning/page.tsx`
- Modify: `frontend/app/api/client.ts` (add cloneVoice function)

**Interfaces:**
- Consumes: New Tailwind tokens, glassmorphic utilities, `/api/voice/clone` endpoint
- Produces: Complete voice cloning UI with upload + recording, progress, success handling

- [ ] **Step 1: Add `cloneVoice` API function to client.ts**

POST `/api/voice/clone` with FormData (audio file). Returns `{ speaker_id, message }`.

- [ ] **Step 2: Create voice-cloning/page.tsx with glassmorphic layout**

Page structure: Header → Instructions → Two tabs (Upload / Record) → Progress → Success → Link to Setup.

- [ ] **Step 3: Implement Upload tab**

File input (accept: audio/*, .mp3, .wav). Drag-drop zone with `.glass-card`. Preview audio player. Validate duration (30-60s recommended). Submit button calls API.

- [ ] **Step 4: Implement Record tab with MediaRecorder API**

Script text for user to read (~45 seconds). Record button with timer. MediaRecorder with 16kHz mono. Visual waveform/level indicator. Stop → preview → submit.

- [ ] **Step 5: Implement progress/loading state**

During API call: spinner with "Creating your voice clone..." and progress steps (Uploading → Processing → Complete).

- [ ] **Step 6: Implement success state**

Show `speaker_id` returned. "Voice cloned successfully!" with CTA to "Save to Profile" (calls `/api/setup` with speaker_id) or "Go to Setup".

- [ ] **Step 7: Error handling**

Display user-friendly errors for: file too large, invalid format, recording permission denied, API failures.

- [ ] **Step 8: Add route to middleware.ts if needed**

Not needed — Next.js App Router auto-detects.

- [ ] **Step 9: Add link from Setup page Voice section (Task 4.4)**

---

### Task 10: Backend Call Pipeline Integration (speaker_id → TTS)

**Files:**
- Modify: `app/api/routers/call_sessions.py` (WebSocket handler)
- Modify: `app/services/gnani_client.py` (verify speaker_id usage)

**Interfaces:**
- Consumes: `session.speaker_id` from MongoDB
- Produces: TTS synthesis with cloned voice when available

- [ ] **Step 1: Verify GnaniTTSClient uses `speaker_id` in payload**

Check `synthesize_wav` method includes `speaker_id` in payload when set. Already implemented (line 98-99).

- [ ] **Step 2: Update WebSocket handler to pass `session.speaker_id` to TTS client**

In `call_websocket`, `tts_client` initialization at line 496-501 already passes `speaker_id=getattr(session, "speaker_id", None)`. Verify this works for both permanent and dynamic sessions.

- [ ] **Step 3: Verify permanent session spawn includes speaker_id**

In `spawn_permanent_session` (line 240-270), `speaker_id=profile.get("speaker_id")` is passed to `create_session`. Verify this persists.

- [ ] **Step 4: Verify dynamic session initiation includes speaker_id**

In `initiate_call_session` (line 106-160), `speaker_id=req.speaker_id` is passed. Frontend `/initiate` page doesn't have speaker_id field — that's fine (optional).

- [ ] **Step 5: Add fallback logging**

Log when `speaker_id` is used vs. default voice. No code change needed if working.

---

### Task 11: Verification & Cleanup

**Files:**
- All modified files

**Interfaces:**
- Consumes: Complete implementation
- Produces: Verified working system

- [ ] **Step 1: Search for legacy color classes across all frontend files**

Run: `grep -r "emerald\|teal-600\|indigo-600\|bg-gradient-to.*emerald\|bg-gradient-to.*teal" frontend/app --include="*.tsx"`
Expected: Zero matches (except possibly in comments)

- [ ] **Step 2: Search for hardcoded dark backgrounds**

Run: `grep -r "bg-slate-900\|bg-slate-950\|dark:bg-slate-9" frontend/app --include="*.tsx" | grep -v "glass-dark\|dark:bg-slate-800"`
Expected: Only glass-dark or intentional dark mode usages

- [ ] **Step 3: Verify all pages render without console errors**

Start dev servers: `cd frontend && npm run dev` and `cd .. && python -m app.main`
Navigate each page: `/`, `/initiate`, `/setup`, `/voice-cloning`, `/call/test-uuid`, `/summary/test-uuid`

- [ ] **Step 4: Test voice cloning flow**

Upload a test audio file → verify speaker_id returned → save to profile → verify used in call.

- [ ] **Step 5: Test call with cloned voice**

Initiate call with profile that has speaker_id → verify TTS uses cloned voice (check logs).

- [ ] **Step 6: Run frontend build**

`cd frontend && npm run build`
Expected: PASS

- [ ] **Step 7: Run backend tests if any**

`cd .. && pytest tests/ -v`
Expected: PASS

- [ ] **Step 8: Commit all changes**

```bash
git add -A
git commit -m "feat: comprehensive refactor - glassmorphic UI, voice cloning page, call pipeline integration"
```