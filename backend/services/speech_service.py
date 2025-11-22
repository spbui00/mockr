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
        try:
            # Updated to match SDK documentation: pass kwargs directly
            source = {"buffer": audio_data}
            
            response = self.deepgram.listen.prerecorded.v("1").transcribe_file(
                source,
                model="nova-2",
                smart_format=True,
                punctuate=True,
                language="en-US"
            )
            
            transcript = response.results.channels[0].alternatives[0].transcript
            return transcript
        except Exception as e:
            print(f"Transcription error: {e}")
            # Fallback for development or if key is invalid
            return "Transcription failed (mock response)"

    async def transcribe_stream(self, audio_stream: AsyncIterator[bytes]) -> AsyncIterator[str]:
        pass
    
    async def synthesize_speech(self, text: str, role: str = "judge") -> bytes:
        try:
            voice = self.voice_mapping.get(role, "aura-athena-en")
            
            # Updated to match SDK documentation: pass kwargs directly
            response = self.deepgram.speak.v("1").generate(
                text=text,
                model="aura-asteria-en"
            )
            
            # Get bytes from stream
            audio_data = response.stream.getvalue()
            return audio_data
            
        except Exception as e:
            print(f"Speech synthesis error: {e}")
            return b""
    
    def get_voice_for_role(self, role: str) -> str:
        return self.voice_mapping.get(role, "aura-athena-en")

speech_service = SpeechService()
