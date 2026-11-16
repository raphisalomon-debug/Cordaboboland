"""Maisons de l'accueil (config modulaire) + images (stockées dans MongoDB)."""
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel

from core import BaseDocument, User, db, get_current_user, get_file_data, put_file, require_admin
from houses_config import HOUSES, REMOVED_HOUSES, RENAMED_HOUSES

router = APIRouter(prefix="/api", tags=["houses"])


class House(BaseDocument):
    key: str
    name: str
    action: str  # "link" | "page"
    target: str = ""
    x: float
    y: float
    visible: bool = True
    color: str = "#FAEDCD"
    order: int = 0
    image_path: Optional[str] = None


class HouseUpdate(BaseModel):
    name: Optional[str] = None
    target: Optional[str] = None
    visible: Optional[bool] = None
    x: Optional[float] = None
    y: Optional[float] = None


class Position(BaseModel):
    key: str
    x: Optional[float] = None
    y: Optional[float] = None
    order: Optional[int] = None


class SettingsPatch(BaseModel):
    auto_layout: Optional[bool] = None


# App-wide settings (single document). auto_layout = houses arrange themselves.
@router.get("/settings")
async def get_settings(_: User = Depends(get_current_user)):
    doc = await db.settings.find_one({"_id": "app"}) or {}
    return {"auto_layout": doc.get("auto_layout", True)}


@router.patch("/settings")
async def update_settings(body: SettingsPatch, _: User = Depends(require_admin)):
    changes = body.model_dump(exclude_none=True)
    if changes:
        await db.settings.update_one({"_id": "app"}, {"$set": changes}, upsert=True)
    return await get_settings(_)


async def seed_houses() -> None:
    """Insert houses from houses_config.py that are not in the DB yet."""
    # Maisons retirées de l'app : on les enlève aussi de la base.
    await db.houses.delete_many({"key": {"$in": REMOVED_HOUSES}})
    for key, (old, new) in RENAMED_HOUSES.items():
        await db.houses.update_one({"key": key, "name": old}, {"$set": {"name": new}})
    for h in HOUSES:
        if not await db.houses.find_one({"key": h["key"]}):
            await db.houses.insert_one(House(**h).to_mongo())


def _clamp(v: float) -> float:
    return max(0.05, min(0.95, v))


@router.get("/houses")
async def list_houses(user: User = Depends(get_current_user)):
    docs = await db.houses.find().sort("order", 1).to_list(100)
    return [House.from_mongo(d).model_dump() for d in docs]


@router.patch("/houses/{key}")
async def update_house(key: str, body: HouseUpdate, _: User = Depends(require_admin)):
    changes = body.model_dump(exclude_none=True)
    for k in ("x", "y"):
        if k in changes:
            changes[k] = _clamp(changes[k])
    if "name" in changes and not changes["name"].strip():
        raise HTTPException(400, "Le nom ne peut pas être vide")
    res = await db.houses.find_one_and_update({"key": key}, {"$set": changes}, return_document=True)
    if not res:
        raise HTTPException(404, "Maison introuvable")
    return House.from_mongo(res).model_dump()


@router.put("/houses/positions")
async def save_positions(body: List[Position], _: User = Depends(require_admin)):
    for p in body:
        changes = {}
        if p.x is not None and p.y is not None:
            changes.update({"x": _clamp(p.x), "y": _clamp(p.y)})
        if p.order is not None:
            changes["order"] = p.order
        if changes:
            await db.houses.update_one({"key": p.key}, {"$set": changes})
    return {"ok": True}


@router.post("/houses/{key}/image")
async def upload_house_image(key: str, file: UploadFile = File(...), user: User = Depends(require_admin)):
    if not await db.houses.find_one({"key": key}):
        raise HTTPException(404, "Maison introuvable")
    content_type = file.content_type or "image/png"
    if not content_type.startswith("image/"):
        raise HTTPException(400, "Ce fichier n'est pas une image")
    data = await file.read()
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(400, "Image trop lourde (8 Mo max)")
    ext = (file.filename or "image.png").rsplit(".", 1)[-1].lower()[:5] or "png"
    path = await put_file(user.id, data, content_type, ext)
    res = await db.houses.find_one_and_update({"key": key}, {"$set": {"image_path": path}}, return_document=True)
    return House.from_mongo(res).model_dump()


@router.delete("/houses/{key}/image")
async def reset_house_image(key: str, _: User = Depends(require_admin)):
    res = await db.houses.find_one_and_update({"key": key}, {"$set": {"image_path": None}}, return_document=True)
    if not res:
        raise HTTPException(404, "Maison introuvable")
    return House.from_mongo(res).model_dump()


@router.get("/files/{path:path}")
async def get_file(path: str, _: User = Depends(get_current_user)):
    # Images are shared by the two of us: any logged-in user may read them.
    found = await get_file_data(path)
    if not found:
        raise HTTPException(404, "Fichier introuvable")
    data, ctype = found
    return Response(content=data, media_type=ctype, headers={"Cache-Control": "private, max-age=86400"})
