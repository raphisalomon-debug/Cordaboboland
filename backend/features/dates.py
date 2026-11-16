"""Nos dates : idées de sorties / rendez-vous à faire ensemble."""
import re
from datetime import datetime
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from core import BaseDocument, User, db, get_current_user, now_iso, oid

router = APIRouter(prefix="/api/dates", tags=["dates"])
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


class DateIdea(BaseDocument):
    title: str
    note: str = ""
    planned_date: Optional[str] = None  # "YYYY-MM-DD"
    done: bool = False
    created_by: str
    created_by_name: str
    created_at: str
    done_at: Optional[str] = None


class DateIn(BaseModel):
    title: str
    note: str = ""
    planned_date: Optional[str] = None


class DatePatch(BaseModel):
    title: Optional[str] = None
    note: Optional[str] = None
    planned_date: Optional[str] = None
    done: Optional[bool] = None


def _check_date(d: Optional[str]) -> None:
    if not d:
        return
    try:
        if not DATE_RE.match(d):
            raise ValueError
        datetime.strptime(d, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(400, "Date invalide")


@router.get("")
async def list_dates(_: User = Depends(get_current_user)):
    docs = await db.dates.find().sort("created_at", -1).to_list(500)
    return [DateIdea.from_mongo(d).model_dump() for d in docs]


@router.post("")
async def create_date(body: DateIn, user: User = Depends(get_current_user)):
    if not body.title.strip():
        raise HTTPException(400, "Le titre est obligatoire")
    _check_date(body.planned_date)
    idea = DateIdea(title=body.title.strip(), note=body.note.strip(), planned_date=body.planned_date or None,
                    created_by=user.id, created_by_name=user.name, created_at=now_iso())
    res = await db.dates.insert_one(idea.to_mongo())
    idea.id = str(res.inserted_id)
    return idea.model_dump()


@router.patch("/{date_id}")
async def update_date(date_id: str, body: DatePatch, _: User = Depends(get_current_user)):
    changes = body.model_dump(exclude_unset=True)
    if "title" in changes:
        if not (changes["title"] or "").strip():
            raise HTTPException(400, "Le titre est obligatoire")
        changes["title"] = changes["title"].strip()
    if "planned_date" in changes:
        changes["planned_date"] = changes["planned_date"] or None
        _check_date(changes["planned_date"])
    if "done" in changes:
        changes["done_at"] = now_iso() if changes["done"] else None
    res = await db.dates.find_one_and_update({"_id": oid(date_id)}, {"$set": changes}, return_document=True)
    if not res:
        raise HTTPException(404, "Idée introuvable")
    return DateIdea.from_mongo(res).model_dump()


@router.delete("/{date_id}")
async def delete_date(date_id: str, _: User = Depends(get_current_user)):
    await db.dates.delete_one({"_id": ObjectId(oid(date_id))})
    return {"ok": True}
