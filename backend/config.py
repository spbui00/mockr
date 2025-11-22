from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    openjustice_api_url: str = "https://api.staging.openjustice.ai/api"
    openjustice_api_key: Optional[str] = None
    deepgram_api_key: str
    frontend_url: str = "http://localhost:3000"
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000
    
    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()

