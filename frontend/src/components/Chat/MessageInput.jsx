import { useState, useRef } from 'react';
import { useChatStore } from '../../store/chatStore';
import { Send, Image as ImageIcon } from 'lucide-react';

export default function MessageInput({ channelId }) {
  const [content, setContent] = useState('');
  const { sendMessage, sendTyping, sendStopTyping } = useChatStore();
  const typingTimeoutRef = useRef(null);

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

  return (
    <div className="p-4 shrink-0 bg-transparent">
      <form onSubmit={handleSend} className="relative flex items-center">
        <button 
          type="button"
          className="absolute left-3 p-2 text-white/50 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors backdrop-blur-sm"
          title="Gửi ảnh/video (Phase sau)"
        >
          <ImageIcon className="w-5 h-5 drop-shadow-sm" />
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
