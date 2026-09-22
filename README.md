# PuzzleFlow

Premium Chess.com custom puzzle trainer — timer, auto-next, streaks, milestones, and offline progress tracking.

## Features

- **Timer overlay** — floating glass panel on chess.com with live stats
- **Auto-next** — automatically advances after solve/fail (configurable)
- **100-position milestones** — celebration modal + motivational quote + screenshot
- **Stop session** — training report + screenshot capture
- **Offline storage** — IndexedDB sessions, daily rollups, personal bests
- **Sync queue** — ready for future `POST /v1/sync` API

## Build and install locally

```bash
npm install
npm run build
```

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select the `dist/` folder
4. Open a Chess.com puzzle page
5. Click the PuzzleFlow extension icon → **Start training**

## Development

```bash
npm run dev   # watch build
```

Rebuild and refresh the extension after changes.

## Prepare a Chrome Web Store upload

```bash
npm run package
```

This creates `puzzleflow-chrome-web-store.zip` from the validated `dist/` directory. Upload that zip in the Chrome Web Store Developer Dashboard. The store listing also requires a 1280x800 or 640x400 screenshot, a short and detailed description, a category, and a support contact.

Before submitting, complete the Privacy practices section accurately. PuzzleFlow stores training data locally in IndexedDB and Chrome storage, captures screenshots only for session reports and milestones, and does not currently send data to a remote server. The listing should disclose those behaviors and include a privacy policy URL if required by your account or store review.

## Project structure

```
src/
  background/     Service worker — sessions, screenshots
  content/        Overlay UI + Chess.com adapter + auto-next
  popup/          Premium control panel
  options/        History & daily activity
  storage/        Dexie (IndexedDB) + session repo
  api/            Future sync client stub
```
