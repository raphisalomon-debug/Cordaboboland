# Nos petites maisons — PRD

## Original problem statement
Private mobile-first French app for a couple (2 accounts: Raphi admin, Fiona partner). Lined beige notebook paper background; home = sheet with hand-drawn houses (buttons), each with a handwritten name. Replaceable PNG slots (houses, logo, loading). Houses: Calendrier de l'avent (littlecalendars.com), Photos (editable drive link), Nos dates (date ideas todo), Loutres (otter-sticker messages only, inbox + in-app notification), Objectifs de couple (propose/accept/refuse/active/complete + trophy) and Nos trophées (wooden shelf). Modular house config (name, image, action, position, visible) in DB / single config file. Admin-only Réglages (toggle, drag, image, links). User extra: little paths between houses with street lamps; at night the sheet is dark and lamps light up.

## User choices
- Accounts: raphi.salomon@gmail.com (admin), fiona.07.tanner@gmail.com
- House image change: upload from phone (Emergent object storage)
- Move houses: drag with finger

## Architecture
- Backend FastAPI: core.py (db, BaseDocument, JWT auth, storage), houses_config.py (single house config, seeded), features/{auth,houses,dates,otters,goals}.py
- Frontend Expo Router: app/{index,login,dates,loutres,objectifs,trophees,reglages/index,reglages/carte}.tsx; src/config/{assets,otters,trophies}.ts (replaceable images & palettes); src/features/*; theme.ts with day/night store (auto 20h–7h, or forced)

## Implemented (2026-06)
- Login (2 seeded accounts, no signup), admin guard
- Home village: SVG paths, street lamps with glowing pulse at night, stars & moon, night toggle
- External links (new tab), Photos link editable
- Nos dates, Loutres (10 otters, unread badge + toast), Objectifs + trophy picker, Trophy shelves
- Réglages: rename, visibility, link, image upload/reset, map drag editor, night mode, logout
- Tested: backend 17/18 → date validation fixed; partner logout added; toast moved below headers

- 2026-06: Nos versets house (7th): shared folders (name + pastel color), verses (reference, text, note) add/edit/move/delete, folder rename/delete with confirmation. Tested 31/31 backend + UI.

- 2026-06: Auto layout (houses re-space when hidden; toggle in Réglages, map editor changes path order), Librairie house (admin writes books/chapters, partner reads with progress), Verse of the day card on home, Photos Drive link set. Tested 39/39 backend + UI; post-test fixes applied.

- 2026-06: Village life (Nature.tsx): auto-placed swaying trees, pines, bushes, flowers, grass; discreet animals (cat w/ tail flick & glowing eyes at night, hopping rabbit, walking hedgehog), bird + butterflies by day, fireflies at night.

- 2026-06: Seasons (auto by month or forced in Réglages, per phone): spring blossoms, summer, autumn colored trees + falling leaves, winter snow on roofs/trees + snowflakes, hedgehog hibernates. Tap cat/rabbit/hedgehog -> heart pops.

- 2026-06: User house PNGs added (avent, photos, dates, loutres=Discussion, objectifs) in assets/images/houses (white bg removed, cropped). Advent link updated to littlecalendars.com/c/cheery-comet-4kczb3vn2v.

- 2026-06: User asked to revert house images to original drawn placeholders (PNGs kept in assets/images/houses). Otter logo added: app icon/adaptive/splash/favicon, BlinkingOtter (idle + wink frames) on loading, login and home header.

- 2026-06: Tap home otter logo -> instant wink + heart pop. Christmas garlands (twinkling bulbs under roofs) in December or when season forced to winter.

## Backlog
- P1: confirm before delete; edit existing date ideas/goals
- P2: real push notifications for otters (only on request), password change screen, rate-limit login
