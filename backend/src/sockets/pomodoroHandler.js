// Lưu trữ trạng thái bộ đếm của các phòng
// Cấu trúc: { roomId: { isRunning, mode, timeLeft, intervalId } }
const pomodoroStates = {};

const WORK_TIME = 25 * 60; // 25 phút
const BREAK_TIME = 5 * 60; // 5 phút

module.exports = (io, socket) => {
  // Client yêu cầu lấy trạng thái hiện tại (khi mới vào phòng)
  socket.on('pomodoro:get_state', (roomId) => {
    if (!pomodoroStates[roomId]) {
      pomodoroStates[roomId] = {
        isRunning: false,
        mode: 'work',
        timeLeft: WORK_TIME,
        intervalId: null
      };
    }
    
    // Gửi lại trạng thái hiện tại (bỏ intervalId đi trước khi gửi)
    const stateToSend = {
      isRunning: pomodoroStates[roomId].isRunning,
      mode: pomodoroStates[roomId].mode,
      timeLeft: pomodoroStates[roomId].timeLeft
    };
    
    socket.emit('pomodoro:state', stateToSend);
  });

  // Client yêu cầu bắt đầu/tiếp tục đếm giờ
  socket.on('pomodoro:start', (roomId) => {
    const state = pomodoroStates[roomId];
    if (!state || state.isRunning) return;

    state.isRunning = true;
    
    // Phát sự kiện cập nhật trạng thái cho cả phòng
    io.to(`room_${roomId}`).emit('pomodoro:state', {
      isRunning: state.isRunning,
      mode: state.mode,
      timeLeft: state.timeLeft
    });

    // Chạy đếm ngược trên server
    state.intervalId = setInterval(() => {
      state.timeLeft -= 1;
      
      // Khi hết giờ
      if (state.timeLeft <= 0) {
        clearInterval(state.intervalId);
        
        // Tự động chuyển mode
        if (state.mode === 'work') {
          state.mode = 'break';
          state.timeLeft = BREAK_TIME;
        } else {
          state.mode = 'work';
          state.timeLeft = WORK_TIME;
        }
        
        state.isRunning = false; // Bắt người dùng bấm Start để chạy tiếp
      }

      // Mỗi giây, phát thời gian cho cả phòng
      io.to(`room_${roomId}`).emit('pomodoro:tick', {
        timeLeft: state.timeLeft,
        isRunning: state.isRunning,
        mode: state.mode
      });

    }, 1000);
  });

  // Client yêu cầu tạm dừng
  socket.on('pomodoro:pause', (roomId) => {
    const state = pomodoroStates[roomId];
    if (!state || !state.isRunning) return;

    state.isRunning = false;
    clearInterval(state.intervalId);
    state.intervalId = null;

    io.to(`room_${roomId}`).emit('pomodoro:state', {
      isRunning: state.isRunning,
      mode: state.mode,
      timeLeft: state.timeLeft
    });
  });

  // Client yêu cầu Reset (Về ban đầu 25 phút)
  socket.on('pomodoro:reset', (roomId) => {
    const state = pomodoroStates[roomId];
    if (state && state.intervalId) {
      clearInterval(state.intervalId);
      state.intervalId = null;
    }

    pomodoroStates[roomId] = {
      isRunning: false,
      mode: 'work',
      timeLeft: WORK_TIME,
      intervalId: null
    };

    io.to(`room_${roomId}`).emit('pomodoro:state', {
      isRunning: false,
      mode: 'work',
      timeLeft: WORK_TIME
    });
  });
};
