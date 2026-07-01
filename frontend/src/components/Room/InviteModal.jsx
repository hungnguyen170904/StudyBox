import { useState } from 'react';
import { useRoomStore } from '../../store/roomStore';
import { X, Copy, Check } from 'lucide-react';

export default function InviteModal({ isOpen, onClose, roomId }) {
  const { currentRoom, generateInviteCode } = useRoomStore();
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen || !currentRoom) return null;

  const inviteCode = currentRoom.room.invite_code;
  const inviteLink = inviteCode ? `${window.location.origin}/invite/${inviteCode}` : '';

  const handleGenerate = async () => {
    setIsLoading(true);
    await generateInviteCode(roomId);
    setIsLoading(false);
  };

  const handleCopy = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md">
      <div className="glass-panel w-full max-w-md rounded-2xl shadow-2xl overflow-hidden relative border border-white/20">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors p-1 bg-black/20 rounded-full"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8">
          <h2 className="text-xl font-bold text-white mb-2 uppercase tracking-wide drop-shadow-sm">Mời bạn bè</h2>
          <p className="text-white/70 text-sm mb-6">
            Gửi liên kết này cho bạn bè để mời họ tham gia phòng <span className="font-bold text-white">{currentRoom.room.name}</span>.
          </p>

          {inviteCode ? (
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/70 uppercase tracking-wider drop-shadow-sm">
                Liên kết mời
              </label>
              <div className="flex glass-input rounded-xl overflow-hidden p-1 shadow-inner focus-within:ring-2 focus-within:ring-blue-500/50">
                <input 
                  type="text" 
                  readOnly 
                  value={inviteLink}
                  className="flex-1 bg-transparent text-white px-3 py-2 text-sm outline-none"
                />
                <button 
                  onClick={handleCopy}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold transition-all shadow-md ${
                    copied ? 'bg-green-500/80 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'
                  }`}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Đã sao chép' : 'Sao chép'}
                </button>
              </div>
              <p className="text-xs text-white/50 mt-2">
                Liên kết này sẽ có hiệu lực vĩnh viễn cho đến khi bị thu hồi (sắp ra mắt).
              </p>
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10 shadow-sm">
                <span className="text-2xl drop-shadow-sm">🔗</span>
              </div>
              <p className="text-white font-bold mb-4 drop-shadow-sm">Phòng này chưa có liên kết mời.</p>
              <button
                onClick={handleGenerate}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg"
              >
                {isLoading ? 'Đang tạo...' : 'Tạo liên kết mời'}
              </button>
            </div>
          )}
        </div>

        <div className="bg-black/20 backdrop-blur-sm px-6 py-4 flex justify-end border-t border-white/10">
          <button 
            onClick={onClose}
            className="text-white/70 hover:text-white px-4 py-2 rounded-lg hover:bg-white/10 text-sm font-medium transition-all"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
