# Mock Trial Simulator

An AI-powered mock trial simulation application for lawyers, law students, and individuals preparing to represent themselves in court.

## Features

- **AI-Powered Agents**: Simulates Judge, Prosecutor, and Defense Attorney roles using advanced AI
- **Real-Time Voice Interface**: Continuous speech-to-text and text-to-speech for natural conversation
- **Legal Context Integration**: Integrates with OpenJustice API for jurisdiction-specific legal knowledge
- **Visual Agent Representation**: Animated circular avatars showing which agent is speaking
- **Transcript Recording**: Real-time transcript of all trial proceedings
- **Document Upload**: Support for PDF and image document analysis

## Technology Stack

### Backend
- Python 3.10+
- FastAPI (API framework)
- PyAgentSpec 26.1.0 (Oracle Agent Spec)
- Deepgram SDK (Speech services)
- OpenJustice API (Legal data)
- WebSocket support for real-time communication

### Frontend
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui (Component library)
- Framer Motion (Animations)
- Web Audio API

## Prerequisites

- Python 3.10 or higher
- Node.js 18 or higher
- Deepgram API key
- OpenJustice API key (optional)

## Installation

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create a `.env` file from the example:
```bash
cp .env.example .env
```

5. Edit `.env` and add your API keys:
```
DEEPGRAM_API_KEY=your_deepgram_api_key_here
OPENJUSTICE_API_KEY=your_openjustice_api_key_here
```

6. Run the backend server:
```bash
python main.py
```

The backend will start at `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file:
```bash
cp .env.local.example .env.local
```

4. Run the development server:
```bash
npm run dev
```

The frontend will start at `http://localhost:3000`

## Usage

1. **Configuration Phase**:
   - Select roles to simulate (Judge, Prosecutor, Defense)
   - Choose jurisdiction and legal areas
   - Provide case description and upload supporting documents

2. **Trial Phase**:
   - Click the microphone button to unmute
   - Speak naturally to interact with AI agents
   - Agents will respond in real-time with voice
   - View the transcript in the right panel

3. **End Trial**:
   - Click "End Trial" button when finished
   - Review the transcript

## Project Structure

```
mockr/
├── backend/
│   ├── main.py                 # FastAPI application entry
│   ├── config.py               # Configuration and environment variables
│   ├── models/                 # Pydantic data models
│   ├── services/               # Business logic services
│   │   ├── openjustice.py     # OpenJustice API integration
│   │   ├── agent_manager.py   # Agent management and responses
│   │   └── speech_service.py  # Deepgram integration
│   ├── routers/                # API route handlers
│   │   ├── configuration.py   # Configuration endpoints
│   │   └── trial.py           # Trial management endpoints
│   └── websockets/             # WebSocket handlers
│       └── trial_session.py   # Real-time trial communication
│
├── frontend/
│   ├── app/                    # Next.js app directory
│   │   ├── page.tsx           # Configuration page
│   │   └── trial/[sessionId]/ # Trial simulation page
│   ├── components/             # React components
│   │   ├── ui/                # shadcn/ui components
│   │   ├── configuration/     # Configuration step components
│   │   └── trial/             # Trial interface components
│   ├── lib/                   # Utility functions
│   │   ├── audio.ts          # Audio recording and playback
│   │   ├── websocket.ts      # WebSocket client
│   │   └── utils.ts          # General utilities
│   └── types/                 # TypeScript type definitions
│
└── README.md
```

## API Endpoints

### REST API

- `GET /api/configuration/jurisdictions` - Get available jurisdictions
- `GET /api/configuration/legal-areas/{jurisdiction}` - Get legal areas for jurisdiction
- `GET /api/configuration/articles` - Search legal articles
- `POST /api/trial/create` - Create a new trial session
- `GET /api/trial/{session_id}` - Get trial session details
- `POST /api/trial/{session_id}/context` - Upload documents to trial
- `DELETE /api/trial/{session_id}` - End a trial session

### WebSocket

- `ws://localhost:8000/ws/trial/{session_id}` - Real-time trial communication

## Agent Roles

### Judge
- Maintains courtroom order
- Makes legal rulings
- Ensures fair proceedings
- Neutral and authoritative

### Prosecutor
- Represents the state
- Presents evidence for conviction
- Cross-examines witnesses
- Assertive and methodical

### Defense Attorney
- Represents the defendant
- Challenges prosecution's case
- Protects client's rights
- Strategic and protective

## Development

### Backend Development

To add new agent behaviors:
1. Edit `backend/services/agent_manager.py`
2. Modify agent prompts or response logic
3. Test with different case scenarios

### Frontend Development

To customize the UI:
1. Edit components in `frontend/components/`
2. Modify styles in Tailwind classes
3. Adjust animations in Framer Motion

## Troubleshooting

### Microphone Not Working
- Check browser permissions for microphone access
- Ensure HTTPS or localhost for getUserMedia API
- Try a different browser (Chrome/Edge recommended)

### WebSocket Connection Failed
- Ensure backend is running on port 8000
- Check CORS settings in backend
- Verify `.env.local` has correct WebSocket URL

### No Agent Response
- Check Deepgram API key is valid
- Ensure proper error handling in browser console
- Verify agent_manager is creating agents correctly

## License

MIT License - see LICENSE file for details

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Acknowledgments

- Oracle Agent Spec for agent orchestration
- Deepgram for speech services
- OpenJustice for legal data
- shadcn/ui for beautiful components

