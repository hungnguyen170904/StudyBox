import { useState, useRef } from 'react';
import { useChatStore } from '../../store/chatStore';
import { Send, Image as ImageIcon, Loader2, X, Reply } from 'lucide-react';

export default function MessageInput({ channelId, replyTo, onCancelReply }) {
  const [content, setContent] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const { sendMessage, sendTyping, sendStopTyping, uploadFile } = useChatStore();
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);

  const handleSend = (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    
    sendMessage(channelId, content, 'text', replyTo?.id);
    setContent('');
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (onCancelReply) onCancelReply();
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

  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && replyTo) {
      onCancelReply?.();
    }
  };

  return (
    <div className="px-4 pb-4 shrink-0 bg-transparent">
      {/* Reply Preview Bar */}
      {replyTo && (
        <div className="flex items-center gap-2 bg-surface/60 border border-white/10 rounded-t-xl px-4 py-2 mb-1 text-sm">
          <Reply className="w-4 h-4 text-primary shrink-0" />
          <span className="text-textMuted">Đang trả lời</span>
          <span className="font-semibold text-white truncate">{replyTo.display_name || replyTo.username}</span>
          <span className="text-textMuted truncate flex-1">: {replyTo.content?.slice(0, 60)}{replyTo.content?.length > 60 ? '…' : ''}</span>
          <button
            onClick={onCancelReply}
            className="ml-auto shrink-0 p-1 text-textMuted hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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
          ref={inputRef}
          type="text"
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={replyTo ? `Trả lời ${replyTo.display_name || replyTo.username}...` : "Nhắn tin vào kênh..."}
          className={`w-full glass-input pl-14 pr-12 py-3.5 focus:outline-none transition-all shadow-lg text-white placeholder:text-white/40 ${replyTo ? 'rounded-b-2xl rounded-t-none' : 'rounded-2xl'}`}
        />
        
        <button 
          type="submit"
          disabled={!content.trim()}
          className="absolute right-3 p-2 text-primary hover:text-primaryHover disabled:text-white/30 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="w-5 h-5 drop-shadow-sm" />
        </button>
      </form>
    </div>
  );
}

