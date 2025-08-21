import React, { useEffect, useRef, useState } from 'react';
import './App.css';

// Конфигурация STUN/TURN серверов
const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

// URL вашего сервера (замените на ваш внешний IP)
const SERVER_URL = 'https://zulfs.loca.lt';
const WS_SERVER_URL = 'wss://zulfs.loca.lt'; // ВАЖНО: wss вместо https!

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [view, setView] = useState('login');
  const [data, setData] = useState({ email: '', password: '', username: '' });
  const [loginError, setLoginError] = useState('');
  const [activeChan, setChan] = useState(1);
  const [msg, setMsg] = useState('');
  const [msgs, setMsgs] = useState([]);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [members, setMembers] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [speakingUsers, setSpeakingUsers] = useState(new Set());
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  
  const localStreamRef = useRef(null);
  const peersRef = useRef(new Map());
  const localAnalyserRef = useRef(null);
  const remoteAnalysersRef = useRef(new Map());
  const wsRef = useRef(null);

  // Аутентификация
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    
    try {
      const response = await fetch(`${SERVER_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setCurrentUser(result.user);
        connectToSignalingServer(result.user.uid, result.user.displayName);
        setView('main');
      } else {
        setLoginError(result.error || 'Ошибка входа');
      }
    } catch (error) {
      console.error('Ошибка входа:', error);
      // Для демо создаем пользователя локально, если сервер недоступен
      const user = {
        uid: 'user-' + Math.random().toString(36).substr(2, 9),
        email: data.email,
        displayName: data.email.split('@')[0]
      };
      
      setCurrentUser(user);
      connectToSignalingServer(user.uid, user.displayName);
      setView('main');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoginError('');
    
    // Создаем пользователя локально
    const user = {
      uid: 'user-' + Math.random().toString(36).substr(2, 9),
      email: data.email,
      displayName: data.username || data.email.split('@')[0]
    };
    
    setCurrentUser(user);
    connectToSignalingServer(user.uid, user.displayName);
    setView('main');
  };

  // Подключение к сигнальному серверу
  const connectToSignalingServer = (userId, username) => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    
    const ws = new WebSocket(`${WS_SERVER_URL}?userId=${userId}&username=${encodeURIComponent(username)}`);
    wsRef.current = ws;
    
    ws.onopen = () => {
      console.log('Подключено к сигнальному серверу');
      setConnectionStatus('connected');
    };
    
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleSignalingMessage(message, userId);
      } catch (error) {
        console.error('Ошибка обработки сообщения:', error);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket ошибка:', error);
      setConnectionStatus('error');
    };
    
    ws.onclose = () => {
      console.log('Отключено от сигнального сервера');
      setConnectionStatus('disconnected');
    };
    
    return ws;
  };

  // Обработка входящих сигнальных сообщений
  const handleSignalingMessage = (message, userId) => {
    switch (message.type) {
      case 'users':
        setMembers(prev => {
          const newMembers = message.users.map(user => ({ 
            uid: user.userId, 
            displayName: user.username || user.userId 
          }));
          return [{ uid: userId, displayName: currentUser?.displayName || userId }, ...newMembers];
        });
        break;
        
      case 'user-joined':
        setMembers(prev => [...prev, { 
          uid: message.userId, 
          displayName: message.username || message.userId 
        }]);
        
        if (voiceEnabled) {
          createPeerConnection(message.userId, true);
        }
        break;
        
      case 'user-left':
        setMembers(prev => prev.filter(user => user.uid !== message.userId));
        closePeerConnection(message.userId);
        break;
        
      case 'offer':
        handleOffer(message, userId);
        break;
        
      case 'answer':
        handleAnswer(message, userId);
        break;
        
      case 'ice-candidate':
        handleIceCandidate(message, userId);
        break;
        
      case 'chat-message':
        setMsgs(prev => [...prev, message.data]);
        break;
    }
  };

  // Отправка сообщения через WebSocket
  const sendSignalingMessage = (message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  };

  // Отправка сообщения в чат
  const sendChatMessage = () => {
    if (!msg.trim() || !currentUser) return;
    
    sendSignalingMessage({
      type: 'chat-message',
      message: {
        u: currentUser.displayName,
        c: msg,
        timestamp: new Date().toISOString(),
        a: currentUser.displayName?.charAt(0) || '👤',
        uid: currentUser.uid,
        id: Date.now().toString()
      }
    });
    
    setMsg('');
  };

  // Обработка входящего offer
  const handleOffer = async (message, userId) => {
    const { sender, offer } = message;
    
    if (!peersRef.current.has(sender)) {
      await createPeerConnection(sender, false);
    }
    
    const peerData = peersRef.current.get(sender);
    await peerData.pc.setRemoteDescription(offer);
    
    const answer = await peerData.pc.createAnswer();
    await peerData.pc.setLocalDescription(answer);
    
    sendSignalingMessage({
      type: 'answer',
      target: sender,
      answer: answer
    });
  };

  // Обработка входящего answer
  const handleAnswer = async (message, userId) => {
    const { sender, answer } = message;
    
    if (peersRef.current.has(sender)) {
      const peerData = peersRef.current.get(sender);
      await peerData.pc.setRemoteDescription(answer);
    }
  };

  // Обработка входящего ICE-кандидата
  const handleIceCandidate = async (message, userId) => {
    const { sender, candidate } = message;
    
    if (peersRef.current.has(sender)) {
      const peerData = peersRef.current.get(sender);
      await peerData.pc.addIceCandidate(candidate);
    }
  };

  // Создание peer-соединения
  const createPeerConnection = async (remoteUid, isInitiator = false) => {
    try {
      console.log(`Создание соединения с ${remoteUid}`);
      
      const pc = new RTCPeerConnection(rtcConfig);
      const audioElement = new Audio();
      audioElement.autoplay = true;
      audioElement.playsInline = true;
      audioElement.volume = 1.0;
      
      // Добавляем локальные треки
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, localStreamRef.current);
        });
      }
      
      // Обработка входящего потока
      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        audioElement.srcObject = remoteStream;
        setupRemoteVolumeAnalyser(remoteUid, remoteStream);
        console.log(`Получен аудиопоток от ${remoteUid}`);
      };
      
      // Обработка ICE-кандидатов
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignalingMessage({
            type: 'ice-candidate',
            target: remoteUid,
            candidate: event.candidate
          });
        }
      };
      
      pc.onconnectionstatechange = () => {
        console.log(`Статус соединения с ${remoteUid}: ${pc.connectionState}`);
      };
      
      peersRef.current.set(remoteUid, { pc, audioElement });
      
      // Если мы инициаторы, создаем и отправляем offer
      if (isInitiator) {
        const offer = await pc.createOffer({ offerToReceiveAudio: true });
        await pc.setLocalDescription(offer);
        
        sendSignalingMessage({
          type: 'offer',
          target: remoteUid,
          offer: offer
        });
      }
      
    } catch (e) {
      console.error(`Ошибка создания соединения с ${remoteUid}:`, e);
    }
  };

  // Обновление статуса говорящего пользователя
  const updateSpeakingStatus = (uid, speaking) => {
    setSpeakingUsers(prev => {
      const newSet = new Set(prev);
      
      if (speaking) {
        newSet.add(uid);
      } else {
        newSet.delete(uid);
      }
      
      return newSet;
    });
  };

  // Настройка анализатора громкости локального микрофона
  const setupLocalVolumeAnalyser = (stream) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.9;
      source.connect(analyser);
      
      localAnalyserRef.current = { ctx, analyser, active: true };
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let speakingCounter = 0;
      let silenceCounter = 0;
      let lastState = false;
      
      const checkVolume = async () => {
        if (!localAnalyserRef.current?.active || !voiceEnabled) return;
        
        if (ctx.state === 'suspended') {
          try { await ctx.resume(); } catch(e) {}
        }
        
        analyser.getByteFrequencyData(dataArray);
        
        const sum = dataArray.reduce((a, b) => a + b, 0);
        const average = sum / dataArray.length;
        
        const micOn = localStreamRef.current?.getAudioTracks().some(t => t.enabled) && !isMuted;
        const isLoud = micOn && average > 25;
        
        if (isLoud) {
          speakingCounter++;
          silenceCounter = 0;
        } else {
          speakingCounter = 0;
          silenceCounter++;
        }
        
        let speaking = lastState;
        if (!lastState && speakingCounter >= 2) speaking = true;
        if (lastState && silenceCounter >= 8) speaking = false;
        
        if (speaking !== lastState) {
          updateSpeakingStatus(currentUser.uid, speaking);
          lastState = speaking;
        }
        
        setTimeout(() => requestAnimationFrame(checkVolume), 200);
      };
      
      setTimeout(checkVolume, 500);
      
    } catch (e) {
      console.warn('Ошибка анализатора:', e);
    }
  };

  // Настройка анализатора громкости удаленного пользователя
  const setupRemoteVolumeAnalyser = (uid, stream) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.9;
      source.connect(analyser);
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let speakingCounter = 0;
      let silenceCounter = 0;
      let lastState = false;
      
      const analyserData = { ctx, analyser, active: true };
      remoteAnalysersRef.current.set(uid, analyserData);
      
      const checkVolume = async () => {
        if (!analyserData.active || !peersRef.current.has(uid)) return;
        
        if (ctx.state === 'suspended') {
          try { await ctx.resume(); } catch(e) {}
        }
        
        analyser.getByteFrequencyData(dataArray);
        
        const sum = dataArray.reduce((a, b) => a + b, 0);
        const average = sum / dataArray.length;
        const isLoud = average > 25;
        
        if (isLoud) {
          speakingCounter++;
          silenceCounter = 0;
        } else {
          speakingCounter = 0;
          silenceCounter++;
        }
        
        let speaking = lastState;
        if (!lastState && speakingCounter >= 2) speaking = true;
        if (lastState && silenceCounter >= 8) speaking = false;
        
        if (speaking !== lastState) {
          updateSpeakingStatus(uid, speaking);
          lastState = speaking;
        }
        
        setTimeout(() => requestAnimationFrame(checkVolume), 200);
      };
      
      setTimeout(checkVolume, 1000);
      
    } catch (e) {
      console.warn(`Ошибка анализатора для ${uid}:`, e);
    }
  };

  // Подключение к голосовому каналу
  const joinVoiceChannel = async () => {
    if (!currentUser || voiceEnabled) return;
    
    try {
      setConnectionStatus('connecting');
      console.log('Подключение к голосовому каналу...');
      
      // Получаем медиа поток
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true, 
          noiseSuppression: true,
          autoGainControl: true 
        } 
      });
      
      localStreamRef.current = stream;
      setVoiceEnabled(true);
      setIsMuted(false);
      
      // Настройка анализатора локального звука
      setupLocalVolumeAnalyser(stream);
      
      // Подключаемся к другим пользователям
      for (const user of members) {
        if (user.uid !== currentUser.uid && !peersRef.current.has(user.uid)) {
          await createPeerConnection(user.uid, true);
        }
      }
      
      setConnectionStatus('connected');
      console.log('Подключен к голосовому каналу');
      
    } catch (e) {
      console.error('Ошибка подключения:', e);
      setConnectionStatus('error');
      alert('Ошибка подключения к голосовому каналу. Проверьте разрешения микрофона.');
    }
  };

  // Отключение от голосового канала
  const leaveVoiceChannel = async () => {
    setVoiceEnabled(false);
    setConnectionStatus('disconnected');
    
    // Закрываем все peer соединения
    for (const [uid] of peersRef.current.entries()) {
      closePeerConnection(uid);
    }
    peersRef.current.clear();
    
    // Останавливаем локальный поток
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    // Очищаем локальный анализатор
    if (localAnalyserRef.current) {
      localAnalyserRef.current.active = false;
      try {
        if (localAnalyserRef.current.ctx.state !== 'closed') {
          localAnalyserRef.current.ctx.close();
        }
      } catch (e) {}
      localAnalyserRef.current = null;
    }
    
    setMembers(prev => prev.filter(user => user.uid === currentUser.uid));
    setSpeakingUsers(new Set());
    setIsMuted(false);
    
    console.log('Отключен от голосового канала');
  };

  // Закрытие peer соединения
  const closePeerConnection = (uid) => {
    const peerData = peersRef.current.get(uid);
    if (peerData) {
      try {
        peerData.pc.close();
        if (peerData.audioElement) {
          peerData.audioElement.srcObject = null;
        }
      } catch (e) {
        console.warn('Ошибка закрытия соединения:', e);
      }
      peersRef.current.delete(uid);
    }
    
    // Очистка анализатора
    const analyser = remoteAnalysersRef.current.get(uid);
    if (analyser) {
      analyser.active = false;
      try {
        if (analyser.ctx.state !== 'closed') {
          analyser.ctx.close();
        }
      } catch (e) {}
      remoteAnalysersRef.current.delete(uid);
    }
    
    updateSpeakingStatus(uid, false);
  };

  // Переключение микрофона
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      const newMutedState = !isMuted;
      setIsMuted(newMutedState);
      
      if (newMutedState) {
        updateSpeakingStatus(currentUser.uid, false);
      }
    }
  };

  // Подключаемся к сигнальному серверу после входа
  useEffect(() => {
    if (currentUser) {
      connectToSignalingServer(currentUser.uid, currentUser.displayName);
    }
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [currentUser]);

  // Выход из системы
  const handleLogout = async () => {
    if (voiceEnabled) {
      await leaveVoiceChannel();
    }
    
    if (wsRef.current) {
      wsRef.current.close();
    }
    
    setCurrentUser(null);
    setView('login');
    setMsgs([]);
    setMembers([]);
  };

  // Рендеринг компонента
  if (!currentUser) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-header">
            <div className="login-icon">🎮</div>
            <h1>ZULFS</h1>
            <p>Игровая платформа</p>
          </div>
          <form onSubmit={view === 'login' ? handleLogin : handleRegister} className="login-form">
            {view === 'register' && (
              <input 
                type="text" 
                placeholder="Имя пользователя" 
                value={data.username} 
                onChange={e => setData({ ...data, username: e.target.value })} 
                className="login-input" 
              />
            )}
            <input 
              type="email" 
              placeholder="Email" 
              value={data.email} 
              onChange={e => setData({ ...data, email: e.target.value })} 
              className="login-input" 
              required 
            />
            <input 
              type="password" 
              placeholder="Пароль" 
              value={data.password} 
              onChange={e => setData({ ...data, password: e.target.value })} 
              className="login-input" 
              required 
            />
            {loginError && <p className="error-message">{loginError}</p>}
            <button type="submit" className="login-button">
              {view === 'login' ? 'Войти' : 'Зарегистрироваться'}
            </button>
          </form>
          <div className="login-footer">
            {view === 'login' ? (
              <button onClick={() => setView('register')} className="toggle-button">
                Нет аккаунта? Зарегистрироваться
              </button>
            ) : (
              <button onClick={() => setView('login')} className="toggle-button">
                Уже есть аккаунт? Войти
              </button>
            )}
          </div>
        </div>
        <div className="background-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="sidebar">
        <div className="app-logo">🎮</div>
        <button onClick={() => setChan(1)} className={`channel-button ${activeChan === 1 ? 'active' : ''}`}>💬</button>
        <button onClick={() => setChan(4)} className={`channel-button ${activeChan === 4 ? 'active' : ''}`}>🔊</button>
        <button onClick={handleLogout} className="logout-button">🚪</button>
      </div>
      <div className="main-content">
        <div className="chat-header">
          <h1 className="channel-title">#{activeChan === 1 ? 'general' : 'voice-chat'}</h1>
          <span className="current-user-display">{currentUser?.displayName}</span>
          {activeChan === 4 && (
            <div className="voice-controls">
              <span className="connection-status">{connectionStatus}</span>
              <button onClick={toggleMute} disabled={!voiceEnabled} className="mute-button">
                {isMuted ? '🔇' : '🎤'}
              </button>
              <button 
                onClick={() => voiceEnabled ? leaveVoiceChannel() : joinVoiceChannel()} 
                className="voice-toggle-button"
                disabled={connectionStatus === 'connecting'}
              >
                {voiceEnabled ? '🔇 Выйти' : '🎤 Войти'}
              </button>
            </div>
          )}
        </div>
        <div className="chat-messages-area">
          {activeChan === 1 ? (
            msgs.map(m => (
              <div key={m.id} className="message-item animate-fade-in">
                <div className="message-avatar">{m.a}</div>
                <div className="message-content-wrapper">
                  <div className="message-meta">
                    <span className="message-author">{m.u}</span>
                    <span className="message-time">
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="message-text">{m.c}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="voice-grid">
              {members.map(m => {
                const isSpeaking = speakingUsers.has(m.uid);
                
                return (
                  <div
                    key={m.uid}
                    className={`voice-card ${isSpeaking ? 'speaking' : ''}`}
                    title={`${m.displayName} - ${isSpeaking ? 'говорит' : 'слушает'}`}
                  >
                    <div className="voice-avatar">{m.displayName?.charAt(0) || '👤'}</div>
                    <div className="voice-name">{m.displayName}</div>
                    <div className="voice-status">
                      {m.uid === currentUser.uid 
                        ? (voiceEnabled 
                            ? (isMuted ? 'Микрофон выключен' : isSpeaking ? 'Говорите' : 'Готов к разговору') 
                            : 'Не подключены'
                          ) 
                        : (isSpeaking ? 'Говорит' : 'Слушает')
                      }
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {activeChan === 1 && (
          <div className="message-input-area">
            <div className="message-input-group">
              <input
                value={msg}
                onChange={e => setMsg(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendChatMessage()}
                placeholder="Сообщение..."
                className="message-input"
              />
              <button onClick={sendChatMessage} className="send-button">Отправить</button>
            </div>
          </div>
        )}
      </div>
      <div className="online-sidebar">
        <div className="online-header">
          <h3>Участники ({members.length})</h3>
          {voiceEnabled && (
            <div className="connection-info">
              <span className={`status-indicator ${connectionStatus}`}></span>
              <span className="status-text">{connectionStatus}</span>
            </div>
          )}
        </div>
        <div className="online-list">
          {members.map(m => (
            <div key={m.uid} className="online-user-item">
              <div className={`user-status-indicator ${speakingUsers.has(m.uid) ? 'speaking' : 'online'}`}></div>
              <div className="user-avatar">{m.displayName?.charAt(0) || '👤'}</div>
              <div className="user-info">
                <p className="user-name">{m.displayName}</p>
                <p className="user-game">{m.uid === currentUser.uid ? 'Вы' : (speakingUsers.has(m.uid) ? 'Говорит' : '')}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}