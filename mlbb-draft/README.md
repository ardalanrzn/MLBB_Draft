# DraftFast — Rank Draft Helper (PWA)

A fast, tap-based ban/pick draft tool for ranked matches. Original build, inspired
by the *idea* of draftmlbb.com but with its own code, design, and feature set —
no code was copied from that site.

## What it does
- Standard MLBB draft-pick sequence: 6 alternating bans, then 10 picks in
  1-2-2-2-2-1 snake order. The state machine auto-advances — you never manually
  declare "ban 3" or "pick 2", it just knows whose turn it is and what type of
  action it is.
- One-tap hero grid, filterable by **role** and **lane**, plus instant search.
- Live **suggestion panel** that updates every turn: counters to the enemy's
  last pick, your team's biggest open role, and current-patch (2.1.95) meta
  picks still on the board.
- Per-turn **countdown timer** (default 15s bans / 30s picks, edit in `app.js`)
  so you can rep the real time pressure of ranked draft.
- Roster includes **Hirara** and **Marcel**, and flags a few Patch 2.1.95
  changes (Kaja rework, Gord nerf, Novaria buff) plus current S-tier picks.
- Installable as a **PWA** — works offline once installed, home-screen icon,
  no browser chrome.

## Why no hero portraits
Official hero art belongs to Moonton and is copyrighted, so I used colored
monogram avatars instead. If you want real portraits, drop your own image
files into an `/icons-heroes/` folder and swap the avatar `<div>` in `app.js`
(`renderGrid`/`renderSlotRow`) for an `<img>` tag pointing at
`icons-heroes/<name>.png`. That keeps the art local to your own device only.

## How to run it

### Quick local test
Any static file server works, e.g. from this folder:
```
python3 -m http.server 8000
```
Then open `http://localhost:8000` in your phone's browser (same Wi-Fi) or
`http://localhost:8000` on desktop.

### Installing as a real PWA
PWAs require **HTTPS** (localhost is exempted for testing, but for your phone
you'll want a real host). Easiest free options:
- **GitHub Pages** — push this folder to a repo, enable Pages, done.
- **Netlify / Vercel** — drag-and-drop the folder in their dashboard.
- **Cloudflare Pages** — same idea, free tier.

Once hosted on HTTPS, open the URL on your phone in Chrome/Safari →
"Add to Home Screen" (iOS) or the install prompt (Android/Chrome). It'll
behave like a native app icon and work offline after first load.

## File structure
```
index.html          — app shell
style.css            — mobile-first dark theme
app.js               — draft state machine, filters, suggestions, timer
heroes.js            — hero roster data + counter map
manifest.json         — PWA manifest
service-worker.js    — offline caching
icons/               — app icons (placeholder, swap if you want your own)
```

## Notes on making it better (my suggestions)
1. **Real hero portraits** — biggest visual upgrade. Legally you'd need your
   own screenshots/art or a licensed asset pack; I can wire up the `<img>`
   swap for you once you have files.
2. **Draft mode toggle** — right now it's locked to ranked draft-pick order.
   Easy to add a toggle for tournament format (6+4 ban split) or "blind pick"
   (no bans) if you play those too.
3. **Voice/gesture confirm** — a "hold to confirm" instead of single-tap could
   prevent mis-taps under time pressure — trivial to add if you find yourself
   fat-fingering picks.
4. **Sync with a duo/team** — right now it's single-device. If you draft with
   teammates, a shared session (e.g. via a simple WebSocket relay) so
   everyone sees the same board live would be a natural next step.
5. **Counter map is intentionally small** — I only hardcoded well-known,
   stable matchups to avoid guessing. Worth expanding as you play, or wiring
   to a stats API if you find one with an open endpoint.
6. **Patch data refresh** — hero list/tiers are current as of Patch 2.1.95
   (Aug 4, 2026). Since I can't auto-fetch patch notes for you locally, you'll
   want to hand-edit `heroes.js` each patch, or ask me to regenerate it.

Enjoy — good luck climbing.
