import React, { useState } from 'react';
import { X, Hash, Volume2, Music, PenTool, FileText } from 'lucide-react';
import { useRoomStore } from '../../store/roomStore';
import { AnimatePresence, motion } from 'framer-motion';

export default function CreateChannelModal({ isOpen, onClose, roomId }) {
  const { createChannel } = useRoomStore();
  const [name, setName] = useState('');
  const [type, setType] = useState('text');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    const channel = await createChannel(roomId, name, type);
    setIsLoading(false);

    if (channel) {
      setName('');
      setType('text');
      onClose();
    }
  };

  const channelTypes = [
    { id: 'text', label: 'Kênh Chat', icon: Hash, desc: 'Gửi tin nhắn văn bản, hình ảnh, emoji.', color: 'text-violet-400' },
    { id: 'voice', label: 'Đàm thoại', icon: Volume2, desc: 'Học tập cùng nhau qua giọng nói và video.', color: 'text-green-400' },
    { id: 'music', label: 'Nghe nhạc', icon: Music, desc: 'Phát chung một danh sách nhạc lo-fi.', color: 'text-pink-400' },
    { id: 'whiteboard', label: 'Bảng trắng', icon: PenTool, desc: 'Vẽ và ghi chú chung theo thời gian thực.', color: 'text-amber-400' },
    { id: 'document', label: 'Tài liệu', icon: FileText, desc: 'Lưu trữ và chia sẻ file PDF, Word, Excel.', color: 'text-cyan-400' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
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
            {/* Header */}
            <div className="h-14 flex items-center justify-between px-6 border-b border-white/10 shrink-0 bg-white/5">
              <h2 className="font-bold text-white flex items-center gap-2 drop-shadow-sm uppercase tracking-wide text-sm">
                Tạo kênh mới
              </h2>
              <button 
                onClick={onClose} 
                className="text-white/50 hover:text-white hover:bg-white/10 p-1.5 rounded-full transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto custom-scrollbar max-h-[70vh]">
              <form onSubmit={handleCreate} className="space-y-6">
                
                <div>
                  <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-3 drop-shadow-sm">
                    Loại kênh
                  </label>
                  <div className="space-y-2">
                    {channelTypes.map(c => {
                      const Icon = c.icon;
                      const isSelected = type === c.id;
                      return (
                        <div 
                          key={c.id}
                          onClick={() => setType(c.id)}
                          className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all border ${
                            isSelected 
                              ? 'bg-primary/20 border-primary shadow-[0_0_15px_rgba(139,92,246,0.15)]' 
                              : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? 'bg-primary/30' : 'bg-white/10'}`}>
                            <Icon className={`w-5 h-5 ${isSelected ? c.color : 'text-white/70'}`} />
                          </div>
                          <div>
                            <div className={`font-bold text-sm ${isSelected ? 'text-white' : 'text-white/80'}`}>{c.label}</div>
                            <div className="text-xs text-white/50 mt-0.5">{c.desc}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-2 drop-shadow-sm">
                    Tên kênh
                  </label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40">
                      {React.createElement(channelTypes.find(c => c.id === type)?.icon || Hash, { className: 'w-4 h-4' })}
                    </div>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full glass-input rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-1 focus:ring-primary/50 focus:border-primary/50"
                      placeholder="Nhập tên kênh (VD: tán-gẫu)"
                      disabled={isLoading}
                      autoFocus
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={onClose}
                    disabled={isLoading}
                    className="px-5 py-2.5 text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                  >
                    Hủy
                  </button>
                  <button 
                    type="submit"
                    disabled={isLoading || !name.trim()}
                    className="px-6 py-2.5 bg-primary hover:bg-primaryHover text-white text-sm font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(139,92,246,0.3)] disabled:opacity-50 disabled:shadow-none"
                  >
                    {isLoading ? 'Đang tạo...' : 'Tạo kênh'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
