import { useEffect, useRef, useState } from 'react';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { Smile, FileText, Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion } from 'framer-motion';

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
          const isMine = msg.user_id === user?.id;
          const showHeader = index === 0 || channelMessages[index - 1].user_id !== msg.user_id || 
            (new Date(msg.created_at).getTime() - new Date(channelMessages[index - 1].created_at).getTime() > 300000);

          return (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              key={msg.id || index} 
              className={`flex group ${showHeader ? 'mt-4' : 'mt-1'} relative ${isMine ? 'flex-row-reverse' : ''}`}
              onMouseEnter={() => setHoveredMessageId(msg.id)}
              onMouseLeave={() => setHoveredMessageId(null)}
            >
              {/* Emoji Picker Menu */}
              {hoveredMessageId === msg.id && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`absolute ${isMine ? 'left-14' : 'right-4'} -top-4 bg-surfaceLight/90 backdrop-blur-md border border-white/10 p-1.5 rounded-xl shadow-lg flex gap-1 z-10`}
                >
                  {EMOJIS.map(emoji => (
                    <button 
                      key={emoji}
                      onClick={() => toggleReaction(msg.id, emoji)}
                      className="hover:scale-125 hover:bg-white/10 p-1 rounded-lg transition-transform"
                    >
                      {emoji}
                    </button>
                  ))}
                </motion.div>
              )}

              <div className={`flex-shrink-0 w-10 ${isMine ? 'ml-3' : 'mr-3'}`}>
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
              <div className={`flex-1 min-w-0 flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                {showHeader && (
                  <div className={`flex items-baseline gap-2 mb-1 ${isMine ? 'flex-row-reverse' : ''}`}>
                    <span className="font-bold text-white hover:underline cursor-pointer drop-shadow-sm">{msg.display_name || msg.username}</span>
                    <span className="text-xs text-white/40">
                      {new Date(msg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
                
                {msg.type === 'image' ? (
                  <div className="mt-1">
                    <img src={msg.content} alt="attachment" className="max-w-[300px] max-h-[300px] rounded-lg object-contain bg-black/20 shadow-md border border-white/5" loading="lazy" />
                  </div>
                ) : msg.type === 'video' ? (
                  <div className="mt-1">
                    <video src={msg.content} controls className="max-w-[300px] max-h-[300px] rounded-lg bg-black/20 shadow-md border border-white/5" />
                  </div>
                ) : msg.content.startsWith('[FILE]:') ? (
                  <div className="mt-1 mb-1">
                    <a 
                      href={msg.content.split('|')[1]} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={`flex items-center gap-3 transition-colors p-3 rounded-xl border w-fit max-w-[250px] group/file shadow-sm ${isMine ? 'bg-primary/20 hover:bg-primary/30 border-primary/30' : 'bg-surface/60 hover:bg-surface border-white/10'}`}
                    >
                      <div className={`p-2 rounded-lg transition-colors ${isMine ? 'bg-primary/30 text-white' : 'bg-blue-500/20 text-blue-300'}`}>
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col overflow-hidden min-w-0">
                        <span className="text-sm font-medium text-white truncate">{msg.content.substring(7).split('|')[0].trim()}</span>
                        <span className="text-xs text-white/60 flex items-center gap-1 mt-0.5"><Download className="w-3 h-3" /> Tải xuống</span>
                      </div>
                    </a>
                  </div>
                ) : (
                  <div className={`text-white/90 break-words leading-relaxed text-[15px] rounded-2xl px-4 py-2 mt-1 inline-block w-fit max-w-[85%] overflow-hidden shadow-sm ${
                    isMine 
                      ? 'bg-primary text-white rounded-tr-none' 
                      : 'bg-surfaceLight/50 border border-white/5 rounded-tl-none'
                  } prose prose-invert prose-p:my-1 prose-pre:bg-black/40 prose-pre:border prose-pre:border-white/10 prose-pre:p-3 prose-pre:rounded-xl prose-a:text-blue-400`}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                )}
                
                {/* Hiển thị Reactions */}
                {msg.reactions && msg.reactions.length > 0 && (
                  <div className={`flex flex-wrap gap-1.5 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
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
                          className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border transition-all ${
                            isMyReaction ? 'bg-primary/20 border-primary/50 text-white shadow-[0_0_8px_rgba(139,92,246,0.2)]' : 'bg-surface/50 border-white/10 text-white/70 hover:bg-surface'
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
            </motion.div>
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
