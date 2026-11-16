# Verses feature tests: verse folders CRUD, verses CRUD, move, cascade delete, validation, auth
import pytest
import requests
from dotenv import dotenv_values

FE_ENV = dotenv_values("/app/frontend/.env")
BASE_URL = FE_ENV["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")
RAPHI = {"email": "raphi.salomon@gmail.com", "password": "Raphi2026!"}
FIONA = {"email": "fiona.07.tanner@gmail.com", "password": "Fiona2026!"}
CREATED_FOLDERS = []


def _session(creds):
    r = requests.post(f"{BASE_URL}/api/auth/login", json=creds, timeout=20)
    if r.status_code != 200:
        pytest.skip(f"login failed {r.status_code}")
    s = requests.Session()
    s.headers["Authorization"] = f"Bearer {r.json()['token']}"
    return s


@pytest.fixture(scope="module")
def raphi():
    s = _session(RAPHI)
    yield s
    for fid in CREATED_FOLDERS:  # cleanup only what we created
        s.delete(f"{BASE_URL}/api/verse-folders/{fid}")


@pytest.fixture(scope="module")
def fiona():
    return _session(FIONA)


def _mk_folder(s, name, color="#CDEAC0"):
    r = s.post(f"{BASE_URL}/api/verse-folders", json={"name": name, "color": color})
    assert r.status_code == 200, r.text
    CREATED_FOLDERS.append(r.json()["id"])
    return r.json()


# --- Auth
class TestAuthRequired:
    @pytest.mark.parametrize("method,path", [
        ("get", "/api/verse-folders"), ("post", "/api/verse-folders"), ("post", "/api/verses"),
        ("get", "/api/verse-folders/000000000000000000000000/verses"),
    ])
    def test_unauth_401(self, method, path):
        r = getattr(requests, method)(f"{BASE_URL}{path}", json={})
        assert r.status_code == 401, r.status_code


# --- Folders
class TestFolders:
    def test_existing_amour_folder_present(self, raphi):
        r = raphi.get(f"{BASE_URL}/api/verse-folders")
        assert r.status_code == 200
        names = {f["name"]: f for f in r.json()}
        assert "Amour" in names
        assert names["Amour"]["count"] >= 1
        assert all("_id" not in f for f in r.json())

    def test_create_get_and_shared(self, raphi, fiona):
        f = _mk_folder(raphi, "TEST_Paix", "#FAEDCD")
        assert f["name"] == "TEST_Paix" and f["color"] == "#FAEDCD" and f["count"] == 0
        assert f["created_by_name"]
        g = raphi.get(f"{BASE_URL}/api/verse-folders/{f['id']}")
        assert g.status_code == 200 and g.json()["name"] == "TEST_Paix"
        # Fiona sees it
        ids = [x["id"] for x in fiona.get(f"{BASE_URL}/api/verse-folders").json()]
        assert f["id"] in ids

    def test_create_empty_name_400(self, raphi):
        r = raphi.post(f"{BASE_URL}/api/verse-folders", json={"name": "   "})
        assert r.status_code == 400

    def test_name_trim_and_truncate(self, raphi):
        f = _mk_folder(raphi, "  TEST_" + "x" * 80 + "  ")
        assert len(f["name"]) == 60 and f["name"].startswith("TEST_")

    def test_patch_folder(self, fiona, raphi):
        f = _mk_folder(raphi, "TEST_Rename")
        r = fiona.patch(f"{BASE_URL}/api/verse-folders/{f['id']}", json={"name": "TEST_Renamed", "color": "#BDE0FE"})
        assert r.status_code == 200 and r.json()["name"] == "TEST_Renamed" and r.json()["color"] == "#BDE0FE"
        g = raphi.get(f"{BASE_URL}/api/verse-folders/{f['id']}").json()
        assert g["name"] == "TEST_Renamed" and g["color"] == "#BDE0FE"
        assert raphi.patch(f"{BASE_URL}/api/verse-folders/{f['id']}", json={"name": " "}).status_code == 400

    def test_folder_404s(self, raphi):
        bad = "000000000000000000000000"
        assert raphi.get(f"{BASE_URL}/api/verse-folders/{bad}").status_code == 404
        assert raphi.get(f"{BASE_URL}/api/verse-folders/not-an-id").status_code == 404
        assert raphi.patch(f"{BASE_URL}/api/verse-folders/{bad}", json={"name": "x"}).status_code == 404


# --- Verses
class TestVerses:
    def test_verse_crud_move_and_cascade(self, raphi, fiona):
        a = _mk_folder(raphi, "TEST_A")
        b = _mk_folder(raphi, "TEST_B")
        # create
        r = fiona.post(f"{BASE_URL}/api/verses", json={"folder_id": a["id"], "reference": " Jean 3:16 ",
                                                        "text": "Car Dieu a tant aimé", "note": "TEST_note"})
        assert r.status_code == 200, r.text
        v = r.json()
        assert v["reference"] == "Jean 3:16" and v["folder_id"] == a["id"] and v["created_by_name"]
        lst = raphi.get(f"{BASE_URL}/api/verse-folders/{a['id']}/verses").json()
        assert [x["id"] for x in lst] == [v["id"]]
        counts = {f["id"]: f["count"] for f in raphi.get(f"{BASE_URL}/api/verse-folders").json()}
        assert counts[a["id"]] == 1 and counts[b["id"]] == 0
        # edit
        r = raphi.patch(f"{BASE_URL}/api/verses/{v['id']}", json={"text": "Texte modifié", "note": ""})
        assert r.status_code == 200 and r.json()["text"] == "Texte modifié" and r.json()["note"] == ""
        assert raphi.patch(f"{BASE_URL}/api/verses/{v['id']}", json={"reference": "  "}).status_code == 400
        # move
        r = raphi.patch(f"{BASE_URL}/api/verses/{v['id']}", json={"folder_id": b["id"]})
        assert r.status_code == 200 and r.json()["folder_id"] == b["id"]
        assert raphi.get(f"{BASE_URL}/api/verse-folders/{a['id']}/verses").json() == []
        assert len(raphi.get(f"{BASE_URL}/api/verse-folders/{b['id']}/verses").json()) == 1
        # move to invalid folder
        assert raphi.patch(f"{BASE_URL}/api/verses/{v['id']}", json={"folder_id": "000000000000000000000000"}).status_code == 404
        # add a second verse then cascade delete folder b
        v2 = raphi.post(f"{BASE_URL}/api/verses", json={"folder_id": b["id"], "reference": "Psaume 23:1"}).json()
        assert v2["text"] == ""
        assert raphi.delete(f"{BASE_URL}/api/verse-folders/{b['id']}").json() == {"ok": True}
        assert raphi.get(f"{BASE_URL}/api/verse-folders/{b['id']}").status_code == 404
        assert raphi.get(f"{BASE_URL}/api/verse-folders/{b['id']}/verses").json() == []
        assert raphi.patch(f"{BASE_URL}/api/verses/{v2['id']}", json={"text": "x"}).status_code == 404

    def test_verse_validation(self, raphi):
        a = _mk_folder(raphi, "TEST_Val")
        assert raphi.post(f"{BASE_URL}/api/verses", json={"folder_id": a["id"], "reference": " "}).status_code == 400
        assert raphi.post(f"{BASE_URL}/api/verses", json={"folder_id": "000000000000000000000000", "reference": "Jean 1:1"}).status_code == 404
        assert raphi.post(f"{BASE_URL}/api/verses", json={"folder_id": "bad", "reference": "Jean 1:1"}).status_code == 404
        assert raphi.post(f"{BASE_URL}/api/verses", json={"reference": "Jean 1:1"}).status_code == 422

    def test_delete_verse(self, raphi):
        a = _mk_folder(raphi, "TEST_Del")
        v = raphi.post(f"{BASE_URL}/api/verses", json={"folder_id": a["id"], "reference": "Romains 8:28"}).json()
        assert raphi.delete(f"{BASE_URL}/api/verses/{v['id']}").status_code == 200
        assert raphi.get(f"{BASE_URL}/api/verse-folders/{a['id']}/verses").json() == []
        assert raphi.patch(f"{BASE_URL}/api/verses/{v['id']}", json={"text": "x"}).status_code == 404
