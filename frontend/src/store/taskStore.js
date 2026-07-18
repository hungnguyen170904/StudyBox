import { create } from 'zustand';
import { fetchApi } from '../utils/api';

export const useTaskStore = create((set, get) => ({
  tasks: [],
  isLoading: false,

  fetchTasks: async (roomId) => {
    set({ isLoading: true });
    try {
      const data = await fetchApi(`/rooms/${roomId}/tasks`);
      set({ tasks: data.tasks || [] });
    } catch (error) {
      console.error('Lỗi lấy danh sách task:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  createTask: async (roomId, content) => {
    try {
      await fetchApi(`/rooms/${roomId}/tasks`, {
        method: 'POST',
        body: JSON.stringify({ content })
      });
      // Component RoomTasks sẽ lắng nghe sự kiện 'task:new' qua Socket để update UI
    } catch (error) {
      console.error('Lỗi tạo task:', error);
    }
  },

  toggleTask: async (taskId) => {
    try {
      await fetchApi(`/rooms/tasks/${taskId}`, { method: 'PUT' });
      // Socket 'task:update' sẽ lo cập nhật
    } catch (error) {
      console.error('Lỗi cập nhật task:', error);
    }
  },

  deleteTask: async (taskId) => {
    try {
      await fetchApi(`/rooms/tasks/${taskId}`, { method: 'DELETE' });
      // Socket 'task:delete' sẽ lo xoá
    } catch (error) {
      console.error('Lỗi xoá task:', error);
    }
  },

  // Xử lý sự kiện Socket
  addTask: (task) => set((state) => ({ tasks: [task, ...state.tasks] })),
  
  updateTask: (updatedTask) => set((state) => ({
    tasks: state.tasks.map(t => t.id === updatedTask.id ? { ...t, ...updatedTask } : t)
  })),
  
  removeTask: (taskId) => set((state) => ({
    tasks: state.tasks.filter(t => t.id !== taskId)
  }))
}));
