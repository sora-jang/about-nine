const startBtn = document.getElementById("startBtn");

if (startBtn) {
  startBtn.addEventListener("click", () => {
    // 사용자 클릭 제스처 유지
    window.location.href = "./call.html";
  });
}
