const jwt = require('jsonwebtoken');
const db = require('../db');
const redis = require('../redis');

let ioInstance;
const userSocketMap = new Map(); // Lưu trữ userId -> socketId

module.exports = {
  getIo: () => ioInstance,
  getUserSocketId: (userId) => userSocketMap.get(userId),
  init: (io) => {
    ioInstance = io;
  // Middleware xác thực socket
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      return next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected to socket: ${socket.user.username} (${socket.id})`);
    
    // Lưu socketId của user
    userSocketMap.set(socket.user.id, socket.id);

    // Tham gia vào một channel (room của socket.io)
    socket.on('join_channel', (channelId) => {
      socket.join(`channel_${channelId}`);
      console.log(`${socket.user.username} joined channel_${channelId}`);
    });

    // Rời khỏi channel
    socket.on('leave_channel', (channelId) => {
      socket.leave(`channel_${channelId}`);
    });

    // Xử lý gửi tin nhắn chat
    socket.on('chat:send', async (data) => {
      try {
        const { channel_id, content, type = 'text' } = data;
        
        // Lưu tin nhắn vào DB
        const result = await db.query(
          'INSERT INTO messages (channel_id, user_id, content, type) VALUES ($1, $2, $3, $4::message_type) RETURNING *',
          [channel_id, socket.user.id, content, type]
        );
        const newMessage = result.rows[0];

        // Đính kèm thông tin user để gửi về client
        const userResult = await db.query('SELECT username, display_name, avatar_url FROM users WHERE id = $1', [socket.user.id]);
        const userInfo = userResult.rows[0];

        const fullMessage = {
          ...newMessage,
          username: userInfo.username,
          display_name: userInfo.display_name,
          avatar_url: userInfo.avatar_url
        };

        // Broadcast tin nhắn cho tất cả người trong channel (bao gồm cả người gửi)
        io.to(`channel_${channel_id}`).emit('chat:new', fullMessage);
      } catch (err) {
        console.error('Lỗi khi gửi tin nhắn:', err);
      }
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user?.username}`);
      userSocketMap.delete(socket.user.id);
    });

    // Hàm phụ trợ: Kiểm tra quyền Owner
    const checkIsOwner = async (channelId, userId) => {
      const res = await db.query(
        `SELECT rm.role FROM room_members rm 
         JOIN channels c ON rm.room_id = c.room_id 
         WHERE c.id = $1 AND rm.user_id = $2`, 
        [channelId, userId]
      );
      return res.rows.length > 0 && res.rows[0].role === 'owner';
    };

    // 1. Thêm nhạc vào queue (Ai cũng thêm được)
    socket.on('music:add', async (data) => {
      let { channel_id, url, title } = data;
      
      // Xử lý link rút gọn SoundCloud (on.soundcloud.com)
      if (url.includes('on.soundcloud.com')) {
        try {
          const response = await fetch(url, { method: 'HEAD', redirect: 'follow' });
          url = response.url; // Lấy URL sau redirect
        } catch (err) {
          console.log('Lỗi resolve SoundCloud link:', err);
        }
      }

      // Chuẩn hóa URL: Cắt bỏ các query parameters thừa (như ?si=...) làm lỗi react-player
      if (url.includes('soundcloud.com')) {
        url = url.split('?')[0];
      }

      // Tự động nhận diện Tên bài hát (Title) qua oEmbed API
      try {
        if (url.includes('soundcloud.com')) {
          const res = await fetch(`https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(url)}`);
          if (res.ok) {
            const data = await res.json();
            title = data.title || title;
          }
        } else if (url.includes('youtube.com') || url.includes('youtu.be')) {
          const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
          if (res.ok) {
            const data = await res.json();
            title = data.title || title;
          }
        }
      } catch (err) {
        console.log('Lỗi fetch oEmbed:', err);
      }

      const track = {
        id: Math.random().toString(36).substring(7),
        url,
        title,
        addedBy: socket.user.username,
      };
      
      // Push vào Redis list
      await redis.rpush(`queue:${channel_id}`, JSON.stringify(track));
      
      // Lấy toàn bộ queue hiện tại để trả về
      const queueItems = await redis.lrange(`queue:${channel_id}`, 0, -1);
      const parsedQueue = queueItems.map(item => JSON.parse(item));
      
      io.to(`channel_${channel_id}`).emit('music:queue_updated', parsedQueue);
    });

    // 1.5. Xóa nhạc khỏi queue (Chỉ Owner)
    socket.on('music:remove', async (data) => {
      const { channel_id, trackId } = data;
      
      if (!(await checkIsOwner(channel_id, socket.user.id))) return;
      
      const queueItems = await redis.lrange(`queue:${channel_id}`, 0, -1);
      const parsedQueue = queueItems.map(item => JSON.parse(item));
      const newQueue = parsedQueue.filter(track => track.id !== trackId);
      
      await redis.del(`queue:${channel_id}`);
      if (newQueue.length > 0) {
        const stringified = newQueue.map(item => JSON.stringify(item));
        await redis.rpush(`queue:${channel_id}`, ...stringified);
      }
      
      io.to(`channel_${channel_id}`).emit('music:queue_updated', newQueue);
    });

    // 2. Play bài nhạc (Chỉ Owner)
    socket.on('music:play', async (data) => {
      const { channel_id, url, currentTime } = data;
      if (!(await checkIsOwner(channel_id, socket.user.id))) return;

      // Giữ lại loopMode hiện tại
      const existing = await redis.get(`music_state:${channel_id}`);
      const loopMode = existing ? JSON.parse(existing).loopMode || 'off' : 'off';

      const state = {
        url,
        isPlaying: true,
        currentTime: currentTime || 0,
        loopMode,
        updatedAt: Date.now(),
        updatedBy: socket.user.username
      };
      await redis.set(`music_state:${channel_id}`, JSON.stringify(state));
      io.to(`channel_${channel_id}`).emit('music:state_sync', state);
    });

    // 3. Pause bài nhạc (Chỉ Owner)
    socket.on('music:pause', async (data) => {
      const { channel_id, url, currentTime } = data;
      if (!(await checkIsOwner(channel_id, socket.user.id))) return;

      const existing = await redis.get(`music_state:${channel_id}`);
      const loopMode = existing ? JSON.parse(existing).loopMode || 'off' : 'off';

      const state = {
        url,
        isPlaying: false,
        currentTime,
        loopMode,
        updatedAt: Date.now(),
        updatedBy: socket.user.username
      };
      await redis.set(`music_state:${channel_id}`, JSON.stringify(state));
      io.to(`channel_${channel_id}`).emit('music:state_sync', state);
    });

    // 4. Seek (Tua) bài nhạc (Chỉ Owner)
    socket.on('music:seek', async (data) => {
      const { channel_id, url, currentTime, isPlaying } = data;
      if (!(await checkIsOwner(channel_id, socket.user.id))) return;

      const existing = await redis.get(`music_state:${channel_id}`);
      const loopMode = existing ? JSON.parse(existing).loopMode || 'off' : 'off';

      const state = {
        url,
        isPlaying,
        currentTime,
        loopMode,
        updatedAt: Date.now(),
        updatedBy: socket.user.username
      };
      await redis.set(`music_state:${channel_id}`, JSON.stringify(state));
      io.to(`channel_${channel_id}`).emit('music:state_sync', state);
    });

    // 5. User mới join -> Gửi state hiện tại để họ sync
    socket.on('music:request_sync', async (channel_id) => {
      const stateStr = await redis.get(`music_state:${channel_id}`);
      if (stateStr) {
        socket.emit('music:state_sync', JSON.parse(stateStr));
      }
      const queueItems = await redis.lrange(`queue:${channel_id}`, 0, -1);
      if (queueItems.length > 0) {
        const parsedQueue = queueItems.map(item => JSON.parse(item));
        socket.emit('music:queue_updated', parsedQueue);
      }
    });

    // 6. Chuyển bài tiếp theo (Chỉ Owner)
    socket.on('music:next', async (data) => {
      const { channel_id } = data;
      if (!(await checkIsOwner(channel_id, socket.user.id))) return;

      const queueItems = await redis.lrange(`queue:${channel_id}`, 0, -1);
      if (queueItems.length === 0) return;

      const parsedQueue = queueItems.map(item => JSON.parse(item));
      const existing = await redis.get(`music_state:${channel_id}`);
      const currentState = existing ? JSON.parse(existing) : {};
      const currentUrl = currentState.url;
      const loopMode = currentState.loopMode || 'off';

      // Tìm vị trí bài hiện tại
      const currentIdx = parsedQueue.findIndex(t => t.url === currentUrl);
      let nextIdx = currentIdx + 1;

      if (nextIdx >= parsedQueue.length) {
        if (loopMode === 'queue') {
          nextIdx = 0; // Quay lại đầu
        } else {
          // Hết danh sách, dừng phát
          const state = { ...currentState, isPlaying: false, updatedAt: Date.now() };
          await redis.set(`music_state:${channel_id}`, JSON.stringify(state));
          io.to(`channel_${channel_id}`).emit('music:state_sync', state);
          return;
        }
      }

      const nextTrack = parsedQueue[nextIdx];
      const state = {
        url: nextTrack.url,
        isPlaying: true,
        currentTime: 0,
        loopMode,
        updatedAt: Date.now(),
        updatedBy: socket.user.username
      };
      await redis.set(`music_state:${channel_id}`, JSON.stringify(state));
      io.to(`channel_${channel_id}`).emit('music:state_sync', state);
    });

    // 7. Bài hát kết thúc — xử lý auto-play (Chỉ Owner gửi)
    socket.on('music:ended', async (data) => {
      const { channel_id } = data;
      if (!(await checkIsOwner(channel_id, socket.user.id))) return;

      const existing = await redis.get(`music_state:${channel_id}`);
      if (!existing) return;
      const currentState = JSON.parse(existing);
      const loopMode = currentState.loopMode || 'off';

      // Loop bài: phát lại bài hiện tại
      if (loopMode === 'track') {
        const state = {
          ...currentState,
          isPlaying: true,
          currentTime: 0,
          updatedAt: Date.now()
        };
        await redis.set(`music_state:${channel_id}`, JSON.stringify(state));
        io.to(`channel_${channel_id}`).emit('music:state_sync', state);
        return;
      }

      // off hoặc queue: chuyển bài tiếp
      const queueItems = await redis.lrange(`queue:${channel_id}`, 0, -1);
      if (queueItems.length === 0) return;

      const parsedQueue = queueItems.map(item => JSON.parse(item));
      const currentIdx = parsedQueue.findIndex(t => t.url === currentState.url);
      let nextIdx = currentIdx + 1;

      if (nextIdx >= parsedQueue.length) {
        if (loopMode === 'queue') {
          nextIdx = 0;
        } else {
          // Hết danh sách, dừng
          const state = { ...currentState, isPlaying: false, updatedAt: Date.now() };
          await redis.set(`music_state:${channel_id}`, JSON.stringify(state));
          io.to(`channel_${channel_id}`).emit('music:state_sync', state);
          return;
        }
      }

      const nextTrack = parsedQueue[nextIdx];
      const state = {
        url: nextTrack.url,
        isPlaying: true,
        currentTime: 0,
        loopMode,
        updatedAt: Date.now(),
        updatedBy: socket.user.username
      };
      await redis.set(`music_state:${channel_id}`, JSON.stringify(state));
      io.to(`channel_${channel_id}`).emit('music:state_sync', state);
    });

    // 8. Đổi chế độ lặp (Chỉ Owner)
    socket.on('music:loop', async (data) => {
      const { channel_id, loopMode } = data;
      if (!(await checkIsOwner(channel_id, socket.user.id))) return;

      const existing = await redis.get(`music_state:${channel_id}`);
      const currentState = existing ? JSON.parse(existing) : { isPlaying: false, currentTime: 0 };

      const state = {
        ...currentState,
        loopMode,
        updatedAt: Date.now(),
        updatedBy: socket.user.username
      };
      await redis.set(`music_state:${channel_id}`, JSON.stringify(state));
      io.to(`channel_${channel_id}`).emit('music:state_sync', state);
    });

    /* =========================================
       PHASE 5: VOICE CHANNEL (WebRTC Signaling)
       ========================================= */

    // Lưu trạng thái kênh thoại của socket hiện tại để dễ dọn dẹp
    socket.voiceChannelId = null;

    socket.on('voice:join', async (channel_id) => {
      // Nếu đang ở kênh khác thì rời kênh cũ trước
      if (socket.voiceChannelId && socket.voiceChannelId !== channel_id) {
        socket.leave(`voice_${socket.voiceChannelId}`);
        io.to(`voice_${socket.voiceChannelId}`).emit('voice:user_left', { userId: socket.user.id });
      }

      socket.voiceChannelId = channel_id;
      socket.join(`voice_${channel_id}`);

      // Lấy thông tin user hiện tại
      const userInfo = {
        id: socket.user.id,
        username: socket.user.username,
        socketId: socket.id
      };

      // Báo cho những người đang ở TRONG kênh biết có người mới vào để họ chuẩn bị tạo kết nối WebRTC (Offer)
      socket.to(`voice_${channel_id}`).emit('voice:user_joined', userInfo);
    });

    socket.on('voice:signal', (data) => {
      // data gồm: { toSocketId, signalData, fromUserId, fromUsername }
      // Chuyển tiếp tín hiệu (Offer/Answer/ICE) đến đích danh một user
      io.to(data.toSocketId).emit('voice:signal', {
        fromSocketId: socket.id,
        fromUserId: socket.user.id,
        fromUsername: socket.user.username,
        signalData: data.signalData
      });
    });

    socket.on('voice:leave', () => {
      if (socket.voiceChannelId) {
        socket.leave(`voice_${socket.voiceChannelId}`);
        io.to(`voice_${socket.voiceChannelId}`).emit('voice:user_left', { userId: socket.user.id });
        socket.voiceChannelId = null;
      }
    });

    // Cần update lại sự kiện disconnect ở trên để xử lý leave voice (tôi sẽ chèn thêm logic vào event disconnect)
    socket.on('disconnect', () => {
      if (socket.voiceChannelId) {
        io.to(`voice_${socket.voiceChannelId}`).emit('voice:user_left', { userId: socket.user.id });
      }
    });

    /* =========================================
       PHASE 8: DIRECT MESSAGES & FRIENDS
       ========================================= */
    socket.on('dm:send', async (data) => {
      try {
        const { toUserId, content, type = 'text' } = data;
        const fromUserId = socket.user.id;

        // Lưu vào DB
        const result = await db.query(
          'INSERT INTO direct_messages (sender_id, receiver_id, content, type) VALUES ($1, $2, $3, $4::message_type) RETURNING *',
          [fromUserId, toUserId, content, type]
        );
        const msg = result.rows[0];

        const userResult = await db.query('SELECT username, display_name, avatar_url FROM users WHERE id = $1', [fromUserId]);
        const userInfo = userResult.rows[0];
        
        const fullMessage = {
          ...msg,
          username: userInfo.username,
          display_name: userInfo.display_name,
          avatar_url: userInfo.avatar_url
        };

        // Trả về cho chính người gửi
        socket.emit('dm:receive', fullMessage);

        // Gửi cho người nhận nếu họ đang online
        const toSocketId = userSocketMap.get(toUserId);
        if (toSocketId) {
          io.to(toSocketId).emit('dm:receive', fullMessage);
        }
      } catch (err) {
        console.error('Lỗi khi gửi DM:', err);
      }
    });

    /* =========================================
       PHASE 12: WHITEBOARD CHANNEL
       ========================================= */
    
    // Broadcast nét vẽ cho những người khác trong phòng
    socket.on('whiteboard:draw', (data) => {
      // data gồm: { channel_id, x0, y0, x1, y1, color, size }
      socket.to(`channel_${data.channel_id}`).emit('whiteboard:draw', data);
    });

    // Xóa bảng
    socket.on('whiteboard:clear', (data) => {
      const { channel_id } = data;
      socket.to(`channel_${channel_id}`).emit('whiteboard:clear');
    });

  });
  } // end init
};
