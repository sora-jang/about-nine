/* score.js
   - localStorage.chemistryResult 를 읽어서 점수 + breakdown bars 업데이트
   - chemistryResult 예시:
     {
       chemistry: 78,     // or 0.78
       lsm: 62,           // or 0.62
       rt: 71,            // or 0.71
       empathy: 80,       // or 0.80
       turns: 18,
       avg_rt_sec: 6.4
     }
*/

(function () {
  const $ = (id) => document.getElementById(id);

  const elChem = $("chemistryScore");
  const elHint = $("chemistryHint");
  const elTurns = $("turnsVal");
  const elAvgRt = $("avgRtVal");

  const elLsmPct = $("lsmPct");
  const elRtPct = $("rtPct");
  const elEmpPct = $("empathyPct");

  const elLsmBar = $("lsmBar");
  const elRtBar = $("rtBar");
  const elEmpBar = $("empathyBar");

  const btnHome = $("btnHome");
  const btnRecalc = $("btnRecalc");
  const btnClear = $("btnClear");

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  // 0~1 값이면 0~100으로, 이미 0~100이면 그대로
  function toPct(v) {
    if (v == null || Number.isNaN(Number(v))) return 0;
    const num = Number(v);
    const pct = num <= 1 ? num * 100 : num;
    return clamp(Math.round(pct), 0, 100);
  }

  function hintFromScore(score) {
    const s = toPct(score);
    if (s >= 85) return "🔥 거의 텔레파시급";
    if (s >= 70) return "✨ 꽤 잘 맞아요";
    if (s >= 50) return "🙂 무난무난";
    if (s >= 30) return "🌫️ 엇박이 조금";
    return "🧊 아직은 차가운 공기";
  }

  function setBar(barEl, pct, ariaLabelId) {
    const p = toPct(pct);
    barEl.style.width = `${p}%`;

    // progressbar aria-valuenow 업데이트
    const wrapper = barEl.closest(".bar");
    if (wrapper) wrapper.setAttribute("aria-valuenow", String(p));

    // (옵션) 숫자만 따로 업데이트할 때는 밖에서 처리
    return p;
  }

  function safeParseJSON(str) {
    try { return JSON.parse(str); } catch { return null; }
  }

  function loadResult() {
    const raw = localStorage.getItem("chemistryResult");
    return raw ? safeParseJSON(raw) : null;
  }

  function render() {
    const r = loadResult();

    const chemistry = r?.chemistry ?? 0;
    const lsm = r?.lsm ?? r?.lsm_score ?? 0;
    const rt = r?.rt ?? r?.rt_score ?? 0;
    const empathy = r?.empathy ?? r?.empathy_score ?? 0;

    const turns = r?.turns ?? r?.turn_count ?? "-";
    const avgRtSec = r?.avg_rt_sec ?? r?.avgResponseSec ?? r?.avg_rt ?? "-";

    const chemPct = toPct(chemistry);
    elChem.textContent = String(chemPct);
    elHint.textContent = hintFromScore(chemPct);

    elTurns.textContent = String(turns);
    elAvgRt.textContent = (typeof avgRtSec === "number")
      ? `${avgRtSec.toFixed(1)}s`
      : String(avgRtSec);

    // Breakdown
    const lsmPct = setBar(elLsmBar, lsm);
    const rtPct = setBar(elRtBar, rt);
    const empPct = setBar(elEmpBar, empathy);

    elLsmPct.textContent = String(lsmPct);
    elRtPct.textContent = String(rtPct);
    elEmpPct.textContent = String(empPct);
  }

  // Buttons
  btnHome?.addEventListener("click", () => {
    window.location.href = "./index.html";
  });

  btnRecalc?.addEventListener("click", () => {
    // 계산 로직이 다른 페이지(call.html/call.js)에서 수행된다면,
    // 여기서는 "다시 계산 페이지로" 보내는 형태가 가장 안전함
    window.location.href = "./call.html";
  });

  btnClear?.addEventListener("click", () => {
    localStorage.removeItem("chemistryResult");
    render();
  });

  render();
})();
