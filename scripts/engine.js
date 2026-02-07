
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const startScreen = document.getElementById('start-screen');
    const startBtn = document.getElementById('start-engine-btn');
    const mainInterface = document.getElementById('main-interface');
    const terminalInput = document.getElementById('terminal-input');
    const terminalOutput = document.getElementById('terminal-output');
    const engineViewport = document.getElementById('engine-viewport');
    const storyBody = document.getElementById('story-body');

    // State
    let stories = [];
    let isTypingGlobal = false;
    let typeQueue = [];

    // Initialization
    if (startBtn) startBtn.addEventListener('click', initEngine);

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('story')) {
        initEngine(true);
    }

    if (terminalInput) {
        terminalInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                processCommand(terminalInput.value.trim());
                terminalInput.value = '';
            }
        });
    }

    function initEngine(skipBoot = false) {
        if (startScreen) startScreen.classList.add('hidden');
        if (mainInterface) mainInterface.classList.remove('hidden');

        if (skipBoot) {
            loadLibrary();
        } else {
            runBootSequence();
        }
    }

    async function runBootSequence() {
        await typeLineTerminal("Initializing Story Engine v2.0...", 15);
        await delay(200);
        await typeLineTerminal("Loading library modules...", 15);
        await delay(300);
        loadLibrary();
    }

    async function loadLibrary() {
        try {
            const response = await fetch('data/library.json');
            if (!response.ok) throw new Error('Failed to load library data.');
            stories = await response.json();

            await typeLineTerminal("Library loaded successfully.", 15);
            await typeLineTerminal("--------------------------------", 15);
            await listStories();

            if (terminalInput) terminalInput.focus();
        } catch (error) {
            printToTerminal(`Error: ${error.message}`);
        }
    }

    async function listStories() {
        printToTerminal("AVAILABLE STORIES:");
        for (const story of stories) {
            await typeLineTerminal(`[${story.selection}] ${story.title}`, 10);
        }
        printToTerminal("--------------------------------");
        printToTerminal("Please select the number index of the story you choose. (Example: 1)");
        printToTerminal("Type 'exit' to shutdown the engine.");
    }

    function printToTerminal(text) {
        if (!terminalOutput) return;
        const line = document.createElement('div');
        line.textContent = text;
        terminalOutput.appendChild(line);
        terminalOutput.scrollTop = terminalOutput.scrollHeight;
    }

    function typeLineTerminal(text, speed = 25) {
        return new Promise((resolve) => {
            if (!terminalOutput) { resolve(); return; }
            const line = document.createElement('div');
            terminalOutput.appendChild(line);

            let i = 0;
            function typeChar() {
                if (i < text.length) {
                    line.textContent += text.charAt(i);
                    i++;
                    terminalOutput.scrollTop = terminalOutput.scrollHeight;
                    setTimeout(typeChar, speed);
                } else {
                    resolve();
                }
            }
            typeChar();
        });
    }

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function processCommand(cmd) {
        printToTerminal(`admin@engine:~$ ${cmd}`);
        if (!cmd) return;

        if (!checkSystemIntegrity(cmd)) {
            printToTerminal("Nice try... but this system is secured by LawithanX.");
            return;
        }

        if (cmd.toLowerCase() === 'exit') {
            shutdownEngine();
            return;
        }

        if (cmd.toLowerCase() === 'list' || cmd.toLowerCase() === 'ls') {
            listStories();
            return;
        }

        const selection = stories.find(s => s.selection === cmd);
        if (selection) {
            await typeLineTerminal("[SYSTEM] ACCESSING DATA_STREAM...", 20);
            await delay(300);
            printToTerminal("Loading " + selection.title + "...");
            await loadStory(selection);
        } else {
            printToTerminal("Invalid selection. Please enter a valid number index.");
        }
    }

    function checkSystemIntegrity(input) {
        const dangerousPatterns = [/<script>/i, /<\/script>/i, /onerror/i, /onload/i, /eval\(/i, /alert\(/i, /document\./i, /window\./i];
        for (const pattern of dangerousPatterns) {
            if (pattern.test(input)) return false;
        }
        return true;
    }

    async function loadStory(storyMetadata) {
        let filename;
        if (storyMetadata.id === "story_binary") filename = "the_story_of_lost_knowledge.json";
        else if (storyMetadata.id === "story_lawithanx") filename = "story_lawithanx.json";
        else if (storyMetadata.id === "story_light") filename = "story_light.json";
        else filename = `${storyMetadata.id}.json`;

        try {
            const response = await fetch(`data/${filename}`);
            if (!response.ok) throw new Error(`Story file not found.`);
            const rawData = await response.json();

            if (rawData.ProjectEngine) {
                renderStoryv2(rawData.ProjectEngine, storyMetadata);
            } else {
                renderLegacyStory(rawData, storyMetadata);
            }
        } catch (error) {
            printToTerminal(`Error: ${error.message}`);
            if (terminalOutput) {
                const errLine = document.createElement('div');
                errLine.className = 'terminal-error';
                errLine.textContent = `Failed to load "${storyMetadata.title}". Check console for details.`;
                terminalOutput.appendChild(errLine);
                terminalOutput.scrollTop = terminalOutput.scrollHeight;
            }
        }
    }

    /* --- COMPONENT RENDERER --- */
    function renderComponent(comp, container) {
        if (!comp || !container) return;

        if (comp.name === 'story-image') {
            container.innerHTML = `
                <img src="${comp.props.src}" alt="${comp.props.alt}" style="max-width:100%; border: 4px solid #000; margin: 20px 0;">
                <p class="caption system-font">${comp.props.caption}</p>
            `;
        } else if (comp.name === 'binary-translator') {
            renderBinaryTranslator(comp.props, container);
        }
    }

    function renderBinaryTranslator(props, container) {
        container.innerHTML = `
            <div class="sacred-logic-box">
                <div class="sacred-label">INTERACTIVE MODULE</div>
                <h3>${props.title}</h3>
                <p>${props.description}</p>
                <div style="margin: 20px 0;">
                    <input type="text" id="trans-input" value="${props.defaultInput || ''}" 
                           style="border: 2px solid #000; padding: 10px; font-family: var(--font-header); font-size: 1.2rem; width: 60%; text-align: center;">
                    <br><br>
                    <button id="trans-btn" style="background: #000; color: #fff; border: none; padding: 10px 20px; font-family: var(--font-header); cursor: pointer;">
                        REVEAL BINARY SOUL
                    </button>
                </div>
                <div id="trans-output" style="min-height: 100px; padding: 20px; border: 1px dashed #000;"></div>
            </div>
        `;

        const btn = container.querySelector('#trans-btn');
        const input = container.querySelector('#trans-input');
        const output = container.querySelector('#trans-output');

        function run() {
            const word = input.value;
            if (!word) return;

            let html = `<div style="display:flex; flex-wrap:wrap; justify-content:center; gap:20px;">`;
            let total = 0;

            for (let i = 0; i < word.length; i++) {
                const char = word[i];
                const code = char.charCodeAt(0);
                total += code;
                const binary = code.toString(2).padStart(8, '0');

                // Hexagram simulation (lines)
                // 1 = Yang (Solid), 0 = Yin (Open)
                let hexLines = '';
                for (let b = 0; b < 6; b++) { // Use first 6 bits for hexagram
                    const bit = binary[b + 2]; // Grab last 6 or specific bits? Just visually simulating
                    hexLines += `<div style="width: 40px; height: 6px; background: ${bit === '1' ? '#000' : 'transparent'}; border: 1px solid #000; margin: 2px auto; display:flex; justify-content:center;">
                        ${bit === '0' ? '<div style="width:10px; height:6px; background:#fff;"></div>' : ''}
                    </div>`;
                }

                html += `
                    <div style="text-align:center; border: 1px solid #ddd; padding: 10px;">
                        <span style="font-size:2rem; font-family:var(--font-header);">${char}</span><br>
                        <span style="font-size:0.8rem;">${code}</span><br>
                        <div style="font-family:monospace; margin: 5px 0;">${binary}</div>
                        <div>${hexLines}</div>
                    </div>
                `;
            }
            html += `</div>`;

            if (word.toLowerCase() === 'chai' || total === 18) {
                html += `<p style="margin-top:20px; font-weight:bold;">LIFE FORCE DETECTED (18)</p>`;
            }

            output.innerHTML = html;
        }

        btn.onclick = run;
    }


    /* --- LEGACY RENDERER --- */
    function renderLegacyStory(data, meta) {
        mainInterface.classList.add('hidden');
        engineViewport.classList.remove('hidden');
        storyBody.innerHTML = '';

        const metaPage = createPageContainer();
        metaPage.classList.add('visible'); // Force visible
        metaPage.innerHTML = `
            <div class="story-metadata">
                <span class="meta-row">PROJECT: ${meta.selection.padStart(3, '0')} // ${meta.title.toUpperCase()}</span>
                <span class="meta-row">AUTHOR: UNKNOWN</span> 
                <span class="meta-row">VERSION: LEGACY</span>
                <h1 class="meta-title">${meta.title}</h1>
            </div>
            <div class="intro-text">
                <p>Decoding legacy archive format...</p>
            </div>
        `;
        storyBody.appendChild(metaPage);

        if (data.content && Array.isArray(data.content)) {
            const contentPage = createPageContainer();
            const wrapper = document.createElement('div');
            wrapper.className = 'legacy-content-wrapper';

            data.content.forEach(item => {
                const block = document.createElement('div');
                block.className = 'content-block';

                if (typeof item === 'string') {
                    // Start hidden, mark for typing
                    block.classList.add('typewriter-target');
                    block.dataset.text = item;
                    block.textContent = '';
                } else if (item.type === 'component') {
                    renderComponent(item, block);
                }

                wrapper.appendChild(block);
            });
            contentPage.appendChild(wrapper);
            storyBody.appendChild(contentPage);
        }

        addControls();
        initScrollAnimation();
    }

    /* --- V2 RENDERER --- */
    function renderStoryv2(engineData, libraryMeta) {
        mainInterface.classList.add('hidden');
        engineViewport.classList.remove('hidden');
        storyBody.innerHTML = '';

        // 1. COVER IMAGE
        if (engineData.Metadata.CoverImage) {
            const coverImg = document.createElement('img');
            coverImg.src = engineData.Metadata.CoverImage;
            coverImg.alt = engineData.Metadata.Title + ' — cover';
            coverImg.classList.add('story-cover');
            coverImg.loading = 'lazy';
            coverImg.onerror = () => {
                coverImg.style.display = 'none';
            };

            const page = createPageContainer();
            page.classList.add('visible');
            page.appendChild(coverImg);
            storyBody.appendChild(page);
        }

        // 2. METADATA
        const metaPage = createPageContainer();
        metaPage.classList.add('visible');
        const metaHTML = `
            <div class="story-metadata">
                <span class="meta-row">PROJECT: ${libraryMeta.selection.padStart(3, '0')} // ${engineData.Metadata.Title.toUpperCase()}</span>
                <span class="meta-row">AUTHOR: ${engineData.Metadata.Author.toUpperCase()}</span>
                <span class="meta-row">VERSION: ${engineData.Metadata.Version}</span>
                <h1 class="meta-title">${engineData.Metadata.Title}</h1>
            </div>
        `;
        metaPage.innerHTML = metaHTML;
        storyBody.appendChild(metaPage);


        // 3. NARRATIVE TIMELINE
        if (engineData.Timeline && Array.isArray(engineData.Timeline)) {
            const narrativePage = createPageContainer();
            const narrativeWrapper = document.createElement('div');
            narrativeWrapper.className = 'story-narrative';

            engineData.Timeline.forEach(entry => {
                const entryDiv = document.createElement('div');
                entryDiv.className = 'timeline-entry';

                entryDiv.innerHTML = `
                    <span class="timeline-year">${entry.year}</span>
                    <div class="timeline-content">
                        <h3>${entry.Title}</h3>
                        ${entry.Image ? `
                            <div class="timeline-image-container">
                                <img src="${entry.Image}" alt="${entry.Title}" style="max-width:100%; border: 3px solid #000; margin: 15px 0; display: block;">
                            </div>
                        ` : ''}
                        <p class="typewriter-target" data-text="${entry.Description}"></p>
                        ${entry.Connection ? `<div class="timeline-connection typewriter-target" data-text="CONNECTION: ${entry.Connection}"></div>` : ''}
                    </div>
                `;
                narrativeWrapper.appendChild(entryDiv);
            });

            narrativePage.appendChild(narrativeWrapper);
            storyBody.appendChild(narrativePage);
        }

        // 4. SACRED LOGIC
        if (engineData.SacredLogic && engineData.SacredLogic.Concept) {
            const logicPage = createPageContainer();
            const concept = engineData.SacredLogic.Concept;
            logicPage.innerHTML = `
                <div class="sacred-logic-box">
                    <div class="sacred-label">Sacred Logic</div>
                    <h3>${concept.name}</h3>
                    ${concept.Equation ? `<div class="logic-equation">${concept.Equation}</div>` : ''}
                    ${concept.Paradigm ? `<div class="code-block">${concept.Paradigm}</div>` : ''}
                    <p class="logic-philosophy typewriter-target" data-text="${concept.Philosophy || concept.History || ''}"></p>
                </div>
            `;
            storyBody.appendChild(logicPage);
        }

        addControls();
        initScrollAnimation();
    }

    function addControls() {
        const controlPage = createPageContainer();
        controlPage.style.textAlign = 'center';
        const backBtn = document.createElement('button');
        backBtn.textContent = 'RETURN TO TERMINAL';
        backBtn.onclick = returnToTerminal;

        backBtn.style.fontFamily = "var(--font-header)";
        backBtn.style.fontSize = "1.2rem";
        backBtn.style.padding = "15px 30px";
        backBtn.style.background = "#000";
        backBtn.style.color = "#fff";
        backBtn.style.border = "none";
        backBtn.style.cursor = "pointer";

        controlPage.appendChild(backBtn);
        storyBody.appendChild(controlPage);
    }

    function createPageContainer() {
        const div = document.createElement('div');
        div.className = 'story-page-container';
        return div;
    }

    function returnToTerminal() {
        engineViewport.classList.add('hidden');
        mainInterface.classList.remove('hidden');
        if (terminalInput) terminalInput.focus();
        listStories();
    }

    function shutdownEngine() {
        engineViewport.classList.add('hidden');
        mainInterface.classList.add('hidden');
        if (startScreen) startScreen.classList.remove('hidden');
        if (terminalOutput) terminalOutput.innerHTML = '';
        if (terminalInput) terminalInput.value = '';
    }

    // --- SEQUENTIAL TYPEWRITER ANIMATION ENGINE ---
    function initScrollAnimation() {
        // Page Turn
        const pages = document.querySelectorAll('.story-page-container');
        const pageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, { threshold: 0.1 });
        pages.forEach(page => pageObserver.observe(page));

        // Typewriter Queue Logic
        const typeTargets = document.querySelectorAll('.typewriter-target');

        // Reset global state
        isTypingGlobal = false;

        const typeObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Mark as ready to type
                    entry.target.classList.add('ready-to-type');
                    processQueue();
                } else {
                    // If scrolling UP and it goes out of view, reset it?
                    // The user said: "if user scrolls back up, the content should reverse or 'erase'"
                    // If it was already done, we reset it.
                    if (entry.boundingClientRect.y > 0) {
                        // Only if it went off screen DOWN-wards (scrolled back UP to see it again?)
                        // Actually "scrolling back up" implies the user is moving UP the page, so the element moves DOWN out of viewport?
                        // Or if the user scrolls DOWN past it, then scrolls UP to see it again.

                        // Simple logic: If it leaves the viewport, reset it.
                        resetTypewriter(entry.target);
                    }
                }
            });
        }, {
            threshold: 0.2,
            rootMargin: "0px"
        });

        typeTargets.forEach(el => typeObserver.observe(el));

        window.scrollTo(0, 0);
    }

    function processQueue() {
        // Run loop to find next thing to type
        if (isTypingGlobal) return; // Busy typing one thing

        // Find the FIRST element in the DOM that is 'ready-to-type' but NOT 'typing-done' and NOT 'is-typing'
        // This ensures strict sequential order based on DOM position
        const allTargets = document.querySelectorAll('.typewriter-target');
        let nextTarget = null;

        for (let i = 0; i < allTargets.length; i++) {
            const el = allTargets[i];

            // If we find an element that is NOT done...
            if (!el.classList.contains('typing-done')) {
                // If it is ready (in view), this is our candidate
                if (el.classList.contains('ready-to-type')) {
                    nextTarget = el;
                    break; // Found the very first one pending
                } else {
                    // If we hit an element that is NOT ready (not in view yet), 
                    // should we stop? Yes, because we shouldn't skip ahead to later paragraphs 
                    // just because they might be barely visible while an earlier one is off screen.
                    // However, IntersectionObserver handles the 'ready-to-type' adding.
                    // So we just pick the first ready one.
                    // Wait, if item A is done, item B is ready -> type B.
                    // If item A is NOT done (and not ready), do we wait? 
                    // User wants "one line at a time". 
                    // Let's just find the first 'ready' one that isn't done.

                    // Actually, usually you want top-down. 
                    // If #1 is in view, type #1. If #2 is also in view, wait for #1.
                    // The loop does exactly that. It finds the first one in reading order.
                }
            }
        }

        if (nextTarget) {
            typeText(nextTarget);
        }
    }


    function typeText(element) {
        isTypingGlobal = true;
        element.classList.add('is-typing');
        element.textContent = '';

        const text = element.dataset.text || '';
        let i = 0;
        const speed = 25; // Slower, more deliberate "story telling" speed

        function step() {
            // Check if still valid (didn't get reset)
            if (!element.classList.contains('is-typing')) {
                isTypingGlobal = false;
                processQueue(); // checking again
                return;
            }

            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
                // Using timeout for control
                setTimeout(() => requestAnimationFrame(step), speed);
            } else {
                element.classList.remove('is-typing');
                element.classList.add('typing-done');
                isTypingGlobal = false;

                // Immediately check for next
                processQueue();
            }
        }
        step();
    }

    function resetTypewriter(element) {
        element.classList.remove('typing-done');
        element.classList.remove('is-typing');
        element.classList.remove('ready-to-type');
        element.textContent = '';

        // If we reset the one currently typing, isTypingGlobal needs to free up?
        // Logic inside step() handles it: checks for 'is-typing'.
    }
});
