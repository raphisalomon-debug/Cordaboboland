"""Cémantix : course quotidienne à deux, avec vérification du mot.

Chacun joue sur cemantix.certitudes.org, puis tape dans l'app le mot qu'il a trouvé. L'app compare
avec la solution du jour publiée sur alucare.fr. Le premier à avoir envoyé le BON mot dans la journée
est roi / reine du jour (c'est l'heure d'envoi qui compte).

Garde-fous :
- on ne juge un mot que si la page alucare est bien celle du jour (même numéro de Cémantix) ;
  sinon le mot reste « en attente » et sera vérifié dès que la solution du jour est publiée ;
- le mot tapé n'est jamais renvoyé par l'API, l'autre joueur ne voit que « a envoyé un mot ».
La journée change à minuit, heure de Paris, comme le mot de Cémantix.
"""
import html as htmllib
import logging
import re
import time
import unicodedata
from datetime import date, datetime
from typing import Optional
from zoneinfo import ZoneInfo

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from core import User, db, get_current_user, now_iso

logger = logging.getLogger("maisons.cemantix")
router = APIRouter(prefix="/api/cemantix", tags=["cemantix"])

GAME_URL = "https://cemantix.certitudes.org/"
SOURCE_URL = "https://www.alucare.fr/cemantix-indice-mot-du-jour-et-solution/"
TZ = ZoneInfo("Europe/Paris")
# Repère de numérotation : le Cémantix n° 1700 était celui du 27 octobre 2026 (+1 par jour).
ANCHOR_NUMBER, ANCHOR_DATE = 1700, date(2026, 10, 27)
RETRY_SECONDS = 120  # on ne redemande pas la page à alucare plus souvent que ça
_last_try: dict[str, float] = {}


def _today() -> str:
    return datetime.now(TZ).strftime("%Y-%m-%d")


def puzzle_number(day: str) -> int:
    return ANCHOR_NUMBER + (date.fromisoformat(day) - ANCHOR_DATE).days


def norm(word: str) -> str:
    """Minuscules, sans accents ni espaces : « Épée » == « epee »."""
    w = (word or "").strip().lower().replace("œ", "oe").replace("æ", "ae")
    w = unicodedata.normalize("NFKD", w)
    return re.sub(r"[^a-z]", "", w)


# --------------------------------------------------------------------------
# Lecture de la page alucare
# --------------------------------------------------------------------------
def _text(fragment: str) -> str:
    return re.sub(r"\s+", " ", htmllib.unescape(re.sub(r"<[^>]+>", " ", fragment))).strip()


def parse_alucare(page: str) -> tuple[Optional[int], Optional[str]]:
    """Retourne (numéro du Cémantix affiché, mot solution normalisé) ; None si introuvable.

    On ancre la recherche sur la phrase « Voici la réponse du jour » : la page contient aussi
    des mots d'indices et, dans les commentaires, d'anciennes solutions qu'il ne faut pas prendre.
    """
    text = _text(page)
    m = re.search(r"jour\s+num[ée]ro\s+(\d{3,5})", text, re.I) or re.search(r"C[ée]mantix\s+(\d{3,5})\s+indice", text, re.I)
    number = int(m.group(1)) if m else None

    anchor = re.search(r"Voici\s+la\s+r(?:é|&eacute;|&#233;|e)ponse\s+du\s+jour", page, re.I)
    word = None
    if anchor:
        li = re.search(r"<li[^>]*>(.*?)</li>", page[anchor.end(): anchor.end() + 4000], re.S | re.I)
        if li:
            m2 = re.match(r"[^\W\d_]+(?:[-'’][^\W\d_]+)*", _text(li.group(1)), re.U)
            candidate = norm(m2.group(0)) if m2 else ""
            if 2 <= len(candidate) <= 40:
                word = candidate
    return number, word


def _masked(page: str) -> str:
    """Extrait de structure pour les journaux, avec tout le texte masqué (pas de spoil)."""
    m = re.search(r"Voici\s+la\s+r", page, re.I)
    seg = page[max(0, (m.start() if m else 0) - 150): (m.start() if m else 0) + 500]
    return re.sub(r">([^<]+)<", ">T<", seg)[:600]


async def _fetch_page() -> str:
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
        "Accept-Language": "fr-FR,fr;q=0.9",
    }
    async with httpx.AsyncClient(timeout=10, follow_redirects=True, headers=headers) as client:
        r = await client.get(SOURCE_URL)
        if r.status_code != 200:
            raise RuntimeError(f"alucare a répondu {r.status_code}")
        return r.text


async def solution_for(day: str) -> Optional[str]:
    """Solution (normalisée) du jour, ou None si elle n'est pas (encore) disponible."""
    doc = await db.cemantix_solutions.find_one({"date": day})
    if doc:
        return doc["word"]
    now = time.monotonic()
    if now - _last_try.get(day, -1e9) < RETRY_SECONDS:
        return None
    _last_try[day] = now
    try:
        page = await _fetch_page()
    except Exception as exc:  # réseau, blocage, etc. : on réessaiera plus tard
        logger.warning("alucare : lecture impossible (%s)", exc)
        return None
    number, word = parse_alucare(page)
    expected = puzzle_number(day)
    if number != expected:
        logger.info("alucare : la page affiche le n° %s, on attend le n° %s (pas encore à jour)", number, expected)
        return None
    if not word:
        logger.warning("alucare : n° %s trouvé mais pas la solution. Structure : %s", number, _masked(page))
        return None
    await db.cemantix_solutions.update_one({"date": day}, {"$set": {"number": number, "word": word}}, upsert=True)
    logger.info("alucare : solution du n° %s enregistrée", number)
    return word


GAME_SCORE_URL = GAME_URL + "score"


async def game_check(raw_word: str) -> Optional[bool]:
    """Demande au jeu lui-même (comme le fait la page de Cémantix) si ce mot est la solution du jour.

    True = bon mot, False = pas le bon mot (ou mot inconnu du jeu), None = impossible de savoir (réseau, format inattendu).
    On ne garde rien du résultat, à part le verdict.
    """
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
        "Origin": GAME_URL.rstrip("/"),
        "Referer": GAME_URL,
        "Accept": "application/json",
    }
    try:
        async with httpx.AsyncClient(timeout=8, follow_redirects=True, headers=headers) as client:
            r = await client.post(GAME_SCORE_URL, data={"word": raw_word})
        data = r.json()
    except Exception as exc:
        logger.warning("jeu : vérification impossible (%s)", exc)
        return None
    if isinstance(data, dict):
        if "percentile" in data or "score" in data:
            pct, score = data.get("percentile"), data.get("score")
            try:
                if (pct is not None and int(pct) >= 1000) or (score is not None and float(score) >= 0.9999):
                    return True
                return False
            except (TypeError, ValueError):
                pass
        if data.get("error"):
            return False  # mot inconnu du jeu : ce n'est pas la solution
    logger.warning("jeu : réponse inattendue (clés : %s)", sorted(data.keys()) if isinstance(data, dict) else type(data).__name__)
    return None


async def verdict(day: str, norm_word: str, raw_word: str) -> Optional[bool]:
    """Bon mot ? True / False, ou None tant qu'aucune source ne peut répondre (alucare pas à jour, jeu injoignable)."""
    solution = await solution_for(day)
    if solution is not None:
        return norm_word == solution
    return await game_check(raw_word)


# --------------------------------------------------------------------------
# État de la course
# --------------------------------------------------------------------------
async def _resolve_pending(day: str) -> None:
    """Vérifie les mots restés « en attente » dès qu'une source (alucare ou le jeu) peut répondre."""
    pending = await db.cemantix_claims.find({"date": day, "status": "pending"}).to_list(10)
    for c in pending:
        ok = await verdict(day, c.get("word", ""), c.get("raw") or c.get("word", ""))
        if ok is None:
            return
        await db.cemantix_claims.update_one({"_id": c["_id"]}, {"$set": {"status": "verified" if ok else "rejected"}})


def _public(claim: dict, rank: int, roles: dict) -> dict:
    return {
        "user_id": claim["user_id"],
        "name": claim["user_name"],
        "role": roles.get(claim["user_id"], "partner"),
        "found_at": claim["found_at"],
        "rank": rank,
    }


async def _state(user: User) -> dict:
    today = _today()
    await _resolve_pending(today)
    users = await db.users.find({}).to_list(10)
    roles = {str(u["_id"]): u.get("role", "partner") for u in users}
    # Seules les déclarations vérifiées comptent (les anciennes, sans statut, sont ignorées).
    claims = await db.cemantix_claims.find({}).to_list(20000)

    by_date: dict[str, list[dict]] = {}
    for c in claims:
        if c.get("status") == "verified":
            by_date.setdefault(c["date"], []).append(c)
    wins: dict[str, int] = {}
    for day_claims in by_date.values():
        first = min(day_claims, key=lambda c: c["found_at"])
        wins[first["user_id"]] = wins.get(first["user_id"], 0) + 1

    ranked = [_public(c, i + 1, roles) for i, c in enumerate(sorted(by_date.get(today, []), key=lambda c: c["found_at"]))]
    todays = [c for c in claims if c["date"] == today]
    mine = next((c for c in todays if c["user_id"] == user.id), None)
    return {
        "date": today,
        "number": puzzle_number(today),
        "link": GAME_URL,
        "claims": ranked,
        "winner": ranked[0] if ranked else None,
        "me_status": mine.get("status") if mine else None,  # None | pending | verified | rejected
        "pending": [{"user_id": c["user_id"], "name": c["user_name"]} for c in todays if c.get("status") == "pending"],
        "solution_ready": bool(await db.cemantix_solutions.find_one({"date": today})),
        "scores": [
            {"user_id": str(u["_id"]), "name": u["name"], "role": u.get("role", "partner"),
             "wins": wins.get(str(u["_id"]), 0)}
            for u in sorted(users, key=lambda u: 0 if u.get("role") == "admin" else 1)
        ],
    }


@router.get("/today")
async def today(user: User = Depends(get_current_user)):
    return await _state(user)


class FoundIn(BaseModel):
    word: str


@router.post("/found")
async def found(body: FoundIn, user: User = Depends(get_current_user)):
    """Envoie le mot trouvé. Vérifié tout de suite si la solution du jour est connue, sinon mis en attente."""
    word = norm(body.word)
    if len(word) < 2:
        raise HTTPException(400, "Écris le mot que tu as trouvé")
    day = _today()
    existing = await db.cemantix_claims.find_one({"date": day, "user_id": user.id})
    if existing and existing.get("status") == "verified":
        return await _state(user)

    raw = re.sub(r"\s+", " ", body.word.strip().lower())[:60]
    ok = await verdict(day, word, raw)
    if ok is False:
        raise HTTPException(400, "Ce n'est pas le bon mot, cherche encore !")
    status = "verified" if ok else "pending"
    keep_time = existing and existing.get("status") == "pending" and existing.get("word") == word
    found_at = existing["found_at"] if keep_time else now_iso()
    await db.cemantix_claims.update_one(
        {"date": day, "user_id": user.id},
        {"$set": {"user_name": user.name, "found_at": found_at, "word": word, "raw": raw, "status": status}},
        upsert=True,
    )
    return await _state(user)


@router.delete("/found")
async def undo(user: User = Depends(get_current_user)):
    """Annule sa propre déclaration du jour."""
    await db.cemantix_claims.delete_one({"date": _today(), "user_id": user.id})
    return await _state(user)
