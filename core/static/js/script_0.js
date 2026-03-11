/**
 * AI Tutor - script_0.js
 * Core logic for the AI Avatar Tutor with bilingual support and live subtitles.
 * Integrated with avatar_prototype.html IDs and event handlers.
 */

// 1. CONFIGURATION & ASSETS
const config = window.AI_CONFIG || {
    openai_api_key: "",
    static_url: "/static/",
    lesson_title: "General English",
    student_name: "Student"
};

// API_KEY is now handled by the backend proxy.
const API_KEY = "PROXY_MANAGED";

const ASSETS = {
    idle: `${config.static_url}img/tutor_idle.png`,
    talk: `${config.static_url}img/tutor_talk.png`,
    think: `${config.static_url}img/tutor_think.png`
};

// 2. STATE MANAGEMENT
let isTalking = false;
let isThinking = false;
let currentAudio = null;
let recognition = null;
let currentMode = 'voice'; // 'voice' or 'chat'
let currentSessionId = null;
let sessions = [];
let chatHistory = [];

const INDEX_KEY = 'ai_tutor_sessions';

/**
 * Persist the session index
 */
window.saveSessions = function() {
    try {
        localStorage.setItem(INDEX_KEY, JSON.stringify(sessions));
    } catch (e) {
        console.error("Failed to save session index:", e);
    }
};

/**
 * Persist current history to localStorage for the active session
 */
window.saveHistory = function () {
    if (!currentSessionId) return;
    try {
        localStorage.setItem(`ai_tutor_msg_${currentSessionId}`, JSON.stringify(chatHistory));
        
        // Update last peek/date in index
        const sess = sessions.find(s => s.id === currentSessionId);
        if (sess) {
            sess.lastPeek = new Date().toISOString();
            // Optional: update title if it was the first user message
            if (sess.title === "Nova Aula" && chatHistory.length > 2) {
                const firstUser = chatHistory.find(m => m.role === 'user');
                if (firstUser) sess.title = firstUser.content.substring(0, 25) + (firstUser.content.length > 25 ? "..." : "");
            }
            window.saveSessions();
            window.renderSessionList();
        }
    } catch (e) {
        console.error("Failed to save history:", e);
    }
};

/**
 * Load a specific session's history and populate UI
 */
window.loadHistory = function (sessionId) {
    if (!sessionId) return false;
    try {
        const saved = localStorage.getItem(`ai_tutor_msg_${sessionId}`);
        if (saved) {
            const parsed = JSON.parse(saved);
            chatHistory = parsed;
            
            // Clear current UI messages
            ['callMsgs', 'chatMsgs'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.innerHTML = '';
            });

            // Re-render all messages (prevent re-saving while loading)
            chatHistory.forEach(msg => {
                if (msg.role !== 'system') {
                    window.renderMsgUI(msg.role, msg.content);
                }
            });
            return true;
        }
    } catch (e) {
        console.error("Failed to load history:", e);
    }
    return false;
};

// 3. UI MAPPINGS
const elements = {
    get subtitle() { return document.getElementById('aiSubtitles'); },
    get avatar() { return document.getElementById('main-tutor-img'); },
    get statusText() { return document.getElementById('ntStatus'); },
    get stateDot() { return document.getElementById('ntDot'); },
    // Dynamic getters
    get chatMsgs() { return document.getElementById(currentMode === 'chat' ? 'chatMsgs' : 'callMsgs'); },
    get inputTxt() { return document.getElementById(currentMode === 'chat' ? 'chatTxt' : 'callTxt'); },
    get micBtn() { return document.getElementById('micBtn'); },
    get camBtn() { return document.getElementById('camBtn'); },
    get chatOverlay() { return document.getElementById('chatOverlay'); },
    get sCall() { return document.getElementById('sCall'); },
    get modeSelection() { return document.getElementById('sSelect'); },
    get userSubtitle() { return document.getElementById('userSubtitles'); }
};

// 4. CORE FUNCTIONS

/**
 * Updates the visual state of the avatar and UI status.
 */
window.setAvState = function (state) {
    const wrap = document.getElementById('avWrap') || document.getElementById('avFloat');
    const mainImg = document.getElementById('main-tutor-img');
    const selImg = document.getElementById('selAvInner');
    
    if (!wrap) return;

    // Reset classes
    wrap.classList.remove('talking', 'thinking');

    let imgSrc = ASSETS.idle;

    switch (state) {
        case 'talk':
            wrap.classList.add('talking');
            if (elements.stateDot) elements.stateDot.style.background = "#ff4b2b";
            if (elements.statusText) elements.statusText.textContent = "Talking...";
            imgSrc = ASSETS.talk;
            isTalking = true;
            isThinking = false;
            break;
        case 'think':
            wrap.classList.add('thinking');
            if (elements.stateDot) elements.stateDot.style.background = "#f9d423";
            if (elements.statusText) elements.statusText.textContent = "Thinking...";
            imgSrc = ASSETS.think;
            isThinking = true;
            isTalking = false;
            break;
        case 'idle':
        default:
            if (elements.stateDot) elements.stateDot.style.background = "#2ecc71";
            if (elements.statusText) elements.statusText.textContent = "Online";
            imgSrc = ASSETS.idle;
            isTalking = false;
            isThinking = false;
            break;
    }

    if (mainImg) mainImg.src = imgSrc;
    if (selImg && selImg.querySelector('img')) selImg.querySelector('img').src = imgSrc;
};

/**
 * Pure UI function to render a message bubble
 */
window.renderMsgUI = function (role, text) {
    const name = role === 'assistant' ? 'Professora Maria' : (config.student_name || 'Você');
    const msgClass = role === 'assistant' ? 'a' : 'u';
    
    const msgHtml = `
        <div class="msg ${msgClass}">
            <div class="msg-name">${name}</div>
            <div class="msg-bbl">${text}</div>
        </div>
    `;
    
    // Support both callMsgs and chatMsgs
    ['callMsgs', 'chatMsgs'].forEach(id => {
        const container = document.getElementById(id);
        if (container) {
            const div = document.createElement('div');
            div.innerHTML = msgHtml.trim();
            const messageNode = div.firstChild;
            if (messageNode) {
                container.appendChild(messageNode.cloneNode(true));
                container.scrollTop = container.scrollHeight;
            }
        }
    });
};

/**
 * Adds a message to the chat container and persists it.
 */
window.addMsg = function (role, text, skipSave = false) {
    if (!skipSave) {
        chatHistory.push({ role: role, content: text });
        window.saveHistory();
    }

    window.renderMsgUI(role, text);

    // Update unread count if overlay is closed
    if (role === 'assistant' && elements.chatOverlay && !elements.chatOverlay.classList.contains('open')) {
        const unread = document.getElementById('unread');
        if (unread) {
            let count = parseInt(unread.textContent) || 0;
            unread.textContent = count + 1;
            unread.style.display = 'flex';
        }
    }
};

/**
 * TTS logic with subtitle overlay.
 */
window.speak = async function (text) {
    if (!text) return;

    window.setAvState('talk');

    // Show Subtitles
    if (elements.subtitle) {
        elements.subtitle.textContent = text;
        elements.subtitle.style.display = 'block';
        setTimeout(() => elements.subtitle.classList.add('active'), 10);
    }

    try {
        const response = await fetch('/ai-tutor/tts/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                input: text
            })
        });

        if (!response.ok) throw new Error('TTS failed');

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        if (currentAudio) currentAudio.pause();
        currentAudio = new Audio(url);

        currentAudio.onended = () => {
            window.setAvState('idle');
            // Hide Subtitles
            if (elements.subtitle) {
                elements.subtitle.classList.remove('active');
                setTimeout(() => {
                    if (!elements.subtitle.classList.contains('active')) {
                        elements.subtitle.style.display = 'none';
                    }
                }, 1000);
            }
        };

        await currentAudio.play();
    } catch (err) {
        console.error("TTS Error:", err);
        window.setAvState('idle');
        if (elements.subtitle) elements.subtitle.style.display = 'none';
    }
};

/**
 * AI Response generator (GPT-4).
 */
window.getAIResponse = async function () {
    window.setAvState('think');

    try {
        const response = await fetch('/ai-tutor/chat/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages: chatHistory
            })
        });

        const data = await response.json();
        const reply = data.choices[0].message.content;

        window.addMsg('assistant', reply);
        
        // Only speak if not in chat mode
        if (currentMode !== 'chat') {
            await window.speak(reply);
        }
    } catch (err) {
        console.error("AI Error:", err);
        window.setAvState('idle');
    }
};

// 5. EXPOSED UI HANDLERS

window.toggleMic = function (mode) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Speech recognition is not supported in this browser.");
        return;
    }

    if (recognition) {
        recognition.stop();
        recognition = null;
        return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true; // Enable live updates

    recognition.onstart = () => {
        const btns = document.querySelectorAll('.cb-mic, .ib-mic');
        btns.forEach(b => b.classList.add('active'));
        if (elements.userSubtitle) {
            elements.userSubtitle.textContent = "...";
            elements.userSubtitle.style.display = 'block';
            setTimeout(() => elements.userSubtitle.classList.add('active'), 10);
        }
    };
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        
        // Show interim transcript for user to see
        if (elements.userSubtitle) {
            elements.userSubtitle.textContent = transcript;
        }

        if (event.results[0].isFinal) {
            if (elements.inputTxt) {
                elements.inputTxt.value = transcript;
                window.doSend(mode);
            }
            // Hide subtitle after a while
            setTimeout(() => {
                if (elements.userSubtitle) {
                    elements.userSubtitle.classList.remove('active');
                    setTimeout(() => elements.userSubtitle.style.display = 'none', 300);
                }
            }, 2000);
        }
    };
    recognition.onend = () => {
        const btns = document.querySelectorAll('.cb-mic, .ib-mic');
        btns.forEach(b => b.classList.remove('active'));
        recognition = null;
    };
    recognition.start();
};

window.doSend = function (mode) {
    console.log("doSend called with mode:", mode, "currentMode:", currentMode);
    
    // Explicitly find the active input
    let input = (mode === 'chat' || currentMode === 'chat') ? document.getElementById('chatTxt') : document.getElementById('callTxt');
    
    if (!input) {
        console.warn("Input not found by mode, trying fallback...");
        input = elements.inputTxt;
    }
    
    if (!input) {
        console.error("Critical: Input element not found.");
        return;
    }
    
    const text = input.value.trim();
    console.log("Input text:", text);
    if (!text) return;

    input.value = '';
    input.style.height = 'auto'; 
    
    console.log("Appending message to UI...");
    window.addMsg('user', text);
    
    console.log("Requesting AI response...");
    window.getAIResponse();
};

window.toggleCam = function () {
    const pipVid = document.getElementById('pipVid');
    const pipPh = document.getElementById('pipPh');
    if (!pipVid) return;

    if (pipVid.style.display === 'none') {
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(stream => {
                pipVid.srcObject = stream;
                pipVid.style.display = 'block';
                if (pipPh) pipPh.style.display = 'none';
                if (elements.camBtn) elements.camBtn.classList.add('active');
            })
            .catch(err => {
                console.error("Camera Error:", err);
                alert("Could not access camera.");
            });
    } else {
        const stream = pipVid.srcObject;
        if (stream) stream.getTracks().forEach(track => track.stop());
        pipVid.srcObject = null;
        pipVid.style.display = 'none';
        if (pipPh) pipPh.style.display = 'flex';
        if (elements.camBtn) elements.camBtn.classList.remove('active');
    }
};

window.toggleSidebar = function () {
    const sidebar = document.getElementById('historySidebar');
    const overlay = document.getElementById('sbOverlay');
    if (sidebar) sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('active');
    if (sidebar && sidebar.classList.contains('open')) {
        window.renderSessionList();
    }
};

window.createNewSession = function () {
    const id = "sess_" + Date.now();
    const newSession = {
        id: id,
        title: "Nova Aula",
        date: new Date().toLocaleDateString(),
        lastPeek: new Date().toISOString()
    };
    sessions.unshift(newSession);
    currentSessionId = id;
    
    // Reset history with system prompt
    chatHistory = [
        {
            role: "system",
            content: `You are "Professora Maria", an advanced AI English Tutor. Context: ${config.lesson_title}.`
        }
    ];
    
    // Clear UI
    ['callMsgs', 'chatMsgs'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '';
    });
    
    window.saveSessions();
    window.saveHistory();
    window.renderSessionList();
    
    // Close sidebar if mobile or optional
    const sidebar = document.getElementById('historySidebar');
    if (sidebar && sidebar.classList.contains('open')) window.toggleSidebar();

    // Trigger greeting
    setTimeout(() => {
        // Double check if this is still the active session and history is empty
        if (id === currentSessionId && chatHistory.length <= 1) {
            const greeting = `Hello ${config.student_name}! I'm Professora Maria, your English tutor. Ready to start our ${config.lesson_title} lesson?`;
            window.addMsg('assistant', greeting);
            if (currentMode !== 'chat') window.speak(greeting);
        }
    }, 600);
};

window.switchSession = function (id) {
    currentSessionId = id;
    const sess = sessions.find(s => s.id === id);
    if (sess) {
        sess.lastPeek = new Date().toISOString();
        window.saveSessions();
    }
    window.loadHistory(id);
    window.renderSessionList();
    const sidebar = document.getElementById('historySidebar');
    if (sidebar && sidebar.classList.contains('open')) window.toggleSidebar();
};

window.renderSessionList = function () {
    const list = document.getElementById('sessionList');
    if (!list) return;
    
    list.innerHTML = sessions.map(s => `
        <div class="sb-item ${s.id === currentSessionId ? 'active' : ''}" onclick="switchSession('${s.id}')">
            <span class="sb-item-title">${s.title}</span>
            <span class="sb-item-date">${s.date}</span>
        </div>
    `).join('');
};

window.launchMode = function (mode, isAuto = false, skipGreeting = false) {
    currentMode = mode;
    
    // If manually clicked from selection screen, always start a new session
    if (!isAuto) {
        window.createNewSession();
        window.location.hash = mode;
    }
    
    // Hide selection screen
    if (elements.modeSelection) elements.modeSelection.style.display = 'none';
    if (elements.modeSelection) elements.modeSelection.classList.remove('active');

    if (mode === 'chat') {
        const sChat = document.getElementById('sChat');
        if (sChat) {
            sChat.style.display = 'flex';
            sChat.classList.add('active');
        }
    } else {
        if (elements.sCall) {
            elements.sCall.style.display = 'flex';
            elements.sCall.classList.add('active');
        }
    }

    // Start simple timer for calls
    if (mode === 'call') {
        let sec = 0;
        const timerEl = document.getElementById('callTimer');
        const timerInt = setInterval(() => {
            if (elements.sCall && elements.sCall.style.display !== 'none') {
                sec++;
                const m = Math.floor(sec / 60).toString().padStart(2, '0');
                const s = (sec % 60).toString().padStart(2, '0');
                if (timerEl) timerEl.textContent = `${m}:${s}`;
            } else {
                clearInterval(timerInt);
            }
        }, 1000);
    }

    // Initial Greeting (only if no history exists and NOT a new session we just created)
    if (!skipGreeting && !(!isAuto)) { 
        setTimeout(() => {
            if (chatHistory.length <= 1) {
                const greeting = `Hello ${config.student_name}! I'm Professora Maria, your English tutor. Ready to start our ${config.lesson_title} lesson?`;
                window.addMsg('assistant', greeting);
                
                // Only speak if not in chat mode
                if (currentMode !== 'chat') {
                    window.speak(greeting);
                }
            }
        }, 600);
    }
};

/**
 * Auto-resize textarea
 */
window.ar = function (el) {
    el.style.height = 'auto';
    el.style.height = (el.scrollHeight) + 'px';
};

/**
 * Handle keydown (Enter to send)
 */
window.hk = function (e, mode) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        window.doSend(mode);
    }
};

window.goHome = function () {
    window.location.hash = '';
    location.reload();
};

// Global helper for quick replies
window.qs = function (btn) {
    // Definitive input resolution for quick replies
    const input = elements.inputTxt;
    if (input) {
        input.value = btn.innerText;
        window.doSend(currentMode);
    }
};

// Auto-init
document.addEventListener('DOMContentLoaded', () => {
    // Inject initial images
    const avFloat = document.getElementById('avFloat');
    const selAvInner = document.getElementById('selAvInner');
    const chatAvThumb = document.getElementById('chatAvThumb');

    if (avFloat) {
        avFloat.innerHTML = `<img id="main-tutor-img" src="${ASSETS.idle}" alt="Tutor" style="width:100%; height:100%; object-fit:cover;">`;
    }
    if (selAvInner) {
        selAvInner.innerHTML = `<img src="${ASSETS.idle}" alt="Tutor" style="width:100%; height:100%; object-fit:cover;">`;
    }
    if (chatAvThumb) {
        chatAvThumb.innerHTML = `<img src="${ASSETS.idle}" alt="Tutor" style="width:100%; height:100%; object-fit:cover;">`;
    }

    window.setAvState('idle');

    // Persistence Check: Load sessions index
    try {
        const savedSessions = localStorage.getItem(INDEX_KEY);
        if (savedSessions) {
            sessions = JSON.parse(savedSessions);
            if (sessions.length > 0) {
                // Get last used session or first one
                const last = sessions.sort((a,b) => new Date(b.lastPeek) - new Date(a.lastPeek))[0];
                currentSessionId = last.id;
                window.loadHistory(currentSessionId);
            }
        }
    } catch(e) { console.error(e); }

    // If no session exists, create one
    if (!currentSessionId) {
        window.createNewSession();
    }

    // Auto-launch based on hash
    const hash = window.location.hash.replace('#', '');
    if (hash === 'chat' || hash === 'call') {
        console.log("Auto-launching mode from hash:", hash);
        window.launchMode(hash, true, chatHistory.length > 1); 
    }
});
