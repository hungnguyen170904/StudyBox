import { useState, useRef } from 'react';
import { useChatStore } from '../../store/chatStore';
import { Send, Image as ImageIcon, Loader2 } from 'lucide-react';

export default function MessageInput({ channelId }) {
  const [content, setContent] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const { sendMessage, sendTyping, sendStopTyping, uploadFile } = useChatStore();
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleSend = (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    
    sendMessage(channelId, content);
    setContent('');
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleChange = (e) => {
    setContent(e.target.value);

    // Emit typing event
    sendTyping(channelId);

    // Xóa timeout cũ nếu có
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Thiết lập timeout mới: sau 2s không gõ thì báo ngừng gõ
    typingTimeoutRef.current = setTimeout(() => {
      sendStopTyping(channelId);
    }, 2000);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Giới hạn 10MB ở frontend
    if (file.size > 10 * 1024 * 1024) {
      alert('File quá lớn. Vui lòng chọn file dưới 10MB.');
      return;
    }

    try {
      setIsUploading(true);
      await uploadFile(channelId, file);
    } catch (err) {
      alert('Lỗi khi tải file lên!');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Reset input
      }
    }
  };

  return (
    <div className="p-4 shrink-0 bg-transparent">
      <form onSubmit={handleSend} className="relative flex items-center">
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          className="hidden" 
          accept="image/*,video/*,.pdf,.doc,.docx,.zip,.rar" 
        />
        <button 
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="absolute left-3 p-2 text-white/50 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors backdrop-blur-sm disabled:opacity-50"
          title="Gửi ảnh/video/tài liệu"
        >
          {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5 drop-shadow-sm" />}
        </button>
        
        <input
          type="text"
          value={content}
          onChange={handleChange}
          placeholder="Nhắn tin vào kênh..."
          className="w-full glass-input rounded-2xl pl-14 pr-12 py-3.5 focus:outline-none transition-all shadow-lg text-white placeholder:text-white/40"
        />
        
        <button 
          type="submit"
          disabled={!content.trim()}
          className="absolute right-3 p-2 text-blue-400 hover:text-blue-300 disabled:text-white/30 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="w-5 h-5 drop-shadow-sm" />
        </button>
      </form>
    </div>
  );
}
