# TECH-JCORP STORY ENGINE v1.3

The Story Engine is a high-fidelity narrative computational synthesis tool, engineered for immersive, terminal-style interactive storytelling. 

It functions as a web-based, zero-dependency engine combining CRT-style scanline aesthetics, an interactive command-line interface, and dynamically injected JSON narrative data to create a lore-heavy, immersive experience.

---

## 🛠️ Architecture Audit & Future Roadmap

As the engine scales to include more rich media (audio tracks, interference clips, webp icons, and h264 video sequences), maintaining high performance requires upgrading the asset management tier.

### 1. Audio Management
Currently, assets like `ontv.mp3`, `offtv.mp3`, `radio song.mp3`, and interference clips are loaded dynamically into the DOM via `<audio>` elements.
* **Proposed Enhancement:** Integrate an audio manager such as **Howler.js**, or compile all short UI sounds (clicks, mechanical buzzes) into a single **Audio Sprite**. This prevents memory bloat by offloading the concurrent playback caching from the raw DOM.

### 2. Video Streaming & Buffering
The engine utilizes raw `.mp4` video files for boot sequences. While local bandwidth is sufficient, live server deployment risks "black screen" buffering latency.
* **Proposed Enhancement:** Transition large video sequences to **HLS (HTTP Live Streaming)** using a library like `video.js` or `hls.js`. HLS breaks the `.mp4` into two-second `.ts` packets, allowing the user to begin immediate playback regardless of internet speeds and preventing the UI from stalling.

### 3. Asynchronous Asset Pre-Fetching
HD textures like `metalpanel.jpg`, `manuel.jpg`, and `RUSTY.jpg` require preemptive fetching.
* **Proposed Enhancement:** Develop a centralized **Asset Preloader State** class in `engine.js` that halts the rendering of `main-interface` until a sequence of JavaScript `Promises` verify the textures are safely cached in browser memory, preventing white-screen flashes.

### 4. Progressive Web App (PWA) Caching
The Story Engine mimics a standalone machine; it shouldn't require network reloading between user visits.
* **Proposed Enhancement:** Write a `serviceWorker.js` to aggressively cache `.jpg` wrappers, core scripts, and `.css` upon the user's first visit. This allows subsequent boots to load from local cache instantly, enabling near-native application speeds.
