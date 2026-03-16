// ---- 데모 시그널링: 같은 도메인 내 탭 간 통신 ----
const chan = new BroadcastChannel("aboutnine-webrtc-demo");
const myId = crypto.randomUUID();

let pc = null;
let localStream = null;
let remoteStream = new MediaStream();

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

// call.html에서 쓰기 쉽게 window에 달아둠
window.__webrtc = {
  async startChat({ onStatus, remoteAudioEl, localAudioEl }) {
    onStatus?.("Requesting mic permission…");

    localStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: false,
    });

    // 로컬 오디오(내 마이크) - muted로 재생(디버그용)
    if (localAudioEl) localAudioEl.srcObject = localStream;

    createPeerConnection(onStatus);

    // 트랙 추가
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

    // 상대 트랙이 들어오면 remoteAudio 연결
    pc.ontrack = (e) => {
      e.streams[0].getTracks().forEach((t) => remoteStream.addTrack(t));
      if (remoteAudioEl) remoteAudioEl.srcObject = remoteStream;
    };

    // ready 알림
    chan.postMessage({ type: "ready", from: myId });
    onStatus?.("Ready. Waiting for peer…");
  },

  hangup({ onStatus, remoteAudioEl, localAudioEl }) {
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
      localStream = null;
    }

    remoteStream = new MediaStream();
    if (remoteAudioEl) remoteAudioEl.srcObject = null;
    if (localAudioEl) localAudioEl.srcObject = null;

    if (pc) {
      pc.close();
      pc = null;
    }

    onStatus?.("Idle");
  }
};

// ---- 시그널링 처리 ----
async function makeOffer(onStatus) {
  onStatus?.("Creating offer…");
  const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: false });
  await pc.setLocalDescription(offer);
  chan.postMessage({ type: "offer", from: myId, sdp: pc.localDescription });
  onStatus?.("Offer sent. Waiting for answer…");
}

async function handleOffer(from, sdp, onStatus) {
  if (pc.signalingState !== "stable") return;

  onStatus?.("Received offer. Creating answer…");
  await pc.setRemoteDescription(sdp);
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  chan.postMessage({ type: "answer", from: myId, to: from, sdp: pc.localDescription });
  onStatus?.("Answer sent. Connecting…");
}

async function handleAnswer(sdp, onStatus) {
  if (pc && pc.signalingState === "have-local-offer") {
    await pc.setRemoteDescription(sdp);
    onStatus?.("Answer received. Connecting…");
  }
}

async function handleIce(candidate) {
  try {
    if (pc) await pc.addIceCandidate(candidate);
  } catch (_) {}
}

// call.js에서 주입해줄 상태 업데이트 핸들러
let __statusHook = null;
window.__setStatusHook = (fn) => { __statusHook = fn; };

chan.onmessage = async (ev) => {
  const msg = ev.data;
  if (!msg || msg.from === myId) return;

  if (!pc) return; // 통화 시작 전이면 무시

  const onStatus = __statusHook;

  if (msg.type === "ready") {
    // offerer 선출(충돌 방지): ID가 작은 쪽이 offer 생성
    if (myId < msg.from) await makeOffer(onStatus);
    else onStatus?.("Peer is ready. Waiting for offer…");
  }

  if (msg.type === "offer") await handleOffer(msg.from, msg.sdp, onStatus);
  if (msg.type === "answer" && (!msg.to || msg.to === myId)) await handleAnswer(msg.sdp, onStatus);
  if (msg.type === "ice") await handleIce(msg.candidate);
};
