import { useEffect, useState } from 'react';
import { useTaskStore } from '../../store/taskStore';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { X, Check, Trash2, Plus, ListTodo, Flag, Clock, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Cấu hình các cột Kanban
const COLUMNS = [
  { id: 'todo',  label: 'Cần làm',    color: 'text-white/60',   dot: 'bg-white/40' },
  { id: 'doing', label: 'Đang làm',   color: 'text-blue-400',   dot: 'bg-blue-400' },
  { id: 'done',  label: 'Hoàn thành', color: 'text-green-400',  dot: 'bg-green-400' },
];

// Badge màu theo priority
const PRIORITY_CONFIG = {
  high:   { label: 'Cao',    cls: 'bg-red-500/20 text-red-400 border-red-500/30' },
  medium: { label: 'Vừa',   cls: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  low:    { label: 'Thấp',   cls: 'bg-green-500/20 text-green-400 border-green-500/30' },
};

function DeadlineBadge({ deadline }) {
  if (!deadline) return null;
  const d = new Date(deadline);
  const now = new Date();
  const diffDays = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
  const isOverdue = diffDays < 0;
  const isToday = diffDays === 0;
  const isSoon = diffDays <= 2 && diffDays >= 0;

  const cls = isOverdue
    ? 'bg-red-500/20 text-red-400 border-red-500/30'
    : isToday
    ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    : isSoon
    ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    : 'bg-white/10 text-white/50 border-white/10';

  const label = isOverdue
    ? `Quá hạn ${Math.abs(diffDays)}n`
    : isToday
    ? 'Hôm nay'
    : `${diffDays}n nữa`;

  return (
    <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${cls}`}>
      <Clock className="w-2.5 h-2.5" />
      {label}
    </span>
  );
}

export default function RoomTasksModal({ isOpen, onClose, roomId }) {
  const { tasks, isLoading, fetchTasks, createTask, toggleTask, patchTask, deleteTask, addTask, updateTask, removeTask } = useTaskStore();
  const { getSocket } = useChatStore();
  const { user } = useAuthStore();
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState('medium');
  const [deadline, setDeadline] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (isOpen && roomId) fetchTasks(roomId);
  }, [isOpen, roomId, fetchTasks]);

  useEffect(() => {
    const socket = getSocket();
    if (socket && isOpen) {
      socket.on('task:new', addTask);
      socket.on('task:update', updateTask);
      socket.on('task:delete', (data) => removeTask(data.id));
      return () => {
        socket.off('task:new');
        socket.off('task:update');
        socket.off('task:delete');
      };
    }
  }, [isOpen, getSocket, addTask, updateTask, removeTask]);

  if (!isOpen) return null;

  const handleCreate = (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    createTask(roomId, content.trim(), {
      priority,
      deadline: deadline || undefined,
    });
    setContent('');
    setPriority('medium');
    setDeadline('');
    setShowForm(false);
  };

  // Phân chia task theo status
  const tasksByStatus = {
    todo:  tasks.filter(t => (t.status || (t.is_completed ? 'done' : 'todo')) === 'todo'),
    doing: tasks.filter(t => (t.status || 'todo') === 'doing'),
    done:  tasks.filter(t => (t.status || (t.is_completed ? 'done' : 'todo')) === 'done'),
  };

  // Di chuyển task sang cột tiếp theo
  const handleMoveNext = (task) => {
    const order = ['todo', 'doing', 'done'];
    const currentStatus = task.status || (task.is_completed ? 'done' : 'todo');
    const idx = order.indexOf(currentStatus);
    if (idx < order.length - 1) {
      patchTask(task.id, { status: order[idx + 1] });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
            className="bg-surface/90 backdrop-blur-xl border border-white/10 w-full max-w-3xl rounded-2xl shadow-[0_8px_40px_rgb(0,0,0,0.4)] flex flex-col max-h-[85vh] overflow-hidden z-10 relative"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex justify-between items-center shrink-0">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <ListTodo className="w-5 h-5 text-primary" />
                Nhiệm vụ chung
                <span className="text-sm font-normal text-textMuted ml-1">({tasks.length} việc)</span>
              </h2>
              <div className="flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowForm(!showForm)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/80 hover:bg-primary text-white rounded-lg text-sm font-semibold transition-all shadow-[0_0_12px_rgba(139,92,246,0.3)]"
                >
                  <Plus className="w-4 h-4" /> Thêm mới
                </motion.button>
                <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Form thêm task */}
            <AnimatePresence>
              {showForm && (
                <motion.form
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  onSubmit={handleCreate}
                  className="overflow-hidden border-b border-white/10 bg-black/20 shrink-0"
                >
                  <div className="p-4 flex flex-col gap-3">
                    <input
                      type="text"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Nhập nội dung nhiệm vụ..."
                      autoFocus
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary/50 transition-colors"
                    />
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Flag className="w-4 h-4 text-textMuted" />
                        <select
                          value={priority}
                          onChange={(e) => setPriority(e.target.value)}
                          className="bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors"
                        >
                          <option value="high">🔴 Cao</option>
                          <option value="medium">🟡 Vừa</option>
                          <option value="low">🟢 Thấp</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-textMuted" />
                        <input
                          type="date"
                          value={deadline}
                          onChange={(e) => setDeadline(e.target.value)}
                          className="bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors [color-scheme:dark]"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={!content.trim()}
                        className="ml-auto bg-primary hover:bg-primaryHover text-white px-4 py-1.5 rounded-lg text-sm font-bold transition-colors shadow-lg disabled:opacity-50"
                      >
                        Tạo nhiệm vụ
                      </button>
                    </div>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            {/* Kanban Board */}
            <div className="flex-1 overflow-auto p-4 custom-scrollbar">
              {isLoading ? (
                <div className="text-center text-white/50 py-12">Đang tải...</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 min-h-[300px]">
                  {COLUMNS.map(col => (
                    <div key={col.id} className="flex flex-col gap-2">
                      {/* Column Header */}
                      <div className="flex items-center gap-2 mb-1 px-1">
                        <div className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                        <span className={`text-sm font-bold ${col.color}`}>{col.label}</span>
                        <span className="ml-auto text-xs font-semibold bg-white/10 text-textMuted px-2 py-0.5 rounded-full">
                          {tasksByStatus[col.id].length}
                        </span>
                      </div>

                      {/* Task Cards */}
                      <div className="flex flex-col gap-2">
                        <AnimatePresence mode="popLayout">
                          {tasksByStatus[col.id].length === 0 ? (
                            <div className="text-center text-white/20 text-xs py-6 border border-dashed border-white/10 rounded-xl">
                              Trống
                            </div>
                          ) : (
                            tasksByStatus[col.id].map(task => {
                              const pc = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
                              return (
                                <motion.div
                                  key={task.id}
                                  layout
                                  initial={{ opacity: 0, y: 8 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.9 }}
                                  className="group bg-white/5 border border-white/10 p-3 rounded-xl hover:bg-white/8 hover:border-white/20 transition-all"
                                >
                                  <p className={`text-sm font-medium text-white mb-2 leading-snug ${col.id === 'done' ? 'line-through opacity-60' : ''}`}>
                                    {task.content}
                                  </p>

                                  {/* Meta row */}
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${pc.cls}`}>
                                      {pc.label}
                                    </span>
                                    <DeadlineBadge deadline={task.deadline} />
                                    {task.display_name && (
                                      <span className="text-[10px] text-white/40 ml-auto truncate max-w-[70px]">
                                        {task.display_name}
                                      </span>
                                    )}
                                  </div>

                                  {/* Actions */}
                                  <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {col.id !== 'done' && (
                                      <button
                                        onClick={() => handleMoveNext(task)}
                                        className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold bg-primary/20 hover:bg-primary/40 text-primary rounded-lg transition-colors"
                                        title="Chuyển sang bước tiếp"
                                      >
                                        <ChevronRight className="w-3 h-3" />
                                        {col.id === 'todo' ? 'Làm ngay' : 'Hoàn thành'}
                                      </button>
                                    )}
                                    {col.id === 'done' && (
                                      <button
                                        onClick={() => patchTask(task.id, { status: 'todo' })}
                                        className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold bg-white/10 hover:bg-white/20 text-white/60 rounded-lg transition-colors"
                                      >
                                        Hoàn tác
                                      </button>
                                    )}
                                    <button
                                      onClick={() => deleteTask(task.id)}
                                      className="ml-auto p-1 text-white/30 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </motion.div>
                              );
                            })
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
