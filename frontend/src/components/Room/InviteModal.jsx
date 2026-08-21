import { useState } from 'react';
import { useRoomStore } from '../../store/roomStore';
import { X, Copy, Check } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export default function InviteModal({ isOpen, onClose, roomId }) {
  const { currentRoom, generateInviteCode } = useRoomStore();
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const inviteCode = currentRoom?.room?.invite_code;
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
    <AnimatePresence>
      {isOpen && currentRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />

          {/* Modal Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
            className="glass-panel w-full max-w-md rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.5)] overflow-hidden relative border border-white/20 flex flex-col z-10"
          >
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 text-white/50 hover:text-white hover:bg-white/10 transition-all p-1.5 rounded-full z-20"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-8">
              <h2 className="text-xl font-bold text-white mb-2 uppercase tracking-wide drop-shadow-sm">Mời bạn bè</h2>
              <p className="text-white/70 text-sm mb-6">
                Gửi liên kết này cho bạn bè để mời họ tham gia phòng <span className="font-bold text-white drop-shadow-sm">{currentRoom.room.name}</span>.
              </p>

              {inviteCode ? (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/70 uppercase tracking-wider drop-shadow-sm">
                    Liên kết mời
                  </label>
                  <div className="flex glass-input rounded-xl overflow-hidden p-1 shadow-inner focus-within:ring-1 focus-within:ring-primary/50 focus-within:border-primary/50 transition-all">
                    <input 
                      type="text" 
                      readOnly 
                      value={inviteLink}
                      className="flex-1 bg-transparent text-white px-3 py-2 text-sm outline-none"
                    />
                    <motion.button 
                      whileTap={{ scale: 0.95 }}
                      onClick={handleCopy}
                      className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold transition-all shadow-md ${
                        copied ? 'bg-green-500/80 text-white' : 'bg-primary hover:bg-primaryHover text-white'
                      }`}
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? 'Đã chép' : 'Sao chép'}
                    </motion.button>
                  </div>
                  <p className="text-xs text-white/50 mt-2">
                    Liên kết này sẽ có hiệu lực vĩnh viễn cho đến khi bị thu hồi (sắp ra mắt).
                  </p>
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
                    <span className="text-2xl drop-shadow-sm">🔗</span>
                  </div>
                  <p className="text-white font-bold mb-4 drop-shadow-sm">Phòng này chưa có liên kết mời.</p>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleGenerate}
                    disabled={isLoading}
                    className="bg-primary hover:bg-primaryHover text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)] disabled:opacity-50 disabled:shadow-none"
                  >
                    {isLoading ? 'Đang tạo...' : 'Tạo liên kết mời'}
                  </motion.button>
                </div>
              )}
            </div>

            <div className="bg-white/5 px-6 py-4 flex justify-end border-t border-white/10">
              <button 
                onClick={onClose}
                className="text-white/70 hover:text-white px-5 py-2 rounded-xl hover:bg-white/10 text-sm font-bold transition-all"
              >
                Đóng
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
