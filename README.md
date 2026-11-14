# Vaani AI Backend Configuration

This document describes how to configure the Vaani AI backend with environment variables for deployment to Google Cloud Run and Docker.

## Prerequisites

Before deploying, you need to set up the following resources:

### 1. MongoDB
- **Local Development**: Use MongoDB with default connection `mongodb://localhost:27017/vaani_ai`
- **GCP Cloud SQL / Atlas**: Use your MongoDB Atlas connection string

### 2. Hugging Face
- API Key from: https://huggingface.co/settings/tokens
- Model: `gnani/gnani-evon-v3.3-30B-A3B`

### 3. Gnani.ai
- API Key from: https://gnani.ai/developer-dashboard
- Unified key covers both Prisma (STT) and Timbre (TTS)

### 4. Meta WhatsApp Business API
- Phone Number ID from Meta Developer Console
- Access Token from Meta Developer Console

### 5. Google Cloud Platform
- Project ID from Google Cloud Console
- GCS bucket name for audio storage
- Service account key (for local development only)

## Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
# MongoDB Configuration
VAANI_MONGODB_URI=mongodb://localhost:27017/vaani_ai
VAANI_MONGODB_DB=vaani_ai

# Hugging Face API (Evon v3.3)
VAANI_HUGGINGFACE_API_KEY=your_huggingface_api_key_here

# Gnani.ai Speech APIs (STT & TTS)
VAANI_GNANI_API_KEY=your_gnani_api_key_here

# Meta WhatsApp Business API
VAANI_WHATSAPP_PHONE_NUMBER_ID=your_whatsapp_phone_number_id
VAANI_WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token

# Google Cloud Platform (GCP)
VAANI_GCP_PROJECT_ID=your_gcp_project_id
VAANI_GCS_BUCKET_NAME=your_gcs_bucket_name
VAANI_GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account-key.json

# Server Configuration
VAANI_HOST=0.0.0.0
VAANI_PORT=8000

# CORS Configuration
VAANI_CORS_ORIGINS=https://your-domain.com,https://www.your-domain.com

# Optional Features
VAANI_VAD_ENABLED=true
VAANI_VAD_ENERGY_THRESHOLD=350
VAANI_MAX_CALL_TURNS=4
VAANI_ENABLE_TTS_CACHE=true
VAANI_CONCISE_MODE=true
```

## Docker Deployment

Use `docker-compose.yml` to deploy locally with MongoDB:

```bash
docker compose up -d
```

## Google Cloud Run Deployment

1. Build Docker image:
```bash
docker build -t vaani-backend .
```

2. Push to Google Container Registry:
```bash
docker push gcr.io/PROJECT_ID/vaani-backend:latest
```

3. Deploy to Cloud Run:
```bash
gcloud run deploy vaani-backend \
  --image gcr.io/PROJECT_ID/vaani-backend:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "VAANI_MONGODB_URI=mongodb://localhost:27017/vaani_ai" \
  --set-env-vars "VAANI_MONGODB_DB=vaani_ai" \
  --set-env-vars "VAANI_GNANI_API_KEY=your_gnani_api_key_here" \
  --set-env-vars "VAANI_WHATSAPP_PHONE_NUMBER_ID=your_whatsapp_phone_number_id" \
  --set-env-vars "VAANI_WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token" \
  --set-env-vars "VAANI_GCP_PROJECT_ID=your_gcp_project_id" \
  --set-env-vars "VAANI_GCS_BUCKET_NAME=your_gcs_bucket_name"
```

## Frontend

The frontend uses Next.js and connects to the backend via environment variables:

- `NEXT_PUBLIC_API_URL`: Base URL for API calls
- Copy `frontend/.env.example` to `frontend/.env.local` for local development

## Security Notes

- Never commit `.env` files with real credentials
- Use Google Secret Manager for production deployments
- Ensure CORS origins are properly configured
- Test for port conflicts in Cloud Run (default port 8000)

## Files Created/Modified

### New Files
- `Dockerfile`: Optimized for Google Cloud Run deployment
- `docker-compose.yml`: Local development with MongoDB
- `render.yaml`: Alternative deployment configuration

### Modified Files
- `.env.example`: Added all required configuration variables
- `app/config.py`: Removed unused imports, simplified to use Field defaults
- `frontend/next.config.mjs`: Removed `NEXT_PUBLIC_N8N_WEBHOOK_URL` environment variable
- `frontend/app/api/client.ts`: Replaced Exotel field names (`exotel_call_sid`, `exotel_media_sid`) with generic (`call_sid`, `media_sid`) to support dual-mode architecture

## Configuration Checklist

- [ ] Set MongoDB connection string
- [ ] Configure Hugging Face API key
- [ ] Configure Gnani.ai API key
- [ ] Configure WhatsApp Business API credentials
- [ ] Configure GCP project and bucket details
- [ ] Set appropriate CORS origins
- [ ] Test all environment variables

For more information, visit the Vaani AI documentation or contact the development team.