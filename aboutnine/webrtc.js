// webrtc.js
// 같은 도메인 탭 간 데모용 WebRTC + STT 공유

const chan = new BroadcastChannel("aboutnine-webrtc-demo");
const myId = crypto.randomUUID();

let pc = null;
let localStream = null;
let remoteStream = new MediaStream();

/* =========================
   PeerConnection
========================= */
function createPeerConnection(onStatus) {
  pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });

  pc.onicecandidate = (e) => {
    if (e.candidate) {
      chan.postMessage({ type: "ice", from: myId, candidate: e.candidate });
    }
  };

  pc.onconnectionstatechange = () => {
    onStatus?.(`Connection: ${pc.connectionState}`);
  };

  pc.ontrack = (e) => {
    e.streams[0].getTracks().forEach((t) => remoteStream.addTrack(t));
  };
}

/* =========================
   외부 공개 API
========================= */
window.__webrtc = {
  async startChat({ onStatus, remoteAudioEl, localAudioEl }) {
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });

    if (localAudioEl) localAudioEl.srcObject = localStream;

    createPeerConnection(onStatus);
    localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));

    pc.ontrack = (e) => {
      e.streams[0].getTracks().forEach((t) => remoteStream.addTrack(t));
      if (remoteAudioEl) remoteAudioEl.srcObject = remoteStream;
    };

    chan.postMessage({ type: "ready", from: myId });
    onStatus?.("Ready. Waiting for peer…");
  },

  // ✅ STT 텍스트 전송
  sendSTT(text) {
    chan.postMessage({ type: "stt", from: myId, text });
  },
};

/* =========================
   시그널링 + STT 수신
========================= */
chan.onmessage = async (ev) => {
  const msg = ev.data;
  if (!msg || msg.from === myId) return;

  // ✅ 상대 STT
  if (msg.type === "stt") {
    window.dispatchEvent(
      new CustomEvent("remote-stt", { detail: msg.text })
    );
    return;
  }

  if (!pc) return;

  if (msg.type === "ready") {
    if (myId < msg.from) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      chan.postMessage({ type: "offer", from: myId, sdp: offer });
    }
  }

  if (msg.type === "offer") {
    await pc.setRemoteDescription(msg.sdp);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    chan.postMessage({ type: "answer", from: myId, to: msg.from, sdp: answer });
  }

  if (msg.type === "answer") {
    await pc.setRemoteDescription(msg.sdp);
  }

  if (msg.type === "ice") {
    try {
      await pc.addIceCandidate(msg.candidate);
    } catch {}
  }
};
