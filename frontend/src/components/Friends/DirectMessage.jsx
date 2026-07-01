import { useEffect, useState, useRef } from 'react';
import { useDmStore } from '../../store/dmStore';
import { useAuthStore } from '../../store/authStore';
import { Send, User } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

export default function DirectMessage({ friend }) {
  const { messages, setActiveFriend, fetchMessages, sendMessage, isLoading } = useDmStore();
  const { user } = useAuthStore();
  const [content, setContent] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (friend) {
      setActiveFriend(friend.id);
    }
    return () => setActiveFriend(null);
  }, [friend, setActiveFriend]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    sendMessage(content);
    setContent('');
  };

  if (!friend) return null;

  return (
    <div className="flex-1 flex flex-col h-full bg-black/20 backdrop-blur-sm">
      {/* Header */}
      <div className="h-14 border-b border-white/10 flex items-center px-4 gap-3 shadow-sm shrink-0 bg-black/10 backdrop-blur-sm">
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
          {friend.avatar_url ? (
            <img src={friend.avatar_url} alt={friend.display_name || friend.username} className="w-full h-full object-cover" />
          ) : (
            <User className="w-4 h-4 text-white/70" />
          )}
        </div>
        <div className="font-bold text-white drop-shadow-sm">{friend.display_name || friend.username}</div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {isLoading && messages.length === 0 ? (
          <div className="flex justify-center mt-10">
            <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-white/50">
            <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-4 shadow-sm border border-white/10">
              <User className="w-10 h-10 text-white/70" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2 drop-shadow-sm">{friend.display_name || friend.username}</h2>
            <p className="text-white/70">Đây là sự khởi đầu của cuộc trò chuyện trực tiếp giữa bạn và <strong>{friend.display_name || friend.username}</strong>.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((msg, index) => {
              const showHeader = index === 0 || messages[index - 1].sender_id !== msg.sender_id || 
                new Date(msg.created_at) - new Date(messages[index - 1].created_at) > 5 * 60 * 1000;
              
              return (
                <div key={msg.id || index} className={`group flex gap-4 ${!showHeader ? 'mt-1' : ''}`}>
                  {showHeader ? (
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0 overflow-hidden mt-0.5 shadow-sm">
                      {msg.avatar_url ? (
                        <img src={msg.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-6 h-6 text-white/70" />
                      )}
                    </div>
                  ) : (
                    <div className="w-10 h-10 shrink-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] text-white/50">
                        {format(new Date(msg.created_at), 'HH:mm')}
                      </span>
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    {showHeader && (
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="font-bold text-white hover:underline cursor-pointer drop-shadow-sm">
                          {msg.display_name || msg.username || (msg.sender_id === user.id ? (user.display_name || user.username) : (friend.display_name || friend.username))}
                        </span>
                        <span className="text-xs text-white/50">
                          {format(new Date(msg.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                        </span>
                      </div>
                    )}
                    <div className="text-white/90 whitespace-pre-wrap break-words leading-relaxed text-[15px]">
                      {msg.content}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 shrink-0">
        <form onSubmit={handleSend} className="glass-input rounded-xl flex items-center px-4 py-3 gap-2 shadow-lg">
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`Nhắn tin cho @${friend.username}`}
            className="flex-1 bg-transparent border-none text-white placeholder:text-white/40 focus:outline-none"
          />
          <button 
            type="submit" 
            disabled={!content.trim()}
            className="text-white/50 hover:text-white disabled:opacity-50 transition-colors p-2"
          >
            <Send className="w-5 h-5 drop-shadow-sm" />
          </button>
        </form>
      </div>
    </div>
  );
}
