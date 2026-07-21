import { create } from 'zustand';
import { io } from 'socket.io-client';
import { fetchApi } from '../lib/api';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
let socket = null;

export const useChatStore = create((set, get) => ({
  messages: [],
  onlineUsers: [],
  typingUsers: {}, // { channelId: [username1, username2] }
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

      socket.on('user_status_change', ({ userId, isOnline, custom_status }) => {
        set((state) => {
          let newOnlineUsers = state.onlineUsers;
          if (isOnline !== undefined) {
            if (isOnline) {
              newOnlineUsers = [...new Set([...state.onlineUsers, userId])];
            } else {
              newOnlineUsers = state.onlineUsers.filter(id => id !== userId);
            }
          }
          return { onlineUsers: newOnlineUsers };
        });

        // Cập nhật custom_status cho roomStore nếu user này nằm trong phòng
        if (custom_status !== undefined) {
          const { currentRoom, updateMemberStatus } = require('./roomStore').useRoomStore.getState();
          if (currentRoom) {
            updateMemberStatus(userId, custom_status);
          }
        }
      });

      socket.on('disconnect', () => {
        set({ isConnected: false });
      });

      socket.on('chat:new', (message) => {
        set((state) => ({ messages: [...state.messages, message] }));
        
        // Phát âm thanh nếu tin nhắn không phải của mình
        import('./authStore').then(({ useAuthStore }) => {
          const currentUser = useAuthStore.getState().user;
          if (currentUser && message.user_id !== currentUser.id) {
            const audio = new Audio('/sounds/ting.ogg');
            audio.volume = 0.5;
            audio.play().catch(err => console.log('Autoplay prevented:', err));
          }
        });
      });

      socket.on('dm:receive', async (message) => {
        // Tránh vòng lặp import bằng cách dùng dynamic import trong ESM
        const { useDmStore } = await import('./dmStore');
        useDmStore.getState().addMessage(message);

        // Phát âm thanh
        const audio = new Audio('/sounds/ting.ogg');
        audio.volume = 0.5;
        audio.play().catch(err => console.log('Autoplay prevented:', err));
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

      socket.on('chat:typing', ({ channelId, username }) => {
        set((state) => {
          const currentTyping = state.typingUsers[channelId] || [];
          if (!currentTyping.includes(username)) {
            return {
              typingUsers: {
                ...state.typingUsers,
                [channelId]: [...currentTyping, username]
              }
            };
          }
          return state;
        });
      });

      socket.on('chat:stop_typing', ({ channelId, username }) => {
        set((state) => {
          const currentTyping = state.typingUsers[channelId] || [];
          return {
            typingUsers: {
              ...state.typingUsers,
              [channelId]: currentTyping.filter(u => u !== username)
            }
          };
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
      socket.emit('chat:stop_typing', channelId);
    }
  },

  sendTyping: (channelId) => {
    if (socket) {
      socket.emit('chat:typing', channelId);
    }
  },

  sendStopTyping: (channelId) => {
    if (socket) {
      socket.emit('chat:stop_typing', channelId);
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
  },

  uploadFile: async (channelId, file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const token = localStorage.getItem('studybox_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/channels/${channelId}/messages/file`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Lỗi upload file:', error);
      throw error;
    }
  }
}));
