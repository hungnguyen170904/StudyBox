import { useEffect, useRef, useState, useMemo } from 'react';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { FileText, Download, Reply, SmilePlus, ChevronDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'framer-motion';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDateLabel(dateStr) {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Hôm nay';
  if (date.toDateString() === yesterday.toDateString()) return 'Hôm qua';
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

// Generate a deterministic gradient from username
function avatarGradient(username = '') {
  const colors = [
    ['#8B5CF6','#6366F1'], ['#06B6D4','#0EA5E9'], ['#10B981','#059669'],
    ['#F59E0B','#EF4444'], ['#EC4899','#8B5CF6'], ['#F97316','#EAB308'],
  ];
  const idx = username.charCodeAt(0) % colors.length;
  const [a, b] = colors[idx];
  return `linear-gradient(135deg, ${a}, ${b})`;
}

// Avatar component: image or gradient initials
function Avatar({ url, username, size = 'w-9 h-9' }) {
  const [error, setError] = useState(false);
  const initial = (username || '?')[0].toUpperCase();

  if (url && !error) {
    return (
      <img
        src={url}
        alt={username}
        onError={() => setError(true)}
        className={`${size} rounded-full object-cover shadow-sm flex-shrink-0`}
      />
    );
  }
  return (
    <div
      className={`${size} rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm`}
      style={{ background: avatarGradient(username) }}
    >
      {initial}
    </div>
  );
}

// ── Emoji picker ──────────────────────────────────────────────────────────────
const EMOJIS = ['👍','❤️','😂','😮','😢','😡'];

// ── Main component ─────────────────────────────────────────────────────────────
export default function MessageList({ channelId, onReply }) {
  const {
    messages, fetchMessages, loadMoreMessages,
    hasMoreMessages, isLoadingMore, toggleReaction, typingUsers,
  } = useChatStore();
  const { user } = useAuthStore();

  const messagesEndRef  = useRef(null);
  const containerRef    = useRef(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(null); // msgId
  const [showScrollButton, setShowScrollButton] = useState(false);

  useEffect(() => {
    if (channelId) fetchMessages(channelId);
  }, [channelId, fetchMessages]);

  useEffect(() => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const nearBottom = scrollHeight - scrollTop - clientHeight < 200;
    if (nearBottom || messages.length <= 50) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      // Nếu có tin nhắn mới mà đang không ở dưới cùng, hiện nút
      setShowScrollButton(true);
    }
  }, [messages]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    
    // Nút cuộn xuống: Hiện nếu cách đáy > 300px
    setShowScrollButton(scrollHeight - scrollTop - clientHeight > 300);

    if (scrollTop === 0 && hasMoreMessages && !isLoadingMore) {
      const prev = scrollHeight;
      loadMoreMessages(channelId).then(() => {
        setTimeout(() => {
          if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight - prev;
          }
        }, 0);
      });
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const channelMessages = messages.filter(m => m.channel_id === channelId);

  // Unread divider: first message from someone else within last 10 min
  const unreadStartIndex = useMemo(() => {
    for (let i = channelMessages.length - 1; i >= 0; i--) {
      if (channelMessages[i].user_id !== user?.id) {
        const age = Date.now() - new Date(channelMessages[i].created_at).getTime();
        if (age < 10 * 60 * 1000 && i > 0) return i;
      }
    }
    return -1;
  }, [channelMessages, user?.id]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-4 py-3 custom-scrollbar relative"
    >
      {/* Load more indicator */}
      {isLoadingMore && (
        <div className="flex justify-center py-3">
          <div className="w-5 h-5 border-2 border-white/20 border-t-primary/70 rounded-full animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {channelMessages.length === 0 && !isLoadingMore && (
        <div className="h-full flex flex-col justify-center items-center text-white/40 select-none">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
            <span className="text-3xl">💬</span>
          </div>
          <p className="font-semibold text-white/70 mb-1">Bắt đầu cuộc trò chuyện!</p>
          <p className="text-sm">Hãy gửi tin nhắn đầu tiên trong kênh này.</p>
        </div>
      )}

      {channelMessages.map((msg, index) => {
        const isMine = msg.user_id === user?.id;

        // Group: same sender within 5 minutes => no avatar/header
        const prevMsg = channelMessages[index - 1];
        const showHeader = !prevMsg
          || prevMsg.user_id !== msg.user_id
          || new Date(msg.created_at) - new Date(prevMsg.created_at) > 300_000;

        const nextMsg = channelMessages[index + 1];
        const isLastInGroup = !nextMsg
          || nextMsg.user_id !== msg.user_id
          || new Date(nextMsg.created_at) - new Date(msg.created_at) > 300_000;

        const currentDate = new Date(msg.created_at).toDateString();
        const prevDate = prevMsg ? new Date(prevMsg.created_at).toDateString() : null;
        const showDayDivider = !prevMsg || currentDate !== prevDate;
        const showUnreadDivider = index === unreadStartIndex;

        // Bubble rounding based on grouping position
        const bubbleRound = isMine
          ? `rounded-2xl ${showHeader ? 'rounded-tr-md' : ''} ${isLastInGroup ? '' : 'rounded-br-md'}`
          : `rounded-2xl ${showHeader ? 'rounded-tl-md' : ''} ${isLastInGroup ? '' : 'rounded-bl-md'}`;

        return (
          <div key={msg.id || index}>
            {/* ── Day divider ── */}
            {showDayDivider && (
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-white/[0.07]" />
                <span className="text-[11px] font-semibold text-white/30 px-3 py-0.5 bg-white/5 rounded-full border border-white/[0.07]">
                  {formatDateLabel(msg.created_at)}
                </span>
                <div className="flex-1 h-px bg-white/[0.07]" />
              </div>
            )}

            {/* ── Unread divider ── */}
            {showUnreadDivider && (
              <div className="flex items-center gap-3 my-3">
                <div className="flex-1 h-px bg-rose-500/30" />
                <span className="text-[11px] font-semibold text-rose-400 px-3 py-0.5 bg-rose-500/10 rounded-full border border-rose-500/20">
                  Tin mới
                </span>
                <div className="flex-1 h-px bg-rose-500/30" />
              </div>
            )}

            {/* ── Message row ── */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className={`flex group relative ${showHeader ? 'mt-3' : 'mt-0.5'} ${isMine ? 'flex-row-reverse' : 'flex-row'}`}
              onMouseEnter={() => setHoveredId(msg.id)}
              onMouseLeave={() => { setHoveredId(null); setPickerOpen(null); }}
            >
              {/* Avatar column */}
              <div className={`w-10 flex-shrink-0 ${isMine ? 'ml-2' : 'mr-2'} flex flex-col items-center`}>
                {showHeader ? (
                  <Avatar url={msg.avatar_url} username={msg.username} size="w-9 h-9" />
                ) : (
                  <span className="w-9 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-white/30">
                    {formatTime(msg.created_at)}
                  </span>
                )}
              </div>

              {/* Message content column */}
              <div className={`flex-1 min-w-0 flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                {/* Name + timestamp header */}
                {showHeader && (
                  <div className={`flex items-baseline gap-2 mb-1 ${isMine ? 'flex-row-reverse' : ''}`}>
                    <span className="text-sm font-semibold text-white/90">
                      {msg.display_name || msg.username}
                    </span>
                    <span className="text-[11px] text-white/30">{formatTime(msg.created_at)}</span>
                  </div>
                )}

                {/* Reply preview */}
                {msg.reply_to && (
                  <div className={`text-xs text-white/40 mb-1 pl-2 border-l-2 border-white/20 max-w-[80%] truncate ${isMine ? 'text-right border-r-2 border-l-0 pr-2' : ''}`}>
                    ↩ {msg.reply_to.username}: {msg.reply_to.content?.slice(0, 60)}…
                  </div>
                )}

                {/* Bubble */}
                {msg.type === 'image' ? (
                  <img
                    src={msg.content}
                    alt="attachment"
                    className={`mt-0.5 max-w-[300px] max-h-[280px] rounded-xl object-contain bg-black/20 shadow border border-white/[0.07] ${isLastInGroup ? '' : ''}`}
                    loading="lazy"
                  />
                ) : msg.type === 'video' ? (
                  <video
                    src={msg.content}
                    controls
                    className="mt-0.5 max-w-[300px] max-h-[280px] rounded-xl bg-black/20 shadow border border-white/[0.07]"
                  />
                ) : msg.content?.startsWith('[FILE]:') ? (
                  <a
                    href={msg.content.split('|')[1]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`mt-0.5 flex items-center gap-3 p-3 rounded-xl border w-fit max-w-[260px] shadow-sm transition-all ${
                      isMine
                        ? 'bg-primary/20 hover:bg-primary/30 border-primary/25'
                        : 'bg-surface/70 hover:bg-surface border-white/10'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${isMine ? 'bg-primary/30' : 'bg-blue-500/20'}`}>
                      <FileText className={`w-4 h-4 ${isMine ? 'text-white' : 'text-blue-300'}`} />
                    </div>
                    <div className="flex flex-col overflow-hidden min-w-0">
                      <span className="text-sm font-medium text-white truncate">
                        {msg.content.substring(7).split('|')[0].trim()}
                      </span>
                      <span className="text-[11px] text-white/50 flex items-center gap-1 mt-0.5">
                        <Download className="w-3 h-3" /> Tải xuống
                      </span>
                    </div>
                  </a>
                ) : (
                  <div className={`msg-bubble mt-0.5 px-3.5 py-2 max-w-[75vw] md:max-w-[55ch] shadow-sm prose-chat ${bubbleRound} ${
                    isMine
                      ? 'bg-primary text-white'
                      : 'bg-[#1e2435] border border-white/[0.07] text-white/90'
                  }`}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                )}

                {/* Reactions */}
                {msg.reactions?.length > 0 && (
                  <div className={`flex flex-wrap gap-1 mt-1.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
                    {Object.entries(
                      msg.reactions.reduce((acc, r) => {
                        acc[r.emoji] = acc[r.emoji] || [];
                        acc[r.emoji].push(r.user_id);
                        return acc;
                      }, {})
                    ).map(([emoji, users]) => {
                      const isMyReaction = users.includes(user?.id);
                      return (
                        <button
                          key={emoji}
                          onClick={() => toggleReaction(msg.id, emoji)}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all ${
                            isMyReaction
                              ? 'bg-primary/20 border-primary/40 text-white shadow-[0_0_6px_rgba(139,92,246,0.25)]'
                              : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                          }`}
                        >
                          <span>{emoji}</span>
                          <span className="font-medium">{users.length}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── Hover action bar ── */}
              <AnimatePresence>
                {hoveredId === msg.id && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.85, y: 4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.85, y: 4 }}
                    transition={{ duration: 0.12 }}
                    className={`absolute ${isMine ? 'left-10 right-auto' : 'right-0 left-auto'} -top-9 flex items-center gap-0.5 bg-[#1c2030] border border-white/10 rounded-xl p-1.5 shadow-xl z-20`}
                  >
                    {/* Emoji quick reactions */}
                    {pickerOpen === msg.id ? (
                      EMOJIS.map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => { toggleReaction(msg.id, emoji); setPickerOpen(null); }}
                          className="text-base hover:scale-125 transition-transform px-1 py-0.5 rounded-lg hover:bg-white/10"
                        >
                          {emoji}
                        </button>
                      ))
                    ) : (
                      <button
                        onClick={() => setPickerOpen(msg.id)}
                        className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all"
                        title="Thả cảm xúc"
                      >
                        <SmilePlus className="w-4 h-4" />
                      </button>
                    )}

                    <div className="w-px h-4 bg-white/10 mx-0.5" />

                    {/* Reply */}
                    <button
                      onClick={() => onReply?.(msg)}
                      className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all"
                      title="Trả lời"
                    >
                      <Reply className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        );
      })}

      {/* Typing indicator */}
      <AnimatePresence>
        {typingUsers[channelId]?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="flex items-center gap-2 text-white/40 text-xs px-2 mt-2"
          >
            <div className="flex gap-1 items-center">
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.12}s` }}
                />
              ))}
            </div>
            <span>
              {typingUsers[channelId].length === 1
                ? `${typingUsers[channelId][0]} đang gõ...`
                : `${typingUsers[channelId].join(', ')} đang gõ...`}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nút cuộn xuống */}
      <AnimatePresence>
        {showScrollButton && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            className="sticky bottom-2 float-right mr-2 z-50 pointer-events-none flex justify-end"
          >
            <button
              onClick={scrollToBottom}
              className="pointer-events-auto bg-primary/90 hover:bg-primary text-white rounded-full p-2.5 shadow-[0_0_20px_rgba(139,92,246,0.6)] transition-all flex items-center justify-center border border-white/20 backdrop-blur-md animate-bounce"
              title="Cuộn xuống dưới"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={messagesEndRef} className="h-2" />
    </div>
  );
}
