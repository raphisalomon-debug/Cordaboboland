# Regression tests: auth, houses (admin perms), dates, otters, goals/trophies
import os
import pytest
import requests
from dotenv import dotenv_values

FE_ENV = dotenv_values("/app/frontend/.env")
BASE_URL = (os.environ.get("EXPO_PUBLIC_BACKEND_URL") or FE_ENV["EXPO_PUBLIC_BACKEND_URL"]).rstrip("/")
RAPHI = {"email": "raphi.salomon@gmail.com", "password": "Raphi2026!"}
FIONA = {"email": "fiona.07.tanner@gmail.com", "password": "Fiona2026!"}
CREATED_OTTERS = []


def _login(creds):
    r = requests.post(f"{BASE_URL}/api/auth/login", json=creds, timeout=20)
    assert r.status_code == 200, r.text
    return r.json()


@pytest.fixture(scope="module")
def raphi():
    d = _login(RAPHI)
    s = requests.Session()
    s.headers["Authorization"] = f"Bearer {d['token']}"
    s.user = d["user"]
    return s


@pytest.fixture(scope="module")
def fiona():
    d = _login(FIONA)
    s = requests.Session()
    s.headers["Authorization"] = f"Bearer {d['token']}"
    s.user = d["user"]
    return s


# --- Auth
class TestAuth:
    def test_login_both(self, raphi, fiona):
        assert raphi.user["role"] == "admin" and raphi.user["name"]
        assert fiona.user["role"] == "partner"
        assert "password_hash" not in raphi.user

    def test_login_case_insensitive_email(self):
        r = requests.post(f"{BASE_URL}/api/auth/login",
                          json={"email": RAPHI["email"].upper(), "password": RAPHI["password"]})
        assert r.status_code == 200

    def test_wrong_password(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": RAPHI["email"], "password": "bad"})
        assert r.status_code == 401

    def test_me(self, raphi, fiona):
        r = raphi.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 200 and r.json()["email"] == RAPHI["email"]
        assert fiona.get(f"{BASE_URL}/api/auth/me").json()["role"] == "partner"

    def test_me_no_token(self):
        assert requests.get(f"{BASE_URL}/api/auth/me").status_code == 401


# --- Houses
class TestHouses:
    def test_list_8(self, raphi):
        r = raphi.get(f"{BASE_URL}/api/houses")
        assert r.status_code == 200
        keys = {h["key"] for h in r.json()}
        assert keys == {"avent", "photos", "dates", "loutres", "objectifs", "trophees", "versets", "librairie"}
        assert all("_id" not in h for h in r.json())

    def test_fiona_forbidden(self, fiona):
        assert fiona.patch(f"{BASE_URL}/api/houses/dates", json={"name": "X"}).status_code == 403
        assert fiona.put(f"{BASE_URL}/api/houses/positions", json=[{"key": "dates", "x": .5, "y": .5}]).status_code == 403
        r = fiona.post(f"{BASE_URL}/api/houses/dates/image", files={"file": ("a.png", b"\x89PNG", "image/png")})
        assert r.status_code == 403
        assert fiona.delete(f"{BASE_URL}/api/houses/dates/image").status_code == 403

    def test_admin_patch_and_restore(self, raphi):
        orig = next(h for h in raphi.get(f"{BASE_URL}/api/houses").json() if h["key"] == "dates")
        r = raphi.patch(f"{BASE_URL}/api/houses/dates", json={"name": "TEST_Dates", "visible": False})
        assert r.status_code == 200 and r.json()["name"] == "TEST_Dates" and r.json()["visible"] is False
        got = next(h for h in raphi.get(f"{BASE_URL}/api/houses").json() if h["key"] == "dates")
        assert got["name"] == "TEST_Dates"
        assert raphi.patch(f"{BASE_URL}/api/houses/dates", json={"name": "  "}).status_code == 400
        assert raphi.patch(f"{BASE_URL}/api/houses/nope", json={"name": "a"}).status_code == 404
        raphi.patch(f"{BASE_URL}/api/houses/dates", json={"name": orig["name"], "visible": orig["visible"]})

    def test_positions_clamp_and_restore(self, raphi):
        orig = next(h for h in raphi.get(f"{BASE_URL}/api/houses").json() if h["key"] == "loutres")
        r = raphi.put(f"{BASE_URL}/api/houses/positions", json=[{"key": "loutres", "x": 2, "y": -1}])
        assert r.status_code == 200
        got = next(h for h in raphi.get(f"{BASE_URL}/api/houses").json() if h["key"] == "loutres")
        assert got["x"] == 0.95 and got["y"] == 0.05
        raphi.put(f"{BASE_URL}/api/houses/positions", json=[{"key": "loutres", "x": orig["x"], "y": orig["y"]}])

    def test_upload_non_image_400(self, raphi):
        r = raphi.post(f"{BASE_URL}/api/houses/dates/image", files={"file": ("a.txt", b"hello", "text/plain")})
        assert r.status_code == 400


# --- Dates
class TestDates:
    def test_crud(self, raphi, fiona):
        r = raphi.post(f"{BASE_URL}/api/dates", json={"title": "TEST_Picnic", "planned_date": "2026-03-14", "note": "n"})
        assert r.status_code == 200
        d = r.json()
        assert d["title"] == "TEST_Picnic" and d["done"] is False and d["planned_date"] == "2026-03-14"
        assert any(x["id"] == d["id"] for x in fiona.get(f"{BASE_URL}/api/dates").json())
        r = fiona.patch(f"{BASE_URL}/api/dates/{d['id']}", json={"done": True})
        assert r.status_code == 200 and r.json()["done"] is True and r.json()["done_at"]
        r = raphi.patch(f"{BASE_URL}/api/dates/{d['id']}", json={"done": False})
        assert r.json()["done"] is False and r.json()["done_at"] is None
        assert raphi.delete(f"{BASE_URL}/api/dates/{d['id']}").status_code == 200
        assert not any(x["id"] == d["id"] for x in raphi.get(f"{BASE_URL}/api/dates").json())

    def test_invalid(self, raphi):
        assert raphi.post(f"{BASE_URL}/api/dates", json={"title": "TEST_x", "planned_date": "14/03/2026"}).status_code == 400
        assert raphi.post(f"{BASE_URL}/api/dates", json={"title": "  "}).status_code == 400
        assert raphi.patch(f"{BASE_URL}/api/dates/badid", json={"done": True}).status_code == 404

    def test_impossible_date_rejected(self, raphi):
        r = raphi.post(f"{BASE_URL}/api/dates", json={"title": "TEST_bad", "planned_date": "2026-13-45"})
        if r.status_code == 200:
            raphi.delete(f"{BASE_URL}/api/dates/{r.json()['id']}")
        assert r.status_code == 400, "calendar-invalid date accepted"


# --- Otters
class TestOtters:
    def test_send_unread_seen(self, raphi, fiona):
        fiona.post(f"{BASE_URL}/api/otters/seen")
        r = raphi.post(f"{BASE_URL}/api/otters", json={"otter_key": "hug"})
        assert r.status_code == 200
        o = r.json()
        CREATED_OTTERS.append(o["id"])
        assert o["to_id"] == fiona.user["id"] and o["from_id"] == raphi.user["id"]
        u = fiona.get(f"{BASE_URL}/api/otters/unread").json()
        assert u["count"] >= 1 and u["latest"]["id"] == o["id"]
        assert fiona.post(f"{BASE_URL}/api/otters/seen").status_code == 200
        assert fiona.get(f"{BASE_URL}/api/otters/unread").json()["count"] == 0
        assert any(x["id"] == o["id"] for x in fiona.get(f"{BASE_URL}/api/otters").json())

    def test_invalid_key(self, raphi):
        assert raphi.post(f"{BASE_URL}/api/otters", json={"otter_key": "Bad Key!"}).status_code == 400


# --- Goals & trophies
class TestGoals:
    def test_accept_complete(self, raphi, fiona):
        g = raphi.post(f"{BASE_URL}/api/goals", json={"title": "TEST_Marathon", "description": "d"}).json()
        assert g["status"] == "pending"
        assert raphi.post(f"{BASE_URL}/api/goals/{g['id']}/accept").status_code == 400
        assert raphi.post(f"{BASE_URL}/api/goals/{g['id']}/complete", json={"trophy": "cup"}).status_code == 400
        r = fiona.post(f"{BASE_URL}/api/goals/{g['id']}/accept")
        assert r.status_code == 200 and r.json()["status"] == "active"
        assert raphi.post(f"{BASE_URL}/api/goals/{g['id']}/complete", json={"trophy": "BAD KEY"}).status_code == 400
        r = raphi.post(f"{BASE_URL}/api/goals/{g['id']}/complete", json={"trophy": "cup"})
        assert r.status_code == 200 and r.json()["status"] == "completed" and r.json()["completed_at"]
        tro = raphi.get(f"{BASE_URL}/api/trophies").json()
        assert any(t["id"] == g["id"] and t["trophy"] == "cup" for t in tro)
        raphi.delete(f"{BASE_URL}/api/goals/{g['id']}")
        assert not any(t["id"] == g["id"] for t in raphi.get(f"{BASE_URL}/api/trophies").json())

    def test_refuse(self, raphi, fiona):
        g = raphi.post(f"{BASE_URL}/api/goals", json={"title": "TEST_Refuse"}).json()
        assert raphi.post(f"{BASE_URL}/api/goals/{g['id']}/refuse").status_code == 400
        r = fiona.post(f"{BASE_URL}/api/goals/{g['id']}/refuse")
        assert r.status_code == 200 and r.json()["status"] == "refused"
        assert fiona.post(f"{BASE_URL}/api/goals/{g['id']}/accept").status_code == 400
        raphi.delete(f"{BASE_URL}/api/goals/{g['id']}")

    def test_empty_title_and_404(self, raphi):
        assert raphi.post(f"{BASE_URL}/api/goals", json={"title": " "}).status_code == 400
        assert raphi.post(f"{BASE_URL}/api/goals/000000000000000000000000/accept").status_code == 404


def teardown_module(_):
    # Otters have no DELETE endpoint: remove only the ones we created, by id
    if CREATED_OTTERS:
        from pymongo import MongoClient
        from bson import ObjectId
        env = dotenv_values("/app/backend/.env")
        MongoClient(env["MONGO_URL"])[env["DB_NAME"]].otters.delete_many(
            {"_id": {"$in": [ObjectId(i) for i in CREATED_OTTERS]}})
