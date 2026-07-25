import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Hash, CheckSquare, MessageSquare, X, Loader2, ArrowRight, Flag, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchApi } from '../../lib/api';

// Hiển thị badge priority cho task
const PRIORITY_COLOR = { high: 'text-red-400', medium: 'text-yellow-400', low: 'text-green-400' };

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function SearchDialog({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const debouncedQuery = useDebounce(query, 300);

  // Focus input khi mở
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults(null);
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Tìm kiếm khi query thay đổi
  useEffect(() => {
    if (debouncedQuery.trim().length < 2) {
      setResults(null);
      return;
    }
    const search = async () => {
      setIsLoading(true);
      try {
        const data = await fetchApi(`/search?q=${encodeURIComponent(debouncedQuery)}`);
        setResults(data.results);
        setSelectedIdx(0);
      } catch (err) {
        console.error('Lỗi tìm kiếm:', err);
      } finally {
        setIsLoading(false);
      }
    };
    search();
  }, [debouncedQuery]);

  // Tổng hợp all items để điều hướng bàn phím
  const allItems = results
    ? [
        ...(results.rooms || []).map(r => ({ type: 'room', data: r })),
        ...(results.tasks || []).map(t => ({ type: 'task', data: t })),
        ...(results.messages || []).map(m => ({ type: 'message', data: m })),
      ]
    : [];

  const handleSelect = useCallback((item) => {
    onClose();
    if (item.type === 'room') {
      navigate(`/room/${item.data.id}`);
    } else if (item.type === 'task') {
      navigate(`/room/${item.data.room_id}`);
    } else if (item.type === 'message') {
      navigate(`/room/${item.data.room_id}`);
    }
  }, [navigate, onClose]);

  // Điều hướng bàn phím
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, allItems.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && allItems[selectedIdx]) { handleSelect(allItems[selectedIdx]); }
  };

  const hasResults = results && (
    (results.rooms?.length || 0) + (results.tasks?.length || 0) + (results.messages?.length || 0) > 0
  );

  if (!isOpen) return null;

  // Đếm offset index cho điều hướng
  const roomCount = results?.rooms?.length || 0;
  const taskCount = results?.tasks?.length || 0;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: -10 }}
        transition={{ duration: 0.15 }}
        className="w-full max-w-2xl bg-surface/95 backdrop-blur-xl border border-white/15 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
          {isLoading
            ? <Loader2 className="w-5 h-5 text-primary animate-spin shrink-0" />
            : <Search className="w-5 h-5 text-white/40 shrink-0" />
          }
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tìm kiếm tin nhắn, nhiệm vụ, phòng học..."
            className="flex-1 bg-transparent text-white placeholder-white/30 text-base focus:outline-none"
          />
          {query && (
            <button onClick={() => { setQuery(''); setResults(null); }} className="p-1 text-white/40 hover:text-white rounded transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Kết quả */}
        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
          {!query || query.trim().length < 2 ? (
            <div className="py-10 text-center text-white/30 text-sm">
              <Search className="w-10 h-10 mx-auto mb-3 opacity-20" />
              Nhập ít nhất 2 ký tự để tìm kiếm
            </div>
          ) : !hasResults && !isLoading ? (
            <div className="py-10 text-center text-white/30 text-sm">
              Không tìm thấy kết quả cho "<span className="text-white/60">{query}</span>"
            </div>
          ) : (
            <div className="p-2">
              {/* Phòng học */}
              {results?.rooms?.length > 0 && (
                <div className="mb-2">
                  <div className="px-3 py-1.5 text-xs font-bold text-white/30 uppercase tracking-wider">Phòng học</div>
                  {results.rooms.map((room, i) => {
                    const idx = i;
                    return (
                      <motion.button
                        key={room.id}
                        onClick={() => handleSelect({ type: 'room', data: room })}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                          selectedIdx === idx ? 'bg-primary/20 border border-primary/30' : 'hover:bg-white/5'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                          <Hash className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white text-sm truncate">{room.name}</p>
                          <p className="text-xs text-white/40">{room.member_count} thành viên · {room.owner_name}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-white/20 shrink-0" />
                      </motion.button>
                    );
                  })}
                </div>
              )}

              {/* Nhiệm vụ */}
              {results?.tasks?.length > 0 && (
                <div className="mb-2">
                  <div className="px-3 py-1.5 text-xs font-bold text-white/30 uppercase tracking-wider">Nhiệm vụ</div>
                  {results.tasks.map((task, i) => {
                    const idx = roomCount + i;
                    const pc = PRIORITY_COLOR[task.priority] || PRIORITY_COLOR.medium;
                    return (
                      <motion.button
                        key={task.id}
                        onClick={() => handleSelect({ type: 'task', data: task })}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                          selectedIdx === idx ? 'bg-primary/20 border border-primary/30' : 'hover:bg-white/5'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center shrink-0">
                          <CheckSquare className="w-4 h-4 text-green-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium text-white text-sm truncate ${task.status === 'done' ? 'line-through opacity-50' : ''}`}>
                            {task.content}
                          </p>
                          <p className="text-xs text-white/40 flex items-center gap-1.5">
                            <Flag className={`w-3 h-3 ${pc}`} />
                            <span>{task.room_name}</span>
                            {task.deadline && (
                              <><Clock className="w-3 h-3" />{new Date(task.deadline).toLocaleDateString('vi-VN')}</>
                            )}
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-white/20 shrink-0" />
                      </motion.button>
                    );
                  })}
                </div>
              )}

              {/* Tin nhắn */}
              {results?.messages?.length > 0 && (
                <div className="mb-2">
                  <div className="px-3 py-1.5 text-xs font-bold text-white/30 uppercase tracking-wider">Tin nhắn</div>
                  {results.messages.map((msg, i) => {
                    const idx = roomCount + taskCount + i;
                    // Highlight từ khóa trong nội dung
                    const raw = msg.content || '';
                    const highlighted = raw.replace(
                      new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'),
                      '<mark class="bg-primary/30 text-white rounded px-0.5">$1</mark>'
                    );
                    return (
                      <motion.button
                        key={msg.id}
                        onClick={() => handleSelect({ type: 'message', data: msg })}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                          selectedIdx === idx ? 'bg-primary/20 border border-primary/30' : 'hover:bg-white/5'
                        }`}
                      >
                        <img
                          src={msg.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${msg.username}`}
                          className="w-8 h-8 rounded-full bg-white/10 shrink-0 object-cover"
                          alt=""
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className="font-semibold text-white text-sm">{msg.display_name || msg.username}</span>
                            <span className="text-[10px] text-white/30">{msg.room_name} · #{msg.channel_name}</span>
                          </div>
                          <p
                            className="text-xs text-white/50 truncate"
                            dangerouslySetInnerHTML={{ __html: highlighted }}
                          />
                        </div>
                        <ArrowRight className="w-4 h-4 text-white/20 shrink-0" />
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-5 py-2.5 border-t border-white/10 flex items-center gap-4 text-[11px] text-white/25">
          <span><kbd className="bg-white/10 px-1.5 py-0.5 rounded font-mono">↑↓</kbd> Di chuyển</span>
          <span><kbd className="bg-white/10 px-1.5 py-0.5 rounded font-mono">Enter</kbd> Chọn</span>
          <span><kbd className="bg-white/10 px-1.5 py-0.5 rounded font-mono">Esc</kbd> Đóng</span>
          <span className="ml-auto">Ctrl+K</span>
        </div>
      </motion.div>
    </div>
  );
}
