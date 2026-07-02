import React, { useState, useEffect } from 'react';
import { X, Settings, ShieldAlert, Trash2 } from 'lucide-react';
import { useRoomStore } from '../../store/roomStore';
import { useNavigate } from 'react-router-dom';

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

  if (!isOpen || !currentRoom) return null;

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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1E1F22] w-full max-w-md rounded-xl shadow-2xl border border-white/10 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-6 border-b border-white/10 shrink-0 bg-black/20">
          <h2 className="font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-400" />
            Cài đặt phòng học
          </h2>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          <form onSubmit={handleSave} className="space-y-6">
            
            <div>
              <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-2">
                Tên phòng học
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="Nhập tên phòng..."
                disabled={isLoading}
              />
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Chế độ công khai</h3>
                  <p className="text-xs text-white/50 mt-1">
                    Hiển thị phòng học ở trang chủ. Nếu tắt, phòng sẽ ở chế độ riêng tư và chỉ vào được bằng mã mời.
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
                  <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                </label>
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
                {isLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </form>

          {/* Danger Zone */}
          <div className="mt-8 pt-6 border-t border-red-500/20">
            <h3 className="text-sm font-bold text-red-400 mb-2 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" /> Vùng nguy hiểm
            </h3>
            <p className="text-xs text-white/50 mb-4">
              Xóa phòng học không thể hoàn tác. Mọi dữ liệu sẽ bị mất vĩnh viễn.
            </p>
            <button 
              onClick={handleDelete}
              disabled={isLoading}
              className="w-full py-2.5 border border-red-500/50 text-red-400 hover:bg-red-500 hover:text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Xoá phòng học
            </button>
          </div>
          
        </div>
      </div>
    </div>
  );
}
