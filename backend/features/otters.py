"""Loutres : on s'envoie uniquement des stickers de loutres (pas de texte)."""
import re

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from core import BaseDocument, User, db, get_current_user, get_partner, now_iso

router = APIRouter(prefix="/api/otters", tags=["otters"])
KEY_RE = re.compile(r"^[a-z0-9_-]{1,30}$")  # the palette lives in frontend/src/config/otters.ts


class Otter(BaseDocument):
    otter_key: str
    from_id: str
    from_name: str
    to_id: str
    created_at: str
    seen: bool = False


class OtterIn(BaseModel):
    otter_key: str


@router.get("")
async def list_otters(_: User = Depends(get_current_user)):
    docs = await db.otters.find().sort("created_at", -1).to_list(200)
    return [Otter.from_mongo(d).model_dump() for d in docs]


@router.post("")
async def send_otter(body: OtterIn, user: User = Depends(get_current_user)):
    if not KEY_RE.match(body.otter_key):
        raise HTTPException(400, "Loutre inconnue")
    partner = await get_partner(user)
    otter = Otter(otter_key=body.otter_key, from_id=user.id, from_name=user.name,
                  to_id=partner.id, created_at=now_iso())
    res = await db.otters.insert_one(otter.to_mongo())
    otter.id = str(res.inserted_id)
    return otter.model_dump()


@router.get("/unread")
async def unread(user: User = Depends(get_current_user)):
    count = await db.otters.count_documents({"to_id": user.id, "seen": False})
    latest = await db.otters.find_one({"to_id": user.id, "seen": False}, sort=[("created_at", -1)])
    return {"count": count, "latest": Otter.from_mongo(latest).model_dump() if latest else None}


@router.post("/seen")
async def mark_seen(user: User = Depends(get_current_user)):
    await db.otters.update_many({"to_id": user.id, "seen": False}, {"$set": {"seen": True}})
    return {"ok": True}
