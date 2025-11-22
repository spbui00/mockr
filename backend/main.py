from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from routers import configuration, trial
from ws_handlers.trial_session import router as ws_router

app = FastAPI(title="Mock Trial Simulator API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(configuration.router, prefix="/api/configuration", tags=["configuration"])
app.include_router(trial.router, prefix="/api/trial", tags=["trial"])
app.include_router(ws_router)

@app.get("/")
async def root():
    return {"message": "Mock Trial Simulator API", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.backend_host, port=settings.backend_port)

