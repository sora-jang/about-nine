const startBtn = document.getElementById("startBtn");

if (startBtn) {
  startBtn.addEventListener("click", (e) => {
    // a 태그 기본 이동 + 강제 이동 이중 보장
    e.preventDefault();
    window.location.href = "./call.html";
  });
}
