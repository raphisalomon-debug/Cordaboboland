"""
Nos petites maisons — API.
Chaque fonctionnalité a son propre routeur dans backend/features/.
Pour en ajouter une : créer features/<nom>.py avec un `router`, puis l'ajouter à FEATURE_ROUTERS.

Le même serveur distribue aussi le site web (dossier `site/`, voir build-site.sh) :
tout ce qui n'est pas /api/... renvoie l'app, installable comme PWA sur iPhone.
"""
import asyncio
import logging
import os
from contextlib import suppress
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pymongo import ASCENDING, DESCENDING, IndexModel
from starlette.middleware.cors import CORSMiddleware

from core import client, db, seed_users
from features import auth, books, cemantix, dates, goals, houses, otters, verses

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

FEATURE_ROUTERS = [auth.router, houses.router, dates.router, otters.router, goals.router, verses.router, books.router, cemantix.router]

INDEXES: dict[str, list[IndexModel]] = {
    "users": [IndexModel([("email", ASCENDING)], name="email", unique=True)],
    "houses": [IndexModel([("key", ASCENDING)], name="key", unique=True),
               IndexModel([("order", ASCENDING)], name="order")],
    "files": [IndexModel([("storage_path", ASCENDING)], name="storage_path")],
    "dates": [IndexModel([("created_at", DESCENDING)], name="created_desc")],
    "otters": [IndexModel([("created_at", DESCENDING)], name="created_desc"),
               IndexModel([("to_id", ASCENDING), ("seen", ASCENDING)], name="to_seen")],
    "goals": [IndexModel([("created_at", DESCENDING)], name="created_desc"),
              IndexModel([("status", ASCENDING), ("completed_at", ASCENDING)], name="status_completed")],
    "verse_folders": [IndexModel([("name", ASCENDING)], name="name")],
    "verses": [IndexModel([("folder_id", ASCENDING), ("created_at", DESCENDING)], name="folder_created")],
    "books": [IndexModel([("created_at", ASCENDING)], name="created")],
    "cemantix_claims": [IndexModel([("date", ASCENDING), ("user_id", ASCENDING)], name="date_user", unique=True)],
    "cemantix_solutions": [IndexModel([("date", ASCENDING)], name="date", unique=True)],
    "chapters": [IndexModel([("book_id", ASCENDING), ("order", ASCENDING)], name="book_order")],
}


async def ensure_indexes() -> None:
    for collection, models in INDEXES.items():
        for model in models:
            try:
                await db[collection].create_indexes([model])
            except Exception as exc:
                logger.error("ensure_indexes(%s.%s): %s", collection, model.document["name"], exc)


app = FastAPI(title="Nos petites maisons")


@app.get("/health", include_in_schema=False)
@app.head("/health", include_in_schema=False)
async def health():
    return {"status": "ok"}


for r in FEATURE_ROUTERS:
    app.include_router(r)

app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=["*"],
                   allow_methods=["*"], allow_headers=["*"])


@app.on_event("startup")
async def startup():
    app.state.index_task = asyncio.create_task(ensure_indexes())
    await seed_users()
    await houses.seed_houses()


@app.on_event("shutdown")
async def shutdown_db_client():
    app.state.index_task.cancel()
    with suppress(asyncio.CancelledError):
        await app.state.index_task
    client.close()


# --------------------------------------------------------------------------
# Site web (export Expo) servi par le même serveur que l'API
# --------------------------------------------------------------------------
SITE_DIR = Path(os.environ.get("SITE_DIR") or Path(__file__).resolve().parent.parent / "site").resolve()

if (SITE_DIR / "index.html").is_file():

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_site(full_path: str):
        if full_path == "api" or full_path.startswith("api/"):
            raise HTTPException(404, "Introuvable")
        target = (SITE_DIR / full_path).resolve()
        if full_path and target.is_file() and SITE_DIR in target.parents:
            # Fichiers à nom unique (hash) : cache long. Le reste doit toujours être revérifié.
            hashed = full_path.startswith("_expo/") or full_path.startswith("assets/")
            cache = "public, max-age=31536000, immutable" if hashed else "no-cache"
            return FileResponse(target, headers={"Cache-Control": cache})
        # Toute autre adresse (/dates, /objectifs...) : c'est l'app qui gère la navigation.
        return FileResponse(SITE_DIR / "index.html", headers={"Cache-Control": "no-cache"})
else:
    logger.warning("Dossier du site introuvable (%s) : seule l'API est servie.", SITE_DIR)
