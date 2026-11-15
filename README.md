# Vaani AI

Dual-mode AI voice assistant with web-based calling. Outbound scheduling via browser; inbound busy-screening via a native doorway redirect. No telephony dependencies.

## Architecture

- **Backend**: FastAPI + Motor (MongoDB), hosted on Render
- **Frontend**: Next.js 15 (App Router)
- **AI Model**: Evon v3.3 (`gnani/gnani-evon-v3.3-30B-A3B`) via Hugging Face Inference API
- **Speech**: Gnani Prisma (STT) + Timbre (TTS)
- **Scheduler**: APScheduler promoting `scheduled` sessions → `pending` every 60s

### Modes

| Mode | Entry Point | Flow |
|------|-------------|------|
| **Outbound** | `/dashboard` | User submits call request (or schedules) → `POST /api/outbound` → redirected to `/call/{room_id}` for live WebSocket call |
| **Inbound (Busy)** | `/busy` | Phone landing page POSTs `generate-busy-session` → instant redirect to `/call/{room_id}?mode=inbound&busy=true` with default screening prompt |

Both modes share the same WebSocket call pipeline:
```
Browser mic → WebSocket → Gnani STT → Evon v3.3 → Gnani TTS → back to browser
```
On disconnect, Evon summarizes the transcript; results persist in MongoDB (no audio files saved).

## Environment Variables

Copy `.env.example` to `.env`:

```bash
VAANI_MONGODB_URI=mongodb://localhost:27017/vaani_ai
VAANI_MONGODB_DB=vaani_ai
VAANI_HUGGINGFACE_API_KEY=your_huggingface_api_key
VAANI_GNANI_API_KEY=your_gnani_api_key
```

Render env vars are configured in `render.yaml`.

## Local Development

```bash
# Backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend && npm install && npm run dev
```

## Docker

```bash
docker compose up -d
```

## Deployment

Deploy backend and frontend as separate services on Render:
- Backend: `services.vaani-backend` (from `render.yaml`)
- Frontend: `services.vaani-frontend` with `NEXT_PUBLIC_API_URL` pointing to backend URL

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/outbound` | Create outbound session (optionally schedule) |
| POST | `/api/generate-busy-session` | Create inbound busy-mode session |
| GET | `/api/sessions` | List all call sessions |
| GET | `/api/sessions/room/{room_id}` | Fetch session by room ID |
| WS | `/ws/call/{room_id}` | Real-time audio streaming (binary) |
