
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const tvButton = document.getElementById('tvbutton');
    const tvScreen = document.getElementById('tv-screen');
    const engineFrame = document.querySelector('.engine-frame');
    const mainInterface = document.getElementById('main-interface');
    const terminalInput = document.getElementById('terminal-input');
    const terminalOutput = document.getElementById('terminal-output');
    const engineViewport = document.getElementById('engine-viewport');
    const storyBody = document.getElementById('story-body');

    // Video elements (both live inside tv-screen)
    const bootVideo = document.getElementById('boot-video');
    const shutdownVideo = document.getElementById('shutdown-video');
    // Hide both videos initially
    if (bootVideo) bootVideo.style.display = 'none';
    if (shutdownVideo) shutdownVideo.style.display = 'none';

    // Shared mute state — applies to both videos
    let isMuted = false;
    const muteBtn = document.getElementById('mute-btn');
    if (muteBtn) {
        // Set initial UI
        muteBtn.textContent = '🔊';
        muteBtn.classList.add('unmuted');

        muteBtn.addEventListener('click', () => {
            isMuted = !isMuted;
            const radioAudio = document.getElementById('radio-audio');
            const onAudio = document.getElementById('on-audio');
            const offAudio = document.getElementById('off-audio');

            if (bootVideo) bootVideo.muted = true; // Videos always muted to prefer explicit audio tracks
            if (shutdownVideo) shutdownVideo.muted = true;

            if (radioAudio) radioAudio.muted = isMuted;
            if (onAudio) onAudio.muted = isMuted;
            if (offAudio) offAudio.muted = isMuted;

            const inter01 = document.getElementById('inter-01');
            const inter02 = document.getElementById('inter-02');
            if (inter01) inter01.muted = isMuted;
            if (inter02) inter02.muted = isMuted;

            muteBtn.textContent = isMuted ? '🔇' : '🔊';
            muteBtn.classList.toggle('unmuted', !isMuted);
        });
    }

    // Logo flash — plays inside the tv-screen div
    function showLogoFlash() {
        return new Promise((resolve) => {
            if (!tvScreen) { resolve(); return; }
            const flash = document.createElement('div');
            flash.className = 'screen-logo-flash';
            flash.innerHTML = `
                <img src="assets/storygear.png" alt="StoryEngine Logo">
                <div class="logo-title">STORYENGINE</div>
            `;
            tvScreen.appendChild(flash);

            // Hold for 2s, then fade out
            setTimeout(() => {
                flash.classList.add('fade-out');
                setTimeout(() => {
                    flash.remove();
                    resolve();
                }, 600);
            }, 2000);
        });
    }

    // Power label element
    const powerLabel = document.getElementById('power-label');
    let isOn = false;

    // TV power button — triggers: screen on → video → black → logo → terminal
    if (tvButton) {
        tvButton.addEventListener('click', () => {
            if (!isOn) {
                // Turn ON
                isOn = true;
                tvButton.classList.add('active');
                if (powerLabel) { powerLabel.textContent = 'ON'; powerLabel.classList.add('on'); }

                if (bootVideo) {
                    bootVideo.muted = true; // Use separate audio file
                    bootVideo.style.display = 'block';
                    bootVideo.currentTime = 0;
                    bootVideo.play();

                    const onAudio = document.getElementById('on-audio');
                    if (onAudio) {
                        onAudio.muted = isMuted;
                        onAudio.currentTime = 0;
                        onAudio.play().catch(e => console.error("On audio play failed:", e));
                    }

                    bootVideo.addEventListener('ended', async () => {
                        bootVideo.classList.add('video-fade-out');
                        await new Promise(r => setTimeout(r, 800));
                        bootVideo.style.display = 'none';
                        bootVideo.classList.remove('video-fade-out');

                        await showLogoFlash();
                        initEngine(true);
                    }, { once: true });
                } else {
                    initEngine(true);
                }
            } else {
                // Turn OFF
                shutdownEngine();
            }
        });
    }

    // State
    let stories = [];
    let currentCollection = null;
    let isTypingGlobal = false;
    let typeQueue = [];

    /** @type {'library' | 'story'} — only show full menu when 'library' and on boot or explicit list */
    let engineState = 'library';

    // Scroll the terminal container to bottom (like a real shell)
    const terminalContainer = document.getElementById('terminal-interface');
    function scrollTerminal() {
        if (terminalContainer) terminalContainer.scrollTop = terminalContainer.scrollHeight;
    }

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
        // Submit any command on Enter — like a real shell
        terminalInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const val = terminalInput.value.trim();
                if (val) {
                    processCommand(val);
                    terminalInput.value = '';
                }
            }
        });
    }

    function initEngine(skipBoot = false) {
        // Swap: hide screen, show terminal — frame stays
        if (tvScreen) tvScreen.classList.add('hidden');
        if (mainInterface) mainInterface.classList.remove('hidden');

        if (skipBoot) {
            loadLibrary();
        } else {
            if (terminalOutput) terminalOutput.innerHTML = '';
            runBootSequence();
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
        } else if (engineState === 'collection') {
            printToTerminal(`AVAILABLE ARCHIVES FOR ${currentCollection.title.toUpperCase()}:`);
            for (const story of currentCollection.items) {
                const file = getFilename(story.id);
                await typeLineTerminal(`[${story.selection}] ${file}  --  ${story.title}`, 10);
            }
            printToTerminal("--------------------------------");
        }
    }

    function printToTerminal(text) {
        if (!terminalOutput) return;
        const line = document.createElement('div');
        line.textContent = text;
        terminalOutput.appendChild(line);
        scrollTerminal();
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
                    scrollTerminal();
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

        const lower = cmd.toLowerCase();

        if (lower === 'exit') {
            shutdownEngine();
            return;
        }

        if (lower === 'clear') {
            if (terminalOutput) terminalOutput.innerHTML = '';
            return;
        }

        if (lower === 'back') {
            if (engineState === 'collection') {
                engineState = 'library';
                currentCollection = null;
                listStories();
            } else if (engineState === 'story') {
                returnToTerminal();
            }
            return;
        }

        if (lower === 'list' || lower === 'ls') {
            listStories();
            return;
        }

        // Easter egg: secret
        if (lower === 'secret') {
            await typeLineTerminal('Job 41:1: "Can you draw out Leviathan with a fishhook? Or press down his tongue with a cord?"', 20);
            return;
        }

        // Easter egg: any variation of 'lawithanx'
        if (lower === 'lawithanx') {
            await typeLineTerminal("[SYSTEM] ACCESS GRANTED — CLASSIFIED FILE DETECTED...", 15);
            await delay(500);
            printToTerminal("Loading FBI CASE FILE - LEAKED...");
            engineState = 'story';
            await loadStory({ id: 'story_lawithanx', title: 'FBI CASE FILE - LEAKED', selection: '1' });
            return;
        }

        if (engineState === 'library') {
            const selection = stories.find(s => s.selection === cmd);
            if (selection) {
                engineState = 'collection';
                currentCollection = selection;
                listStories();
                return;
            }
        } else if (engineState === 'collection') {
            const selection = currentCollection.items.find(s => s.selection === cmd);
            if (selection) {
                engineState = 'story';
                await typeLineTerminal("[SYSTEM] ACCESSING DATA_STREAM...", 20);
                await delay(300);
                printToTerminal("Loading " + selection.title + "...");
                await loadStory(selection);
                return;
            }
        }

        // Echo anything else — like a real shell
        printToTerminal(cmd);
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
                throw new Error("Story format invalid. Missing ProjectEngine structure.");
            }
        } catch (error) {
            printToTerminal(`Error: ${error.message}`);
            if (terminalOutput) {
                const errLine = document.createElement('div');
                errLine.className = 'terminal-error';
                errLine.textContent = `Failed to load "${storyMetadata.title}". Check console for details.`;
                terminalOutput.appendChild(errLine);
                scrollTerminal();
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


    /* --- V2 RENDERER --- */
    function renderStoryv2(engineData, libraryMeta) {
        mainInterface.classList.add('hidden');
        if (engineFrame) engineFrame.classList.add('hidden');
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
        if (engineFrame) engineFrame.classList.remove('hidden');
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
        // Hide terminal and story viewport immediately
        engineViewport.classList.add('hidden');
        mainInterface.classList.add('hidden');
        engineState = 'library';
        currentCollection = null;

        // Show tv-screen so we can play the off video in it
        if (tvScreen) tvScreen.classList.remove('hidden');

        // Reset boot video
        if (bootVideo) {
            bootVideo.pause();
            bootVideo.currentTime = 0;
            bootVideo.style.display = 'none';
            bootVideo.classList.remove('video-fade-out');
        }
        // Remove any logo flash still on screen
        if (tvScreen) {
            const flash = tvScreen.querySelector('.screen-logo-flash');
            if (flash) flash.remove();
        }
        if (terminalOutput) terminalOutput.innerHTML = '';
        if (terminalInput) terminalInput.value = '';

        // Play shutdown video in the screen
        if (shutdownVideo) {
            shutdownVideo.muted = true; // Video itself is always muted
            shutdownVideo.style.display = 'block';
            // Start from the middle of the video instead of the beginning for a faster, punchier effect
            shutdownVideo.currentTime = 2.0;
            shutdownVideo.play().catch(e => console.error("Shutdown video play failed:", e));

            const offAudio = document.getElementById('off-audio');
            if (offAudio) {
                offAudio.muted = isMuted;
                offAudio.currentTime = 2.0; // Play synced audio starting at 2s
                offAudio.play().catch(e => console.error("Off audio play failed:", e));
            }

            shutdownVideo.addEventListener('ended', () => {
                shutdownVideo.style.display = 'none';
                // Reset button to OFF state
                isOn = false;
                tvButton.classList.remove('active');
                if (powerLabel) { powerLabel.textContent = 'OFF'; powerLabel.classList.remove('on'); }
            }, { once: true });
        } else {
            // No shutdown video — reset immediately
            isOn = false;
            tvButton.classList.remove('active');
            if (powerLabel) { powerLabel.textContent = 'OFF'; powerLabel.classList.remove('on'); }
        }
    }

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

    // Manual button toggle
    const manualBtn = document.getElementById('manual-btn');
    const manualOverlay = document.getElementById('manual-overlay');
    const closeManual = document.getElementById('close-manual');

    if (manualBtn && manualOverlay) {
        manualBtn.addEventListener('click', () => {
            manualOverlay.classList.toggle('hidden');
        });
    }
    if (closeManual && manualOverlay) {
        closeManual.addEventListener('click', () => {
            manualOverlay.classList.add('hidden');
        });
    }

    // Vintage Radio Toggle & Interference Logic
    const vintageRadio = document.getElementById('vintage-radio');
    const radioAudio = document.getElementById('radio-audio');
    const inter01 = document.getElementById('inter-01');
    const inter02 = document.getElementById('inter-02');

    let radioInterferenceInterval = null;
    let radioInterferenceDuration = null;
    let isInterfering = false;
    let currentInterferenceAudio = null;

    if (vintageRadio && radioAudio) {
        // Sync initial mute state
        radioAudio.muted = isMuted;
        if (inter01) inter01.muted = isMuted;
        if (inter02) inter02.muted = isMuted;

        function clearInterferences() {
            if (radioInterferenceInterval) clearTimeout(radioInterferenceInterval);
            if (radioInterferenceDuration) clearTimeout(radioInterferenceDuration);
            if (currentInterferenceAudio) {
                currentInterferenceAudio.pause();
                currentInterferenceAudio.currentTime = 0;
            }
            isInterfering = false;
            currentInterferenceAudio = null;
            radioAudio.volume = 1.0;
        }

        function scheduleInterference() {
            // Chooses random time between 15s to 45s to play an interference
            const nextInterferenceTime = Math.random() * 30000 + 15000;
            radioInterferenceInterval = setTimeout(triggerInterference, nextInterferenceTime);
        }

        function triggerInterference() {
            if (radioAudio.paused && !isInterfering) return; // Radio is off globally

            isInterfering = true;
            radioAudio.volume = 0.1; // Turn down main song instead of pausing

            // Randomly choose track 1 or 2
            const trackToPlay = Math.random() > 0.5 ? inter01 : inter02;
            currentInterferenceAudio = trackToPlay;

            if (currentInterferenceAudio) {
                currentInterferenceAudio.currentTime = 0;
                currentInterferenceAudio.play().catch(e => console.error("Interference play failed", e));
            }

            // Play for random duration between 3s and 13s
            const duration = Math.random() * 10000 + 3000;
            radioInterferenceDuration = setTimeout(() => {
                if (currentInterferenceAudio) {
                    currentInterferenceAudio.pause();
                }
                isInterfering = false;
                currentInterferenceAudio = null;
                // Resume main song
                if (vintageRadio.classList.contains('playing')) {
                    radioAudio.volume = 1.0; // Restore volume
                    scheduleInterference();
                }
            }, duration);
        }

        vintageRadio.addEventListener('click', () => {
            if (!vintageRadio.classList.contains('playing')) {
                // Turn ON
                radioAudio.play().catch(e => console.error("Radio play failed:", e));
                vintageRadio.classList.add('playing');
                scheduleInterference();
            } else {
                // Turn OFF entirely
                radioAudio.pause();
                vintageRadio.classList.remove('playing');
                clearInterferences(); // Stop any pending or running interference
            }
        });
    }

});
