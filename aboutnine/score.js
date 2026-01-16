const scoreNum = document.getElementById("scoreNum");
const scoreFill = document.getElementById("scoreFill");
const breakdownEl = document.getElementById("breakdown");
const scoreMeta = document.getElementById("scoreMeta");

const backHomeBtn = document.getElementById("backHomeBtn");
const againBtn = document.getElementById("againBtn");

function item(label, value) {
  const div = document.createElement("div");
  div.className = "bd-item";

  const l = document.createElement("div");
  l.className = "bd-label";
  l.textContent = label;

  const v = document.createElement("div");
  v.className = "bd-value";
  v.textContent = `${value}`;

  const bar = document.createElement("div");
  bar.className = "bd-bar";

  const fill = document.createElement("div");
  fill.className = "bd-fill";
  fill.style.width = `${Math.max(0, Math.min(100, value))}%`;

  bar.appendChild(fill);
  div.appendChild(l);
  div.appendChild(v);
  div.appendChild(bar);
  return div;
}

function safeParse(key) {
  try { return JSON.parse(sessionStorage.getItem(key) || "null"); }
  catch (_) { return null; }
}

const result = safeParse("aboutnine_chemistry_result");

if (!result) {
  scoreNum.textContent = "0";
  scoreFill.style.width = "0%";
  scoreMeta.textContent = "결과가 없어요. 통화 후 다시 시도해 주세요.";
} else {
  scoreNum.textContent = String(result.score);
  scoreFill.style.width = `${result.score}%`;

  const { breakdown, meta } = result;
  scoreMeta.textContent = `대화 ${meta?.lines ?? 0}줄 • ${meta?.durationSec ?? 0}s`;

  breakdownEl.innerHTML = "";
  breakdownEl.appendChild(item("LSM (의미 유사도)", breakdown.lsm));
  breakdownEl.appendChild(item("Empathy (공감 표현)", breakdown.empathy));
  breakdownEl.appendChild(item("Turn-taking (핑퐁)", breakdown.turnTaking));
  breakdownEl.appendChild(item("Response time (응답)", breakdown.responseTime));
}

backHomeBtn.addEventListener("click", () => {
  window.location.href = "./index.html";
});

againBtn.addEventListener("click", () => {
  window.location.href = "./call.html";
});
