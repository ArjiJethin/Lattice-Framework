"""Minimal FastAPI entry point for verifying server initialization."""

from fastapi import FastAPI

app = FastAPI(
    title="Lattice Backend",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)


@app.get("/health", tags=["Health"])
async def health_check() -> dict[str, str]:
    """Basic health check endpoint to verify API server status."""
    return {"status": "ok", "service": "lattice-backend", "version": "0.1.0"}
