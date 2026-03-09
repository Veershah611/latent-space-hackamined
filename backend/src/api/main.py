from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from src.api.routes import router
from src.ml.model_loader import get_model
import logging

@asynccontextmanager
async def lifespan(app: FastAPI):
    logging.info("Loading ML Model...")
    app.state.model = get_model()
    yield
    # Clean up on shutdown
    app.state.model = None

app = FastAPI(title="SolarSight API", description="AI-Driven Solar Inverter Failure Prediction API", lifespan=lifespan)

# CORS — allow frontend to call API (allow all for hackathon/dev environment)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

@app.get("/", include_in_schema=False)
async def root():
    return RedirectResponse(url="/docs")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.api.main:app", host="0.0.0.0", port=8000, reload=True)
