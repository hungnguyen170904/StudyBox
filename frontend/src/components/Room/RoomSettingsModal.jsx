import React, { useState, useEffect } from 'react';
import { X, Settings, ShieldAlert, Trash2 } from 'lucide-react';
import { useRoomStore } from '../../store/roomStore';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

export default function RoomSettingsModal({ isOpen, onClose, roomId }) {
  const { currentRoom, updateRoomSettings, deleteRoom } = useRoomStore();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (currentRoom?.room) {
      setName(currentRoom.room.name);
      setIsPublic(currentRoom.room.is_public);
    }
  }, [currentRoom, isOpen]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    await updateRoomSettings(roomId, { name, is_public: isPublic });
    setIsLoading(false);
    onClose();
  };

  const handleDelete = async () => {
    if (window.confirm('CẢNH BÁO: Hành động này sẽ xóa vĩnh viễn phòng học, toàn bộ kênh, tin nhắn và tài liệu bên trong. Bạn có chắc chắn không?')) {
      setIsLoading(true);
      const success = await deleteRoom(roomId);
      setIsLoading(false);
      if (success) {
        onClose();
        navigate('/');
      }
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
            {/* Header */}
            <div className="h-14 flex items-center justify-between px-6 border-b border-white/10 shrink-0 bg-white/5">
              <h2 className="font-bold text-white flex items-center gap-2 drop-shadow-sm uppercase tracking-wide text-sm">
                <Settings className="w-4 h-4 text-primary" />
                Cài đặt phòng học
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
              <form onSubmit={handleSave} className="space-y-6">
                
                <div>
                  <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-2 drop-shadow-sm">
                    Tên phòng học
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full glass-input rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary/50 focus:border-primary/50"
                    placeholder="Nhập tên phòng..."
                    disabled={isLoading}
                  />
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white drop-shadow-sm">Chế độ công khai</h3>
                      <p className="text-xs text-white/50 mt-1">
                        Hiển thị ở trang chủ. Nếu tắt, chỉ vào được bằng mã mời.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={isPublic}
                        onChange={(e) => setIsPublic(e.target.checked)}
                        disabled={isLoading}
                      />
                      <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                    </label>
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
                    {isLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                </div>
              </form>

              {/* Danger Zone */}
              <div className="mt-8 pt-6 border-t border-red-500/20">
                <h3 className="text-sm font-bold text-red-400 mb-2 flex items-center gap-2 drop-shadow-sm">
                  <ShieldAlert className="w-4 h-4" /> Vùng nguy hiểm
                </h3>
                <p className="text-xs text-white/50 mb-4">
                  Xóa phòng học không thể hoàn tác. Mọi dữ liệu sẽ bị mất vĩnh viễn.
                </p>
                <button 
                  onClick={handleDelete}
                  disabled={isLoading}
                  className="w-full py-2.5 border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Xoá phòng học
                </button>
              </div>
              
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
