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

/**
 * 대화 로그 (점수 계산의 “원재료”)
 * { speaker: "me" | "other", text: string, ts: number }
 */
const convo = [];

/* =========================
   UI: transcript 라인 추가
========================= */
function appendLine(speaker, text) {
  // 안내 문구(t-muted) 제거
  const muted = transcriptEl.querySelector(".t-muted");
  if (muted) muted.remove();

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
   데이터: 로그 저장
========================= */
function pushConvo(speaker, text, ts = Date.now()) {
  const clean = String(text || "").trim();
  if (!clean) return;

  convo.push({ speaker, text: clean, ts });
  appendLine(speaker, clean);

  // (디버그/재사용 용) 원문 로그도 저장해둠
  localStorage.setItem("conversationLog", JSON.stringify(convo));
}

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
   2. STT 자동 시작 (내 목소리 = ME)
   - interimResults는 false 권장 (final만 누적)
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
    // 마지막 결과만 사용
    const last = event.results[event.results.length - 1];
    if (!last || !last.isFinal) return;

    const text = last[0]?.transcript?.trim() || "";
    if (!text) return;

    // ✅ 내 발화 저장
    const ts = Date.now();
    pushConvo("me", text, ts);

    // ✅ 상대 탭으로 텍스트 전달
    window.__webrtc?.sendSTT?.(text, ts);
  };

  recognition.onerror = () => {
    sttStateEl.textContent = "STT 오류";
  };

  try {
    recognition.start();
  } catch (_) {
    // 이미 시작된 경우 등
  }
}

/* =========================
   3. 상대 STT 수신 (HIM / HER)
========================= */
window.addEventListener("remote-stt", (e) => {
  const payload = e.detail || {};
  const text = typeof payload === "string" ? payload : payload.text;
  const ts = typeof payload === "object" && payload.ts ? payload.ts : Date.now();
  pushConvo("other", text, ts);
});

/* =========================
   4. Chemistry 계산 (me vs other)
========================= */
function tokenize(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function cosine(vecA, vecB) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    na += vecA[i] * vecA[i];
    nb += vecB[i] * vecB[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function lsmScore(meText, otherText) {
  // TF-IDF (2문서: me, other)
  const meTokens = tokenize(meText);
  const otTokens = tokenize(otherText);

  const vocab = new Map();
  const add = (t) => { if (!vocab.has(t)) vocab.set(t, vocab.size); };

  meTokens.forEach(add);
  otTokens.forEach(add);

  const V = vocab.size;
  if (V === 0) return 0;

  const tfMe = new Array(V).fill(0);
  const tfOt = new Array(V).fill(0);

  for (const t of meTokens) tfMe[vocab.get(t)]++;
  for (const t of otTokens) tfOt[vocab.get(t)]++;

  // df 계산
  const df = new Array(V).fill(0);
  for (let i = 0; i < V; i++) {
    if (tfMe[i] > 0) df[i]++;
    if (tfOt[i] > 0) df[i]++;
  }

  // idf: log((N+1)/(df+1)) + 1, N=2
  const N = 2;
  const idf = df.map((d) => Math.log((N + 1) / (d + 1)) + 1);

  // tf 정규화
  const sumMe = meTokens.length || 1;
  const sumOt = otTokens.length || 1;

  const vMe = tfMe.map((c, i) => (c / sumMe) * idf[i]);
  const vOt = tfOt.map((c, i) => (c / sumOt) * idf[i]);

  return cosine(vMe, vOt); // 0~1
}

function empathyScore(allText, turns) {
  // 간단 공감 사전 (필요하면 더 늘려도 됨)
  const lex = [
    "me too", "same", "i agree", "true", "exactly", "that makes sense",
    "i get you", "i hear you", "i feel you", "totally", "got it",
    "i understand", "i can relate", "right", "yeah"
  ];

  const txt = String(allText || "").toLowerCase();
  let hits = 0;
  for (const p of lex) {
    // 포함 여부를 카운트(중복 과다 방지)
    if (txt.includes(p)) hits += 1;
  }

  // turns 대비 적당히 스케일 (대화가 길수록 약간 더 공평)
  const denom = Math.max(1, Math.min(12, turns));
  const raw = hits / denom;         // 대략 0~1 근처
  return Math.max(0, Math.min(1, raw));
}

function rtScoreFromConvo(log) {
  // speaker가 바뀌는 지점의 시간 차를 RT로 측정
  const diffs = [];
  for (let i = 1; i < log.length; i++) {
    const prev = log[i - 1];
    const cur = log[i];
    if (prev.speaker !== cur.speaker) {
      const dt = (cur.ts - prev.ts) / 1000;
      if (Number.isFinite(dt) && dt >= 0) diffs.push(dt);
    }
  }

  const avg = diffs.length
    ? diffs.reduce((a, b) => a + b, 0) / diffs.length
    : 0;

  // 점수화: 0초~20초를 1~0으로 선형 감소(단순/안전)
  const score = Math.max(0, Math.min(1, 1 - avg / 20));
  return { score, avgSec: avg };
}

function turnBalanceScore(log) {
  const me = log.filter((x) => x.speaker === "me").length;
  const ot = log.filter((x) => x.speaker === "other").length;
  const total = me + ot;
  if (total === 0) return 0;
  const imbalance = Math.abs(me - ot) / total; // 0이면 완벽 균형
  return Math.max(0, Math.min(1, 1 - imbalance));
}

function computeChemistry(log) {
  const meText = log.filter(x => x.speaker === "me").map(x => x.text).join(" ");
  const otText = log.filter(x => x.speaker === "other").map(x => x.text).join(" ");
  const allText = log.map(x => x.text).join(" ");

  const turns = log.length;

  const lsm = lsmScore(meText, otText);
  const { score: rt, avgSec } = rtScoreFromConvo(log);
  const empathy = empathyScore(allText, turns);
  const turn = turnBalanceScore(log);

  // Chemistry: 4요소 평균 (0~1)
  const chemistry = (lsm + rt + empathy + turn) / 4;

  return {
    chemistry,
    lsm,
    rt,
    empathy,
    turns,
    avg_rt_sec: avgSec
  };
}

/* =========================
   5. 통화 종료
========================= */
hangupBtn.addEventListener("click", () => {
  if (recognition) recognition.stop();
  clearInterval(timerInterval);

  // ✅ 점수 계산 → localStorage 저장 → score.html에서 읽음
  const result = computeChemistry(convo);
  localStorage.setItem("chemistryResult", JSON.stringify(result));

  // WebRTC 정리
  window.__webrtc?.hangup?.({
    onStatus: (txt) => (statusEl.textContent = txt),
    remoteAudioEl,
    localAudioEl
  });

  location.href = "./score.html";
});

/* =========================
   6. 페이지 로드 시 자동 실행
   - WebRTC 시작 + STT 시작
========================= */
window.addEventListener("load", async () => {
  // status hook 연결 (webrtc.js가 상태 업데이트할 수 있게)
  window.__setStatusHook?.((txt) => {
    statusEl.textContent = txt;
  });

  try {
    await window.__webrtc?.startChat?.({
      onStatus: (txt) => (statusEl.textContent = txt),
      remoteAudioEl,
      localAudioEl
    });
    statusEl.textContent = "Connected";
  } catch (e) {
    statusEl.textContent = "Mic permission needed";
  }

  hangupBtn.disabled = false;
  startTimer();
  startSTT();
});
