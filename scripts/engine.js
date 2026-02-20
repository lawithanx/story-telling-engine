
document.addEventListener('DOMContentLoaded', () => {
    // Updated DOM Elements for new flow
    const powerBtn = document.getElementById('power-btn');
    const rootScreen = document.getElementById('root-screen');
    const initEngineBtn = document.getElementById('init-engine-btn');
    const mainInterface = document.getElementById('main-interface');
    const terminalInput = document.getElementById('terminal-input');
    const terminalOutput = document.getElementById('terminal-output');
    const engineViewport = document.getElementById('engine-viewport');
    const storyBody = document.getElementById('story-body');

    // Power button shows the black square (rootScreen) and reveals init button
    if (powerBtn) {
        powerBtn.addEventListener('click', () => {
            powerBtn.classList.add('hidden');
            if (rootScreen) rootScreen.classList.remove('hidden');
            // initEngineBtn will be revealed in the next stage
        });
    }

    // Init Engine button starts the engine (skip boot sequence)
    if (initEngineBtn) {
        initEngineBtn.addEventListener('click', () => initEngine(true));
    }

    // Adjust initEngine to hide rootScreen and show main interface
    function initEngine(skipBoot = false) {
        if (skipBoot) {
            if (rootScreen) rootScreen.classList.add('hidden');
            if (mainInterface) mainInterface.classList.remove('hidden');
            loadLibrary();
        } else {
            // Not used in new flow, but keep fallback
            if (powerBtn) powerBtn.textContent = 'INITIALIZING...';
            setTimeout(() => {
                if (rootScreen) rootScreen.classList.add('hidden');
                if (mainInterface) mainInterface.classList.remove('hidden');
                loadLibrary();
            }, 2000);
        }
    }


    // State
    let stories = [];
    let currentCollection = null;
    let isTypingGlobal = false;
    let typeQueue = [];

    if (startBtn) {
        startBtn.addEventListener('click', () => initEngine(false));
    }
    // New two‑step safety switch
    const toggleBtn = document.getElementById('toggle-engine-btn');
    const safetyBtn = document.getElementById('safety-switch-btn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            toggleBtn.classList.add('hidden');
            if (safetyBtn) safetyBtn.classList.remove('hidden');
        });
    }
    if (safetyBtn) {
        safetyBtn.addEventListener('click', () => initEngine(true));
    }
    /** @type {'library' | 'story'} — only show full menu when 'library' and on boot or explicit list */
    let engineState = 'library';

    // Navigation Control
    function createNavButton() {
        const btn = document.createElement('button');
        btn.textContent = 'BACK TO TERMINAL';
        btn.className = 'nav-return-btn';
        btn.onclick = returnToTerminal;
        return btn;
    }

    function addNavTab(container) {
        const tabContainer = document.createElement('div');
        tabContainer.className = 'nav-tab-container';
        tabContainer.appendChild(createNavButton());

        // Ensure the container is relative so absolute positioning works
        if (getComputedStyle(container).position === 'static') {
            container.style.position = 'relative';
        }
        container.appendChild(tabContainer);
    }


    if (terminalInput) {
        terminalInput.addEventListener('input', (e) => {
            const val = terminalInput.value.trim().toLowerCase();
            if (!val) return;

            // Check if valid selection or command
            let isValid = false;
            if (val === 'exit' || val === 'list' || val === 'ls' || val === 'back') {
                isValid = true;
            } else if (engineState === 'library') {
                if (stories.find(s => s.selection.toLowerCase() === val)) isValid = true;
            } else if (engineState === 'collection') {
                if (currentCollection && currentCollection.items.find(s => s.selection.toLowerCase() === val)) isValid = true;
            }

            if (isValid) {
                processCommand(terminalInput.value.trim());
                terminalInput.value = '';
            }
        });

        // Disable Enter key for unmatched input since only valid inputs should trigger
        terminalInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
            }
        });
    }

    function initEngine(skipBoot = false) {
        if (skipBoot) {
            if (startScreen) startScreen.classList.add('hidden');
            if (mainInterface) mainInterface.classList.remove('hidden');
            loadLibrary();
        } else {
            // Apply 2-second delay
            if (startBtn) {
                startBtn.textContent = 'INITIALIZING...';
                startBtn.style.opacity = '0.7';
                startBtn.style.cursor = 'wait';
            }
            setTimeout(() => {
                if (startScreen) startScreen.classList.add('hidden');
                if (mainInterface) mainInterface.classList.remove('hidden');

                // Clear any previous text to just show the terminal
                if (terminalOutput) terminalOutput.innerHTML = '';

                runBootSequence();
            }, 2000);
        }
    }

    async function runBootSequence() {
        await typeLineTerminal("Initializing StoryEngine v2.0...", 15);
        await delay(200);
        await typeLineTerminal("Loading library modules...", 15);
        await delay(300);
        loadLibrary();
    }

    async function loadLibrary() {
        try {
            engineState = 'library';
            const response = await fetch('data/library.json?t=' + Date.now());
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

    function getFilename(id) {
        if (id === "story_binary") return "the_story_of_lost_knowledge.json";
        if (id === "story_lawithanx") return "story_lawithanx.json";
        if (id === "story_light") return "story_light.json";
        return `${id}.json`;
    }

    async function listStories() {
        if (engineState === 'library') {
            printToTerminal("AVAILABLE AUTHORS / ARCHIVES:");
            for (const collection of stories) {
                await typeLineTerminal(`[${collection.selection}] ${collection.title}`, 10);
            }
            printToTerminal("--------------------------------");
            printToTerminal("Please select the number index of the author you choose. (Example: 1)");
            printToTerminal("Type 'exit' to shutdown the engine.");
        } else if (engineState === 'collection') {
            printToTerminal(`AVAILABLE ARCHIVES FOR ${currentCollection.title.toUpperCase()}:`);
            for (const story of currentCollection.items) {
                const file = getFilename(story.id);
                await typeLineTerminal(`[${story.selection}] ${file}  --  ${story.title}`, 10);
            }
            printToTerminal("--------------------------------");
            printToTerminal("Please select the number index of the story you choose. (Example: 1)");
            printToTerminal("Type 'back' to return to authors list, or 'exit' to shutdown.");
        }
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

        if (cmd.toLowerCase() === 'back') {
            if (engineState === 'collection') {
                engineState = 'library';
                currentCollection = null;
                listStories();
            } else if (engineState === 'story') {
                returnToTerminal();
            }
            return;
        }

        if (cmd.toLowerCase() === 'list' || cmd.toLowerCase() === 'ls') {
            listStories();
            return;
        }

        if (engineState === 'library') {
            const selection = stories.find(s => s.selection === cmd);
            if (selection) {
                engineState = 'collection';
                currentCollection = selection;
                listStories();
            }
        } else if (engineState === 'collection') {
            const selection = currentCollection.items.find(s => s.selection === cmd);
            if (selection) {
                engineState = 'story';
                await typeLineTerminal("[SYSTEM] ACCESSING DATA_STREAM...", 20);
                await delay(300);
                printToTerminal("Loading " + selection.title + "...");
                await loadStory(selection);
            }
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
        const filename = getFilename(storyMetadata.id);

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

        // Navigation will be added to the metadata page

        const metaPage = createPageContainer();
        metaPage.classList.add('visible'); // Force visible

        const summaryText = data.subtitle || data.summary || '';
        const authorText = data.author || meta.author || 'teacher-j';
        const projectNum = meta.selection.padStart(3, '0');

        metaPage.innerHTML = `
            <div class="story-metadata">
                <span class="meta-row">PROJECT: ${projectNum} // ${meta.title.toUpperCase()}</span>
                <span class="meta-row">AUTHOR: ${authorText}</span> 
                <span class="meta-row">VERSION: LEGACY</span>
                <h1 class="meta-title">${data.title || meta.title}</h1>
                ${summaryText ? `<h4 class="meta-summary" style="margin-top:0;">${summaryText}</h4>` : ''}
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
                    // Legacy Mode: Render text directly
                    let text = item;
                    // Wrap lines at terminal width (80 chars)
                    text = text.replace(/(.{1,80})(\s|$)/g, '$1\n');
                    block.classList.add('typewriter-target');
                    block.dataset.text = text;
                    block.textContent = '';
                } else if (item.type === 'component') {
                    // Render image inline
                    renderComponent(item, block);
                }

                wrapper.appendChild(block);
            });
            contentPage.appendChild(wrapper);
            storyBody.appendChild(contentPage);
        }

        addControls();
        addNavTab(metaPage);
        initScrollAnimation();
    }

    /* --- V2 RENDERER --- */
    function renderStoryv2(engineData, libraryMeta) {
        mainInterface.classList.add('hidden');
        engineViewport.classList.remove('hidden');
        storyBody.innerHTML = '';



        // 2. METADATA
        const metaPage = createPageContainer();
        metaPage.classList.add('visible');
        const metaHTML = `
            <div class="story-metadata">
                <span class="meta-row">AUTHOR: ${engineData.Metadata.Author ? engineData.Metadata.Author.toUpperCase() : 'UNKNOWN'}</span>
                <h1 class="meta-title">${engineData.Metadata.Title}</h1>
                ${engineData.Metadata.Summary ? `<p class="meta-summary">${engineData.Metadata.Summary}</p>` : ''}
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
                                <img src="${entry.Image}" alt="${entry.Title}" class="scroll-image" style="max-width:100%; border: 3px solid #000; margin: 15px 0; display: block;">
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

        // 5. FOOTER
        if (engineData.Metadata.Footer) {
            const footerPage = createPageContainer();
            footerPage.innerHTML = `
                <div class="story-footer">
                    <p>${engineData.Metadata.Footer}</p>
                </div>
            `;
            // Add Bottom Nav
            const bottomNav = createNavButton();
            // bottomNav needs slightly different styling if not absolute? 
            // Just append it to the footer normally for bottom access
            bottomNav.style.margin = '40px auto 0 auto';
            bottomNav.style.writingMode = 'horizontal-tb';
            bottomNav.style.borderRadius = '4px';
            bottomNav.style.width = 'auto';
            bottomNav.style.display = 'inline-block';

            footerPage.querySelector('.story-footer').appendChild(document.createElement('br'));
            footerPage.querySelector('.story-footer').appendChild(bottomNav);

            storyBody.appendChild(footerPage);
        } else {
            // If no footer, add a control/nav page at bottom
            const controlPage = createPageContainer();
            controlPage.style.textAlign = 'center';
            controlPage.appendChild(createNavButton());
            // Override vertical style for bottom button
            const btn = controlPage.querySelector('.nav-return-btn');
            btn.style.writingMode = 'horizontal-tb';
            btn.style.width = 'auto';
            btn.style.display = 'inline-block';
            btn.style.borderRadius = '4px';

            storyBody.appendChild(controlPage);
        }

        // Add Top Nav (Tab)
        // We do this to the first page (Metadata page)
        addNavTab(metaPage);

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
        if (currentCollection) {
            engineState = 'collection';
        } else {
            engineState = 'library';
        }
        if (terminalOutput) {
            printToTerminal("--------------------------------");
            if (engineState === 'collection') {
                printToTerminal("Back in collection. Type 'list' for menu, a number to open a story, 'back' to return to authors, or 'exit' to quit.");
            } else {
                printToTerminal("Back in library. Type 'list' for menu, a number to open a collection, or 'exit' to quit.");
            }
        }
        if (terminalInput) terminalInput.focus();
    }

    function shutdownEngine() {
        engineViewport.classList.add('hidden');
        mainInterface.classList.add('hidden');
        engineState = 'library';
        currentCollection = null;
        if (startScreen) startScreen.classList.remove('hidden');
        if (terminalOutput) terminalOutput.innerHTML = '';
        if (terminalInput) terminalInput.value = '';
    }

    const shutdownBtn = document.getElementById('shutdown-btn');
    if (shutdownBtn) shutdownBtn.addEventListener('click', shutdownEngine);

    // --- ANIMATION ENGINE ---
    function initScrollAnimation() {
        // Page Turn
        const pages = document.querySelectorAll('.story-page-container');
        const pageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    pageObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });
        pages.forEach(page => pageObserver.observe(page));

        // Typewriter Effect
        const typeTargets = document.querySelectorAll('.typewriter-target');
        const typeObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const el = entry.target;
                    const text = el.dataset.text || el.textContent;
                    el.textContent = '';
                    el.style.opacity = '1';
                    let i = 0;
                    function typeChar() {
                        if (i < text.length) {
                            el.textContent += text.charAt(i);
                            i++;
                            setTimeout(typeChar, 15);
                        }
                    }
                    typeChar();
                    typeObserver.unobserve(el);
                }
            });
        });
        typeTargets.forEach(el => typeObserver.observe(el));

        // Image Reveal Logic
        const imageTargets = document.querySelectorAll('.scroll-image');
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    imageObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.2 });
        imageTargets.forEach(img => imageObserver.observe(img));

        window.scrollTo(0, 0);
    }
});
