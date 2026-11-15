# Vaani AI - Frontend

## Project Overview

Vaani AI is a sophisticated voice AI platform that enables creating AI assistants for voice calls. This frontend handles scheduling, making, and managing voice calls with AI-powered natural language processing.

## Key Features

### Dashboard
- **New Call**: Schedule and initiate voice calls with AI agents
- **Call History**: View and manage past calls
- **Voice Studio**: Configure call settings and voice profiles

### Call Interface
- **Real-time Voice Calling**: Native mobile-style call experience with WebSocket audio streaming
- **Voice Activity Detection (VAD)**: Intelligent audio processing that filters silence for cleaner voice transmission
- **Conversation Transcript**: Live transcription of call conversations
- **Audio Queue Management**: Seamless audio chunk queuing with 5ms padding to prevent clicks
- **Persona-based Speaking**: AI agents speak naturally as configured personas
- **Multi-language Support**: English, Kannada, and Mixed dialect support
- **Informal/Formal Tone Control**: Choose conversational style

### Message Setup
- **Direct Link Generation**: Create shareable call links to send to recipients
- **Quick Fill**: Use pre-verified phone numbers for testing
- **Persona Instructions**: Configure AI speaking style and content
- **Language Selection**: Choose message language mode

## Technical Architecture

### Audio Processing
- Web Audio API for real-time audio capture and playback
- Opus compression for efficient audio streaming
- 5ms silence padding between audio chunks to prevent clicks
- Advanced VAD filtering (8-unit volume threshold) to reduce noise

### Backend Integration
- RESTful API for session management
- WebSocket connections for real-time audio and transcript streaming
- Session-based authentication and authorization

### Design System
- Material Symbols Outlined for icons
- Inter and Plus Jakarta Sans fonts
- Consistent color palette with primary-container (#4f46e5)
- Responsive design with mobile-first approach
- Shadow and elevation system for depth

## Setup Instructions

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager

### Installation
1. Clone the repository
2. Navigate to the frontend directory
3. Install dependencies: `npm install` or `yarn install`

### Running the Application
1. Start the Next.js development server:
   ```bash
   npm run dev
   ```
   or
   ```bash
   yarn dev
   ```

2. The application will be available at `http://localhost:3000`

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm test` | Run tests |
| `npm run lint` | Run linting |

## Project Structure

```
frontend/
├── app/                    # Next.js app router
│   ├── api/               # API client and endpoints
│   ├── call/              # Call interface components
│   ├── dashboard/         # Dashboard features
│   └── components/        # Shared UI components
├── public/                 # Static assets
├── styles/                 # Global styles
├── types/                 # TypeScript type definitions
└── utils/                 # Utility functions
```

## Development Guidelines

- **Design System**: Follow the established color scheme, typography, and spacing
- **Accessibility**: Ensure all components are WCAG compliant
- **Performance**: Optimize bundle size and loading times
- **Security**: Implement proper authentication and data validation
- **Testing**: Write comprehensive unit and integration tests

## Version Control

### Branch Naming Convention
- `feature/*` - New features
- `fix/*` - Bug fixes
- `docs/*` - Documentation updates
- `refactor/*` - Code refactoring
- `chore/*` - Maintenance tasks

### Commit Message Guidelines
- Use imperative mood
- Include issue references when applicable
- Keep messages concise but descriptive
- Limit to 72 characters where possible

## License

This project is part of the Vaani AI platform. See the parent repository for license information.

## Support

For technical issues or feature requests, please contact the development team or submit an issue through the project repository.

## Changelog

### Recent Changes
- Enhanced call interface with iOS/Android native look
- Added Voice Activity Detection for cleaner audio
- Improved audio playback queue management
- Enhanced persona-based AI speaking
- Added multi-language support
- Improved user interface and experience

For a complete history, refer to the git commit log or CHANGELOG in the root directory.
