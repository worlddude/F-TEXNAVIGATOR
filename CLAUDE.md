# F-TEXNAVIGATOR — project notes for Claude

## What I'm working on
The active project is **`Claude/`**. Everything else in the repo is old / other
experiments and can be ignored unless I say otherwise.

Inside `Claude/`:
- **`index.html`** — THE app. A mobile web app called "Locator" that helps store
  staff find products. This is the file I'm actively building.
- **`add/index.html`** — a separate admin website for *adding* items (e.g. milk)
  to the database, so regular app users can't change product locations and break
  things.
- **`123index321.html`** — IGNORE this file. Old version, do not touch.

## What the app does
A Danish-language ("dansk") in-store product finder, styled like a phone app.
Features in `Claude/index.html`:
- **Map view** with shelves/aisles you can tap (flips between a store map and a
  shelf photo).
- **Camera + barcode scanning** to look up items by label.
- **Item cards, photos, category grid, list page, add/edit form.**
- **ItemGPT** — an AI search ("Hvad leder du efter?") that sends the catalog to
  Google Gemini and returns matching barcodes.

## Tech / backend
- Plain single-file HTML + CSS + vanilla JS. No build step, no framework, no
  tests. To preview: just open the HTML file in a browser.
- **Supabase** is the backend (product database + image storage in the
  `item_images` and `Ailes` buckets). Client + anon key are inline in the HTML.
- **Google Gemini** (`gemini-flash-latest`) powers ItemGPT.

## Preferences
- The app UI is in **Danish** — keep new user-facing text in Danish.
- Don't rename or restructure files without asking; the repo is intentionally
  messy and I know where things are.

## ⚠️ Security note (worth fixing)
`Claude/index.html` has a **real Google Gemini API key hardcoded** in the page
(around line 1550). Because the page ships to the browser and this repo is on
GitHub, anyone can read that key and run up charges on it. Recommended fix:
revoke/rotate the key in Google AI Studio and move AI calls behind a small proxy
(e.g. a Supabase Edge Function) so the key never reaches the browser. The
Supabase **anon** key is designed to be public, but make sure Row Level Security
is enabled so app users can only read, not overwrite, product data.
