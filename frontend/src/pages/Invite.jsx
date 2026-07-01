import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRoomStore } from '../store/roomStore';
import { useAuthStore } from '../store/authStore';

export default function Invite() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { getRoomByInviteCode, joinRoomByInvite } = useRoomStore();
  const { user } = useAuthStore();
  
  const [roomInfo, setRoomInfo] = useState(null);
  const [error, setError] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    // Nếu chưa đăng nhập, đá về Login (sau khi login có thể redirect lại invite nếu muốn)
    if (!user) {
      navigate('/login');
      return;
    }

    const checkInvite = async () => {
      const room = await getRoomByInviteCode(code);
      if (room) {
        setRoomInfo(room);
      } else {
        setError('Mã mời không hợp lệ hoặc đã hết hạn.');
      }
    };
    
    checkInvite();
  }, [code, user, navigate, getRoomByInviteCode]);

  const handleJoin = async () => {
    setIsJoining(true);
    const roomId = await joinRoomByInvite(code);
    if (roomId) {
      navigate(`/room/${roomId}`);
    } else {
      setError('Có lỗi xảy ra khi tham gia phòng.');
      setIsJoining(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center p-4">
        <div className="glass-panel p-8 rounded-2xl shadow-2xl max-w-md w-full text-center border border-white/20">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
            <span className="text-red-400 text-2xl font-bold drop-shadow-sm">!</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2 drop-shadow-sm">Lỗi Lời Mời</h2>
          <p className="text-white/70 mb-6">{error}</p>
          <button 
            onClick={() => navigate('/')}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold transition-all shadow-md"
          >
            Quay về Trang Chủ
          </button>
        </div>
      </div>
    );
  }

  if (!roomInfo) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin shadow-lg"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center p-4">
      <div className="glass-panel p-10 rounded-3xl shadow-2xl max-w-md w-full text-center border border-white/20">
        <div className="w-24 h-24 bg-white/10 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner border border-white/10 rotate-3 hover:rotate-0 transition-transform">
          <span className="text-5xl drop-shadow-md">👋</span>
        </div>
        <p className="text-white/70 text-sm font-bold uppercase tracking-wider mb-2 drop-shadow-sm">
          Bạn được mời tham gia phòng
        </p>
        <h1 className="text-3xl font-bold text-white mb-10 truncate px-4 drop-shadow-lg" title={roomInfo.name}>
          {roomInfo.name}
        </h1>
        
        <button 
          onClick={handleJoin}
          disabled={isJoining}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3.5 rounded-xl font-bold transition-all text-lg flex items-center justify-center gap-2 shadow-lg"
        >
          {isJoining ? (
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            'Tham Gia Phòng'
          )}
        </button>
        
        <button 
          onClick={() => navigate('/')}
          className="w-full mt-4 bg-transparent hover:underline text-white/50 hover:text-white py-2 text-sm font-medium transition-colors"
        >
          Từ chối
        </button>
      </div>
    </div>
  );
}
