// call.js

let recognition = null;
let startTime = null;
let timerInterval = null;

const statusEl = document.getElementById("status");
const timerEl = document.getElementById("timer");
const transcriptEl = document.getElementById("transcript");
const sttStateEl = document.getElementById("sttState");
const hangupBtn = document.getElementById("hangupBtn");

/* =========================
   1. 타이머
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
   2. STT 자동 시작
========================= */
function startSTT() {
  if (!("webkitSpeechRecognition" in window)) {
    sttStateEl.textContent = "STT 미지원 브라우저";
    return;
  }

  recognition = new webkitSpeechRecognition();
  recognition.lang = "en-US";
  recognition.continuous = true;
  recognition.interimResults = true;

  sttStateEl.textContent = "STT: 듣는 중…";

  recognition.onresult = (event) => {
    transcriptEl.innerHTML = "";

    for (let i = 0; i < event.results.length; i++) {
      const line = document.createElement("div");
      line.className = "line";

      const badge = document.createElement("div");
      badge.className = "badge";
      badge.textContent = "ME";

      const msg = document.createElement("div");
      msg.className = "msg";
      msg.textContent = event.results[i][0].transcript;

      line.appendChild(badge);
      line.appendChild(msg);
      transcriptEl.appendChild(line);
    }

    transcriptEl.scrollTop = transcriptEl.scrollHeight;
  };

  recognition.onerror = () => {
    sttStateEl.textContent = "STT 오류";
  };

  recognition.start();
}

/* =========================
   3. 통화 종료
========================= */
hangupBtn.addEventListener("click", () => {
  if (recognition) recognition.stop();
  clearInterval(timerInterval);

  location.href = "./score.html";
});

/* =========================
   4. 페이지 로드 시 자동 실행
========================= */
window.addEventListener("load", () => {
  statusEl.textContent = "Connected";
  hangupBtn.disabled = false;

  startTimer();
  startSTT(); // 🎙️ 자동 STT
});
