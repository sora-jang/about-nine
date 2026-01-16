// call.js

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

/* =========================
   공통: transcript 추가
========================= */
function appendLine(speaker, text) {
  const line = document.createElement("div");
  line.className = `line ${speaker}`;

  const badge = document.createElement("div");
  badge.className = "badge";
  badge.textContent = speaker === "me" ? "ME" : "HIM / HER";

  const msg = document.createElement("div");
  msg.className = "msg";
  msg.textContent = text;

  line.appendChild(badge);
  line.appendChild(msg);
  transcriptEl.appendChild(line);
  transcriptEl.scrollTop = transcriptEl.scrollHeight;
}

/* =========================
   타이머
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
   STT (내 목소리 → ME)
========================= */
function startSTT() {
  if (!("webkitSpeechRecognition" in window)) {
    sttStateEl.textContent = "STT 미지원 브라우저";
    return;
  }

  recognition = new webkitSpeechRecognition();
  recognition.lang = "en-US";
  recognition.continuous = true;
  recognition.interimResults = false;

  sttStateEl.textContent = "STT: 듣는 중…";

  recognition.onresult = (event) => {
    const result = event.results[event.results.length - 1];
    if (!result.isFinal) return;

    const text = result[0].transcript.trim();
    if (!text) return;

    // ✅ 내 발화
    appendLine("me", text);

    // ✅ 상대 탭으로 전달
    window.__webrtc?.sendSTT(text);
  };

  recognition.onerror = () => {
    sttStateEl.textContent = "STT 오류";
  };

  recognition.start();
}

/* =========================
   상대 STT 수신 (HIM / HER)
========================= */
window.addEventListener("remote-stt", (e) => {
  appendLine("other", e.detail);
});

/* =========================
   통화 종료
========================= */
hangupBtn.addEventListener("click", () => {
  if (recognition) recognition.stop();
  clearInterval(timerInterval);
  location.href = "./score.html";
});

/* =========================
   페이지 로드
========================= */
window.addEventListener("load", async () => {
  statusEl.textContent = "Connecting…";

  await window.__webrtc.startChat({
    onStatus: (txt) => (statusEl.textContent = txt),
    remoteAudioEl,
    localAudioEl,
  });

  hangupBtn.disabled = false;
  startTimer();
  startSTT();
});
