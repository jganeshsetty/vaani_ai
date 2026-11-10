# VaaniCall AI Backend

Multilingual autonomous voice calling assistant for the Great Indian AI Internship Challenge 2026.

## Architecture

```
User -> FastAPI REST -> MongoDB
          |
          v
    POST /api/calls/start -> Exotel Connect Voice AI
          |
          v
    WebSocket /media <-- Exotel (bidirectional audio) <--> Gnani Prisma/Timbre
          |
          v
    Agentic Engine handles conversation, verification, language detection
```

## Tech Stack

- **Backend**: Python 3.12+, FastAPI (async), uvicorn
- **Database**: MongoDB (Motor async driver)
- **Telephony**: Exotel Connect Voice AI (WebSocket)
- **STT/TTS**: Gnani Prisma v2.5 (STT), Timbre v2.5 (TTS)

## Quick Start

```bash
# 1. Set environment variables (copy .env.example)
cp .env.example .env
# Edit .env with real credentials

# 2. Start MongoDB (docker)
docker-compose up -d mongo

# 3. Install deps and run
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/tasks` | Create a voice call task |
| GET | `/api/tasks` | List tasks (optional ?user_id=...) |
| GET | `/api/tasks/{id}` | Get a specific task |
| POST | `/api/calls/start` | Start a call for a task |
| GET | `/api/calls/{id}` | Get call details |
| GET | `/health` | Health check |
| WS | `/media?call_id=<id>` | Exotel media WebSocket |

## Models

### TaskCreate (POST /api/tasks)

```json
{
  "user_id": "string",
  "description": "Call the store and ask if my laptop is dispatched",
  "language": "kannada|english|kanglish",
  "target_number": "+91XXXXXXXXXX",
  "constraints": ["be polite"],
  "questions_to_ask": ["Is my order dispatched?", "When will it arrive?"]
}
```

### Response (CallOut)

```json
{
  "id": "call_id",
  "task_id": "task_id",
  "status": "initiated|in_progress|completed|failed",
  "transcript": [{ "role": "agent|callee", "text": "...", "language": "..." }],
  "summary": "Task: ...\n- Question: confirmed/unclear/not_asked"
}
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VAANI_MONGODB_URI` | MongoDB connection string |
| `VAANI_MONGODB_DB` | Database name |
| `VAANI_EXOTEL_API_KEY` | Exotel API key |
| `VAANI_EXOTEL_TOKEN` | Exotel auth token |
| `VAANI_EXOTEL_BASE_URL` | Exotel API base (default: api.exotel.com/v1) |
| `VAANI_EXOTEL_VOICE_AI_SID` | Exotel Voice AI SID |
| `VAANI_GNANI_PRISMA_WS_URL` | Gnani Prisma WebSocket URL |
| `VAANI_GNANI_TIMBRE_WS_URL` | Gnani Timbre WebSocket URL |
| `VAANI_GNANI_API_KEY` | Gnani API key |
| `VAANI_CORS_ORIGINS` | Comma-separated CORS origins |

## Deploy to Render

1. Create a new Web Service
2. Build command: `pip install -r requirements.txt`
3. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add environment variables
5. Connect MongoDB Atlas or enable free tier

## Testing

```bash
# Unit tests
py -m pytest tests/ -v

# Coverage
py -m pytest tests/ --cov=app --cov-report=html
```

🤖 Generated with [Claude Code](https://claude.com/claude-code)