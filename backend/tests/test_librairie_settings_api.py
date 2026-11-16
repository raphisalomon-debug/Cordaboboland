# Iteration 3: settings (auto_layout), positions with order, books/chapters (Librairie), random verse, photos link
import os
import pytest
import requests
from dotenv import dotenv_values

FE_ENV = dotenv_values("/app/frontend/.env")
BASE_URL = (os.environ.get("EXPO_PUBLIC_BACKEND_URL") or FE_ENV["EXPO_PUBLIC_BACKEND_URL"]).rstrip("/")
RAPHI = {"email": "raphi.salomon@gmail.com", "password": "Raphi2026!"}
FIONA = {"email": "fiona.07.tanner@gmail.com", "password": "Fiona2026!"}
API = f"{BASE_URL}/api"


def _session(creds):
    r = requests.post(f"{API}/auth/login", json=creds, timeout=20)
    assert r.status_code == 200, r.text
    s = requests.Session()
    s.headers["Authorization"] = f"Bearer {r.json()['token']}"
    return s


@pytest.fixture(scope="module")
def raphi():
    return _session(RAPHI)


@pytest.fixture(scope="module")
def fiona():
    return _session(FIONA)


# --- Settings
class TestSettings:
    def test_get_default_and_patch(self, raphi, fiona):
        r = raphi.get(f"{API}/settings")
        assert r.status_code == 200 and isinstance(r.json()["auto_layout"], bool)
        orig = r.json()["auto_layout"]
        assert fiona.get(f"{API}/settings").status_code == 200
        assert fiona.patch(f"{API}/settings", json={"auto_layout": False}).status_code == 403
        r = raphi.patch(f"{API}/settings", json={"auto_layout": False})
        assert r.status_code == 200 and r.json()["auto_layout"] is False
        assert raphi.get(f"{API}/settings").json()["auto_layout"] is False
        r = raphi.patch(f"{API}/settings", json={"auto_layout": True})
        assert r.json()["auto_layout"] is True
        assert orig is True  # default/current expected true

    def test_unauth(self):
        assert requests.get(f"{API}/settings").status_code == 401


# --- Houses positions with order
class TestPositionsOrder:
    def test_order_saved_and_restored(self, raphi, fiona):
        houses = raphi.get(f"{API}/houses").json()
        assert len(houses) == 8
        lib = next(h for h in houses if h["key"] == "librairie")
        photos = next(h for h in houses if h["key"] == "photos")
        assert lib["action"] == "page"
        assert photos["target"] == "https://drive.google.com/drive/u/0/folders/19XQOFS62HXzGwYvqhML1rqMQrupkDW9n"
        orig = {h["key"]: h for h in houses}
        r = raphi.put(f"{API}/houses/positions", json=[{"key": "librairie", "x": 0.4, "y": 0.4, "order": 99}])
        assert r.status_code == 200
        got = next(h for h in raphi.get(f"{API}/houses").json() if h["key"] == "librairie")
        assert got["order"] == 99 and got["x"] == 0.4
        # without order -> order untouched
        raphi.put(f"{API}/houses/positions", json=[{"key": "librairie", "x": 0.5, "y": 0.5}])
        got = next(h for h in raphi.get(f"{API}/houses").json() if h["key"] == "librairie")
        assert got["order"] == 99
        o = orig["librairie"]
        raphi.put(f"{API}/houses/positions", json=[{"key": "librairie", "x": o["x"], "y": o["y"], "order": o["order"]}])
        got = next(h for h in raphi.get(f"{API}/houses").json() if h["key"] == "librairie")
        assert got["order"] == o["order"]


# --- Books & chapters
class TestBooks:
    created = []

    @pytest.fixture(scope="class", autouse=True)
    def cleanup(self, raphi):
        yield
        for bid in self.created:
            raphi.delete(f"{API}/books/{bid}")

    def test_existing_and_permissions(self, raphi, fiona):
        r = fiona.get(f"{API}/books")
        assert r.status_code == 200
        assert any(b["title"] == "Notre histoire" for b in r.json())
        assert all("_id" not in b and "chapter_count" in b for b in r.json())
        assert fiona.post(f"{API}/books", json={"name": "TEST_x"}).status_code == 403
        bid = next(b["id"] for b in r.json() if b["title"] == "Notre histoire")
        assert fiona.patch(f"{API}/books/{bid}", json={"name": "X"}).status_code == 403
        assert fiona.delete(f"{API}/books/{bid}").status_code == 403
        assert fiona.post(f"{API}/books/{bid}/chapters", json={"title": "X"}).status_code == 403
        book = fiona.get(f"{API}/books/{bid}").json()
        assert book["chapters"] and "_id" not in book
        cid = book["chapters"][0]["id"]
        assert fiona.patch(f"{API}/chapters/{cid}", json={"title": "X"}).status_code == 403
        assert fiona.delete(f"{API}/chapters/{cid}").status_code == 403

    def test_validation(self, raphi):
        assert raphi.post(f"{API}/books", json={"name": "   "}).status_code == 400
        assert raphi.get(f"{API}/books/000000000000000000000000").status_code == 404

    def test_full_crud(self, raphi, fiona):
        r = raphi.post(f"{API}/books", json={"name": "TEST_Livre", "color": "#CDE7D8"})
        assert r.status_code == 200
        b = r.json()
        self.created.append(b["id"])
        assert b["title"] == "TEST_Livre" and b["chapter_count"] == 0 and b["author_name"]
        assert raphi.post(f"{API}/books/{b['id']}/chapters", json={"title": " "}).status_code == 400
        c1 = raphi.post(f"{API}/books/{b['id']}/chapters", json={"title": "TEST_C1", "content": "Hello"}).json()
        c2 = raphi.post(f"{API}/books/{b['id']}/chapters", json={"title": "TEST_C2", "content": "World"}).json()
        assert c1["order"] < c2["order"]
        got = fiona.get(f"{API}/books/{b['id']}").json()
        assert [c["title"] for c in got["chapters"]] == ["TEST_C1", "TEST_C2"]
        lst = next(x for x in raphi.get(f"{API}/books").json() if x["id"] == b["id"])
        assert lst["chapter_count"] == 2
        r = raphi.patch(f"{API}/chapters/{c1['id']}", json={"title": "TEST_C1b", "content": "Edited"})
        assert r.status_code == 200 and r.json()["content"] == "Edited"
        assert raphi.patch(f"{API}/chapters/{c1['id']}", json={"title": ""}).status_code == 400
        assert raphi.patch(f"{API}/chapters/000000000000000000000000", json={"title": "a"}).status_code == 404
        r = raphi.patch(f"{API}/books/{b['id']}", json={"name": "TEST_Livre2"})
        assert r.status_code == 200 and r.json()["title"] == "TEST_Livre2"
        assert raphi.patch(f"{API}/books/{b['id']}", json={"name": " "}).status_code == 400
        assert raphi.delete(f"{API}/chapters/{c2['id']}").status_code == 200
        assert len(raphi.get(f"{API}/books/{b['id']}").json()["chapters"]) == 1
        assert raphi.delete(f"{API}/books/{b['id']}").status_code == 200
        assert raphi.get(f"{API}/books/{b['id']}").status_code == 404
        # chapters removed: patch should 404
        assert raphi.patch(f"{API}/chapters/{c1['id']}", json={"title": "x"}).status_code == 404
        self.created.remove(b["id"])

    def test_invalid_id(self, raphi):
        r = raphi.get(f"{API}/books/not-an-id")
        assert r.status_code in (400, 404), r.status_code


# --- Random verse
class TestRandomVerse:
    def test_random(self, fiona):
        r = fiona.get(f"{API}/verses/random")
        assert r.status_code == 200
        v = r.json()
        assert v is not None
        assert v["reference"] and "folder_name" in v and "folder_color" in v and "_id" not in v
