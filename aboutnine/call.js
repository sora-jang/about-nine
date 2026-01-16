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
// Speaker labels (A/B)
// =============================
const LOCAL_SPEAKER = "A";
const REMOTE_SPEAKER = "B";

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
const sttChan = new BroadcastChannel("aboutnine-stt-demo");

// ✅ 대화 로그(점수 계산용)
const convo = []; // { speaker:'A'|'B', text:string, ts:number }

function appendLine(who, text, ts = Date.now()) {
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

  transcriptEl.scrollTop = transcriptEl.scrollHeight;

  // ✅ 로그 저장
  convo.push({ speaker: who, text: String(text || ""), ts });
}

// 상대방 STT 수신
sttChan.onmessage = (ev) => {
  const msg = ev.data;
  if (!msg || msg.type !== "stt") return;
  appendLine(REMOTE_SPEAKER, msg.text, Date.now());
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
  recognition.lang = "ko-KR";
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
    // 통화 중이면 자동 재시작
    if (timerId) {
      try { recognition.start(); } catch (_) {}
    }
  };

  recognition.onresult = (event) => {
    let finals = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const res = event.results[i];
      const text = res[0].transcript.trim();
      if (res.isFinal) finals += (text + " ");
    }

    finals = finals.trim();

    if (finals && finals !== lastFinal) {
      lastFinal = finals;

      // 내 STT는 A로 표시
      appendLine(LOCAL_SPEAKER, finals, Date.now());

      // 상대 탭에 공유
      sttChan.postMessage({ type: "stt", text: finals, speaker: LOCAL_SPEAKER });
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
// Chemistry score (0~100)
// =============================

// 텍스트 토큰화 (한글/영문/숫자만 남기고 분리)
function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .map(t => t.trim())
    .filter(t => t.length >= 2);
}

function tfidfCosine(docA, docB) {
  const toksA = tokenize(docA);
  const toksB = tokenize(docB);
  const N = 2;

  if (toksA.length === 0 || toksB.length === 0) return 0;

  const vocab = new Map();
  for (const t of toksA) vocab.set(t, (vocab.get(t) || 0) + 1);
  for (const t of toksB) vocab.set(t, (vocab.get(t) || 0) + 1);

  const terms = Array.from(vocab.keys());

  // df 계산
  const hasA = new Set(toksA);
  const hasB = new Set(toksB);

  const df = new Map();
  for (const term of terms) {
    let c = 0;
    if (hasA.has(term)) c++;
    if (hasB.has(term)) c++;
    df.set(term, c);
  }

  function vectorize(tokens) {
    const tf = new Map();
    for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
    const total = tokens.length;

    const vec = new Array(terms.length).fill(0);
    for (let i = 0; i < terms.length; i++) {
      const term = terms[i];
      const tfVal = (tf.get(term) || 0) / total;
      const idfVal = Math.log((N + 1) / ((df.get(term) || 0) + 1)) + 1;
      vec[i] = tfVal * idfVal;
    }
    return vec;
  }

  const vA = vectorize(toksA);
  const vB = vectorize(toksB);

  let dot = 0, nA = 0, nB = 0;
  for (let i = 0; i < vA.length; i++) {
    dot += vA[i] * vB[i];
    nA += vA[i] * vA[i];
    nB += vB[i] * vB[i];
  }
  const denom = Math.sqrt(nA) * Math.sqrt(nB);
  if (!denom) return 0;
  return Math.max(0, Math.min(1, dot / denom));
}

const EMPATHY_WORDS = [
  // EN
  "me too","same","i agree","exactly","that’s right","thats right","i get you","i feel you",
  "i understand","makes sense","totally","got it",
  // KR
  "나도","맞아","그러게","그렇지","완전","공감","이해해","알겠어","맞다","그랬구나","괜찮아",
  "힘들","스트레스","좋아","대박","진짜"
];

function empathyScore(lines) {
  if (lines.length === 0) return 0;
  let hit = 0;
  for (const { text } of lines) {
    const t = String(text || "").toLowerCase();
    if (EMPATHY_WORDS.some(w => t.includes(w))) hit++;
  }
  // “공감 발화 비율” (0~1)
  return Math.max(0, Math.min(1, hit / lines.length));
}

function turnTakingScore(lines) {
  if (lines.length <= 1) return 0;
  let switches = 0;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].speaker !== lines[i - 1].speaker) switches++;
  }
  return Math.max(0, Math.min(1, switches / (lines.length - 1)));
}

function responseTimeScore(lines) {
  // 스피커가 바뀌는 순간의 응답 간격 평균 (초)
  const gaps = [];
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].speaker !== lines[i - 1].speaker) {
      const dt = (lines[i].ts - lines[i - 1].ts) / 1000;
      if (Number.isFinite(dt) && dt >= 0) gaps.push(dt);
    }
  }
  if (gaps.length === 0) return 0.5;

  const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;

  // 2초 근처가 가장 좋다고 보고, 느릴수록 깎는 스케일
  // avg <= 2s -> 1.0, avg=12s -> 0.0
  const score = 1 - (avg - 2) / 10;
  return Math.max(0, Math.min(1, score));
}

function computeChemistry(lines) {
  const aText = lines.filter(x => x.speaker === "A").map(x => x.text).join(" ");
  const bText = lines.filter(x => x.speaker === "B").map(x => x.text).join(" ");

  const lsm = tfidfCosine(aText, bText);     // 의미 유사도(대화 주제/단어 겹침)
  const emp = empathyScore(lines);           // 공감/동의 표현 비율
  const turn = turnTakingScore(lines);       // 핑퐁(턴 교대)
  const rt = responseTimeScore(lines);       // 응답 속도

  const raw = (lsm + emp + turn + rt) / 4;
  const score100 = Math.round(raw * 100);

  return {
    score: Math.max(0, Math.min(100, score100)),
    breakdown: {
      lsm: Math.round(lsm * 100),
      empathy: Math.round(emp * 100),
      turnTaking: Math.round(turn * 100),
      responseTime: Math.round(rt * 100),
    },
    meta: {
      lines: lines.length,
      durationSec: t0 ? Math.round((Date.now() - t0) / 1000) : 0,
    }
  };
}

// =============================
// Call start/stop
// =============================
async function startCallAuto() {
  hangupBtn.disabled = false;
  setStatus("Connecting…");

  await window.__webrtc.startChat({
    onStatus: setStatus,
    remoteAudioEl: remoteAudio,
    localAudioEl: localAudio,
  });

  startTimer();
  startSTT();
}

function endCall() {
  // 1) WebRTC 정리
  window.__webrtc.hangup({
    onStatus: setStatus,
    remoteAudioEl: remoteAudio,
    localAudioEl: localAudio,
  });

  // 2) 타이머 / STT 정리
  stopTimer();
  stopSTT();
  hangupBtn.disabled = true;

  // 3) ✅ Chemistry 계산 → sessionStorage 저장
  const result = computeChemistry(convo);
  sessionStorage.setItem("aboutnine_chemistry_result", JSON.stringify(result));
  sessionStorage.setItem("aboutnine_transcript", JSON.stringify(convo));

  // 4) ✅ 결과 화면으로 이동
  window.location.href = "./score.html";
}

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
