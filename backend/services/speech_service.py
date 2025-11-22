from deepgram import DeepgramClient
from typing import AsyncIterator, Optional
import asyncio
from config import settings
import io

class SpeechService:
    def __init__(self):
        self.deepgram = DeepgramClient(api_key=settings.deepgram_api_key)
        self.voice_mapping = {
            "judge": "aura-athena-en",
            "prosecutor": "aura-arcas-en",
            "defense": "aura-angus-en",
        }
    
    async def transcribe_audio(self, audio_data: bytes) -> str:
        print(f"[TRANSCRIBE] Starting transcription...")
        print(f"[TRANSCRIBE] Audio data size: {len(audio_data)} bytes")
        print(f"[TRANSCRIBE] Audio data type: {type(audio_data)}")
        
        try:
            print(f"[TRANSCRIBE] Calling Deepgram API (v5)...")
            response = self.deepgram.listen.v1.media.transcribe_file(
                request=audio_data,
                model="nova-2",
                smart_format=True,
                punctuate=True,
                language="en-US"
            )
            
            print(f"[TRANSCRIBE] Response received from Deepgram")
            print(f"[TRANSCRIBE] Response type: {type(response)}")
            
            transcript = response.results.channels[0].alternatives[0].transcript
            print(f"[TRANSCRIBE] Transcript extracted: '{transcript}'")
            print(f"[TRANSCRIBE] Transcript length: {len(transcript)} chars")
            return transcript
        except Exception as e:
            print(f"[TRANSCRIBE] ERROR: {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()
            return "Transcription failed (mock response)"

    async def transcribe_stream(self, audio_stream: AsyncIterator[bytes]) -> AsyncIterator[str]:
        pass
    
    async def synthesize_speech(self, text: str, role: str = "judge") -> bytes:
        try:
            voice = self.voice_mapping.get(role, "aura-asteria-en")
            
            print(f"[SPEAK] Synthesizing speech for role: {role}, voice: {voice}")
            print(f"[SPEAK] Text length: {len(text)} chars")
            
            response = self.deepgram.speak.v1.audio.generate(
                text=text,
                model=voice
            )
            
            print(f"[SPEAK] Response type: {type(response)}")
            print(f"[SPEAK] Response attributes: {dir(response)}")
            
            if hasattr(response, 'stream'):
                audio_data = response.stream.getvalue()
            elif hasattr(response, 'content'):
                audio_data = response.content
            elif isinstance(response, bytes):
                audio_data = response
            else:
                audio_bytes = b""
                for chunk in response:
                    if isinstance(chunk, bytes):
                        audio_bytes += chunk
                    elif hasattr(chunk, 'data'):
                        audio_bytes += chunk.data
                audio_data = audio_bytes
            
            print(f"[SPEAK] Generated audio: {len(audio_data)} bytes")
            return audio_data
            
        except Exception as e:
            print(f"[SPEAK] ERROR: {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()
            return b""
    
    def get_voice_for_role(self, role: str) -> str:
        return self.voice_mapping.get(role, "aura-athena-en")

speech_service = SpeechService()
