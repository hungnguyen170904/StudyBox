import { useEffect, useRef, useState } from 'react';
import { useVoiceStore } from '../../store/voiceStore';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { Mic, MicOff, PhoneOff, User, Video, VideoOff, MonitorUp, MonitorOff } from 'lucide-react';

/* ───── Component: Thẻ Audio/Video và Avatar của một User ───── */
const VoicePeer = ({ stream, username, isLocal, isMuted }) => {
  const mediaRef = useRef(null);
  const [isTalking, setIsTalking] = useState(false);
  const audioContextRef = useRef(null);
  const rafId = useRef(null);

  const hasVideo = stream && stream.getVideoTracks().length > 0;

  // Gắn stream vào thẻ media (video hoặc audio)
  useEffect(() => {
    if (mediaRef.current && stream) {
      mediaRef.current.srcObject = stream;
    }
  }, [stream, hasVideo]);

  // Audio Analyzer để làm hiệu ứng phát sáng khi nói
  useEffect(() => {
    if (!stream || stream.getAudioTracks().length === 0) return;

    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;
      const analyzer = audioContext.createAnalyser();
      
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyzer);
      analyzer.fftSize = 256;
      
      const bufferLength = analyzer.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkVolume = () => {
        analyzer.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        
        // Ngưỡng âm lượng
        if (average > 10) {
          setIsTalking(true);
        } else {
          setIsTalking(false);
        }
        rafId.current = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (err) {
      console.warn('AudioContext không hỗ trợ:', err);
    }

    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, [stream]);

  return (
    <div className="flex flex-col items-center gap-3 p-4 w-full h-full max-w-[400px]">
      
      {/* Container Media / Avatar */}
      <div 
        className={`relative w-full aspect-video rounded-2xl bg-black/40 backdrop-blur-md flex items-center justify-center overflow-hidden transition-all duration-150 ${
          isTalking && !isMuted ? 'ring-4 ring-green-500 shadow-[0_0_20px_rgba(34,197,94,0.6)]' : 'ring-4 ring-white/10'
        }`}
      >
        {hasVideo ? (
          <video 
            ref={mediaRef} 
            autoPlay 
            playsInline 
            muted={isLocal} 
            className="w-full h-full object-cover"
          />
        ) : (
          <>
            <User className="w-16 h-16 text-white/50 drop-shadow-sm" />
            {/* Audio ẩn nếu không có video */}
            {!isLocal && <audio ref={mediaRef} autoPlay />}
          </>
        )}
        
        {/* Muted Icon Overlay */}
        {isMuted && (
          <div className="absolute bottom-3 right-3 bg-red-500/90 backdrop-blur-sm p-2 rounded-full shadow-lg">
            <MicOff className="w-4 h-4 text-white" />
          </div>
        )}
      </div>

      <div className="text-sm font-bold text-white drop-shadow-sm w-full text-center truncate px-2">
        {username} {isLocal && <span className="text-white/50 text-xs font-normal">(Bạn)</span>}
      </div>
    </div>
  );
};

/* ───── Main Component ───── */
export default function VoiceChannel({ channelId }) {
  const { user } = useAuthStore();
  const { getSocket } = useChatStore();
  const socket = getSocket();
  
  const { 
    isConnected, localStream, peers, 
    isMuted, isVideoOn, isScreenSharing,
    joinVoiceChannel, leaveVoiceChannel, 
    toggleMute, toggleVideo, toggleScreenShare
  } = useVoiceStore();

  useEffect(() => {
    if (socket) {
      joinVoiceChannel(socket, channelId, user);
    }
    return () => {
      leaveVoiceChannel(socket);
    };
  }, [socket, channelId]); // eslint-disable-line

  const handleDisconnect = () => {
    leaveVoiceChannel(socket);
  };

  if (!isConnected) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-white/70 bg-transparent">
        <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4"></div>
        <p className="font-medium drop-shadow-sm">Đang kết nối vào kênh thoại...</p>
        <p className="text-xs mt-2 opacity-70">Vui lòng cho phép quyền sử dụng Microphone</p>
      </div>
    );
  }

  const peersArray = Object.values(peers);

  // Layout linh hoạt tùy theo số lượng người
  const gridClass = peersArray.length === 0 
    ? 'flex items-center justify-center h-full' 
    : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-max';

  return (
    <div className="flex-1 flex flex-col bg-transparent h-full overflow-hidden">
      
      {/* Grid danh sách User */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar flex items-center justify-center">
        <div className={`w-full max-w-6xl ${gridClass}`}>
          
          {/* Người dùng hiện tại */}
          <VoicePeer 
            stream={localStream} 
            username={user.display_name || user.username} 
            isLocal={true} 
            isMuted={isMuted} 
          />

          {/* Những người khác */}
          {peersArray.map((peer, idx) => (
            <VoicePeer 
              key={idx}
              stream={peer.stream}
              username={peer.username}
              isLocal={false}
              isMuted={false} // Todo: Đồng bộ trạng thái mute qua Socket sau
            />
          ))}

        </div>
      </div>

      {/* Control Bar */}
      <div className="h-24 bg-black/30 backdrop-blur-md flex items-center justify-center gap-4 sm:gap-6 px-4 shrink-0 border-t border-white/10 shadow-[0_-8px_30px_rgba(0,0,0,0.12)]">
        
        {/* Nút Bật/Tắt Mic */}
        <button 
          onClick={toggleMute}
          className={`flex items-center justify-center w-14 h-14 rounded-2xl transition-all shadow-lg backdrop-blur-sm border ${
            isMuted ? 'bg-red-500/80 hover:bg-red-500 border-red-500/50' : 'bg-white/10 hover:bg-white/20 border-white/20'
          }`}
          title={isMuted ? 'Bật Mic' : 'Tắt Mic'}
        >
          {isMuted ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
        </button>

        {/* Nút Bật/Tắt Camera */}
        <button 
          onClick={toggleVideo}
          className={`flex items-center justify-center w-14 h-14 rounded-2xl transition-all shadow-lg backdrop-blur-sm border ${
            !isVideoOn ? 'bg-red-500/80 hover:bg-red-500 border-red-500/50' : 'bg-white/10 hover:bg-white/20 border-white/20'
          }`}
          title={isVideoOn ? 'Tắt Camera' : 'Bật Camera'}
        >
          {!isVideoOn ? <VideoOff className="w-6 h-6 text-white" /> : <Video className="w-6 h-6 text-white" />}
        </button>

        {/* Nút Chia sẻ màn hình */}
        <button 
          onClick={toggleScreenShare}
          className={`flex items-center justify-center w-14 h-14 rounded-2xl transition-all shadow-lg backdrop-blur-sm border ${
            !isScreenSharing ? 'bg-white/10 hover:bg-white/20 border-white/20' : 'bg-blue-500/80 hover:bg-blue-500 border-blue-500/50'
          }`}
          title={isScreenSharing ? 'Dừng chia sẻ màn hình' : 'Chia sẻ màn hình'}
        >
          {!isScreenSharing ? <MonitorUp className="w-6 h-6 text-white" /> : <MonitorOff className="w-6 h-6 text-white" />}
        </button>

        <div className="w-px h-8 bg-white/20 mx-2"></div>

        {/* Nút Rời Kênh */}
        <button 
          onClick={handleDisconnect}
          className="flex items-center justify-center w-14 h-14 rounded-2xl bg-red-500/80 hover:bg-red-500 border border-red-500/50 transition-all shadow-lg backdrop-blur-sm"
          title="Ngắt kết nối"
        >
          <PhoneOff className="w-6 h-6 text-white" />
        </button>

      </div>
    </div>
  );
}
