// =============================
// UI refs
// =============================
const statusEl = document.getElementById("status");
const timerEl = document.getElementById("timer");
const hangupBtn = document.getElementById("hangupBtn");

const transcriptEl = document.getElementById("transcript");
const sttStateEl = document.getElementById("sttState");

const remoteAudio = document.getElementById("remoteAudio");
const localAudio = document.getElementById("localAudio");

function setStatus(text) {
  statusEl.textContent = text;
}
window.__setStatusHook?.(setStatus);

// =============================
// Call timer
// =============================
let t0 = null;
let timerId = null;

function fmtTime(ms) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return `${mm}:${ss}`;
}

function startTimer() {
  t0 = Date.now();
  timerEl.textContent = "00:00";
  timerId = setInterval(() => {
    timerEl.textContent = fmtTime(Date.now() - t0);
  }, 250);
}

function stopTimer() {
  if (timerId) clearInterval(timerId);
  timerId = null;
  t0 = null;
  timerEl.textContent = "00:00";
}

// =============================
// Transcript + STT sharing
// =============================

// STT 결과를 서로 공유하기 위한 채널(webrtc 시그널링과 별도 채널 권장)
const sttChan = new BroadcastChannel("aboutnine-stt-demo");

function appendLine(who, text) {
  // 첫 안내 문구 제거
  const muted = transcriptEl.querySelector(".t-muted");
  if (muted) muted.remove();

  const line = document.createElement("div");
  line.className = "line";

  const badge = document.createElement("div");
  badge.className = "badge";
  badge.textContent = who;

  const msg = document.createElement("div");
  msg.className = "msg";
  msg.textContent = text;

  line.appendChild(badge);
  line.appendChild(msg);
  transcriptEl.appendChild(line);

  // 스크롤 맨 아래로
  transcriptEl.scrollTop = transcriptEl.scrollHeight;
}

// 상대방 STT 수신
sttChan.onmessage = (ev) => {
  const msg = ev.data;
  if (!msg || msg.type !== "stt") return;
  // who: "Them"으로 표시 (데모에서는 실제 구분 어려워서 단순화)
  appendLine("Them", msg.text);
};

// =============================
// Web Speech API STT
// =============================
let recognition = null;
let sttRunning = false;

function startSTT() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SR) {
    sttStateEl.textContent = "STT: 이 브라우저는 지원하지 않아요";
    return;
  }

  recognition = new SR();
  recognition.lang = "ko-KR";         // 필요하면 "en-US" 등으로 바꾸기
  recognition.continuous = true;
  recognition.interimResults = true;

  let lastFinal = "";

  recognition.onstart = () => {
    sttRunning = true;
    sttStateEl.textContent = "STT: 실행 중";
  };

  recognition.onerror = (e) => {
    sttStateEl.textContent = `STT: 오류(${e.error})`;
  };

  recognition.onend = () => {
    sttRunning = false;
    // 일부 브라우저는 일정 시간 후 자동 종료될 수 있어 재시작 옵션
    // 통화 중이면 자동 재시작 (원치 않으면 아래 블록 삭제)
    if (timerId) {
      try { recognition.start(); } catch (_) {}
    }
  };

  recognition.onresult = (event) => {
    let interim = "";
    let finals = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const res = event.results[i];
      const text = res[0].transcript.trim();
      if (res.isFinal) finals += (text + " ");
      else interim += (text + " ");
    }

    finals = finals.trim();
    interim = interim.trim();

    // 최종 문장만 로그에 추가 (중복 방지)
    if (finals && finals !== lastFinal) {
      lastFinal = finals;

      appendLine("Me", finals);
      sttChan.postMessage({ type: "stt", text: finals });
    } else {
      // interim 표시를 굳이 넣고 싶으면 여기서 처리 가능
    }
  };

  try {
    recognition.start();
  } catch (e) {
    sttStateEl.textContent = "STT: 시작 실패";
  }
}

function stopSTT() {
  if (recognition) {
    try { recognition.onend = null; } catch (_) {}
    try { recognition.stop(); } catch (_) {}
  }
  recognition = null;
  sttRunning = false;
  sttStateEl.textContent = "STT: 중지됨";
}

// =============================
// Call start/stop
// =============================
async function startCallAuto() {
  hangupBtn.disabled = false;
  setStatus("Connecting…");

  // 1) 통화 시작
  await window.__webrtc.startChat({
    onStatus: setStatus,
    remoteAudioEl: remoteAudio,
    localAudioEl: localAudio,
  });

  // 2) 타이머 시작
  startTimer();

  // 3) STT 시작
  startSTT();
}

function endCall() {
  // 1. 통화 종료 (WebRTC 정리)
  window.__webrtc.hangup({
    onStatus: setStatus,
    remoteAudioEl: remoteAudio,
    localAudioEl: localAudio,
  });

  // 2. 타이머 / STT 정리
  stopTimer();
  stopSTT();
  hangupBtn.disabled = true;

  // 3. 메인 화면으로 이동
  window.location.href = "./index.html";
}


// 버튼
hangupBtn.addEventListener("click", endCall);

// ✅ call.html 진입하면 자동 통화 시작
window.addEventListener("load", async () => {
  try {
    await startCallAuto();
  } catch (e) {
    console.error(e);
    setStatus("Mic permission denied or error");
    hangupBtn.disabled = true;
    stopTimer();
    stopSTT();
    sttStateEl.textContent = "STT: 시작 불가";
  }
});
