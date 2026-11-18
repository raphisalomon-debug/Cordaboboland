"""Voyages : carte du monde partagée entre nous deux.

- Pays visité (couleur, date) ; pays « on veut y aller » (une envie par personne, avec un « pourquoi ») ;
- souvenirs par pays (photo, citation, lieu, date, épingle précise sur la carte) ;
- idées par pays (mini-liste à cocher) ;
- prochain voyage (un pays, une date).
Un pays absent de la base = pas encore pensé (noir sur la carte).
"""
import io
import re
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, Field

from core import User, db, get_current_user, now_iso, oid, put_file

router = APIRouter(prefix="/api/voyages", tags=["voyages"])

CODE_RE = re.compile(r"^[A-Z]{2}(-[A-Z]{1,2})?$|^X-[A-Za-z]{1,40}$")
COLOR_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")
DATE_RE = re.compile(r"^(\d{4}-\d{2}-\d{2})?$")
PHOTO_RE = re.compile(r"^uploads/[\w-]+/[\w.-]+$")


def _code(code: str) -> str:
    if not CODE_RE.match(code):
        raise HTTPException(404, "Pays inconnu")
    return code


# --------------------------------------------------------------------------
# Modèles
# --------------------------------------------------------------------------
class VisitIn(BaseModel):
    color: str = Field(pattern=COLOR_RE.pattern)
    visited_on: str = Field(default="", pattern=DATE_RE.pattern)


class WishIn(BaseModel):
    why: str = Field(default="", max_length=200)


class Pin(BaseModel):
    x: float = Field(ge=0, le=1000)
    y: float = Field(ge=0, le=600)


class EntryIn(BaseModel):
    text: str = Field(default="", max_length=300)
    place: str = Field(default="", max_length=80)
    date: str = Field(default="", pattern=DATE_RE.pattern)
    photo_path: Optional[str] = None
    pin: Optional[Pin] = None


class IdeaIn(BaseModel):
    text: str = Field(min_length=1, max_length=120)


class IdeaPatch(BaseModel):
    done: bool


class TripIn(BaseModel):
    code: str
    date: str = Field(default="", pattern=DATE_RE.pattern)
    title: str = Field(default="", max_length=60)


# --------------------------------------------------------------------------
# Mise en forme
# --------------------------------------------------------------------------
def _visit(d: dict) -> dict:
    return {"code": d["code"], "color": d["color"], "visited_on": d.get("visited_on", "")}


def _wish(d: dict) -> dict:
    return {"code": d["code"], "user_id": d["user_id"], "user_name": d["user_name"], "why": d.get("why", "")}


def _entry(d: dict) -> dict:
    return {
        "id": str(d["_id"]), "code": d["code"], "author_id": d["author_id"], "author_name": d["author_name"],
        "text": d.get("text", ""), "place": d.get("place", ""), "date": d.get("date", ""),
        "photo_path": d.get("photo_path"), "pin": d.get("pin"), "created_at": d["created_at"],
    }


def _idea(d: dict) -> dict:
    return {"id": str(d["_id"]), "code": d["code"], "text": d["text"], "done": d.get("done", False),
            "author_name": d.get("author_name", "")}


async def _trip() -> Optional[dict]:
    d = await db.travel_trip.find_one({"_id": "trip"})
    return {"code": d["code"], "date": d.get("date", ""), "title": d.get("title", "")} if d else None


# --------------------------------------------------------------------------
# Vue d'ensemble (pour dessiner la carte)
# --------------------------------------------------------------------------
@router.get("")
async def list_visited(_: User = Depends(get_current_user)):
    """Ancienne route : seulement les pays visités."""
    return [_visit(d) for d in await db.visited_countries.find({}).to_list(400)]


@router.get("/overview")
async def overview(_: User = Depends(get_current_user)):
    visited = await db.visited_countries.find({}).to_list(400)
    wishes = await db.country_wishes.find({}).to_list(800)
    pins = await db.country_entries.find({"pin": {"$ne": None}}).sort("created_at", 1).to_list(500)
    counts: dict[str, int] = {}
    for e in await db.country_entries.find({}, {"code": 1}).to_list(5000):
        counts[e["code"]] = counts.get(e["code"], 0) + 1
    return {
        "visited": [_visit(d) for d in visited],
        "wishes": [_wish(d) for d in wishes],
        "pins": [_entry(d) for d in pins],
        "memories": counts,
        "trip": await _trip(),
    }


# --------------------------------------------------------------------------
# Prochain voyage (déclaré avant /{code})
# --------------------------------------------------------------------------
@router.put("/trip")
async def set_trip(body: TripIn, user: User = Depends(get_current_user)):
    _code(body.code)
    await db.travel_trip.update_one(
        {"_id": "trip"},
        {"$set": {"code": body.code, "date": body.date, "title": body.title.strip(), "set_by": user.id}},
        upsert=True,
    )
    return await _trip()


@router.delete("/trip")
async def clear_trip(_: User = Depends(get_current_user)):
    await db.travel_trip.delete_one({"_id": "trip"})
    return None


# --------------------------------------------------------------------------
# Photos (réduites avant d'être gardées dans la base)
# --------------------------------------------------------------------------
@router.post("/photo")
async def upload_photo(file: UploadFile = File(...), user: User = Depends(get_current_user)):
    from PIL import Image, ImageOps  # import tardif : seulement utile ici

    raw = await file.read()
    if len(raw) > 15 * 1024 * 1024:
        raise HTTPException(400, "Photo trop lourde (15 Mo max)")
    try:
        img = ImageOps.exif_transpose(Image.open(io.BytesIO(raw)))
        img = img.convert("RGB")
        img.thumbnail((1400, 1400))
        out = io.BytesIO()
        img.save(out, "JPEG", quality=80, optimize=True)
    except Exception:
        raise HTTPException(400, "Ce fichier n'est pas une photo lisible")
    path = await put_file(user.id, out.getvalue(), "image/jpeg", "jpg")
    return {"path": path}


# --------------------------------------------------------------------------
# Souvenirs et idées : routes à plusieurs segments (avant /{code})
# --------------------------------------------------------------------------
@router.delete("/entries/{entry_id}")
async def delete_entry(entry_id: str, user: User = Depends(get_current_user)):
    d = await db.country_entries.find_one({"_id": oid(entry_id)})
    if not d:
        raise HTTPException(404, "Souvenir introuvable")
    if d["author_id"] != user.id:
        raise HTTPException(403, "Seul(e) l'auteur(e) peut retirer ce souvenir")
    await db.country_entries.delete_one({"_id": d["_id"]})
    return {"ok": True}


@router.patch("/ideas/{idea_id}")
async def patch_idea(idea_id: str, body: IdeaPatch, _: User = Depends(get_current_user)):
    res = await db.country_ideas.update_one({"_id": oid(idea_id)}, {"$set": {"done": body.done}})
    if not res.matched_count:
        raise HTTPException(404, "Idée introuvable")
    return {"ok": True}


@router.delete("/ideas/{idea_id}")
async def delete_idea(idea_id: str, _: User = Depends(get_current_user)):
    await db.country_ideas.delete_one({"_id": oid(idea_id)})
    return {"ok": True}


# --------------------------------------------------------------------------
# Un pays
# --------------------------------------------------------------------------
async def _detail(code: str) -> dict:
    visit = await db.visited_countries.find_one({"code": code})
    wishes = await db.country_wishes.find({"code": code}).to_list(10)
    entries = await db.country_entries.find({"code": code}).to_list(500)
    entries.sort(key=lambda e: (e.get("date") or e["created_at"][:10], e["created_at"]), reverse=True)
    ideas = await db.country_ideas.find({"code": code}).sort("created_at", 1).to_list(200)
    return {
        "code": code,
        "visit": _visit(visit) if visit else None,
        "wishes": [_wish(w) for w in wishes],
        "entries": [_entry(e) for e in entries],
        "ideas": [_idea(i) for i in ideas],
    }


@router.get("/{code}")
async def country_detail(code: str, _: User = Depends(get_current_user)):
    return await _detail(_code(code))


@router.put("/{code}")
async def set_visited(code: str, body: VisitIn, user: User = Depends(get_current_user)):
    _code(code)
    await db.visited_countries.update_one(
        {"code": code},
        {"$set": {"color": body.color, "visited_on": body.visited_on, "updated_by": user.id, "updated_at": now_iso()}},
        upsert=True,
    )
    return await _detail(code)


@router.delete("/{code}")
async def unset_visited(code: str, _: User = Depends(get_current_user)):
    await db.visited_countries.delete_one({"code": _code(code)})
    return await _detail(code)


@router.put("/{code}/wish")
async def set_wish(code: str, body: WishIn, user: User = Depends(get_current_user)):
    _code(code)
    await db.country_wishes.update_one(
        {"code": code, "user_id": user.id},
        {"$set": {"user_name": user.name, "why": body.why.strip(), "updated_at": now_iso()}},
        upsert=True,
    )
    return await _detail(code)


@router.delete("/{code}/wish")
async def clear_wish(code: str, user: User = Depends(get_current_user)):
    await db.country_wishes.delete_one({"code": _code(code), "user_id": user.id})
    return await _detail(code)


@router.post("/{code}/entries")
async def add_entry(code: str, body: EntryIn, user: User = Depends(get_current_user)):
    _code(code)
    if body.photo_path and not PHOTO_RE.match(body.photo_path):
        raise HTTPException(400, "Photo invalide")
    if not (body.text.strip() or body.photo_path or body.place.strip()):
        raise HTTPException(400, "Ajoute au moins une photo, un mot ou un lieu")
    await db.country_entries.insert_one({
        "code": code, "author_id": user.id, "author_name": user.name, "created_at": now_iso(),
        "text": body.text.strip(), "place": body.place.strip(), "date": body.date,
        "photo_path": body.photo_path, "pin": body.pin.model_dump() if body.pin else None,
    })
    return await _detail(code)


@router.post("/{code}/ideas")
async def add_idea(code: str, body: IdeaIn, user: User = Depends(get_current_user)):
    _code(code)
    await db.country_ideas.insert_one({
        "code": code, "text": body.text.strip(), "done": False, "author_name": user.name, "created_at": now_iso(),
    })
    return await _detail(code)
