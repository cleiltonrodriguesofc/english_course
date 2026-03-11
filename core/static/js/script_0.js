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
let chatHistory = [
    {
        role: "system",
        content: `You are "Professora Maria", an advanced AI English Tutor. 
        Context: The student is attending the lesson: ${config.lesson_title}.
        
        INSTRUCTIONS:
        - Communicate primarily in English.
        - Use Portuguese only when necessary for translation or deep clarification.
        - Maintain a warm, encouraging, and professional persona.
        - Provide immediate, constructive feedback on grammar and vocabulary.
        - Ask open-ended questions to keep the conversation flowing.
        - Keep spoken responses short (2-4 sentences) for clarity with subtitles.`
    }
];

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
 * Adds a message to the chat container.
 */
window.addMsg = function (role, text) {
    chatHistory.push({ role: role, content: text });

    const name = role === 'assistant' ? 'Professora Maria' : (config.student_name || 'Você');
    const msgClass = role === 'assistant' ? 'a' : 'u';
    
    const msgHtml = `
        <div class="msg ${msgClass}">
            <div class="msg-name">${name}</div>
            <div class="msg-bbl">${text}</div>
        </div>
    `;
    
    // Support both callMsgs and chatMsgs for safety
    ['callMsgs', 'chatMsgs'].forEach(id => {
        const container = document.getElementById(id);
        if (container) {
            const div = document.createElement('div');
            div.innerHTML = msgHtml.trim();
            // We want the inner div (the .msg) to be appended
            container.appendChild(div.firstChild);
            container.scrollTop = container.scrollHeight;
        }
    });

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
    // If a mode is provided, try to get the specific input for that mode
    const input = mode ? document.getElementById(mode === 'chat' ? 'chatTxt' : 'callTxt') : elements.inputTxt;
    if (!input) return;
    
    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    input.style.height = 'auto'; // Reset height
    window.addMsg('user', text);
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

window.toggleChatOverlay = function () {
    if (elements.chatOverlay) elements.chatOverlay.classList.toggle('open');
};

window.launchMode = function (mode) {
    currentMode = mode;
    
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

    // Initial Greeting
    setTimeout(() => {
        const greeting = `Hello ${config.student_name}! I'm Professora Maria, your English tutor. Ready to start our ${config.lesson_title} lesson?`;
        window.addMsg('assistant', greeting);
        
        // Only speak if not in chat mode
        if (currentMode !== 'chat') {
            window.speak(greeting);
        }
    }, 600);
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
    location.reload();
};

// Global helper for quick replies
window.qs = function (btn) {
    if (elements.inputTxt) {
        elements.inputTxt.value = btn.innerText;
        window.doSend('call');
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
});
