# Ancient Archives — Interactive Story Engine

A **vanilla JavaScript** front-end project that treats narrative as structured data. Stories live in decoupled JSON modules; a custom engine fetches and renders them with a terminal-style UI, typewriter effects, and timeline exhibits.

![Tech: HTML5, CSS3, ES6+, Fetch API, Intersection Observer](https://img.shields.io/badge/stack-HTML5%20%7C%20CSS3%20%7C%20ES6%2B%20%7C%20Fetch%20API-blue)

---

## Features

- **Modular content** — Stories are separate JSON files; add or edit content without touching app code.
- **Terminal-style interface** — Choose stories by number; boot sequence and commands feel like a CLI.
- **Dynamic rendering** — Cover image, metadata, timeline, and “Sacred Logic” sections are built from JSON.
- **Typewriter effect** — Narrative text types on as you scroll, with sequential queue and reset on scroll-back.
- **No build step** — Plain HTML, CSS, and JS; run with any static server.

---

## Tech Stack

| Layer   | Choice              |
|--------|----------------------|
| Markup | HTML5 (semantic)     |
| Style  | CSS3 (custom props)  |
| Logic  | JavaScript (ES6+)    |
| Data   | JSON                 |
| APIs   | Fetch, IntersectionObserver |

---

## Quick Start

**Option A — npm**

```bash
npm install   # optional, no deps required
npm start
```

**Option B — Python**

```bash
python3 -m http.server 8000
```

**Option C — Shell script**

```bash
chmod +x engine.sh
./engine.sh
```

Then open **http://localhost:8000** and click **INITIALIZE ENGINE**. Enter a story number (1–6), `list`, or `exit`.

---

## Project Structure

```
AncientArchives/
├── index.html          # Single-page app shell
├── README.md
├── package.json        # npm scripts (start/serve)
├── engine.sh           # Server launcher (Python)
├── assets/             # Images (covers, timeline art)
├── data/
│   ├── library.json    # Story index (id, selection, title)
│   ├── story_*.json    # Per-story content (Metadata, Timeline, SacredLogic)
│   └── ...
└── scripts/
    ├── engine.js       # App logic: boot, terminal, fetch, render, typewriter
    └── style.css       # Layout, terminal, story pages, typography
```

---

## Data Model

- **library.json** — Array of `{ id, selection, title }`; `selection` is the digit users type.
- **Story JSON** — Either legacy `content[]` or v2 `ProjectEngine` with:
  - `Metadata`: Title, Author, Version, CoverImage
  - `Timeline`: `{ year, Title, Description, Image?, Connection? }[]`
  - `SacredLogic.Concept`: name, Equation, Philosophy/History, etc.

---

## Architecture Notes

- **Security** — Terminal input is sanitized (script/event handlers blocked) before use.
- **Accessibility** — ARIA labels, `sr-only` helper, semantic sections, keyboard-friendly terminal.
- **Responsive** — Viewport meta and flexible layout; terminal and story pages adapt.

---

## License

MIT.
# Test
