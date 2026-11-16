"""Cémantix : course quotidienne à deux.

Chacun joue sur cemantix.certitudes.org, puis appuie sur « J'ai trouvé ! » dans l'app.
Le premier à l'avoir déclaré dans la journée est roi / reine du jour. L'app ne peut pas
vérifier la réponse (le site du jeu n'a pas d'API) : c'est une course « sur l'honneur ».
La journée change à minuit, heure de Paris, comme le mot de Cémantix.
"""
from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends

from core import User, db, get_current_user, now_iso

router = APIRouter(prefix="/api/cemantix", tags=["cemantix"])
GAME_URL = "https://cemantix.certitudes.org/"
TZ = ZoneInfo("Europe/Paris")


def _today() -> str:
    return datetime.now(TZ).strftime("%Y-%m-%d")


def _public(claim: dict, rank: int, roles: dict) -> dict:
    return {
        "user_id": claim["user_id"],
        "name": claim["user_name"],
        "role": roles.get(claim["user_id"], "partner"),
        "found_at": claim["found_at"],
        "rank": rank,
    }


async def _state(user: User) -> dict:
    users = await db.users.find({}).to_list(10)
    roles = {str(u["_id"]): u.get("role", "partner") for u in users}
    claims = await db.cemantix_claims.find({}).to_list(20000)

    # Premier de chaque jour (ordre d'arrivée), pour les scores.
    by_date: dict[str, list[dict]] = {}
    for c in claims:
        by_date.setdefault(c["date"], []).append(c)
    wins: dict[str, int] = {}
    for day_claims in by_date.values():
        first = min(day_claims, key=lambda c: c["found_at"])
        wins[first["user_id"]] = wins.get(first["user_id"], 0) + 1

    today = _today()
    today_claims = sorted(by_date.get(today, []), key=lambda c: c["found_at"])
    ranked = [_public(c, i + 1, roles) for i, c in enumerate(today_claims)]
    return {
        "date": today,
        "link": GAME_URL,
        "claims": ranked,
        "winner": ranked[0] if ranked else None,
        "me_found": any(c["user_id"] == user.id for c in ranked),
        "scores": [
            {"user_id": str(u["_id"]), "name": u["name"], "role": u.get("role", "partner"),
             "wins": wins.get(str(u["_id"]), 0)}
            for u in sorted(users, key=lambda u: 0 if u.get("role") == "admin" else 1)
        ],
    }


@router.get("/today")
async def today(user: User = Depends(get_current_user)):
    return await _state(user)


@router.post("/found")
async def found(user: User = Depends(get_current_user)):
    """« J'ai trouvé ! » : enregistre l'heure (une seule fois par jour et par personne)."""
    await db.cemantix_claims.update_one(
        {"date": _today(), "user_id": user.id},
        {"$setOnInsert": {"user_name": user.name, "found_at": now_iso()}},
        upsert=True,
    )
    return await _state(user)


@router.delete("/found")
async def undo(user: User = Depends(get_current_user)):
    """Annule sa propre déclaration du jour (appui par erreur)."""
    await db.cemantix_claims.delete_one({"date": _today(), "user_id": user.id})
    return await _state(user)
