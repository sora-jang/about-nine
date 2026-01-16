let recognition = null;
let startTime = null;
let timerInterval = null;

let currentSpeaker = "A"; // A or B

const statusEl = document.getElementById("status");
const timerEl = document.getElementById("timer");
const transcriptEl = document.querySelector(".transcript");
const hangupBtn = document.getElementById("hangupBtn");
const switchBtn = document.getElementById("switchBtn");

const convo = [];

/* =========================
   UI
========================= */
function appendLine(speaker, text) {
  const muted = transcriptEl.querySelector(".t-muted");
  if (muted) muted.remove();

  const line = document.createElement("div");
  line.className = `line ${speaker === "A" ? "me" : "other"}`;

  const msg = document.createElement("div");
  msg.className = "msg";
  msg.textContent = text;

  line.appendChild(msg);
  transcriptEl.appendChild(line);
  transcriptEl.scrollTop = transcriptEl.scrollHeight;
}

function pushConvo(speaker, text) {
  const clean = text.trim();
  if (!clean) return;

  convo.push({ speaker, text: clean, ts: Date.now() });
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
  recognition = new webkitSpeechRecognition();
  recognition.lang = "en-US";
  recognition.continuous = true;
  recognition.interimResults = false;

  recognition.onresult = (e) => {
    const last = e.results[e.results.length - 1];
    if (!last.isFinal) return;

    pushConvo(currentSpeaker, last[0].transcript);
  };

  recognition.onerror = (e) => {
    if (e.error === "no-speech") {
      recognition.stop();
      setTimeout(() => recognition.start(), 300);
      return;
    }
    statusEl.textContent = `STT error`;
  };

  recognition.start();
}

/* =========================
   Controls
========================= */
switchBtn.addEventListener("click", () => {
  currentSpeaker = currentSpeaker === "A" ? "B" : "A";
  switchBtn.textContent = `현재 화자: ${currentSpeaker}`;
});

hangupBtn.addEventListener("click", () => {
  recognition?.stop();
  clearInterval(timerInterval);
  location.href = "./score.html";
});

/* =========================
   Init
========================= */
window.addEventListener("load", () => {
  startTimer();
  startSTT();
});
