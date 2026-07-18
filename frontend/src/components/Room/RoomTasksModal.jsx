import { useEffect, useState } from 'react';
import { useTaskStore } from '../../../store/taskStore';
import { useChatStore } from '../../../store/chatStore';
import { useAuthStore } from '../../../store/authStore';
import { X, Check, Trash2, Plus, ListTodo } from 'lucide-react';

export default function RoomTasksModal({ isOpen, onClose, roomId }) {
  const { tasks, isLoading, fetchTasks, createTask, toggleTask, deleteTask, addTask, updateTask, removeTask } = useTaskStore();
  const { getSocket } = useChatStore();
  const { user } = useAuthStore();
  const [content, setContent] = useState('');

  useEffect(() => {
    if (isOpen && roomId) {
      fetchTasks(roomId);
    }
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
    createTask(roomId, content.trim());
    setContent('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface/90 backdrop-blur-xl border border-white/10 w-full max-w-md rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.3)] flex flex-col max-h-[80vh] overflow-hidden">
        
        <div className="p-4 border-b border-white/10 flex justify-between items-center shrink-0">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ListTodo className="w-6 h-6 text-blue-400" />
            Nhiệm vụ chung
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {isLoading ? (
            <div className="text-center text-white/50 py-4">Đang tải...</div>
          ) : tasks.length === 0 ? (
            <div className="text-center text-white/40 py-8">
              Chưa có nhiệm vụ nào. <br/> Hãy thêm công việc mới để nhóm cùng làm nhé!
            </div>
          ) : (
            <ul className="space-y-2">
              {tasks.map(task => (
                <li key={task.id} className="flex items-center gap-3 bg-white/5 border border-white/10 p-3 rounded-xl group hover:bg-white/10 transition-colors">
                  <button 
                    onClick={() => toggleTask(task.id)}
                    className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                      task.is_completed ? 'bg-green-500 border-green-500 text-white' : 'border-white/30 text-transparent hover:border-green-400'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <div className={`flex-1 overflow-hidden transition-opacity ${task.is_completed ? 'opacity-50 line-through' : ''}`}>
                    <p className="text-sm text-white font-medium truncate">{task.content}</p>
                    <p className="text-xs text-white/40 truncate">
                      Tạo bởi {task.display_name || task.username}
                    </p>
                  </div>
                  {/* Chỉ người tạo hoặc chủ phòng mới đc xóa (giả lập đơn giản: ai cũng xóa đc, hoặc bạn tự check role) */}
                  <button 
                    onClick={() => deleteTask(task.id)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-white/40 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all shrink-0"
                    title="Xoá nhiệm vụ"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="p-4 border-t border-white/10 bg-black/20 shrink-0">
          <form onSubmit={handleCreate} className="flex gap-2">
            <input 
              type="text" 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Thêm nhiệm vụ mới..." 
              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 transition-colors"
            />
            <button 
              type="submit"
              disabled={!content.trim()}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Thêm
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
