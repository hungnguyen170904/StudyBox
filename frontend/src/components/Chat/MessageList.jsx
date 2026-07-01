import { useEffect, useRef } from 'react';
import { useChatStore } from '../../store/chatStore';

export default function MessageList({ channelId }) {
  const { messages, fetchMessages } = useChatStore();
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (channelId) {
      fetchMessages(channelId);
    }
  }, [channelId, fetchMessages]);

  useEffect(() => {
    // Tự động cuộn xuống dưới cùng khi có tin nhắn mới
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Nhóm các tin nhắn theo channelId để hiển thị đúng
  const channelMessages = messages.filter(m => m.channel_id === channelId);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
      {channelMessages.length === 0 ? (
        <div className="h-full flex flex-col justify-center items-center text-white/50">
          <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-4 shadow-sm border border-white/10">
            <span className="text-3xl drop-shadow-sm">👋</span>
          </div>
          <p className="font-bold text-white text-lg drop-shadow-sm mb-1">Chào mừng đến với kênh này!</p>
          <p className="text-sm">Hãy là người đầu tiên gửi tin nhắn.</p>
        </div>
      ) : (
        channelMessages.map((msg, index) => {
          const showHeader = index === 0 || channelMessages[index - 1].user_id !== msg.user_id || 
            (new Date(msg.created_at).getTime() - new Date(channelMessages[index - 1].created_at).getTime() > 300000); // Cách 5 phút thì hiện lại tên

          return (
            <div key={msg.id || index} className={`flex group ${showHeader ? 'mt-4' : 'mt-1'}`}>
              <div className="flex-shrink-0 mr-4 w-10">
                {showHeader ? (
                  <img 
                    src={msg.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${msg.username}`} 
                    alt="avatar" 
                    className="w-10 h-10 rounded-full bg-white/20 hover:cursor-pointer shadow-sm"
                  />
                ) : (
                  <div className="w-10 h-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] text-white/40">
                      {new Date(msg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                {showHeader && (
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-bold text-white hover:underline cursor-pointer drop-shadow-sm">{msg.display_name || msg.username}</span>
                    <span className="text-xs text-white/40">
                      {new Date(msg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
                <div className="text-white/90 break-words leading-relaxed text-[15px]">
                  {msg.content}
                </div>
              </div>
            </div>
          );
        })
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}
