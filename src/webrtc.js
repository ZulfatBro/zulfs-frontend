import { db } from "./firebase";
const data = snapshot.data();
if (data?.answer && !pc.currentRemoteDescription) {
const answer = new RTCSessionDescription(data.answer);
pc.setRemoteDescription(answer);
}
});


// Слушаем входящие answerCandidates
onSnapshot(answerCandidates, snapshot => {
snapshot.docChanges().forEach(change => {
if (change.type === "added") {
const candidate = new RTCIceCandidate(change.doc.data());
pc.addIceCandidate(candidate);
}
});
});


return { pc, roomRef };
}


// Подключается к существующей комнате (answer). Возвращает { pc }.
export async function joinRoom(roomId, localStream, onRemoteTrack) {
const roomRef = doc(db, "calls", roomId);
const roomSnapshot = await getDoc(roomRef);
if (!roomSnapshot.exists()) {
throw new Error("Room not found");
}


const pc = new RTCPeerConnection({
iceServers: [
{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }
]
});


localStream.getTracks().forEach(track => pc.addTrack(track, localStream));


pc.addEventListener("track", event => {
onRemoteTrack(event.streams[0]);
});


const offerCandidates = collection(roomRef, "offerCandidates");
const answerCandidates = collection(roomRef, "answerCandidates");


pc.addEventListener("icecandidate", async event => {
if (event.candidate) {
await addDoc(answerCandidates, event.candidate.toJSON());
}
});


const roomData = roomSnapshot.data();
const offer = roomData.offer;
await pc.setRemoteDescription(new RTCSessionDescription(offer));


const answer = await pc.createAnswer();
await pc.setLocalDescription(answer);


await updateDoc(roomRef, { answer: { type: answer.type, sdp: answer.sdp } });


onSnapshot(offerCandidates, snapshot => {
snapshot.docChanges().forEach(change => {
if (change.type === "added") {
const candidate = new RTCIceCandidate(change.doc.data());
pc.addIceCandidate(candidate);
}
});
});


return { pc, roomRef };
}