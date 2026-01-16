:root{
  /* ---- Background (grainy charcoal) ---- */
  --bg-top:#3a3a3a;
  --bg-mid:#2a2b2d;
  --bg-btm:#141516;

  /* ---- Surfaces ---- */
  --surface: rgba(20,21,22,.72);
  --surface-2: rgba(28,29,31,.72);

  /* ---- Text ---- */
  --text:#f3f3f3;
  --muted: rgba(243,243,243,.62);
  --subtle: rgba(243,243,243,.42);

  /* ---- Lines ---- */
  --line: rgba(255,255,255,.16);

  /* ---- Accent (CTA gradient) ---- */
  --ctaL:#2f6fd6;   /* blue */
  --ctaM:#4b6ad9;   /* indigo-ish */
  --ctaR:#7b4aa8;   /* purple */

  --danger:#ef4444;

  --r-lg:22px;
  --r-md:18px;
  --r-sm:14px;
}

*{ box-sizing:border-box; }
html,body{ height:100%; margin:0; }

body{
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Noto Sans KR", Arial;
  color: var(--text);
  background:
    radial-gradient(900px 700px at 20% -10%, rgba(255,255,255,.10), transparent 60%),
    linear-gradient(180deg, var(--bg-top), var(--bg-mid) 35%, var(--bg-btm));
  position: relative;
}

/* ---- Grain overlay ---- */
body::before{
  content:"";
  position:fixed;
  inset:0;
  pointer-events:none;
  opacity:.18;
  background-image:
    repeating-linear-gradient(0deg, rgba(255,255,255,.03) 0 1px, transparent 1px 2px),
    repeating-linear-gradient(90deg, rgba(0,0,0,.035) 0 1px, transparent 1px 3px);
  mix-blend-mode: overlay;
}

/* ---------------- index ---------------- */
.screen{
  height:100%;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:24px;
}

.start-btn{
  width:100%;
  max-width:420px;
  height:74px;
  border-radius:999px;
  border:1px solid rgba(255,255,255,.10);
  cursor:pointer;

  display:flex;
  align-items:center;
  justify-content:center;
  text-decoration:none;

  font-size:22px;
  font-weight:800;
  letter-spacing:.2px;
  color: rgba(255,255,255,.95);

  background: linear-gradient(90deg, var(--ctaL), var(--ctaM) 45%, var(--ctaR));
  box-shadow:
    0 22px 60px rgba(0,0,0,.55),
    inset 0 1px 0 rgba(255,255,255,.20);
}
.start-btn:active{ transform: scale(.985); }

/* ---------------- call ---------------- */
.call-screen{
  height:100%;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:24px;
}

.call-card{
  width:100%;
  max-width:420px;
  border:1px solid rgba(255,255,255,.12);
  background: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.03));
  border-radius: var(--r-lg);
  padding:18px;
  box-shadow: 0 26px 80px rgba(0,0,0,.60);
  backdrop-filter: blur(10px);
}

.call-top{
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap:12px;
  margin-bottom: 12px;
}

.call-title{
  font-weight:900;
  letter-spacing:.2px;
  font-size:18px;
  margin-bottom:6px;
}

.call-status{
  color: var(--muted);
  font-size:13px;
  display:inline-block;
  padding:7px 10px;
  border-radius:999px;
  border:1px solid rgba(255,255,255,.12);
  background: rgba(0,0,0,.18);
  margin-bottom:10px;
}

.call-timer{
  font-weight:800;
  font-size:14px;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(0,0,0,.18);
  color: rgba(255,255,255,.88);
}

.call-actions{
  display:flex;
  gap:10px;
  flex-wrap:wrap;
  margin-bottom: 12px;
}

.btn{
  flex:1;
  min-width: 140px;
  height:52px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(0,0,0,.22);
  color: rgba(255,255,255,.92);
  font-size:15px;
  font-weight:800;
  cursor:pointer;
}
.btn:active{ transform: translateY(1px); }
.btn:disabled{ opacity:.45; cursor:not-allowed; transform:none; }

.btn.primary{
  border-color: rgba(255,255,255,.10);
  background: linear-gradient(90deg, var(--ctaL), var(--ctaM) 45%, var(--ctaR));
  color: rgba(255,255,255,.96);
}

.btn.danger{
  border-color: rgba(239,68,68,.35);
  background: rgba(239,68,68,.16);
  color: rgba(255,255,255,.95);
}

.transcript-wrap{
  margin-top: 12px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(0,0,0,.18);
  border-radius: var(--r-md);
  overflow:hidden;
}

.transcript-head{
  display:flex;
  align-items:baseline;
  justify-content:space-between;
  gap:10px;
  padding: 12px;
  border-bottom: 1px solid rgba(255,255,255,.08);
  background: rgba(255,255,255,.04);
}

.th-title{
  font-size: 13px;
  font-weight: 900;
  color: rgba(255,255,255,.92);
}

.th-sub{
  font-size: 12px;
  color: var(--muted);
}

.transcript{
  max-height: 280px;
  overflow:auto;
  padding: 12px;
  display:flex;
  flex-direction:column;
  gap:8px;
}

.line{
  display:flex;
  gap:10px;
  align-items:flex-start;
}

.badge{
  flex: 0 0 auto;
  font-size: 11px;
  font-weight: 900;
  padding: 5px 8px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.05);
  color: rgba(255,255,255,.85);
}

.msg{
  font-size: 13px;
  line-height: 1.45;
  color: rgba(255,255,255,.90);
  word-break: break-word;
}

.t-muted{
  color: rgba(255,255,255,.55);
  font-size: 13px;
}

.call-hint{
  margin-top:12px;
  font-size:12px;
  color: var(--muted);
  line-height:1.5;
}

/* =========================
   SCORE UI (추가)
========================= */

.score-screen{
  height:100%;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:24px;
}

.score-card{
  width:100%;
  max-width:420px;
  border:1px solid rgba(255,255,255,.12);
  background: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.03));
  border-radius: var(--r-lg);
  padding:18px;
  box-shadow: 0 26px 80px rgba(0,0,0,.60);
  backdrop-filter: blur(10px);
}

/* ... (중간 scorePage 스타일은 네 기존 파일 그대로) ... */

/* =========================
   speaker styles (추가)
========================= */

/* ME */
.line.me{
  justify-content:flex-end;
}
.line.me .badge{
  background: linear-gradient(90deg, #4b6ad9, #7b4aa8);
  border-color: rgba(255,255,255,.25);
  color:#fff;
}
.line.me .msg{
  background: rgba(123,74,168,.18);
  border-radius:14px 4px 14px 14px;
  padding:8px 10px;
}

/* OTHER (HIM / HER) */
.line.other{
  justify-content:flex-start;
}
.line.other .badge{
  background: rgba(255,255,255,.08);
  color: rgba(255,255,255,.75);
}
.line.other .msg{
  background: rgba(0,0,0,.25);
  border-radius:4px 14px 14px 14px;
  padding:8px 10px;
}
