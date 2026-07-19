import { useState, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { X, Camera, Save } from 'lucide-react';

export default function ProfileSettings({ isOpen, onClose }) {
  const { user, updateProfile } = useAuthStore();
  const [username, setUsername] = useState(user?.username || '');
  const [displayName, setDisplayName] = useState(user?.display_name || user?.username || '');
  const [customStatus, setCustomStatus] = useState(user?.custom_status || '');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(user?.avatar_url || '');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    const formData = new FormData();
    if (username && username !== user.username) {
      formData.append('username', username);
    }
    if (displayName && displayName !== user.display_name) {
      formData.append('display_name', displayName);
    }
    if (customStatus !== user.custom_status) {
      formData.append('custom_status', customStatus);
    }
    if (file) {
      formData.append('avatar', file);
    }

    if (formData.entries().next().done) {
      setMessage('Không có thay đổi nào.');
      setIsLoading(false);
      return;
    }

    const res = await updateProfile(formData);
    setIsLoading(false);

    if (res.success) {
      setMessage('Cập nhật hồ sơ thành công!');
      setTimeout(() => {
        onClose();
      }, 1500);
    } else {
      setMessage(res.message || 'Có lỗi xảy ra.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md">
      <div className="glass-panel w-full max-w-md rounded-2xl overflow-hidden relative border border-white/20 shadow-2xl">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors p-1 bg-black/20 rounded-full"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8">
          <h2 className="text-xl font-bold text-white mb-6 uppercase tracking-wider text-center drop-shadow-md">
            Hồ sơ của bạn
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Avatar Section */}
            <div className="flex flex-col items-center">
              <div 
                className="relative w-24 h-24 rounded-full group cursor-pointer overflow-hidden border-4 border-white/20 shadow-lg"
                onClick={() => fileInputRef.current?.click()}
              >
                {preview ? (
                  <img src={preview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-white/10 flex items-center justify-center backdrop-blur-sm">
                    <span className="text-3xl text-white drop-shadow-md">{username.charAt(0).toUpperCase()}</span>
                  </div>
                )}
                
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                  <Camera className="w-6 h-6 text-white mb-1" />
                  <span className="text-[10px] text-white font-semibold uppercase">Thay đổi</span>
                </div>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={handleFileChange}
              />
              <p className="text-xs text-white/50 mt-3 drop-shadow-sm">Khuyên dùng ảnh hình vuông, tối đa 2MB</p>
            </div>

            {/* Display Name Section */}
            <div>
              <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-2 drop-shadow-sm">
                Tên hiển thị
              </label>
              <input 
                type="text" 
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Tên mọi người sẽ thấy"
                className="w-full glass-input rounded-xl p-3 outline-none"
              />
            </div>

            {/* Username Section */}
            <div>
              <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-2 drop-shadow-sm">
                Tên định danh (Username)
              </label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Dùng để đăng nhập hoặc kết bạn"
                className="w-full glass-input rounded-xl p-3 outline-none"
              />
            </div>

            {/* Custom Status Section */}
            <div>
              <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-2 drop-shadow-sm">
                Trạng thái (Custom Status)
              </label>
              <input 
                type="text" 
                value={customStatus}
                onChange={(e) => setCustomStatus(e.target.value)}
                placeholder="Ví dụ: 🎧 Đang nghe lofi, 📚 Đang giải bài tập"
                maxLength={100}
                className="w-full glass-input rounded-xl p-3 outline-none text-blue-300 placeholder-blue-300/30 font-medium"
              />
            </div>

            {message && (
              <div className={`text-sm text-center font-medium p-3 rounded-lg backdrop-blur-sm border ${message.includes('thành công') ? 'bg-green-500/20 text-green-200 border-green-500/30' : 'bg-red-500/20 text-red-200 border-red-500/30'}`}>
                {message}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-6 mt-4 border-t border-white/10">
              <button 
                type="button" 
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-white/70 hover:bg-white/10 hover:text-white text-sm font-medium transition-all"
              >
                Hủy
              </button>
              <button 
                type="submit" 
                disabled={isLoading}
                className="px-6 py-2.5 bg-white/20 hover:bg-white/30 border border-white/30 text-white rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-lg backdrop-blur-sm"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Lưu thay đổi
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
