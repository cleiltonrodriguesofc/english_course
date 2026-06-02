
// ─── Avatar image (base64, loaded from template) ─────────────────────────────
// AVATAR_SVG is injected by the HTML template via AI_CONFIG

// ─── State ───────────────────────────────────────────────────────────────────
let conv = [], lesson = { title: '', desc: '' }, mode = '';
let timerSec = 0, timerIv = null, camStream = null;
let isRec = false, recog = null, chatOpen = false, unreadN = 0;
let mouthIv = null;
let currentAudio = null;

// ─── Boot ────────────────────────────────────────────────────────────────────
window.addEventListener('load', () => {
    const selAvInner = document.getElementById('selAvInner');
    if (selAvInner && window.AI_CONFIG && window.AI_CONFIG.avatar_img_tag) {
        selAvInner.innerHTML = window.AI_CONFIG.avatar_img_tag;
    }
});

// ─── CSRF helper ─────────────────────────────────────────────────────────────
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// ─── Mode launch ─────────────────────────────────────────────────────────────
function launchMode(m) {
    mode = m;
    const v = document.getElementById('lessonSel').value.split('|');
    lesson = { title: v[0], desc: v[1] };
    showScreen(m === 'call' ? 'sCall' : 'sChat');
    injectAvatars();
    conv = [];
    clearMsgs();
    if (m === 'call') { startTimer(); chatOpen = false; document.getElementById('speakRing').className = 'speak-ring'; }
    if (m === 'chat') { document.getElementById('chatLessonPill').textContent = lesson.title.split('—')[0].trim(); }
    setTimeout(() => welcome(), 400);
}

function injectAvatars() {
    const tag = window.AI_CONFIG && window.AI_CONFIG.avatar_img_tag ? window.AI_CONFIG.avatar_img_tag : '👩‍🏫';
    document.getElementById('avFloat').innerHTML = tag;
    document.getElementById('chatAvThumb').innerHTML = tag;
}

function clearMsgs() {
    document.getElementById('callMsgs').innerHTML = '';
    document.getElementById('chatMsgs').innerHTML = '';
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function goHome() {
    if (currentAudio) { currentAudio.pause(); currentAudio = null; }
    if (camStream) { camStream.getTracks().forEach(t => t.stop()); camStream = null; }
    clearInterval(timerIv); timerSec = 0;
    document.getElementById('callTimer').textContent = '00:00';
    chatOpen = false;
    document.getElementById('chatOverlay').classList.remove('open');
    showScreen('sSelect');
}

// ─── Timer ───────────────────────────────────────────────────────────────────
function startTimer() {
    clearInterval(timerIv);
    timerIv = setInterval(() => {
        timerSec++;
        const m = String(Math.floor(timerSec / 60)).padStart(2, '0');
        const s = String(timerSec % 60).padStart(2, '0');
        document.getElementById('callTimer').textContent = `${m}:${s}`;
    }, 1000);
}

// ─── System prompt ───────────────────────────────────────────────────────────
function sysPrompt() {
    const studentName = window.AI_CONFIG && window.AI_CONFIG.student_name ? window.AI_CONFIG.student_name : 'Student';
    return `You are Maria, a warm and encouraging English teacher in a ${mode === 'call' ? 'live video call' : 'text chat'} with a Brazilian student named ${studentName} who is around 12 years old.
Lesson: "${lesson.title}" — ${lesson.desc}
Rules:
1. Your main focus is teaching natural spoken English, showing "connected speech" techniques and natural intonation.
2. Communicate structurally in Portuguese (Brazilian), but give practical examples from the lesson in English.
3. Keep responses SHORT — maximum 3 sentences. Like a spoken conversation.
4. Gently correct grammar and pronunciation errors, give a brief explanation in Portuguese, then continue.
5. End each response with ONE question to keep the conversation flowing. Stay on the lesson topic. Plain text only — no markdown.`;
}

// ─── Welcome ─────────────────────────────────────────────────────────────────
function welcome() {
    const txt = `Olá! Eu sou a Maria, e hoje vamos praticar "${lesson.title}". Estou muito feliz em ter você aqui! Para começar, me diga, qual é o seu nome?`;
    addMsg('a', txt);
    conv.push({ role: 'model', parts: [{ text: txt }] });
    if (mode === 'call') speak(txt);
}

// ─── Send ─────────────────────────────────────────────────────────────────────
async function doSend(ctx) {
    const inp = document.getElementById(ctx === 'call' ? 'callTxt' : 'chatTxt');
    const txt = inp.value.trim();
    if (!txt) return;
    inp.value = ''; ar(inp);
    addMsg('u', txt);
    conv.push({ role: 'user', parts: [{ text: txt }] });
    setAvState('think');

    try {
        // Build the full prompt string for Gemini
        const sys = sysPrompt();
        const historyText = conv.slice(0, -1).map(m => {
            const role = m.role === 'model' ? 'Maria' : 'Student';
            const text = m.parts ? m.parts[0].text : m.content || '';
            return `${role}: ${text}`;
        }).join('\n');
        const fullPrompt = `${sys}\n\n${historyText}\nStudent: ${txt}\nMaria:`;

        const res = await fetch('/ai-tutor/chat/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({ prompt: fullPrompt })
        });

        const data = await res.json();

        if (data.error) {
            throw new Error(data.error.message || 'API error');
        }

        // Parse Gemini response
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'Desculpe, não entendi. Pode repetir?';
        conv.push({ role: 'model', parts: [{ text: reply }] });
        setAvState('idle');
        addMsg('a', reply);
        if (mode === 'call') speak(reply);
        if (mode === 'call' && !chatOpen) { unreadN++; const u = document.getElementById('unread'); u.textContent = unreadN; u.style.display = 'flex'; }

    } catch (e) {
        setAvState('idle');
        showToast('Erro ao conectar com a IA: ' + e.message);
        console.error(e);
    }
}

// ─── Quick send ──────────────────────────────────────────────────────────────
function qs(btn) {
    const ctx = mode === 'call' ? 'call' : 'chat';
    const inp = document.getElementById(ctx === 'call' ? 'callTxt' : 'chatTxt');
    inp.value = btn.textContent.trim();
    doSend(ctx);
}

// ─── Add message bubble ───────────────────────────────────────────────────────
function addMsg(role, text) {
    const box = document.getElementById(mode === 'call' ? 'callMsgs' : 'chatMsgs');
    const name = window.AI_CONFIG && window.AI_CONFIG.student_name ? window.AI_CONFIG.student_name : 'Você';
    const d = document.createElement('div');
    d.className = `msg ${role}`;
    const n = document.createElement('div');
    n.className = 'msg-name';
    n.textContent = role === 'a' ? 'Professora Maria' : name;
    const b = document.createElement('div');
    b.className = 'msg-bbl';
    b.textContent = text;
    d.appendChild(n); d.appendChild(b); box.appendChild(d);
    box.scrollTop = box.scrollHeight;
}

function showTyping(on) {
    const box = document.getElementById(mode === 'call' ? 'callMsgs' : 'chatMsgs');
    let el = box.querySelector('.typing-msg');
    if (on && !el) { el = document.createElement('div'); el.className = 'typing-msg'; el.innerHTML = '<span></span><span></span><span></span>'; box.appendChild(el); box.scrollTop = box.scrollHeight; }
    else if (!on && el) el.remove();
}

// ─── Avatar states ────────────────────────────────────────────────────────────
function setAvState(s) {
    const ring = document.getElementById('speakRing');
    const dot = document.getElementById('ntDot');
    const stat = document.getElementById('ntStatus');
    const tb = document.getElementById('typeBadge');
    const chs = document.getElementById('chatStatus');
    showTyping(s === 'think');
    clearInterval(mouthIv); mouthIv = null;
    setMouth('idle');
    if (ring) ring.className = 'speak-ring';
    if (tb) tb.className = 'type-badge';
    if (s === 'talk') {
        if (ring) ring.classList.add('on');
        if (dot) { dot.style.background = '#22c55e'; dot.style.boxShadow = '0 0 10px #22c55e'; }
        if (stat) stat.textContent = 'Falando…';
        if (chs) chs.textContent = 'Falando…';
        setMouth('talk');
        mouthIv = setInterval(() => setMouth('talk'), 130);
    } else if (s === 'think') {
        if (tb) tb.classList.add('on');
        if (dot) { dot.style.background = '#f59e0b'; dot.style.boxShadow = '0 0 8px #f59e0b'; }
        if (stat) stat.textContent = 'Pensando…';
        if (chs) chs.textContent = 'Pensando…';
    } else {
        if (dot) { dot.style.background = '#22c55e'; dot.style.boxShadow = '0 0 8px #22c55e'; }
        if (stat) stat.textContent = 'Professora de Inglês com IA';
        if (chs) chs.textContent = 'Online';
    }
}

function setMouth(s) {
    const imgElems = document.querySelectorAll('#avFloat img, #chatAvThumb img');
    if (s === 'talk') {
        imgElems.forEach(img => {
            const r = (Math.random() - 0.5) * 2;
            const sc = 1 + (Math.random() * 0.04);
            const y = (Math.random() * -4);
            img.style.transform = `scale(${sc}) rotate(${r}deg) translateY(${y}px)`;
            img.style.transition = 'transform 0.1s ease-in-out';
        });
    } else {
        imgElems.forEach(img => {
            img.style.transform = 'scale(1) rotate(0deg) translateY(0px)';
            img.style.transition = 'transform 0.4s ease-out';
        });
    }
}

// ─── TTS (via Django backend → OpenAI) ────────────────────────────────────────
async function speak(text) {
    if (currentAudio) { currentAudio.pause(); currentAudio = null; }
    setAvState('think');
    try {
        const res = await fetch('/ai-tutor/tts/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({ input: text, voice: 'nova' })
        });

        if (!res.ok) {
            // TTS failed (likely no OpenAI key) — use browser speech synthesis as fallback
            fallbackSpeak(text);
            return;
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        currentAudio = new Audio(url);
        currentAudio.onplay = () => setAvState('talk');
        currentAudio.onended = () => { setAvState('idle'); URL.revokeObjectURL(url); };
        currentAudio.onerror = () => { setAvState('idle'); fallbackSpeak(text); };
        currentAudio.play();
    } catch (e) {
        setAvState('idle');
        fallbackSpeak(text);
        console.warn('TTS backend failed, using browser synthesis:', e.message);
    }
}

function fallbackSpeak(text) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = 0.9;
    u.pitch = 1.1;
    u.onstart = () => setAvState('talk');
    u.onend = () => setAvState('idle');
    window.speechSynthesis.speak(u);
}

// ─── Mic / voice ──────────────────────────────────────────────────────────────
function toggleMic(ctx) {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) { showToast('Reconhecimento de voz requer Chrome.'); return; }
    if (isRec) { recog?.stop(); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    recog = new SR(); recog.lang = 'en-US'; recog.interimResults = false; recog.maxAlternatives = 1;
    const btn = document.getElementById(ctx === 'call' ? 'micBtn' : 'chatMicBtn');
    const inBtn = document.getElementById(ctx === 'call' ? 'callMicIn' : 'chatMicBtn');
    recog.onstart = () => { isRec = true; if (btn) btn.classList.add('off'); if (inBtn) inBtn.classList.add('rec'); document.getElementById('selfPip')?.classList.add('speaking'); };
    recog.onresult = (e) => { const t = e.results[0][0].transcript; const inp = document.getElementById(ctx === 'call' ? 'callTxt' : 'chatTxt'); inp.value = t; };
    recog.onend = () => { isRec = false; if (btn) btn.classList.remove('off'); if (inBtn) inBtn.classList.remove('rec'); document.getElementById('selfPip')?.classList.remove('speaking'); const t = document.getElementById(ctx === 'call' ? 'callTxt' : 'chatTxt').value.trim(); if (t) doSend(ctx); };
    recog.onerror = (e) => { isRec = false; if (btn) btn.classList.remove('off'); if (inBtn) inBtn.classList.remove('rec'); document.getElementById('selfPip')?.classList.remove('speaking'); if (e.error !== 'no-speech') showToast('Erro no microfone: ' + e.error); };
    if (ctx === 'call' && !chatOpen) { toggleChatOverlay(); setTimeout(() => recog.start(), 320); } else recog.start();
}

// ─── Camera ───────────────────────────────────────────────────────────────────
async function toggleCam() {
    if (camStream) { camStream.getTracks().forEach(t => t.stop()); camStream = null; const v = document.getElementById('pipVid'); v.style.display = 'none'; document.getElementById('pipPh').style.display = 'flex'; document.getElementById('camBtn').innerHTML = '<i class="fas fa-video"></i>'; return; }
    try {
        camStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        const v = document.getElementById('pipVid'); v.srcObject = camStream; v.style.display = 'block';
        document.getElementById('pipPh').style.display = 'none';
        document.getElementById('camBtn').innerHTML = '<i class="fas fa-video-slash"></i>';
    } catch { showToast('Câmera bloqueada.'); }
}

// ─── Chat overlay (call screen) ───────────────────────────────────────────────
function toggleChatOverlay() {
    chatOpen = !chatOpen;
    document.getElementById('chatOverlay').classList.toggle('open', chatOpen);
    document.getElementById('chatTogBtn').classList.toggle('on', chatOpen);
    if (chatOpen) { unreadN = 0; const u = document.getElementById('unread'); u.textContent = '0'; u.style.display = 'none'; document.getElementById('callMsgs').scrollTop = 99999; setTimeout(() => document.getElementById('callTxt').focus(), 350); }
}

// ─── Sidebar (chat screen) ────────────────────────────────────────────────────
function toggleSidebar() {
    const sb = document.getElementById('historySidebar');
    if (sb) sb.classList.toggle('open');
}

function createNewSession() {
    conv = [];
    clearMsgs();
    setTimeout(() => welcome(), 300);
    toggleSidebar();
}

// ─── Utils ────────────────────────────────────────────────────────────────────
function ar(el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 100) + 'px'; }
function hk(e, ctx) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(ctx); } }
function showToast(msg) { const t = document.getElementById('toast'); if (!t) return; t.textContent = msg; t.classList.add('on'); setTimeout(() => t.classList.remove('on'), 4000); }
