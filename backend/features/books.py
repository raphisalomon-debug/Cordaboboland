"""Librairie : petits livres écrits par l'admin (chapitres), lisibles par nous deux."""
from datetime import datetime, timezone
from typing import Optional

import io
import re

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel

from core import BaseDocument, User, db, get_current_user, now_iso, oid, put_file, require_admin

router = APIRouter(prefix="/api", tags=["books"])
MAX_CONTENT = 100_000
COVER_RE = re.compile(r"^uploads/[\w-]+/[\w.-]+$")


class Book(BaseDocument):
    title: str
    color: str = "#F8D8E4"
    author_name: str
    cover_path: Optional[str] = None  # photo de la couverture (facultative)
    created_at: str
    updated_at: str


class Chapter(BaseDocument):
    book_id: str
    title: str
    content: str = ""
    order: int = 0
    created_at: str


class BookIn(BaseModel):
    name: str  # same shape as the folder sheet: name + color
    color: str = "#F8D8E4"
    cover_path: Optional[str] = None


class BookPatch(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    cover_path: Optional[str] = None
    remove_cover: bool = False


class ChapterIn(BaseModel):
    title: str
    content: str = ""


class ChapterPatch(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None


async def _book(book_id: str) -> dict:
    doc = await db.books.find_one({"_id": oid(book_id)})
    if not doc:
        raise HTTPException(404, "Livre introuvable")
    return doc


async def _touch(book_id: str) -> None:
    await db.books.update_one({"_id": oid(book_id)}, {"$set": {"updated_at": now_iso()}})


def _check_chapter(title: Optional[str], content: Optional[str]) -> None:
    if title is not None and not title.strip():
        raise HTTPException(400, "Donne un titre au chapitre")
    if content is not None and len(content) > MAX_CONTENT:
        raise HTTPException(400, "Chapitre trop long")


# ------------------------------ Books ------------------------------------
@router.post("/books/cover")
async def upload_cover(file: UploadFile = File(...), user: User = Depends(require_admin)):
    """Photo de couverture : réduite (900 px) avant d'être gardée. Accepte aussi les HEIC d'iPhone."""
    from PIL import Image, ImageOps

    try:
        from pillow_heif import register_heif_opener

        register_heif_opener()
    except Exception:
        pass
    raw = await file.read()
    if len(raw) > 15 * 1024 * 1024:
        raise HTTPException(400, "Photo trop lourde (15 Mo max)")
    try:
        img = ImageOps.exif_transpose(Image.open(io.BytesIO(raw))).convert("RGB")
        img.thumbnail((900, 1300))
        out = io.BytesIO()
        img.save(out, "JPEG", quality=82, optimize=True)
    except Exception:
        raise HTTPException(400, "Ce fichier n'est pas une photo lisible")
    return {"path": await put_file(user.id, out.getvalue(), "image/jpeg", "jpg")}


def _check_cover(path: Optional[str]) -> None:
    if path and not COVER_RE.match(path):
        raise HTTPException(400, "Photo invalide")


@router.get("/books")
async def list_books(_: User = Depends(get_current_user)):
    docs = await db.books.find().sort("created_at", 1).to_list(500)
    counts = {c["_id"]: c["n"] async for c in db.chapters.aggregate([{"$group": {"_id": "$book_id", "n": {"$sum": 1}}}])}
    out = []
    for d in docs:
        b = Book.from_mongo(d).model_dump()
        b["chapter_count"] = counts.get(b["id"], 0)
        out.append(b)
    return out


@router.get("/books/{book_id}")
async def get_book(book_id: str, _: User = Depends(get_current_user)):
    book = Book.from_mongo(await _book(book_id)).model_dump()
    chapters = await db.chapters.find({"book_id": book_id}).sort("order", 1).to_list(1000)
    book["chapters"] = [Chapter.from_mongo(c).model_dump() for c in chapters]
    return book


@router.post("/books")
async def create_book(body: BookIn, user: User = Depends(require_admin)):
    if not body.name.strip():
        raise HTTPException(400, "Donne un titre au livre")
    _check_cover(body.cover_path)
    now = now_iso()
    book = Book(title=body.name.strip()[:80], color=body.color, author_name=user.name, cover_path=body.cover_path, created_at=now, updated_at=now)
    res = await db.books.insert_one(book.to_mongo())
    book.id = str(res.inserted_id)
    return {**book.model_dump(), "chapter_count": 0}


@router.patch("/books/{book_id}")
async def update_book(book_id: str, body: BookPatch, _: User = Depends(require_admin)):
    changes = {}
    if body.name is not None:
        if not body.name.strip():
            raise HTTPException(400, "Donne un titre au livre")
        changes["title"] = body.name.strip()[:80]
    if body.color is not None:
        changes["color"] = body.color
    _check_cover(body.cover_path)
    if body.cover_path:
        changes["cover_path"] = body.cover_path
    elif body.remove_cover:
        changes["cover_path"] = None
    changes["updated_at"] = now_iso()
    res = await db.books.find_one_and_update({"_id": oid(book_id)}, {"$set": changes}, return_document=True)
    if not res:
        raise HTTPException(404, "Livre introuvable")
    return Book.from_mongo(res).model_dump()


@router.delete("/books/{book_id}")
async def delete_book(book_id: str, _: User = Depends(require_admin)):
    await db.books.delete_one({"_id": oid(book_id)})
    await db.chapters.delete_many({"book_id": book_id})
    return {"ok": True}


# ----------------------------- Chapters ----------------------------------
@router.post("/books/{book_id}/chapters")
async def add_chapter(book_id: str, body: ChapterIn, _: User = Depends(require_admin)):
    await _book(book_id)
    _check_chapter(body.title, body.content)
    last = await db.chapters.find_one({"book_id": book_id}, sort=[("order", -1)])
    chapter = Chapter(book_id=book_id, title=body.title.strip()[:120], content=body.content,
                      order=(last["order"] + 1) if last else 0, created_at=now_iso())
    res = await db.chapters.insert_one(chapter.to_mongo())
    chapter.id = str(res.inserted_id)
    await _touch(book_id)
    return chapter.model_dump()


@router.patch("/chapters/{chapter_id}")
async def update_chapter(chapter_id: str, body: ChapterPatch, _: User = Depends(require_admin)):
    _check_chapter(body.title, body.content)
    changes = body.model_dump(exclude_none=True)
    if "title" in changes:
        changes["title"] = changes["title"].strip()[:120]
    res = await db.chapters.find_one_and_update({"_id": oid(chapter_id)}, {"$set": changes}, return_document=True)
    if not res:
        raise HTTPException(404, "Chapitre introuvable")
    await _touch(res["book_id"])
    return Chapter.from_mongo(res).model_dump()


@router.delete("/chapters/{chapter_id}")
async def delete_chapter(chapter_id: str, _: User = Depends(require_admin)):
    doc = await db.chapters.find_one_and_delete({"_id": oid(chapter_id)})
    if doc:
        await _touch(doc["book_id"])
    return {"ok": True}
