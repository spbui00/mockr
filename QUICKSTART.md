# Quick Start Guide

Get the Mock Trial Simulator running in 5 minutes!

## Prerequisites

- Python 3.10+ installed
- Node.js 18+ installed  
- A Deepgram API key (get free at https://deepgram.com)

## Option 1: Using Startup Scripts (Recommended)

### macOS/Linux

**Terminal 1 - Backend:**
```bash
./start-backend.sh
```

**Terminal 2 - Frontend:**
```bash
./start-frontend.sh
```

### Windows

**Terminal 1 - Backend:**
```bash
start-backend.bat
```

**Terminal 2 - Frontend:**
```bash
start-frontend.bat
```

## Option 2: Manual Setup

### Backend (Terminal 1)

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `backend/.env` and add your Deepgram API key:
```
DEEPGRAM_API_KEY=your_actual_key_here
```

Start the server:
```bash
python main.py
```

### Frontend (Terminal 2)

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

## First Run

1. **Open http://localhost:3000**

2. **Configure Your Trial:**
   - Leave all roles selected (Judge, Prosecutor, Defense)
   - Select "United States" and "Criminal Law"
   - Enter a case description like:
     ```
     The defendant is charged with theft. On January 15, 2024, 
     they allegedly stole merchandise worth $500 from a store. 
     Security footage shows a person matching their description.
     ```
   - Click "Start Trial"

3. **Start the Trial:**
   - Allow microphone access when prompted
   - The microphone is automatically listening (real-time mode)
   - Click the mic button to mute/unmute
   - Speak naturally to interact with agents

4. **Example Phrases to Try:**
   - "Your Honor, I would like to make an opening statement."
   - "The prosecution presents evidence of the defendant at the scene."
   - "The defense objects to this characterization."
   - "Your Honor, I move to dismiss based on lack of evidence."

5. **End the Trial:**
   - Click "End Trial" button
   - Confirm to return to the configuration page

## Verify It's Working

✅ Backend running: Visit http://localhost:8000 (should see API status)  
✅ Frontend running: Visit http://localhost:3000 (should see config page)  
✅ API docs: Visit http://localhost:8000/docs (Swagger UI)

## Troubleshooting

### "Module not found" errors
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt --upgrade
```

### "npm command not found"
Install Node.js from https://nodejs.org

### "python command not found"
Install Python from https://python.org or use `python3` instead

### Microphone not working
- Use Chrome or Edge browser
- Ensure you're on localhost (not 127.0.0.1)
- Check browser permissions
- Click "Allow" on microphone prompt

### No agent responses
- Verify Deepgram API key in `backend/.env`
- Check backend console for errors
- Check browser console (F12) for errors

## What's Next?

- 📖 Read [SETUP.md](SETUP.md) for detailed setup
- 🧪 Follow [TESTING.md](TESTING.md) for comprehensive testing
- 📚 Check [README.md](README.md) for full documentation
- 📊 Review [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) for technical details

## Common Use Cases

### For Law Students
Practice oral arguments, objections, and courtroom procedure

### For Lawyers
Prepare for trials, practice cross-examination, test arguments

### For Self-Representation
Learn courtroom etiquette, practice presenting your case

### For Legal Education
Demonstrate trial procedures, teach legal reasoning

## Need Help?

Check the comprehensive guides:
- [SETUP.md](SETUP.md) - Detailed setup instructions
- [TESTING.md](TESTING.md) - Testing procedures
- [README.md](README.md) - Full documentation

## Tips for Best Experience

1. **Speak Clearly:** Enunciate for better transcription
2. **Use Legal Terms:** Agents respond to formal language
3. **Address the Court:** Say "Your Honor" to trigger the Judge
4. **Wait for Responses:** Give agents time to respond
5. **Check Transcript:** Review the conversation in the right panel
6. **Refresh if Stuck:** Page refresh fixes most issues

## Performance Notes

- First audio processing may take 2-3 seconds
- Subsequent responses are faster (1-2 seconds)
- Agent responses are simulated for MVP (not full LLM)
- Sessions are in-memory (lost on restart)

Enjoy your mock trial! 🎯⚖️

