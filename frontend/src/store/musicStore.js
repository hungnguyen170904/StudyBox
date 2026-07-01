import { create } from 'zustand';

export const useMusicStore = create((set, get) => ({
  queue: [],
  playbackState: {
    url: null,
    isPlaying: false,
    currentTime: 0,
    loopMode: 'off', // 'off' | 'track' | 'queue'
    updatedAt: 0,
    updatedBy: ''
  },
  
  setQueue: (queue) => set({ queue }),
  setPlaybackState: (state) => set({ playbackState: state }),
  
  addTrack: (socket, channelId, url, title) => {
    if (socket) socket.emit('music:add', { channel_id: channelId, url, title });
  },

  removeTrack: (socket, channelId, trackId) => {
    if (socket) socket.emit('music:remove', { channel_id: channelId, trackId });
  },
  
  playTrack: (socket, channelId, url, currentTime) => {
    if (socket) socket.emit('music:play', { channel_id: channelId, url, currentTime });
  },

  pauseTrack: (socket, channelId, url, currentTime) => {
    if (socket) socket.emit('music:pause', { channel_id: channelId, url, currentTime });
  },

  nextTrack: (socket, channelId) => {
    if (socket) socket.emit('music:next', { channel_id: channelId });
  },

  trackEnded: (socket, channelId) => {
    if (socket) socket.emit('music:ended', { channel_id: channelId });
  },

  setLoopMode: (socket, channelId, mode) => {
    if (socket) socket.emit('music:loop', { channel_id: channelId, loopMode: mode });
  },

  requestSync: (socket, channelId) => {
    if (socket) socket.emit('music:request_sync', channelId);
  }
}));
