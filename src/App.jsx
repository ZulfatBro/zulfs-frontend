import React, { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCLIbIvWygldkiGHD6zN3jLSlijhHfzLvk",
  authDomain: "zulfs-8d5f6.firebaseapp.com",
  projectId: "zulfs-8d5f6",
  storageBucket: "zulfs-8d5f6.firebasestorage.app",
  messagingSenderId: "1088885843207",
  appId: "1:1088885843207:web:ae7e6fc670cb96803691a2",
  measurementId: "G-ZVL24M57JN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export default function App() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [peerId, setPeerId] = useState("");
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const pcRef = useRef(null);
  const dataChannelRef = useRef(null);

  // Auth state listener
  useEffect(() => {
    onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  // Chat messages listener
  useEffect(() => {
    const q = query(collection(db, "messages"), orderBy("createdAt"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map((doc) => doc.data()));
    });
    return unsubscribe;
  }, []);

  // Login / Register
  const register = async () => {
    await createUserWithEmailAndPassword(auth, email, password);
  };
  const login = async () => {
    await signInWithEmailAndPassword(auth, email, password);
  };
  const logout = async () => {
    await signOut(auth);
  };

  // Send chat message
  const sendMessage = async () => {
    if (!newMessage) return;
    await addDoc(collection(db, "messages"), {
      text: newMessage,
      uid: user.uid,
      createdAt: Date.now(),
    });
    setNewMessage("");
  };

  // Start call
  const startCall = async () => {
    const pc = new RTCPeerConnection();
    pcRef.current = pc;
    dataChannelRef.current = pc.createDataChannel("chat");

    // Local stream
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    localVideoRef.current.srcObject = stream;

    // Remote stream
    pc.ontrack = (event) => {
      remoteVideoRef.current.srcObject = event.streams[0];
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // Send offer via Firebase
    const callDoc = await addDoc(collection(db, "calls"), {
      offer: offer.toJSON(),
      from: user.uid,
      to: peerId,
    });

    // Listen for answer
    onSnapshot(callDoc, async (doc) => {
      const data = doc.data();
      if (!pc.currentRemoteDescription && data.answer) {
        await pc.setRemoteDescription(data.answer);
      }
    });
  };

  // Answer call
  const answerCall = async (callData) => {
    const pc = new RTCPeerConnection();
    pcRef.current = pc;

    // Local stream
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    localVideoRef.current.srcObject = stream;

    // Remote stream
    pc.ontrack = (event) => {
      remoteVideoRef.current.srcObject = event.streams[0];
    };

    await pc.setRemoteDescription(callData.offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    // Send answer back via Firebase
    const callRef = collection(db, "calls").doc(callData.id);
    await callRef.update({ answer: answer.toJSON() });
  };

  if (!user)
    return (
      <div style={{ padding: 20 }}>
        <h2>Login / Register</h2>
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button onClick={login}>Login</button>
        <button onClick={register}>Register</button>
      </div>
    );

  return (
    <div style={{ padding: 20 }}>
      <h2>Welcome, {user.email}</h2>
      <button onClick={logout}>Logout</button>

      <div style={{ marginTop: 20 }}>
        <h3>Chat</h3>
        <div style={{ maxHeight: 200, overflowY: "scroll", border: "1px solid gray" }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ color: msg.uid === user.uid ? "blue" : "black" }}>
              {msg.text}
            </div>
          ))}
        </div>
        <input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
        />
        <button onClick={sendMessage}>Send</button>
      </div>

      <div style={{ marginTop: 20 }}>
        <h3>Video Call</h3>
        <input
          placeholder="Peer UID"
          value={peerId}
          onChange={(e) => setPeerId(e.target.value)}
        />
        <button onClick={startCall}>Call</button>
        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          <video ref={localVideoRef} autoPlay muted style={{ width: 200 }} />
          <video ref={remoteVideoRef} autoPlay style={{ width: 200 }} />
        </div>
      </div>
    </div>
  );
}
