"""Fleuriste : on compose des bouquets de fleurs (forme, nombre et couleur des pétales, dessin sur les pétales)
avec un petit mot attaché. Les bouquets sont partagés entre nous deux."""
from typing import Annotated, List, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from core import User, db, get_current_user, now_iso, oid

router = APIRouter(prefix="/api/fleuriste", tags=["fleuriste"])

HEX = r"^#[0-9A-Fa-f]{6}$"
Coord = Annotated[float, Field(ge=-2, le=3)]


class Stroke(BaseModel):
    color: str = Field(pattern=HEX)
    width: float = Field(ge=0.005, le=0.15)
    points: List[tuple[Coord, Coord]] = Field(min_length=1, max_length=400)


class Flower(BaseModel):
    shape: Literal["ronde", "ovale", "pointue", "coeur", "goutte"]
    petals: int = Field(ge=3, le=16)
    petal_color: str = Field(pattern=HEX)
    center_color: str = Field(pattern=HEX)
    drawing: List[Stroke] = Field(default_factory=list, max_length=60)


class BouquetIn(BaseModel):
    flowers: List[Flower] = Field(min_length=1, max_length=8)
    note: str = Field(default="", max_length=300)


def _public(d: dict) -> dict:
    return {
        "id": str(d["_id"]),
        "author_id": d["author_id"],
        "author_name": d["author_name"],
        "created_at": d["created_at"],
        "note": d.get("note", ""),
        "flowers": d["flowers"],
    }


@router.get("")
async def list_bouquets(_: User = Depends(get_current_user)):
    docs = await db.bouquets.find({}).sort("created_at", -1).to_list(100)
    return [_public(d) for d in docs]


@router.post("")
async def create_bouquet(body: BouquetIn, user: User = Depends(get_current_user)):
    doc = {
        "author_id": user.id,
        "author_name": user.name,
        "created_at": now_iso(),
        "note": body.note.strip(),
        "flowers": body.model_dump()["flowers"],
    }
    res = await db.bouquets.insert_one(doc)
    doc["_id"] = res.inserted_id
    return _public(doc)


@router.delete("/{bouquet_id}")
async def delete_bouquet(bouquet_id: str, user: User = Depends(get_current_user)):
    d = await db.bouquets.find_one({"_id": oid(bouquet_id)})
    if not d:
        raise HTTPException(404, "Bouquet introuvable")
    if d["author_id"] != user.id:
        raise HTTPException(403, "Seul(e) l'auteur(e) peut retirer ce bouquet")
    await db.bouquets.delete_one({"_id": d["_id"]})
    return {"ok": True}
