import { create } from 'zustand';

export const usePomodoroStore = create((set, get) => ({
  isRunning: false,
  mode: 'work',
  timeLeft: 25 * 60,
  socket: null,
  roomId: null,

  initPomodoro: (socket, roomId) => {
    set({ socket, roomId });
    
    // Yêu cầu state hiện tại
    socket.emit('pomodoro:get_state', roomId);

    // Lắng nghe cập nhật tick từng giây
    socket.on('pomodoro:tick', (data) => {
      set({ 
        timeLeft: data.timeLeft,
        isRunning: data.isRunning,
        mode: data.mode
      });
    });

    // Lắng nghe cập nhật trạng thái
    socket.on('pomodoro:state', (data) => {
      set({ 
        timeLeft: data.timeLeft,
        isRunning: data.isRunning,
        mode: data.mode
      });
    });
  },

  cleanup: () => {
    const { socket } = get();
    if (socket) {
      socket.off('pomodoro:tick');
      socket.off('pomodoro:state');
    }
    set({ socket: null, roomId: null });
  },

  start: () => {
    const { socket, roomId } = get();
    if (socket && roomId) {
      socket.emit('pomodoro:start', roomId);
    }
  },

  pause: () => {
    const { socket, roomId } = get();
    if (socket && roomId) {
      socket.emit('pomodoro:pause', roomId);
    }
  },

  reset: () => {
    const { socket, roomId } = get();
    if (socket && roomId) {
      socket.emit('pomodoro:reset', roomId);
    }
  }
}));
