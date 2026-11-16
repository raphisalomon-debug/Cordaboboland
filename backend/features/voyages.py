"""Voyages : carte du monde des pays visités (partagée entre nous deux).

Un pays absent de la base = pas visité (affiché en noir). Un pays présent = visité, avec sa couleur.
"""
import re

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from core import User, db, get_current_user, now_iso

router = APIRouter(prefix="/api/voyages", tags=["voyages"])

CODE_RE = re.compile(r"^[A-Z]{2}(-[A-Z]{1,2})?$|^X-[A-Za-z]{1,40}$")
COLOR_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")


class VisitIn(BaseModel):
    color: str


async def _all() -> list[dict]:
    docs = await db.visited_countries.find({}).to_list(400)
    return [{"code": d["code"], "color": d["color"]} for d in docs]


@router.get("")
async def list_visited(_: User = Depends(get_current_user)):
    return await _all()


@router.put("/{code}")
async def set_visited(code: str, body: VisitIn, user: User = Depends(get_current_user)):
    if not CODE_RE.match(code):
        raise HTTPException(400, "Pays inconnu")
    if not COLOR_RE.match(body.color):
        raise HTTPException(400, "Couleur invalide")
    await db.visited_countries.update_one(
        {"code": code},
        {"$set": {"color": body.color, "updated_by": user.id, "updated_at": now_iso()}},
        upsert=True,
    )
    return await _all()


@router.delete("/{code}")
async def unset_visited(code: str, _: User = Depends(get_current_user)):
    await db.visited_countries.delete_one({"code": code})
    return await _all()
