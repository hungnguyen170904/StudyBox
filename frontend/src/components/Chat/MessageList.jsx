import { useEffect, useRef, useState } from 'react';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { Smile, FileText, Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function MessageList({ channelId }) {
  const { messages, fetchMessages, loadMoreMessages, hasMoreMessages, isLoadingMore, toggleReaction, typingUsers } = useChatStore();
  const { user } = useAuthStore();
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);
  const [hoveredMessageId, setHoveredMessageId] = useState(null);

  const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

  useEffect(() => {
    if (channelId) {
      fetchMessages(channelId);
    }
  }, [channelId, fetchMessages]);

  useEffect(() => {
    // Tự động cuộn xuống dưới cùng khi mới load hoặc có tin nhắn mới (ở dưới cùng)
    // Để tránh cuộn khi đang xem tin cũ, có thể thêm logic phức tạp hơn
    // Tạm thời chỉ cuộn khi scroll đang ở gần đáy
    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
      if (isNearBottom || messages.length <= 50) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [messages]);

  const handleScroll = () => {
    if (containerRef.current) {
      if (containerRef.current.scrollTop === 0 && hasMoreMessages && !isLoadingMore) {
        // Lưu lại vị trí scroll để giữ nguyên view sau khi load thêm
        const prevScrollHeight = containerRef.current.scrollHeight;
        
        loadMoreMessages(channelId).then(() => {
          setTimeout(() => {
            if (containerRef.current) {
              const currentScrollHeight = containerRef.current.scrollHeight;
              containerRef.current.scrollTop = currentScrollHeight - prevScrollHeight;
            }
          }, 0);
        });
      }
    }
  };

  // Nhóm các tin nhắn theo channelId để hiển thị đúng
  const channelMessages = messages.filter(m => m.channel_id === channelId);

  return (
    <div 
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar relative"
    >
      {isLoadingMore && (
        <div className="flex justify-center py-2 text-white/50">
          <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
        </div>
      )}
      
      {channelMessages.length === 0 && !isLoadingMore ? (
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
            <div 
              key={msg.id || index} 
              className={`flex group ${showHeader ? 'mt-4' : 'mt-1'} relative`}
              onMouseEnter={() => setHoveredMessageId(msg.id)}
              onMouseLeave={() => setHoveredMessageId(null)}
            >
              {/* Emoji Picker Menu */}
              {hoveredMessageId === msg.id && (
                <div className="absolute right-4 -top-4 bg-surfaceLight/90 backdrop-blur-md border border-white/10 p-1.5 rounded-xl shadow-lg flex gap-1 z-10 animate-fade-in">
                  {EMOJIS.map(emoji => (
                    <button 
                      key={emoji}
                      onClick={() => toggleReaction(msg.id, emoji)}
                      className="hover:scale-125 hover:bg-white/10 p-1 rounded-lg transition-transform"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

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
                
                {msg.type === 'image' ? (
                  <div className="mt-1">
                    <img src={msg.content} alt="attachment" className="max-w-[300px] max-h-[300px] rounded-lg object-contain bg-black/20" loading="lazy" />
                  </div>
                ) : msg.type === 'video' ? (
                  <div className="mt-1">
                    <video src={msg.content} controls className="max-w-[300px] max-h-[300px] rounded-lg bg-black/20" />
                  </div>
                ) : msg.content.startsWith('[FILE]:') ? (
                  <div className="mt-1 mb-1">
                    <a 
                      href={msg.content.split('|')[1]} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 bg-white/10 hover:bg-white/20 transition-colors p-3 rounded-xl border border-white/10 w-fit max-w-[250px] group/file"
                    >
                      <div className="bg-blue-500/20 p-2 rounded-lg text-blue-300 group-hover/file:bg-blue-500/30 transition-colors">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col overflow-hidden min-w-0">
                        <span className="text-sm font-medium text-white truncate">{msg.content.substring(7).split('|')[0].trim()}</span>
                        <span className="text-xs text-white/50 flex items-center gap-1 mt-0.5"><Download className="w-3 h-3" /> Tải xuống</span>
                      </div>
                    </a>
                  </div>
                ) : (
                  <div className="text-white/90 break-words leading-relaxed text-[15px] group-hover:bg-white/5 rounded-lg p-1 -ml-1 transition-colors inline-block w-fit max-w-full overflow-hidden prose prose-invert prose-p:my-1 prose-pre:bg-black/40 prose-pre:border prose-pre:border-white/10 prose-pre:p-3 prose-pre:rounded-xl prose-a:text-blue-400">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                )}
                
                {/* Hiển thị Reactions */}
                {msg.reactions && msg.reactions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {/* Nhóm reactions theo emoji */}
                    {Object.entries(msg.reactions.reduce((acc, r) => {
                      acc[r.emoji] = acc[r.emoji] || [];
                      acc[r.emoji].push(r.user_id);
                      return acc;
                    }, {})).map(([emoji, users]) => {
                      const isMyReaction = users.includes(user?.id);
                      return (
                        <button
                          key={emoji}
                          onClick={() => toggleReaction(msg.id, emoji)}
                          className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-medium border transition-colors ${
                            isMyReaction ? 'bg-blue-500/20 border-blue-500/30 text-blue-200' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                          }`}
                        >
                          <span>{emoji}</span>
                          <span>{users.length}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}
      
      {/* Typing Indicator */}
      {typingUsers[channelId] && typingUsers[channelId].length > 0 && (
        <div className="flex items-center gap-2 text-white/50 text-xs italic mt-2 animate-pulse">
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce"></span>
            <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
            <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
          </div>
          <span>
            {typingUsers[channelId].length === 1 
              ? `${typingUsers[channelId][0]} đang gõ...`
              : `${typingUsers[channelId].join(', ')} đang gõ...`}
          </span>
        </div>
      )}
      
      <div ref={messagesEndRef} />
    </div>
  );
}
