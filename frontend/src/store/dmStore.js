import { create } from 'zustand';
import { fetchApi } from '../lib/api';
import { useChatStore } from './chatStore';

export const useDmStore = create((set, get) => ({
  messages: [], // mảng lưu tin nhắn 1-1 với người hiện tại
  activeFriendId: null, // Đang chat với ai
  isLoading: false,

  setActiveFriend: (friendId) => {
    set({ activeFriendId: friendId, messages: [] });
    if (friendId) {
      get().fetchMessages(friendId);
    }
  },

  fetchMessages: async (friendId) => {
    set({ isLoading: true });
    try {
      const data = await fetchApi(`/dm/${friendId}`);
      set({ messages: data.messages, isLoading: false });
    } catch (error) {
      console.error(error);
      set({ isLoading: false });
    }
  },

  addMessage: (msg) => {
    // Chỉ thêm nếu tin nhắn đó thuộc về đoạn hội thoại hiện tại
    const currentFriendId = get().activeFriendId;
    // Kiểm tra nếu người gửi hoặc nhận chính là activeFriend
    if (msg.sender_id === currentFriendId || msg.receiver_id === currentFriendId) {
      set(state => ({
        messages: [...state.messages, msg]
      }));
    }
  },

  sendMessage: (content) => {
    const friendId = get().activeFriendId;
    if (!friendId || !content.trim()) return;

    const socket = useChatStore.getState().getSocket();
    if (socket) {
      socket.emit('dm:send', {
        toUserId: friendId,
        content
      });
    }
  }
}));
