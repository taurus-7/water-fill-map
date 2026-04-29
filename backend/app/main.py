import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine
from .routers import parcels, farmers, contracts


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await engine.dispose()


app = FastAPI(
    title="Water Fill Map API",
    description="API для визуализации заполнения лимитов воды по участкам",
    version="2.0.0",
    lifespan=lifespan,
)

_raw = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173")
ALLOWED_ORIGINS = [o.strip() for o in _raw.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(parcels.router, prefix="/api", tags=["parcels"])
app.include_router(farmers.router, prefix="/api", tags=["farmers"])
app.include_router(contracts.router, prefix="/api", tags=["contracts"])


@app.get("/health")
async def health():
    return {"status": "ok"}
