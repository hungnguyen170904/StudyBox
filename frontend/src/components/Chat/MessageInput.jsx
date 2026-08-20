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

      <form onSubmit={handleSend} className="relative flex items-center group">
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          className="hidden" 
          accept="image/*,video/*,.pdf,.doc,.docx,.zip,.rar" 
        />
        
        {/* Attachment Button */}
        <button 
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="absolute left-2.5 p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition-all disabled:opacity-50 z-10"
          title="Đính kèm file"
        >
          {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
        </button>
        
        {/* Input Field */}
        <input
          ref={inputRef}
          type="text"
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={replyTo ? `Trả lời ${replyTo.display_name || replyTo.username}...` : "Nhắn tin vào kênh..."}
          className={`w-full bg-[#1c2030]/80 backdrop-blur-xl border border-white/10 focus:border-primary/50 focus:bg-[#1e2335] outline-none transition-all duration-300 pl-14 pr-12 py-3.5 text-sm text-white placeholder:text-white/30 focus:shadow-[0_0_20px_rgba(139,92,246,0.15)] focus:ring-1 focus:ring-primary/30 ${replyTo ? 'rounded-b-2xl rounded-t-none' : 'rounded-2xl shadow-sm'}`}
        />
        
        {/* Send Button */}
        <button 
          type="submit"
          disabled={!content.trim()}
          className="absolute right-2 p-2 rounded-xl text-primary hover:text-white hover:bg-primary/80 disabled:text-white/20 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all z-10 flex items-center justify-center"
          title="Gửi tin nhắn"
        >
          <Send className="w-4 h-4 ml-0.5" />
        </button>
      </form>
    </div>
  );
}

