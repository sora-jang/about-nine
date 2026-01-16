let recognition = null;
let startTime = null;
let timerInterval = null;

const statusEl = document.getElementById("status");
const timerEl = document.getElementById("timer");
const transcriptEl = document.getElementById("transcript");
const sttStateEl = document.getElementById("sttState");
const hangupBtn = document.getElementById("hangupBtn");

const remoteAudioEl = document.getElementById("remoteAudio");
const localAudioEl = document.getElementById("localAudio");

const convo = [];

/* =========================
   Chat UI
========================= */
function appendLine(speaker, text) {
  const muted = transcriptEl.querySelector(".t-muted");
  if (muted) muted.remove();

  const line = document.createElement("div");
  line.className = `line ${speaker}`;

  const msg = document.createElement("div");
  msg.className = "msg";
  msg.textContent = text;

  line.appendChild(msg);
  transcriptEl.appendChild(line);
  transcriptEl.scrollTop = transcriptEl.scrollHeight;
}

function pushConvo(speaker, text, ts = Date.now()) {
  const clean = String(text || "").trim();
  if (!clean) return;
  convo.push({ speaker, text: clean, ts });
  appendLine(speaker, clean);
}

/* =========================
   Timer
========================= */
function startTimer() {
  startTime = Date.now();
  timerInterval = setInterval(() => {
    const diff = Date.now() - startTime;
    const m = String(Math.floor(diff / 60000)).padStart(2, "0");
    const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");
    timerEl.textContent = `${m}:${s}`;
  }, 1000);
}

/* =========================
   STT
========================= */
function startSTT() {
  if (!("webkitSpeechRecognition" in window)) {
    sttStateEl.textContent = "STT not supported";
    return;
  }

  recognition = new webkitSpeechRecognition();
  recognition.lang = "en-US";
  recognition.continuous = true;
  recognition.interimResults = false;

  sttStateEl.textContent = "Listening…";

  recognition.onresult = (event) => {
    const last = event.results[event.results.length - 1];
    if (!last || !last.isFinal) return;

    const text = last[0].transcript.trim();
    if (!text) return;

    const ts = Date.now();
    pushConvo("me", text, ts);
    window.__webrtc?.sendSTT?.(text, ts);
  };

  recognition.onerror = (e) => {
    console.error("STT error:", e);
    sttStateEl.textContent = `STT error: ${e.error}`;
  };

  recognition.start(); // ✅ 마이크 허용 팝업
}

/* =========================
   Receive remote STT
========================= */
window.addEventListener("remote-stt", (e) => {
  const payload = e.detail || {};
  const text = payload.text || payload;
  const ts = payload.ts || Date.now();
  pushConvo("other", text, ts);
});

/* =========================
   Hang up
========================= */
hangupBtn.addEventListener("click", () => {
  if (recognition) recognition.stop();
  clearInterval(timerInterval);
  location.href = "./score.html";
});

/* =========================
   Init (중요)
========================= */
window.addEventListener("load", async () => {
  try {
    await window.__webrtc?.startChat?.({
      onStatus: (txt) => (statusEl.textContent = txt),
      remoteAudioEl,
      localAudioEl
    });
    statusEl.textContent = "Connected";
  } catch {
    statusEl.textContent = "Mic permission needed";
  }

  hangupBtn.disabled = false;
  startTimer();

  // ✅ Start Chat 클릭 직후 바로 실행
  startSTT();
});
