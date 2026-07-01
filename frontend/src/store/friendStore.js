import { create } from 'zustand';
import { fetchApi } from '../lib/api';

export const useFriendStore = create((set) => ({
  friends: [],
  pending: [],
  sent: [],
  isLoading: false,

  fetchFriends: async () => {
    set({ isLoading: true });
    try {
      const data = await fetchApi('/friends');
      set({
        friends: data.friends,
        pending: data.pending,
        sent: data.sent,
        isLoading: false
      });
    } catch (error) {
      console.error(error);
      set({ isLoading: false });
    }
  },

  sendRequest: async (username) => {
    try {
      await fetchApi('/friends/request', {
        method: 'POST',
        body: JSON.stringify({ username })
      });
      // Tải lại danh sách sau khi gửi
      useFriendStore.getState().fetchFriends();
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  },

  respondRequest: async (friendId, action) => {
    try {
      await fetchApi('/friends/accept', {
        method: 'PUT',
        body: JSON.stringify({ friendId, action })
      });
      useFriendStore.getState().fetchFriends();
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }
}));
