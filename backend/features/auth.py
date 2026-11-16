"""Connexion (email + mot de passe). Aucune inscription publique."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from core import User, db, get_current_user, make_token, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginIn(BaseModel):
    email: str
    password: str


@router.post("/login")
async def login(body: LoginIn):
    user = User.from_mongo(await db.users.find_one({"email": body.email.lower().strip()}))
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "Email ou mot de passe incorrect")
    return {"token": make_token(user.id), "user": user.public()}


@router.get("/me")
async def me(user: User = Depends(get_current_user)):
    return user.public()
