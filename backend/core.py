"""
Shared core: database, document base model, authentication helpers and
file storage helpers. Every feature router (backend/features/*.py) imports
from here.
"""
import logging
import os
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Annotated, Optional

import bcrypt
import jwt
from bson import Binary, ObjectId
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, Request
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, BeforeValidator, ConfigDict, Field

load_dotenv(Path(__file__).parent / ".env")
logger = logging.getLogger("maisons")

# --------------------------------------------------------------------------
# Database
# --------------------------------------------------------------------------
client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def oid(value: str) -> ObjectId:
    """Parse an id coming from a URL, 404 when malformed."""
    if not ObjectId.is_valid(value):
        raise HTTPException(404, "Introuvable")
    return ObjectId(value)


PyObjectId = Annotated[str, BeforeValidator(lambda v: str(v) if isinstance(v, ObjectId) else v)]


class BaseDocument(BaseModel):
    """Base for every Mongo document: maps `_id` -> `id` (string)."""

    model_config = ConfigDict(populate_by_name=True)
    id: Optional[PyObjectId] = Field(default=None, alias="_id")

    @classmethod
    def from_mongo(cls, doc):
        return cls.model_validate(doc) if doc else None

    def to_mongo(self) -> dict:
        return self.model_dump(exclude={"id"})


# --------------------------------------------------------------------------
# Users & auth (2 accounts only, seeded from .env, no public sign-up)
# --------------------------------------------------------------------------
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_DAYS = 30


class User(BaseDocument):
    email: str
    name: str
    role: str  # "admin" (can open Réglages) or "partner"
    password_hash: str

    def public(self) -> dict:
        return {"id": self.id, "email": self.email, "name": self.name, "role": self.role}


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    return bcrypt.checkpw(pw.encode(), hashed.encode())


def make_token(user_id: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(days=JWT_DAYS)
    return jwt.encode({"sub": user_id, "exp": exp}, JWT_SECRET, algorithm="HS256")


async def get_current_user(request: Request) -> User:
    """Token from `Authorization: Bearer` header, or `?token=` (web <img>)."""
    header = request.headers.get("Authorization", "")
    token = header[7:] if header.startswith("Bearer ") else request.query_params.get("token")
    if not token:
        raise HTTPException(401, "Non connecté")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Session expirée")
    user = User.from_mongo(await db.users.find_one({"_id": oid(payload["sub"])}))
    if not user:
        raise HTTPException(401, "Compte introuvable")
    return user


async def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(403, "Réservé à l'administrateur")
    return user


async def get_partner(user: User) -> User:
    return User.from_mongo(await db.users.find_one({"_id": {"$ne": ObjectId(user.id)}}))


async def seed_users() -> None:
    """Create / refresh the two accounts from .env (idempotent)."""
    for prefix, role in (("ADMIN", "admin"), ("PARTNER", "partner")):
        email = os.environ[f"{prefix}_EMAIL"].lower().strip()
        name = os.environ[f"{prefix}_NAME"]
        password = os.environ[f"{prefix}_PASSWORD"]
        existing = await db.users.find_one({"email": email})
        if not existing:
            user = User(email=email, name=name, role=role, password_hash=hash_password(password))
            await db.users.insert_one(user.to_mongo())
        elif not verify_password(password, existing["password_hash"]) or existing.get("role") != role:
            await db.users.update_one(
                {"_id": existing["_id"]},
                {"$set": {"password_hash": hash_password(password), "role": role, "name": name}},
            )


# --------------------------------------------------------------------------
# File storage (house images): kept directly in MongoDB, no external service.
# Images are limited to 8 MB by the upload route, well under Mongo's 16 MB cap.
# --------------------------------------------------------------------------
async def put_file(owner_id: str, data: bytes, content_type: str, ext: str = "png") -> str:
    """Store a file and return its path (used as `image_path` and in /api/files/<path>)."""
    path = f"uploads/{owner_id}/{uuid.uuid4()}.{ext}"
    await db.files.insert_one(
        {"storage_path": path, "owner_id": owner_id, "content_type": content_type, "data": Binary(data)}
    )
    return path


async def get_file_data(path: str) -> Optional[tuple[bytes, str]]:
    record = await db.files.find_one({"storage_path": path})
    if not record or "data" not in record:
        return None
    return bytes(record["data"]), record.get("content_type") or "application/octet-stream"
