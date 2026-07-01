import { create } from 'zustand';
import { io } from 'socket.io-client';
import { fetchApi } from '../lib/api';

const SOCKET_URL = 'http://localhost:5000';
let socket = null;

export const useChatStore = create((set, get) => ({
  messages: [],
  isConnected: false,
  getSocket: () => socket,

  initSocket: () => {
    const token = localStorage.getItem('studybox_token');
    if (!token) return;

    if (!socket) {
      socket = io(SOCKET_URL, {
        auth: { token }
      });

      socket.on('connect', () => {
        set({ isConnected: true });
      });

      socket.on('disconnect', () => {
        set({ isConnected: false });
      });

      socket.on('chat:new', (message) => {
        set((state) => ({ messages: [...state.messages, message] }));
      });

      socket.on('dm:receive', async (message) => {
        // Tránh vòng lặp import bằng cách dùng dynamic import trong ESM
        const { useDmStore } = await import('./dmStore');
        useDmStore.getState().addMessage(message);
      });
    }
  },

  disconnectSocket: () => {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
    set({ isConnected: false });
  },

  joinChannel: (channelId) => {
    if (socket) {
      socket.emit('join_channel', channelId);
    }
  },

  leaveChannel: (channelId) => {
    if (socket) {
      socket.emit('leave_channel', channelId);
    }
  },

  fetchMessages: async (channelId) => {
    try {
      const data = await fetchApi(`/channels/${channelId}/messages`);
      set({ messages: data.messages });
    } catch (error) {
      console.error(error);
    }
  },

  sendMessage: (channelId, content, type = 'text') => {
    if (socket) {
      socket.emit('chat:send', { channel_id: channelId, content, type });
    }
  }
}));
