const redis = require('../redis');
const { isChannelMember } = require('../middlewares/channelMiddleware');

// URL allow-list để phòng chống SSRF
const ALLOWED_MUSIC_HOSTS = ['youtube.com', 'www.youtube.com', 'youtu.be', 'm.youtube.com', 'soundcloud.com', 'www.soundcloud.com', 'on.soundcloud.com'];

function isAllowedMusicUrl(url) {
  try {
    const parsed = new URL(url);
    // Từ chối mọi URL không phải https
    if (parsed.protocol !== 'https:') return false;
    // Kiểm tra hostname nằm trong allow-list
    return ALLOWED_MUSIC_HOSTS.some(host => parsed.hostname === host);
  } catch {
    return false;
  }
}

module.exports = (io, socket, { checkIsOwner }) => {
  // 1. Thêm nhạc vào queue (Ai cũng thêm được — nhưng phải là thành viên channel)
  socket.on('music:add', async (data) => {
    let { channel_id, url, title } = data;

    // Kiểm tra thành viên channel
    const isMember = await isChannelMember(channel_id, socket.user.id);
    if (!isMember) {
      console.warn(`[Security] ${socket.user.username} cố thêm nhạc vào channel ${channel_id} không hợp lệ.`);
      return;
    }

    // Resolve SoundCloud short link trước khi validate
    if (url.includes('on.soundcloud.com')) {
      try {
        const response = await fetch(url, { method: 'HEAD', redirect: 'follow' });
        url = response.url;
      } catch (err) {
        console.log('Lỗi resolve SoundCloud link:', err);
      }
    }

    // Kiểm tra URL có trong allow-list không (chống SSRF)
    if (!isAllowedMusicUrl(url)) {
      console.warn(`[Security] ${socket.user.username} cố thêm URL không hợp lệ: ${url}`);
      socket.emit('music:error', { message: 'Chỉ hỗ trợ link YouTube và SoundCloud.' });
      return;
    }

    if (url.includes('soundcloud.com')) {
      url = url.split('?')[0];
    }

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
    
    await redis.rpush(`queue:${channel_id}`, JSON.stringify(track));
    
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

  // 5. User mới join -> Gửi state hiện tại (kiểm tra membership)
  socket.on('music:request_sync', async (channel_id) => {
    const isMember = await isChannelMember(channel_id, socket.user.id);
    if (!isMember) {
      console.warn(`[Security] ${socket.user.username} cố request music sync từ channel ${channel_id} không hợp lệ.`);
      return;
    }
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

    const currentIdx = parsedQueue.findIndex(t => t.url === currentUrl);
    let nextIdx = currentIdx + 1;

    if (nextIdx >= parsedQueue.length) {
      if (loopMode === 'queue') {
        nextIdx = 0;
      } else {
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

  // 7. Bài hát kết thúc
  socket.on('music:ended', async (data) => {
    const { channel_id } = data;
    if (!(await checkIsOwner(channel_id, socket.user.id))) return;

    const existing = await redis.get(`music_state:${channel_id}`);
    if (!existing) return;
    const currentState = JSON.parse(existing);
    const loopMode = currentState.loopMode || 'off';

    if (loopMode === 'track') {
      const state = { ...currentState, isPlaying: true, currentTime: 0, updatedAt: Date.now() };
      await redis.set(`music_state:${channel_id}`, JSON.stringify(state));
      io.to(`channel_${channel_id}`).emit('music:state_sync', state);
      return;
    }

    const queueItems = await redis.lrange(`queue:${channel_id}`, 0, -1);
    if (queueItems.length === 0) return;

    const parsedQueue = queueItems.map(item => JSON.parse(item));
    const currentIdx = parsedQueue.findIndex(t => t.url === currentState.url);
    let nextIdx = currentIdx + 1;

    if (nextIdx >= parsedQueue.length) {
      if (loopMode === 'queue') {
        nextIdx = 0;
      } else {
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
};
