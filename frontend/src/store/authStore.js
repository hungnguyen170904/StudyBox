import { create } from 'zustand';
import { fetchApi } from '../lib/api';

export const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true, // ban đầu để true để chờ load từ localStorage

  login: async (email, password) => {
    try {
      const data = await fetchApi('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem('studybox_token', data.token);
      set({ user: data.user, isAuthenticated: true });
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  },

  register: async (username, email, password) => {
    try {
      const data = await fetchApi('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, email, password }),
      });
      localStorage.setItem('studybox_token', data.token);
      set({ user: data.user, isAuthenticated: true });
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  },

  logout: () => {
    localStorage.removeItem('studybox_token');
    set({ user: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('studybox_token');
    if (!token) {
      set({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }

    try {
      const data = await fetchApi('/auth/me');
      set({ user: data.user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      localStorage.removeItem('studybox_token');
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  updateProfile: async (formData) => {
    try {
      const data = await fetchApi('/auth/profile', {
        method: 'PUT',
        body: formData,
      });
      // Cập nhật state với thông tin user mới
      set({ user: data.user });
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  },
}));
