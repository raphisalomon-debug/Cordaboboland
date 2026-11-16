"""
Objectifs de couple + trophées.
Cycle : pending (proposé) -> active (l'autre accepte) | refused
        active -> completed (+ trophée choisi) -> visible sur l'étagère.
"""
import re
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from core import BaseDocument, User, db, get_current_user, now_iso, oid

router = APIRouter(prefix="/api", tags=["goals"])
KEY_RE = re.compile(r"^[a-z0-9_-]{1,40}$")  # trophy list lives in frontend/src/config/trophies.ts


class Goal(BaseDocument):
    title: str
    description: str = ""
    proposed_by: str
    proposed_by_name: str
    status: str = "pending"  # pending | active | refused | completed
    trophy: Optional[str] = None
    created_at: str
    accepted_at: Optional[str] = None
    completed_at: Optional[str] = None


class GoalIn(BaseModel):
    title: str
    description: str = ""


class CompleteIn(BaseModel):
    trophy: str


async def _get(goal_id: str) -> Goal:
    goal = Goal.from_mongo(await db.goals.find_one({"_id": oid(goal_id)}))
    if not goal:
        raise HTTPException(404, "Objectif introuvable")
    return goal


async def _set(goal_id: str, changes: dict) -> dict:
    res = await db.goals.find_one_and_update({"_id": oid(goal_id)}, {"$set": changes}, return_document=True)
    return Goal.from_mongo(res).model_dump()


@router.get("/goals")
async def list_goals(_: User = Depends(get_current_user)):
    docs = await db.goals.find().sort("created_at", -1).to_list(500)
    return [Goal.from_mongo(d).model_dump() for d in docs]


@router.post("/goals")
async def propose_goal(body: GoalIn, user: User = Depends(get_current_user)):
    if not body.title.strip():
        raise HTTPException(400, "Le titre est obligatoire")
    goal = Goal(title=body.title.strip(), description=body.description.strip()[:300],
                proposed_by=user.id, proposed_by_name=user.name, created_at=now_iso())
    res = await db.goals.insert_one(goal.to_mongo())
    goal.id = str(res.inserted_id)
    return goal.model_dump()


@router.post("/goals/{goal_id}/accept")
async def accept_goal(goal_id: str, user: User = Depends(get_current_user)):
    goal = await _get(goal_id)
    if goal.status != "pending" or goal.proposed_by == user.id:
        raise HTTPException(400, "C'est à l'autre de valider cet objectif")
    return await _set(goal_id, {"status": "active", "accepted_at": now_iso()})


@router.post("/goals/{goal_id}/refuse")
async def refuse_goal(goal_id: str, user: User = Depends(get_current_user)):
    goal = await _get(goal_id)
    if goal.status != "pending" or goal.proposed_by == user.id:
        raise HTTPException(400, "C'est à l'autre de répondre")
    return await _set(goal_id, {"status": "refused"})


@router.post("/goals/{goal_id}/complete")
async def complete_goal(goal_id: str, body: CompleteIn, _: User = Depends(get_current_user)):
    goal = await _get(goal_id)
    if goal.status != "active":
        raise HTTPException(400, "Seul un objectif actif peut être terminé")
    if not KEY_RE.match(body.trophy):
        raise HTTPException(400, "Trophée inconnu")
    return await _set(goal_id, {"status": "completed", "trophy": body.trophy, "completed_at": now_iso()})


@router.delete("/goals/{goal_id}")
async def delete_goal(goal_id: str, _: User = Depends(get_current_user)):
    await db.goals.delete_one({"_id": oid(goal_id)})
    return {"ok": True}


@router.get("/trophies")
async def list_trophies(_: User = Depends(get_current_user)):
    docs = await db.goals.find({"status": "completed"}).sort("completed_at", 1).to_list(500)
    return [Goal.from_mongo(d).model_dump() for d in docs]
