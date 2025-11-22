# Quick Setup Guide

Follow these steps to get the Mock Trial Simulator running:

## Step 1: Get API Keys

### Deepgram (Required)
1. Go to https://deepgram.com
2. Sign up for a free account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key

### OpenJustice (Optional)
1. Go to https://openjustice.ai
2. Sign up for API access
3. Get your API key

## Step 2: Backend Setup

```bash
cd backend

python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

pip install -r requirements.txt

cp .env.example .env
```

Edit `.env` file:
```
DEEPGRAM_API_KEY=your_actual_deepgram_key
OPENJUSTICE_API_KEY=your_actual_openjustice_key
```

Start the backend:
```bash
python main.py
```

You should see: "Application startup complete" on http://0.0.0.0:8000

## Step 3: Frontend Setup

Open a new terminal:

```bash
cd frontend

npm install

cp .env.local.example .env.local
```

The `.env.local` should already have:
```
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

Start the frontend:
```bash
npm run dev
```

You should see: "Ready on http://localhost:3000"

## Step 4: Test the Application

1. Open http://localhost:3000 in your browser
2. Select at least one role (Judge, Prosecutor, or Defense)
3. Choose a jurisdiction (e.g., United States)
4. Select legal areas (e.g., Criminal Law)
5. Enter a case description like:
   ```
   The defendant is charged with theft. 
   On January 15, 2024, they allegedly stole merchandise 
   worth $500 from a retail store. Security footage shows 
   a person matching the defendant's description.
   ```
6. Click "Start Trial"
7. Allow microphone access when prompted
8. Unmute the microphone (click the button)
9. Start speaking to interact with the agents

## Common Issues

### "Module not found" errors
```bash
cd backend
pip install -r requirements.txt --upgrade
```

### Microphone not working
- Use Chrome or Edge browser
- Check browser permissions
- Ensure you're on localhost or HTTPS

### Backend won't start
- Check if port 8000 is available
- Verify Python version: `python --version` (should be 3.10+)
- Check `.env` file exists with API keys

### Frontend won't start
- Check if port 3000 is available
- Verify Node version: `node --version` (should be 18+)
- Delete `node_modules` and run `npm install` again

## Testing Without API Keys

For testing purposes, the application will work with simulated responses even if:
- OpenJustice API key is not provided (uses mock data)
- Deepgram key is invalid (will show errors but can test UI)

However, for full functionality, you need valid API keys.

## Next Steps

1. Customize agent prompts in `backend/services/agent_manager.py`
2. Adjust UI styling in frontend components
3. Add more legal areas or jurisdictions
4. Implement additional features like:
   - Session history
   - Export transcripts
   - Multiple witnesses
   - Evidence management

