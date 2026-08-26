"""FastAPI application entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import api_router
from app.config import get_settings
from app.models.database import init_db

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle events for the FastAPI application."""
    # Startup
    await init_db()
    yield
    # Shutdown
    pass


app = FastAPI(
    title=settings.app_name,
    description="Code Intelligence Platform API",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware
origins = [origin.strip() for origin in settings.allowed_origins.split(",") if origin.strip()]

if "*" in origins or not origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Include routers
app.include_router(api_router, prefix="/api/v1")


@app.get("/", tags=["Health"])
@app.head("/", tags=["Health"])
async def root():
    """Root health check for cloud providers."""
    return {"status": "online", "app": settings.app_name, "version": "0.1.0"}


@app.get("/health", tags=["Health"])
@app.head("/health", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}
