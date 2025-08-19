import React, { useEffect, useRef, useState } from "react";
import { auth, db } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "firebase/auth";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp
} from "firebase/firestore";
import { createRoom, joinRoom } from "./webrtc";

const App = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loginView, setLoginView] = useState(true);
  const [registerData, setRegisterData] = useState({ username: "", password: "" });
  const [loginData, setLoginData] = useState({ username: "", password: "" });

  const [activeServer, setActiveServer] = useState(1);
  const [activeChannel, setActiveChannel] = useState(1); // 1=text general, 4=voice-chat
  const [messages, setMessages] = useState({});
  const [newMessage, setNewMessage] = useState("");

  const [voiceActive, setVoiceActive] = useState(false);
  const [videoActive, setVideoActive] = useState(false);
  const [screenShareActive, setScreenShareActive] = useState(false);

  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const roomIdRef = useRef(null);

  // Один сервер/канал как в твоём UI
  const servers = [
    {
      id: 1,
      name: "ZULFS HQ",
      icon: "🎮",
      channels: [
        { id: 1, name: "general", type: "text" },
        { id: 4, name: "voice-chat", type: "voice" }
      ]
    }
  ];

  // ======= Auth state =======
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        setCurrentUser({ username: u.email || "user", avatar: "👤", uid: u.uid });
        setLoginView(false);
      } else {
        setCurrentUser(null);
        setLoginView(true);
      }
    });
    return () => unsub();
  }, []);

  // ======= Subscribe chat messages (Firestore) =======
  useEffect(() => {
    if (!activeChannel) return;
    if (activeChannel !== 1) return; // только для text general в демо

    const q = query(
      collection(db, "channels", String(activeChannel), "messages"),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const list = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setMessages((prev) => ({ ...prev, [activeChannel]: list }));
    });
    return () => unsub();
  }, [activeChannel]);

  // ======= Auth handlers =======
  const handleRegister = async (e) => {
    e?.preventDefault?.();
    if (!registerData.username || !registerData.password) return;
    // Интерпретируем username как email (пусть вводят реальный email)
    await createUserWithEmailAndPassword(auth, registerData.username, registerData.password);
  };

  const handleLogin = async (e) => {
    e?.preventDefault?.();
    if (!loginData.username || !loginData.password) return;
    await signInWithEmailAndPassword(auth, loginData.username, loginData.password);
  };

  const handleLogout = async () => {
    await signOut(auth);
    setActiveChannel(1);
  };

  // ======= Chat send =======
  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUser) return;
    await addDoc(collection(db, "channels", String(activeChannel), "messages"), {
      user: currentUser.username,
      uid: currentUser.uid,
      content: newMessage.trim(),
      avatar: currentUser.avatar,
      createdAt: serverTimestamp()
    });
    setNewMessage("");
  };

  // ======= WebRTC (1:1 демо) =======
  const ensureLocalStream = async (withVideo = false) => {
    if (localStreamRef.current) return localStreamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: withVideo });
    localStreamRef.current = stream;
    return stream;
  };

  const toggleVoice = async () => {
    try {
      if (!voiceActive) {
        const stream = await ensureLocalStream(false);
        // Если нет активной комнаты, создаём offer; иначе пробуем присоединиться как answer
        if (!roomIdRef.current) {
          const { pc, roomRef } = await createRoom(stream, (remoteStream) => {
            remoteStreamRef.current = remoteStream;
            if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
          });
          pcRef.current = pc;
          roomIdRef.current = roomRef.id;
        } else {
          const { pc } = await joinRoom(roomIdRef.current, stream, (remoteStream) => {
            remoteStreamRef.current = remoteStream;
            if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
          });
          pcRef.current = pc;
        }
        setVoiceActive(true);
      } else {
        // Отключаемся локально (для простоты)
        pcRef.current?.getSenders()?.forEach(s => s.track && s.track.stop());
        pcRef.current?.close();
        pcRef.current = null;
        localStreamRef.current?.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
        setVoiceActive(false);
      }
    } catch (e) {
      console.error(e);
      alert("Ошибка с микрофоном/соединением");
    }
  };

  const toggleVideo = async () => {
    try {
      if (!videoActive) {
        const stream = await ensureLocalStream(true);
        if (!roomIdRef.current) {
          const { pc, roomRef } = await createRoom(stream, (remoteStream) => {
            remoteStreamRef.current = remoteStream;
            if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
          });
          pcRef.current = pc;
          roomIdRef.current = roomRef.id;
        } else {
          const { pc } = await joinRoom(roomIdRef.current, stream, (remoteStream) => {
            remoteStreamRef.current = remoteStream;
            if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
          });
          pcRef.current = pc;
        }
        setVideoActive(true);
      } else {
        pcRef.current?.getSenders()?.forEach(s => s.track && s.track.stop());
        pcRef.current?.close();
        pcRef.current = null;
        localStreamRef.current?.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
        setVideoActive(false);
      }
    } catch (e) {
      console.error(e);
      alert("Ошибка с камерой/соединением");
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!screenShareActive) {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        // Для простоты: если соединение есть — заменим видеотрек
        if (pcRef.current) {
          const sender = pcRef.current.getSenders().find(s => s.track && s.track.kind === "video");
          if (sender) sender.replaceTrack(stream.getVideoTracks()[0]);
        } else {
          // Иначе создаём комнату со стримом экрана
          if (!roomIdRef.current) {
            const { pc, roomRef } = await createRoom(stream, (remoteStream) => {
              remoteStreamRef.current = remoteStream;
              if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
            });
            pcRef.current = pc;
            roomIdRef.current = roomRef.id;
          }
        }
        setScreenShareActive(true);
        stream.getVideoTracks()[0].addEventListener("ended", () => setScreenShareActive(false));
      } else {
        setScreenShareActive(false);
      }
    } catch (e) {
      console.error(e);
      alert("Не удалось расшарить экран");
    }
  };

  const isVoiceChannelActive = activeChannel === 4;

  if (loginView) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-black/40 p-6 rounded-xl">
          <h1 className="text-2xl font-bold mb-4 text-center">ZULFS — Login</h1>
          <div className="space-y-4">
            <input
              placeholder="Email"
              value={loginData.username}
              onChange={(e)=>setLoginData(v=>({...v, username:e.target.value}))}
              className="w-full px-4 py-3 rounded bg-gray-800 border border-gray-700"
            />
            <input
              placeholder="Password"
              type="password"
              value={loginData.password}
              onChange={(e)=>setLoginData(v=>({...v, password:e.target.value}))}
              className="w-full px-4 py-3 rounded bg-gray-800 border border-gray-700"
            />
            <button onClick={handleLogin} className="w-full py-3 rounded bg-indigo-600">Login</button>
            <hr className="border-gray-700"/>
            <h2 className="text-lg font-semibold">Register</h2>
            <input
              placeholder="Email"
              value={registerData.username}
              onChange={(e)=>setRegisterData(v=>({...v, username:e.target.value}))}
              className="w-full px-4 py-3 rounded bg-gray-800 border border-gray-700"
            />
            <input
              placeholder="Password"
              type="password"
              value={registerData.password}
              onChange={(e)=>setRegisterData(v=>({...v, password:e.target.value}))}
              className="w-full px-4 py-3 rounded bg-gray-800 border border-gray-700"
            />
            <button onClick={handleRegister} className="w-full py-3 rounded bg-green-600">Create account</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 text-white flex">
      {/* Sidebar */}
      <div className="w-16 bg-black/50 flex flex-col items-center py-4 space-y-6">
        <div className="text-2xl">🎮</div>
        {servers.map(s => (
          <button key={s.id} onClick={()=>{setActiveServer(s.id); setActiveChannel(s.channels[0].id);}} className={`w-10 h-10 rounded-full ${activeServer===s.id?"bg-indigo-600":"bg-gray-800"}`}>{s.icon}</button>
        ))}
        <button onClick={handleLogout} className="mt-auto text-xs text-gray-300 hover:text-white">Logout</button>
      </div>

      {/* Channels */}
      <div className="w-64 bg-black/30">
        <div className="p-4 border-b border-gray-700 font-bold">ZULFS HQ</div>
        <div className="p-2">
          <h3 className="text-xs uppercase text-gray-400 mb-2">Text</h3>
          <button onClick={()=>setActiveChannel(1)} className={`block w-full text-left px-3 py-2 rounded ${activeChannel===1?"bg-indigo-600/40":"hover:bg-white/10"}`}>💬 general</button>
        </div>
        <div className="p-2">
          <h3 className="text-xs uppercase text-gray-400 mb-2">Voice</h3>
          <button onClick={()=>setActiveChannel(4)} className={`block w-full text-left px-3 py-2 rounded ${activeChannel===4?"bg-indigo-600/40":"hover:bg-white/10"}`}>🔊 voice-chat</button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        <div className="h-16 bg-black/40 border-b border-gray-700 flex items-center px-6">
          <div className="font-bold">#{servers.find(s=>s.id===activeServer)?.channels.find(c=>c.id===activeChannel)?.name}</div>
          <div className="ml-auto flex gap-2">
            <button onClick={toggleVideo} className={`px-3 py-1 rounded ${videoActive?"bg-red-600":"bg-gray-700"}`}>{videoActive?"📹":"🎥"}</button>
            <button onClick={toggleVoice} className={`px-3 py-1 rounded ${voiceActive?"bg-green-600":"bg-gray-700"}`}>{voiceActive?"🎤":"🔇"}</button>
            <button onClick={toggleScreenShare} className={`px-3 py-1 rounded ${screenShareActive?"bg-blue-600":"bg-gray-700"}`}>{screenShareActive?"🖥️":"📺"}</button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activeChannel===1 ? (
            (messages[1]||[]).map(m => (
              <div key={m.id} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center">👤</div>
                <div>
                  <div className="text-sm font-semibold">{m.user || "user"} <span className="text-gray-400 text-xs">{m.createdAt?.seconds?new Date(m.createdAt.seconds*1000).toLocaleTimeString():""}</span></div>
                  <div className="text-gray-200">{m.content}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-6 text-gray-400">Зайдите в voice-chat и нажмите 🎥 или 🎤, чтобы начать 1:1 соединение. Второй пользователь должен открыть тот же канал — первый создаёт комнату, второй присоединяется.</div>
          )}
        </div>

        {/* Input */}
        {activeChannel===1 && (
          <div className="p-4 border-t border-gray-700 flex gap-2">
            <input
              value={newMessage}
              onChange={(e)=>setNewMessage(e.target.value)}
              onKeyDown={(e)=>{if(e.key==='Enter') sendMessage();}}
              placeholder="Type a message..."
              className="flex-1 bg-black/50 border border-gray-700 rounded px-3 py-2"
            />
            <button onClick={sendMessage} className="px-4 py-2 rounded bg-indigo-600">Send</button>
          </div>
        )}

        {/* Remote video (если есть) */}
        <video ref={remoteVideoRef} autoPlay playsInline className="hidden" />
      </div>
    </div>
  );
};

export default App;