import { create } from 'zustand';
import { io } from 'socket.io-client';
import { fetchApi } from '../lib/api';

const SOCKET_URL = 'http://localhost:5000';
let socket = null;

export const useChatStore = create((set, get) => ({
  messages: [],
  onlineUsers: [],
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
        socket.emit('get_online_users');
      });

      socket.on('online_users_list', (users) => {
        set({ onlineUsers: users });
      });

      socket.on('user_status_change', ({ userId, isOnline }) => {
        set((state) => {
          if (isOnline) {
            return { onlineUsers: [...new Set([...state.onlineUsers, userId])] };
          } else {
            return { onlineUsers: state.onlineUsers.filter(id => id !== userId) };
          }
        });
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

      socket.on('message_reaction_update', (data) => {
        set((state) => {
          const newMessages = state.messages.map(msg => {
            if (msg.id === data.messageId) {
              let currentReactions = msg.reactions || [];
              if (data.isAdded) {
                currentReactions = [...currentReactions, { emoji: data.emoji, user_id: data.userId }];
              } else {
                currentReactions = currentReactions.filter(r => !(r.emoji === data.emoji && r.user_id === data.userId));
              }
              return { ...msg, reactions: currentReactions };
            }
            return msg;
          });
          return { messages: newMessages };
        });
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

  hasMoreMessages: true,
  isLoadingMore: false,

  fetchMessages: async (channelId) => {
    try {
      const data = await fetchApi(`/channels/${channelId}/messages`);
      set({ 
        messages: data.messages, 
        hasMoreMessages: data.messages.length === 50 // Giả định limit=50
      });
    } catch (error) {
      console.error(error);
    }
  },

  loadMoreMessages: async (channelId) => {
    const state = get();
    if (state.isLoadingMore || !state.hasMoreMessages || state.messages.length === 0) return;

    set({ isLoadingMore: true });
    try {
      // Lấy created_at của tin nhắn cũ nhất làm cursor
      const cursor = state.messages[0].created_at;
      const data = await fetchApi(`/channels/${channelId}/messages?cursor=${encodeURIComponent(cursor)}`);
      
      if (data.messages.length > 0) {
        set({ 
          messages: [...data.messages, ...state.messages],
          hasMoreMessages: data.messages.length === 50
        });
      } else {
        set({ hasMoreMessages: false });
      }
    } catch (error) {
      console.error(error);
    } finally {
      set({ isLoadingMore: false });
    }
  },

  sendMessage: (channelId, content, type = 'text') => {
    if (socket) {
      socket.emit('chat:send', { channel_id: channelId, content, type });
    }
  },

  toggleReaction: async (messageId, emoji) => {
    try {
      await fetchApi(`/channels/messages/${messageId}/reactions`, {
        method: 'POST',
        body: JSON.stringify({ emoji })
      });
    } catch (error) {
      console.error(error);
    }
  }
}));
