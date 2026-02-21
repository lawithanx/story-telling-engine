# StoryEngine — Interactive Story Engine

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
StoryEngine/
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
- **Environment & SEO** — Uses a `.env` file (ignored by git in `.gitignore`) for storing sensitive project settings. A `robots.txt` intentionally limits AI scraper access to internal structures, presenting the application externally solely as an "ancient artifact."

---

## License

MIT.
## About this project
StoryEngine is a front-end project that loads story content from JSON and renders it with a terminal-style interface, typewriter effects, and optional logic exhibits. Built with vanilla HTML, CSS, and JavaScript—no frameworks.

**Tech:** ES6+, Fetch API, Intersection Observer, modular JSON data.

## How StoryEngine Works
StoryEngine is a **Single Page Application (SPA)** that functions like a document viewer or game engine. Instead of navigating between multiple HTML files, the application loads content dynamically into a single shell.

### 1. The Shell (index.html)
The only actual web page in the project. It provides the empty containers where content will be injected:
- **Intro Layer:** Handles the startup video sequence.
- **Start Screen:** Displays the project branding and entry point.
- **Terminal View:** The primary navigation interface where users select stories.
- **Viewport:** The reading area where story content is rendered.

### 2. The Index (data/library.json)
Acts as the **Table of Contents**. When the engine boots, it fetches this file to understand:
- Which stories are available.
- What ID/Number corresponds to each story.
- The filename of the JSON module to load for each entry.

### 3. The Content Modules (data/*.json)
These files contain the actual narrative **data**, decoupled from any HTML or formatting code.
- Stories are written in pure JSON.
- A story file contains structured fields like `Title`, `Timeline`, `Description`, and `Image`.
- This separation allows writers to add new content without modifying the codebase.

### 4. The Engine (scripts/engine.js)
The core JavaScript logic that powers the experience:
1.  **Boot:** Initializes the app, plays the intro, and loads the library.
2.  **Listen:** Waits for user input in the simulated terminal.
3.  **Fetch & Render:** When a user selects a story number, the engine fetches the corresponding JSON file and programmatically constructs DOM elements (paragraphs, images, headers) to display the content.
4.  **Animate:**
    - **Typewriter Effect:** Text is typed out character-by-character as it scrolls into view.
    - **Scroll Reveal:** Images fade in and slide up when they enter the viewport.

### Summary
StoryEngine effectively runs a custom content browser inside the web browser. To add a new story, you simply create a new JSON file and add an entry to `library.json`. No new HTML pages are required.

📈 Project Status
🚧 underconstruction: currently under development.

Proprietary - All Rights Reserved. Contact Tech-JCorp for licensing.

"In contested environments, data integrity is mission-critical."
