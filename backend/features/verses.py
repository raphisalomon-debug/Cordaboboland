"""Versets : dossiers nommés dans lesquels on classe nos versets de la Bible."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from core import BaseDocument, User, db, get_current_user, now_iso, oid

router = APIRouter(prefix="/api", tags=["verses"])


class Folder(BaseDocument):
    name: str
    color: str = "#FAEDCD"
    created_by_name: str
    created_at: str


class Verse(BaseDocument):
    folder_id: str
    reference: str  # ex "Jean 3:16"
    text: str
    note: str = ""
    created_by_name: str
    created_at: str


class FolderIn(BaseModel):
    name: str
    color: str = "#FAEDCD"


class FolderPatch(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None


class VerseIn(BaseModel):
    folder_id: str
    reference: str
    text: str = ""
    note: str = ""


class VersePatch(BaseModel):
    folder_id: Optional[str] = None
    reference: Optional[str] = None
    text: Optional[str] = None
    note: Optional[str] = None


async def _folder_exists(folder_id: str) -> None:
    if not await db.verse_folders.find_one({"_id": oid(folder_id)}):
        raise HTTPException(404, "Dossier introuvable")


# ----------------------------- Folders -----------------------------------
@router.get("/verse-folders")
async def list_folders(_: User = Depends(get_current_user)):
    docs = await db.verse_folders.find().sort("name", 1).to_list(500)
    counts = {c["_id"]: c["n"] async for c in db.verses.aggregate([{"$group": {"_id": "$folder_id", "n": {"$sum": 1}}}])}
    out = []
    for d in docs:
        f = Folder.from_mongo(d).model_dump()
        f["count"] = counts.get(f["id"], 0)
        out.append(f)
    return out


@router.get("/verse-folders/{folder_id}")
async def get_folder(folder_id: str, _: User = Depends(get_current_user)):
    doc = await db.verse_folders.find_one({"_id": oid(folder_id)})
    if not doc:
        raise HTTPException(404, "Dossier introuvable")
    return Folder.from_mongo(doc).model_dump()


@router.post("/verse-folders")
async def create_folder(body: FolderIn, user: User = Depends(get_current_user)):
    if not body.name.strip():
        raise HTTPException(400, "Donne un nom au dossier")
    folder = Folder(name=body.name.strip()[:60], color=body.color, created_by_name=user.name, created_at=now_iso())
    res = await db.verse_folders.insert_one(folder.to_mongo())
    folder.id = str(res.inserted_id)
    return {**folder.model_dump(), "count": 0}


@router.patch("/verse-folders/{folder_id}")
async def update_folder(folder_id: str, body: FolderPatch, _: User = Depends(get_current_user)):
    changes = body.model_dump(exclude_none=True)
    if "name" in changes:
        if not changes["name"].strip():
            raise HTTPException(400, "Donne un nom au dossier")
        changes["name"] = changes["name"].strip()[:60]
    res = await db.verse_folders.find_one_and_update({"_id": oid(folder_id)}, {"$set": changes}, return_document=True)
    if not res:
        raise HTTPException(404, "Dossier introuvable")
    return Folder.from_mongo(res).model_dump()


@router.delete("/verse-folders/{folder_id}")
async def delete_folder(folder_id: str, _: User = Depends(get_current_user)):
    await db.verse_folders.delete_one({"_id": oid(folder_id)})
    await db.verses.delete_many({"folder_id": folder_id})
    return {"ok": True}


# ----------------------------- Verses ------------------------------------
@router.get("/verses/random")
async def random_verse(_: User = Depends(get_current_user)):
    """Un verset au hasard parmi tous nos dossiers (null s'il n'y en a pas)."""
    docs = await db.verses.aggregate([{"$sample": {"size": 1}}]).to_list(1)
    if not docs:
        return None
    verse = Verse.from_mongo(docs[0]).model_dump()
    folder = await db.verse_folders.find_one({"_id": oid(verse["folder_id"])})
    verse["folder_name"] = folder["name"] if folder else ""
    verse["folder_color"] = folder["color"] if folder else "#FAEDCD"
    return verse


@router.get("/verse-folders/{folder_id}/verses")
async def list_verses(folder_id: str, _: User = Depends(get_current_user)):
    docs = await db.verses.find({"folder_id": folder_id}).sort("created_at", -1).to_list(1000)
    return [Verse.from_mongo(d).model_dump() for d in docs]


@router.post("/verses")
async def create_verse(body: VerseIn, user: User = Depends(get_current_user)):
    if not body.reference.strip():
        raise HTTPException(400, "Indique la référence (ex : Jean 3:16)")
    await _folder_exists(body.folder_id)
    verse = Verse(folder_id=body.folder_id, reference=body.reference.strip(), text=body.text.strip(),
                  note=body.note.strip(), created_by_name=user.name, created_at=now_iso())
    res = await db.verses.insert_one(verse.to_mongo())
    verse.id = str(res.inserted_id)
    return verse.model_dump()


@router.patch("/verses/{verse_id}")
async def update_verse(verse_id: str, body: VersePatch, _: User = Depends(get_current_user)):
    changes = {k: v.strip() for k, v in body.model_dump(exclude_none=True).items()}
    if "reference" in changes and not changes["reference"]:
        raise HTTPException(400, "Indique la référence (ex : Jean 3:16)")
    if "folder_id" in changes:
        await _folder_exists(changes["folder_id"])
    res = await db.verses.find_one_and_update({"_id": oid(verse_id)}, {"$set": changes}, return_document=True)
    if not res:
        raise HTTPException(404, "Verset introuvable")
    return Verse.from_mongo(res).model_dump()


@router.delete("/verses/{verse_id}")
async def delete_verse(verse_id: str, _: User = Depends(get_current_user)):
    await db.verses.delete_one({"_id": oid(verse_id)})
    return {"ok": True}
