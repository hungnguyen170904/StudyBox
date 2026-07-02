import React, { useState } from 'react';
import { X, Hash, Volume2, Music, PenTool, FileText } from 'lucide-react';
import { useRoomStore } from '../../store/roomStore';

export default function CreateChannelModal({ isOpen, onClose, roomId }) {
  const { createChannel } = useRoomStore();
  const [name, setName] = useState('');
  const [type, setType] = useState('text');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

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
    { id: 'text', label: 'Kênh Chat', icon: Hash, desc: 'Gửi tin nhắn văn bản, hình ảnh, emoji.' },
    { id: 'voice', label: 'Đàm thoại', icon: Volume2, desc: 'Học tập cùng nhau qua giọng nói và video.' },
    { id: 'music', label: 'Nghe nhạc', icon: Music, desc: 'Phát chung một danh sách nhạc lo-fi.' },
    { id: 'whiteboard', label: 'Bảng trắng', icon: PenTool, desc: 'Vẽ và ghi chú chung theo thời gian thực.' },
    { id: 'document', label: 'Tài liệu', icon: FileText, desc: 'Lưu trữ và chia sẻ file PDF, Word, Excel.' },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1E1F22] w-full max-w-md rounded-xl shadow-2xl border border-white/10 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-6 border-b border-white/10 shrink-0 bg-black/20">
          <h2 className="font-bold text-white flex items-center gap-2">
            Tạo kênh mới
          </h2>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          <form onSubmit={handleCreate} className="space-y-6">
            
            <div>
              <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-3">
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
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors border ${
                        isSelected 
                          ? 'bg-indigo-500/20 border-indigo-500 text-white' 
                          : 'bg-white/5 border-white/5 text-white/70 hover:bg-white/10'
                      }`}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      <div>
                        <div className="font-medium text-sm text-white">{c.label}</div>
                        <div className="text-xs text-white/50 mt-0.5">{c.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-2">
                Tên kênh
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
                  {React.createElement(channelTypes.find(c => c.id === type)?.icon || Hash, { className: 'w-4 h-4' })}
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  placeholder="Nhập tên kênh (VD: tán-gẫu)"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
              <button 
                type="button" 
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-white/70 hover:text-white transition-colors"
              >
                Hủy
              </button>
              <button 
                type="submit"
                disabled={isLoading || !name.trim()}
                className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Đang tạo...' : 'Tạo kênh'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
