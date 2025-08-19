import React, { useState, useEffect, useRef } from 'react';

const App = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loginView, setLoginView] = useState(true);
  const [registerData, setRegisterData] = useState({ username: '', password: '', secret: '' });
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [activeServer, setActiveServer] = useState(null);
  const [activeChannel, setActiveChannel] = useState(null);
  const [messages, setMessages] = useState({});
  const [newMessage, setNewMessage] = useState('');
  const [voiceActive, setVoiceActive] = useState(false);
  const [videoActive, setVideoActive] = useState(false);
  const [screenShareActive, setScreenShareActive] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [settingsTab, setSettingsTab] = useState('user');
  const [profileData, setProfileData] = useState({ username: '', password: '', avatar: '👤' });
  const [audioDevices, setAudioDevices] = useState([]);
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState('');
  const [selectedVideoDevice, setSelectedVideoDevice] = useState('');
  const [volume, setVolume] = useState(75);
  const [inputVolume, setInputVolume] = useState(60);
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaStreamRef = useRef(null);

  // Mock data - только ZULFS HQ сервер
  const servers = [
    { 
      id: 1, 
      name: 'ZULFS HQ', 
      icon: '🎮', 
      channels: [
        { id: 1, name: 'general', type: 'text' },
        { id: 4, name: 'voice-chat', type: 'voice' }
      ]
    }
  ];

  // Сообщения только для канала general
  const mockMessages = {
    1: [
      { id: 2, user: 'CyberNinja', content: "Just finished a 10-hour gaming session! Who's up for some ranked?", timestamp: '10:32', avatar: '🥷' },
      { id: 3, user: 'PixelQueen', content: "I'm streaming Valorant right now! Come watch!", timestamp: '10:35', avatar: '👑' }
    ]
  };

  // Онлайн пользователи без ботов
  const mockOnlineUsers = [
    { id: 1, name: 'CyberNinja', status: 'online', game: 'Valorant', avatar: '🥷' },
    { id: 2, name: 'PixelQueen', status: 'streaming', game: 'Fortnite', avatar: '👑' },
    { id: 3, name: 'ProGamerX', status: 'online', game: 'CS2', avatar: '🔥' },
    { id: 4, name: 'SpeedRunner', status: 'dnd', game: 'Speedrun', avatar: '⚡' },
    { id: 5, name: 'GameTheorist', status: 'idle', game: 'Research', avatar: '🧠' },
    { id: 7, name: 'ShadowWarrior', status: 'online', game: 'Apex Legends', avatar: '⚔️' },
    { id: 8, name: 'TechWizard', status: 'online', game: 'Programming', avatar: '🧙' }
  ];

  useEffect(() => {
    setMessages(mockMessages);
    setOnlineUsers(mockOnlineUsers);
    simulateDeviceEnumeration();
  }, []);

  const simulateDeviceEnumeration = async () => {
    try {
      setTimeout(() => {
        const mockAudioDevices = [
          { deviceId: 'mic-1', label: 'Gaming Headset Microphone', kind: 'audioinput' },
          { deviceId: 'mic-2', label: 'Built-in Microphone', kind: 'audioinput' },
          { deviceId: 'spk-1', label: 'Gaming Headset Speakers', kind: 'audiooutput' }
        ];
        const mockVideoDevices = [
          { deviceId: 'cam-1', label: 'Gaming Webcam 1080p', kind: 'videoinput' },
          { deviceId: 'cam-2', label: 'Built-in Camera', kind: 'videoinput' }
        ];
        const audioInputs = mockAudioDevices
          .filter(d => d.kind === 'audioinput')
          .map(d => ({ id: d.deviceId, name: d.label, type: 'input' }));
        const audioOutputs = mockAudioDevices
          .filter(d => d.kind === 'audiooutput')
          .map(d => ({ id: d.deviceId, name: d.label, type: 'output' }));
        const videoInputs = mockVideoDevices
          .filter(d => d.kind === 'videoinput')
          .map(d => ({ id: d.deviceId, name: d.label }));
        setAudioDevices([...audioInputs, ...audioOutputs]);
        setVideoDevices(videoInputs);
        if (audioInputs.length > 0) setSelectedAudioDevice(audioInputs[0].id);
        if (videoInputs.length > 0) setSelectedVideoDevice(videoInputs[0].id);
      }, 500);
    } catch (error) {
      console.error('Error accessing media devices:', error);
      setAudioDevices([
        { id: 'mic-1', name: 'Default Microphone', type: 'input' },
        { id: 'spk-1', name: 'Default Speakers', type: 'output' }
      ]);
      setVideoDevices([
        { id: 'cam-1', name: 'Default Camera' }
      ]);
      setSelectedAudioDevice('mic-1');
      setSelectedVideoDevice('cam-1');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    // TODO: Replace with actual API call to your backend
    if (registerData.username && registerData.password && registerData.secret) {
      setCurrentUser({ 
        username: registerData.username, 
        avatar: '👤'
      });
      setLoginView(false);
      setActiveServer(1);
      setActiveChannel(1);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    // TODO: Replace with actual API call to your backend
    if (loginData.username && loginData.password) {
      setCurrentUser({ 
        username: loginData.username, 
        avatar: '👤'
      });
      setLoginView(false);
      setActiveServer(1);
      setActiveChannel(1);
    }
  };

  const sendMessage = () => {
    if (newMessage.trim() && activeChannel && currentUser) {
      const message = {
        id: Date.now(),
        user: currentUser.username,
        content: newMessage,
        timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        avatar: currentUser.avatar
      };
      setMessages(prev => ({
        ...prev,
        [activeChannel]: [...(prev[activeChannel] || []), message]
      }));
      setNewMessage('');
      // TODO: send to backend via WebSocket
    }
  };

  const toggleVoice = async () => {
    try {
      if (!voiceActive) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        setVoiceActive(true);
      } else {
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => track.stop());
          mediaStreamRef.current = null;
        }
        setVoiceActive(false);
      }
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Could not access microphone. Please check your browser permissions.');
    }
  };

  const toggleVideo = async () => {
    try {
      if (!videoActive) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        mediaStreamRef.current = stream;
        setVideoActive(true);
      } else {
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => track.stop());
          mediaStreamRef.current = null;
        }
        setVideoActive(false);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Could not access camera. Please check your browser permissions.');
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!screenShareActive) {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        mediaStreamRef.current = stream;
        setScreenShareActive(true);
        stream.getVideoTracks()[0].addEventListener('ended', () => {
          setScreenShareActive(false);
        });
      } else {
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => track.stop());
          mediaStreamRef.current = null;
        }
        setScreenShareActive(false);
      }
    } catch (error) {
      console.error('Error accessing screen sharing:', error);
      if (error.name === 'NotAllowedError') {
        alert('Screen sharing was denied. Please allow screen sharing to continue.');
      } else {
        alert('Could not share screen. Please try again.');
      }
    }
  };

  const handleAvatarClick = () => {
    setShowProfile(true);
    setProfileData({
      username: currentUser.username,
      password: '',
      avatar: currentUser.avatar
    });
  };

  const saveProfile = () => {
    if (profileData.username) {
      setCurrentUser(prev => ({
        ...prev,
        username: profileData.username,
        avatar: profileData.avatar
      }));
      setShowProfile(false);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfileData(prev => ({ ...prev, avatar: e.target.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVolumeChange = (e) => {
    setVolume(parseInt(e.target.value));
  };

  const handleInputVolumeChange = (e) => {
    setInputVolume(parseInt(e.target.value));
  };

  const isVoiceChannelActive = activeChannel === 4;

  const getAvatarSrc = (avatar) => {
    if (!avatar) return `https://placehold.co/40x40/6366f1/ffffff?text=👤`;
    if (typeof avatar === 'string' && (avatar.startsWith('data:') || avatar.startsWith('http') || avatar.length > 2)) return avatar;
    return `https://placehold.co/40x40/6366f1/ffffff?text=${encodeURIComponent(avatar)}`;
  };

  if (loginView) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full filter blur-3xl opacity-20 animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full filter blur-3xl opacity-20 animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500 rounded-full filter blur-3xl opacity-10 animate-pulse delay-2000"></div>
        </div>
        <div className="relative z-10 w-full max-w-md">
          <div className="bg-black bg-opacity-40 backdrop-blur-lg rounded-2xl p-8 border border-purple-500 border-opacity-30 shadow-2xl">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">🎮</div>
              <h1 className="text-3xl font-bold text-white mb-2">ZULFS</h1>
              <p className="text-purple-200">Gaming Communication Platform</p>
            </div>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-white mb-4">Welcome to ZULFS</h2>
              <p className="text-purple-200 text-sm mb-4">The ultimate gaming communication platform for elite gamers.</p>
              <button
                onClick={() => {
                  setLoginData({ username: 'demo', password: 'demo' });
                  setTimeout(() => {
                    setCurrentUser({ 
                      username: 'GamerPro', 
                      avatar: '🎮'
                    });
                    setLoginView(false);
                    setActiveServer(1);
                    setActiveChannel(1);
                  }, 1000);
                }}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 mb-4 shadow-lg"
              >
                Quick Demo Login
              </button>
            </div>
            <div className="space-y-4">
              <button
                onClick={() => setLoginView(false)}
                className="w-full bg-gradient-to-r from-green-600 to-teal-600 text-white py-3 rounded-lg font-semibold hover:from-green-700 hover:to-teal-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                Register
              </button>
              <button
                onClick={handleLogin}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                Login
              </button>
            </div>
            <div className="mt-6 text-center">
              <p className="text-purple-200 text-sm">
                No email required • Secure gaming communication • Real-time voice & video
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white flex overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-purple-500 rounded-full filter blur-3xl opacity-10 animate-pulse"></div>
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-blue-500 rounded-full filter blur-3xl opacity-10 animate-pulse delay-1000"></div>
        <div className="absolute top-1/3 left-1/4 w-40 h-40 bg-indigo-500 rounded-full filter blur-3xl opacity-5 animate-pulse delay-2000"></div>
      </div>
      
      {/* Sidebar */}
      {sidebarOpen && (
        <div className="w-16 bg-black bg-opacity-50 backdrop-blur-lg border-r border-purple-500 border-opacity-30 flex flex-col items-center py-4 space-y-6 flex-shrink-0">
          <div className="text-2xl mb-6">🎮</div>
          {servers.map(server => (
            <button
              key={server.id}
              onClick={() => {
                setActiveServer(server.id);
                setActiveChannel(server.channels[0].id);
              }}
              className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all duration-300 transform hover:scale-110 ${
                activeServer === server.id 
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 shadow-lg shadow-purple-500/50' 
                  : 'bg-gray-800 hover:bg-gray-700'
              }`}
              title={server.name}
            >
              {server.icon}
            </button>
          ))}
          <div className="mt-auto pt-8 space-y-4">
            <button 
              className="w-10 h-10 rounded-full bg-gradient-to-r from-green-600 to-teal-600 flex items-center justify-center text-lg hover:scale-110 transition-all duration-300 shadow-lg shadow-green-500/50"
              title="Add Server"
            >
              ➕
            </button>
            <button 
              onClick={() => setShowSettings(true)}
              className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center text-lg hover:scale-110 transition-all duration-300 shadow-lg shadow-purple-500/50"
              title="Settings"
            >
              ⚙️
            </button>
          </div>
        </div>
      )}
      
      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Server Channels Sidebar */}
        {activeServer && (
          <div className="w-64 bg-black bg-opacity-30 backdrop-blur-lg border-r border-purple-500 border-opacity-20 flex flex-col">
            <div className="p-4 border-b border-purple-500 border-opacity-20">
              <h2 className="text-xl font-bold text-white flex items-center">
                {servers.find(s => s.id === activeServer)?.icon} {servers.find(s => s.id === activeServer)?.name}
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="p-2">
                <h3 className="text-xs uppercase text-purple-300 font-semibold mb-3 px-2">Text Channels</h3>
                {servers.find(s => s.id === activeServer)?.channels
                  .filter(c => c.type === 'text')
                  .map(channel => (
                    <button
                      key={channel.id}
                      onClick={() => setActiveChannel(channel.id)}
                      className={`w-full text-left px-3 py-2 rounded-md mb-1 transition-all duration-200 flex items-center ${
                        activeChannel === channel.id 
                          ? 'bg-gradient-to-r from-purple-600/50 to-blue-600/50 text-white' 
                          : 'text-gray-300 hover:bg-white hover:bg-opacity-10 hover:text-white'
                      }`}
                    >
                      <span className="mr-2">💬</span>
                      {channel.name}
                    </button>
                  ))}
              </div>
              <div className="p-2">
                <h3 className="text-xs uppercase text-purple-300 font-semibold mb-3 px-2">Voice Channels</h3>
                {servers.find(s => s.id === activeServer)?.channels
                  .filter(c => c.type === 'voice')
                  .map(channel => (
                    <button
                      key={channel.id}
                      onClick={() => setActiveChannel(channel.id)}
                      className={`w-full text-left px-3 py-2 rounded-md mb-1 transition-all duration-200 flex items-center ${
                        activeChannel === channel.id 
                          ? 'bg-gradient-to-r from-purple-600/50 to-blue-600/50 text-white' 
                          : 'text-gray-300 hover:bg-white hover:bg-opacity-10 hover:text-white'
                      }`}
                    >
                      <span className="mr-2">🔊</span>
                      {channel.name}
                    </button>
                  ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Channel Header */}
          {activeChannel && (
            <div className="h-16 bg-black bg-opacity-40 backdrop-blur-lg border-b border-purple-500 border-opacity-20 flex items-center px-6">
              <h1 className="text-xl font-bold text-white">
                #{servers.find(s => s.id === activeServer)?.channels.find(c => c.id === activeChannel)?.name}
              </h1>
              <div className="ml-auto flex items-center space-x-4">
                <button 
                  onClick={toggleVideo}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    videoActive 
                      ? 'bg-red-600 text-white' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  title="Video"
                >
                  {videoActive ? '📹' : '🎥'}
                </button>
                <button 
                  onClick={toggleVoice}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    voiceActive 
                      ? 'bg-green-600 text-white' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  title="Voice"
                >
                  {voiceActive ? '🎤' : '🔇'}
                </button>
                <button 
                  onClick={toggleScreenShare}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    screenShareActive 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  title="Screen Share"
                >
                  {screenShareActive ? '🖥️' : '📺'}
                </button>
              </div>
            </div>
          )}
          
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {activeChannel ? (
              (messages[activeChannel] || []).map(message => (
                <div key={message.id} className="flex items-start space-x-3 animate-fade-in">
                  <img 
                    src={getAvatarSrc(message.avatar)} 
                    alt={message.user}
                    className="w-10 h-10 rounded-full border-2 border-purple-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-semibold text-white">{message.user}</span>
                      <span className="text-xs text-gray-400">{message.timestamp}</span>
                    </div>
                    <p className="text-gray-200 leading-relaxed">{message.content}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center h-full text-center">
                <div>
                  <div className="text-6xl mb-4">🎮</div>
                  <h2 className="text-2xl font-bold text-white mb-2">Welcome to ZULFS</h2>
                  <p className="text-gray-400">Select a server and channel to start chatting with fellow gamers</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Message Input */}
          {activeChannel && (
            <div className="p-4 border-t border-purple-500 border-opacity-20">
              <div className="flex items-center space-x-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 bg-black bg-opacity-50 backdrop-blur-lg border border-purple-500 border-opacity-30 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Right Sidebar - Online Users */}
        <div className="w-80 bg-black bg-opacity-30 backdrop-blur-lg border-l border-purple-500 border-opacity-20 flex flex-col">
          <div className="p-4 border-b border-purple-500 border-opacity-20">
            <h3 className="font-bold text-white">Online ({onlineUsers.length})</h3>
          </div>
          <div className="flex-1 p-4 space-y-3">
            {onlineUsers.map(user => (
              <div key={user.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-white hover:bg-opacity-10 transition-all duration-200 cursor-pointer group">
                <div className={`w-2 h-2 rounded-full ${
                  user.status === 'online' ? 'bg-green-500' :
                  user.status === 'streaming' ? 'bg-red-500' :
                  user.status === 'dnd' ? 'bg-red-500' :
                  'bg-yellow-500'
                }`}></div>
                <img 
                  src={`https://placehold.co/32x32/6366f1/ffffff?text=${encodeURIComponent(user.avatar)}`} 
                  alt={user.name}
                  className="w-8 h-8 rounded-full"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user.name}</p>
                  <div className="flex items-center space-x-2">
                    <p className="text-xs text-gray-400 truncate">{user.game}</p>
                    {user.status === 'streaming' && <span className="text-xs bg-red-600 text-white px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">🔴 LIVE</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* User Profile Card */}
          {currentUser && (
            <div className="p-4 border-t border-purple-500 border-opacity-20 bg-black bg-opacity-30">
              <div 
                className="flex items-center space-x-3 p-3 rounded-lg hover:bg-white hover:bg-opacity-10 transition-all duration-200 cursor-pointer"
                onClick={handleAvatarClick}
              >
                <img 
                  src={getAvatarSrc(currentUser.avatar)} 
                  alt={currentUser.username}
                  className="w-10 h-10 rounded-full border-2 border-purple-500"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white">{currentUser.username}</p>
                </div>
                <span className="text-sm text-gray-400">▶</span>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Voice Channel Controls */}
      {isVoiceChannelActive && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 backdrop-blur-lg rounded-2xl px-6 py-4 flex items-center space-x-4 border border-purple-500 border-opacity-30 z-50 min-w-96">
          <div className="flex-1 flex items-center space-x-4">
            <button 
              onClick={toggleVoice}
              className={`p-3 rounded-full transition-all duration-200 ${
                voiceActive 
                  ? 'bg-red-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              title="Microphone"
            >
              {voiceActive ? '🎤' : '🔇'}
            </button>
            <button 
              onClick={toggleVideo}
              className={`p-3 rounded-full transition-all duration-200 ${
                videoActive 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              title="Camera"
            >
              {videoActive ? '📹' : '🎥'}
            </button>
            <button 
              onClick={toggleScreenShare}
              className={`p-3 rounded-full transition-all duration-200 ${
                screenShareActive 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              title="Screen Share"
            >
              {screenShareActive ? '🖥️' : '📺'}
            </button>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-300">Mic</span>
              <input
                type="range"
                min="0"
                max="100"
                value={inputVolume}
                onChange={handleInputVolumeChange}
                className="w-20 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-300">Vol</span>
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={handleVolumeChange}
                className="w-20 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
          <button 
            onClick={() => {
              setActiveChannel(1);
              setVoiceActive(false);
              setVideoActive(false);
              setScreenShareActive(false);
            }}
            className="p-3 bg-red-600 text-white rounded-full hover:bg-red-700 transition-all duration-200"
            title="Leave Voice Channel"
          >
            🚪
          </button>
        </div>
      )}
      
      {/* Floating Action Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-2xl shadow-2xl hover:from-purple-700 hover:to-blue-700 transition-all duration-300 transform hover:scale-110 z-50"
      >
        {sidebarOpen ? '⬅️' : '➡️'}
      </button>
      
      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-2xl max-h-90vh overflow-y-auto border border-purple-500 border-opacity-30">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Settings</h2>
              <button 
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            <div className="flex space-x-6 mb-6">
              <button
                onClick={() => setSettingsTab('user')}
                className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
                  settingsTab === 'user' 
                    ? 'bg-purple-600 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                User Settings
              </button>
              <button
                onClick={() => setSettingsTab('audio')}
                className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
                  settingsTab === 'audio' 
                    ? 'bg-purple-600 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Audio & Video
              </button>
            </div>
            {settingsTab === 'user' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Profile</h3>
                  <div className="flex items-center space-x-6">
                    <img 
                      src={typeof profileData.avatar === 'string' && profileData.avatar.startsWith('data:') 
                        ? profileData.avatar 
                        : `https://placehold.co/80x80/6366f1/ffffff?text=${profileData.avatar || '👤'}`} 
                      alt="Avatar"
                      className="w-20 h-20 rounded-full border-2 border-purple-500"
                    />
                    <div>
                      <p className="text-gray-300 mb-2">Click to change avatar</p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-all duration-200"
                      >
                        Change Avatar
                      </button>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
                  <input
                    type="text"
                    value={profileData.username}
                    onChange={(e) => setProfileData(prev => ({ ...prev, username: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                  <input
                    type="password"
                    value="••••••••"
                    disabled
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-gray-400"
                  />
                  <p className="text-xs text-gray-400 mt-1">Password cannot be changed in demo</p>
                </div>
              </div>
            )}
            {settingsTab === 'audio' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Audio Input</h3>
                  {audioDevices.filter(d => d.type === 'input').length > 0 ? (
                    <select
                      value={selectedAudioDevice}
                      onChange={(e) => setSelectedAudioDevice(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                    >
                      {audioDevices.filter(d => d.type === 'input').map(device => (
                        <option key={device.id} value={device.id}>{device.name}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-yellow-400">
                      No audio input devices found
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Audio Output</h3>
                  {audioDevices.filter(d => d.type === 'output').length > 0 ? (
                    <select
                      value={audioDevices.find(d => d.type === 'output')?.id || ''}
                      className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                      disabled
                    >
                      {audioDevices.filter(d => d.type === 'output').map(device => (
                        <option key={device.id} value={device.id}>{device.name}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-yellow-400">
                      No audio output devices found
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-1">Output device selection requires browser permissions</p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Video Input</h3>
                  {videoDevices.length > 0 ? (
                    <select
                      value={selectedVideoDevice}
                      onChange={(e) => setSelectedVideoDevice(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                    >
                      {videoDevices.map(device => (
                        <option key={device.id} value={device.id}>{device.name}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-yellow-400">
                      No video devices found
                    </div>
                  )}
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="font-semibold text-white mb-2">Input Volume</h4>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={inputVolume}
                    onChange={handleInputVolumeChange}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>Min</span>
                    <span>{inputVolume}%</span>
                    <span>Max</span>
                  </div>
                  <h4 className="font-semibold text-white mb-2 mt-4">Output Volume</h4>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>Min</span>
                    <span>{volume}%</span>
                    <span>Max</span>
                  </div>
                </div>
              </div>
            )}
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowSettings(false)}
                className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-all duration-200"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Profile Modal */}
      {showProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-purple-500 border-opacity-30">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Your Profile</h2>
              <button 
                onClick={() => setShowProfile(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            <div className="space-y-6">
              <div className="flex flex-col items-center space-y-4">
                <img 
                  src={typeof profileData.avatar === 'string' && profileData.avatar.startsWith('') 
                    ? profileData.avatar 
                    : `https://placehold.co/100x100/6366f1/ffffff?text=${profileData.avatar}`} 
                  alt="Avatar"
                  className="w-24 h-24 rounded-full border-4 border-purple-500"
                />
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-purple-400 hover:text-purple-300 text-sm"
                  >
                    Change Avatar
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
                <input
                  type="text"
                  value={profileData.username}
                  onChange={(e) => setProfileData(prev => ({ ...prev, username: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                <input
                  type="password"
                  value={profileData.password}
                  onChange={(e) => setProfileData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter current password to change"
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setShowProfile(false)}
                  className="flex-1 bg-gray-700 text-white py-3 rounded-lg hover:bg-gray-600 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={saveProfile}
                  disabled={!profileData.username}
                  className="flex-1 bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition-all duration-200 disabled:opacity-50"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: linear-gradient(45deg, #8B5CF6, #3B82F6);
          cursor: pointer;
          box-shadow: 0 0 10px rgba(139, 92, 246, 0.5);
        }
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: linear-gradient(45deg, #8B5CF6, #3B82F6);
          cursor: pointer;
          border: none;
          box-shadow: 0 0 10px rgba(139, 92, 246, 0.5);
        }
      `}</style>
    </div>
  );
};

export default App;
