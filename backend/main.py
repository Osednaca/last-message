import os

from dotenv import load_dotenv
from fastapi import FastAPI

load_dotenv()
from fastapi.middleware.cors import CORSMiddleware

from api.routes import router
from api.legacy_routes import legacy_router

app = FastAPI(
    title="Last Message - Echoes from the Future",
    description="Backend API for object classification and category mapping",
    version="0.1.0",
)

# Configure CORS: allow the Vite dev server and the deployed frontend origin
# by default, and optionally read additional origins from the CORS_ORIGINS env var.
_default_origins = [
    "http://localhost:5173",
    "https://last-message-web.fly.dev",
    "https://lastmessage.navium.com.co",
]
_env_origins = os.environ.get("CORS_ORIGINS", "")
_extra_origins = [o.strip() for o in _env_origins.split(",") if o.strip()] if _env_origins else []
allowed_origins = _default_origins + _extra_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    # Allow any localhost / 127.0.0.1 port for dev (Vite picks another port
    # when 5173 is in use, e.g. 5174).
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
app.include_router(legacy_router)


@app.get("/health")
async def health_check():
    return {"status": "ok"}
