import { create } from 'zustand';
import { fetchApi } from '../lib/api';

export const useRoomStore = create((set, get) => ({
  rooms: [],
  currentRoom: null,
  isLoading: false,

  fetchRooms: async (search = '') => {
    set({ isLoading: true });
    try {
      const url = search ? `/rooms?search=${encodeURIComponent(search)}` : '/rooms';
      const data = await fetchApi(url);
      set({ rooms: data.rooms, isLoading: false });
    } catch (error) {
      console.error(error);
      set({ isLoading: false });
    }
  },

  createRoom: async (name) => {
    try {
      const data = await fetchApi('/rooms', {
        method: 'POST',
        body: JSON.stringify({ name, is_public: true }),
      });
      // Thêm phòng mới vào đầu danh sách
      set((state) => ({ rooms: [data.room, ...state.rooms] }));
      return data.room;
    } catch (error) {
      console.error(error);
      return null;
    }
  },

  fetchRoomDetails: async (id) => {
    set({ isLoading: true });
    try {
      const data = await fetchApi(`/rooms/${id}`);
      set({ currentRoom: data, isLoading: false });
    } catch (error) {
      console.error(error);
      set({ isLoading: false, currentRoom: null });
    }
  },
  
  generateInviteCode: async (roomId) => {
    try {
      const data = await fetchApi(`/rooms/${roomId}/invite`, { method: 'POST' });
      // Cập nhật lại currentRoom
      set((state) => ({
        currentRoom: {
          ...state.currentRoom,
          room: { ...state.currentRoom.room, invite_code: data.invite_code }
        }
      }));
      return data.invite_code;
    } catch (error) {
      console.error(error);
      return null;
    }
  },

  getRoomByInviteCode: async (code) => {
    try {
      const data = await fetchApi(`/rooms/invite/${code}`);
      return data.room;
    } catch (error) {
      console.error(error);
      return null;
    }
  },

  joinRoomByInvite: async (code) => {
    try {
      const data = await fetchApi(`/rooms/join/${code}`, { method: 'POST' });
      return data.roomId;
    } catch (error) {
      console.error(error);
      return null;
    }
  },

  kickMember: async (roomId, userId) => {
    try {
      await fetchApi(`/rooms/${roomId}/members/${userId}`, { method: 'DELETE' });
      // Xóa khỏi danh sách members trên store
      set((state) => ({
        currentRoom: {
          ...state.currentRoom,
          members: state.currentRoom.members.filter(m => m.id !== userId)
        }
      }));
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  },

  leaveRoom: async (roomId) => {
    try {
      await fetchApi(`/rooms/${roomId}/leave`, { method: 'DELETE' });
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  },

  changeMemberRole: async (roomId, userId, role) => {
    try {
      await fetchApi(`/rooms/${roomId}/members/${userId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role })
      });
      // Cập nhật lại danh sách members trên store
      set((state) => ({
        currentRoom: {
          ...state.currentRoom,
          members: state.currentRoom.members.map(m => 
            m.id === userId ? { ...m, role } : m
          )
        }
      }));
      return true;
    } catch (error) {
      console.error('Lỗi khi đổi role:', error);
      return false;
    }
  },

  updateRoomSettings: async (roomId, data) => {
    try {
      const res = await fetchApi(`/rooms/${roomId}/settings`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      set((state) => ({
        currentRoom: state.currentRoom ? {
          ...state.currentRoom,
          room: { ...state.currentRoom.room, ...res.room }
        } : null
      }));
      return true;
    } catch (error) {
      console.error('Lỗi khi cập nhật cài đặt:', error);
      return false;
    }
  },

  deleteRoom: async (roomId) => {
    try {
      await fetchApi(`/rooms/${roomId}`, { method: 'DELETE' });
      set((state) => ({
        currentRoom: null,
        rooms: state.rooms.filter(r => r.id !== roomId)
      }));
      return true;
    } catch (error) {
      console.error('Lỗi khi xoá phòng:', error);
      return false;
    }
  },

  createChannel: async (roomId, name, type) => {
    try {
      const data = await fetchApi(`/rooms/${roomId}/channels`, {
        method: 'POST',
        body: JSON.stringify({ name, type })
      });
      set((state) => ({
        currentRoom: {
          ...state.currentRoom,
          channels: [...state.currentRoom.channels, data.channel]
        }
      }));
      return data.channel;
    } catch (error) {
      console.error('Lỗi tạo kênh:', error);
      return null;
    }
  },

  deleteChannel: async (roomId, channelId) => {
    try {
      await fetchApi(`/rooms/${roomId}/channels/${channelId}`, { method: 'DELETE' });
      set((state) => ({
        currentRoom: {
          ...state.currentRoom,
          channels: state.currentRoom.channels.filter(c => c.id !== channelId)
        }
      }));
      return true;
    } catch (error) {
      console.error('Lỗi xoá kênh:', error);
      return false;
    }
  },

  clearCurrentRoom: () => set({ currentRoom: null })
}));
