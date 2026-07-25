import { create } from 'zustand';
import { fetchApi } from '../lib/api';

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

  createTask: async (roomId, content, extra = {}) => {
    try {
      await fetchApi(`/rooms/${roomId}/tasks`, {
        method: 'POST',
        body: JSON.stringify({ content, ...extra })
      });
      // Socket 'task:new' sẽ update UI
    } catch (error) {
      console.error('Lỗi tạo task:', error);
    }
  },

  toggleTask: async (taskId) => {
    try {
      await fetchApi(`/rooms/tasks/${taskId}`, { method: 'PUT' });
    } catch (error) {
      console.error('Lỗi cập nhật task:', error);
    }
  },

  // Cập nhật chi tiết task (status, priority, deadline, assigned_to)
  patchTask: async (taskId, fields) => {
    try {
      await fetchApi(`/rooms/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify(fields)
      });
      // Socket 'task:update' sẽ cập nhật UI
    } catch (error) {
      console.error('Lỗi patch task:', error);
    }
  },

  deleteTask: async (taskId) => {
    try {
      await fetchApi(`/rooms/tasks/${taskId}`, { method: 'DELETE' });
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
