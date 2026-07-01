import { create } from 'zustand';

// Định cấu hình STUN servers
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]
};

export const useVoiceStore = create((set, get) => ({
  localStream: null,
  isMuted: false,
  isVideoOn: false,
  isScreenSharing: false,
  peers: {}, // { socketId: { peerConnection, stream, userId, username } }
  
  isConnected: false,
  currentChannelId: null,

  // 1. Tham gia kênh thoại
  joinVoiceChannel: async (socket, channelId, user) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      set({ 
        localStream: stream, 
        isConnected: true, 
        currentChannelId: channelId,
        isMuted: false,
        isVideoOn: false,
        isScreenSharing: false
      });

      socket.on('voice:user_joined', async (userInfo) => {
        console.log('[WebRTC] User joined, preparing offer for:', userInfo.username);
        const pc = get().createPeerConnection(socket, userInfo.socketId, userInfo.id, userInfo.username);
        get().localStream.getTracks().forEach(track => pc.addTrack(track, get().localStream));
      });

      socket.on('voice:signal', async (data) => {
        const { fromSocketId, fromUserId, fromUsername, signalData } = data;
        let pc = get().peers[fromSocketId]?.peerConnection;

        if (!pc && signalData.type === 'offer') {
          console.log('[WebRTC] Received offer, creating PC for:', fromUsername);
          pc = get().createPeerConnection(socket, fromSocketId, fromUserId, fromUsername);
          get().localStream.getTracks().forEach(track => pc.addTrack(track, get().localStream));
        }

        if (!pc) return;

        if (signalData.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signalData.offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('voice:signal', {
            toSocketId: fromSocketId,
            signalData: { type: 'answer', answer }
          });
        } else if (signalData.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signalData.answer));
        } else if (signalData.type === 'ice-candidate') {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(signalData.candidate));
          } catch (e) {
            console.error('[WebRTC] Error adding received ice candidate', e);
          }
        }
      });

      socket.on('voice:user_left', (data) => {
        get().removePeer(data.userId);
      });

      socket.emit('voice:join', channelId);

    } catch (err) {
      console.error('Không thể truy cập Microphone:', err);
      alert('Vui lòng cấp quyền Microphone để sử dụng tính năng này.');
    }
  },

  // 2. Rời kênh thoại
  leaveVoiceChannel: (socket) => {
    const { localStream, peers } = get();
    
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }

    Object.values(peers).forEach(p => p.peerConnection.close());

    if (socket) {
      socket.emit('voice:leave');
      socket.off('voice:user_joined');
      socket.off('voice:signal');
      socket.off('voice:user_left');
    }

    set({ 
      localStream: null, 
      peers: {}, 
      isConnected: false, 
      currentChannelId: null,
      isVideoOn: false,
      isScreenSharing: false
    });
  },

  // 3. Helpers
  createPeerConnection: (socket, toSocketId, toUserId, toUsername) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Gửi ICE candidate
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('voice:signal', {
          toSocketId,
          signalData: { type: 'ice-candidate', candidate: event.candidate }
        });
      }
    };

    // Tự động đàm phán lại khi có thay đổi Track (Video/Screen)
    pc.onnegotiationneeded = async () => {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('voice:signal', {
          toSocketId,
          signalData: { type: 'offer', offer }
        });
      } catch (err) {
        console.error('[WebRTC] onnegotiationneeded error:', err);
      }
    };

    // Nhận stream
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      set(state => ({
        peers: {
          ...state.peers,
          [toSocketId]: {
            ...state.peers[toSocketId],
            stream: remoteStream
          }
        }
      }));
    };

    set(state => ({
      peers: {
        ...state.peers,
        [toSocketId]: {
          peerConnection: pc,
          stream: null,
          userId: toUserId,
          username: toUsername
        }
      }
    }));

    return pc;
  },

  removePeer: (userId) => {
    const { peers } = get();
    const newPeers = { ...peers };
    let socketIdToRemove = null;
    for (const [socketId, peerObj] of Object.entries(peers)) {
      if (peerObj.userId === userId) {
        socketIdToRemove = socketId;
        peerObj.peerConnection.close();
        break;
      }
    }
    if (socketIdToRemove) {
      delete newPeers[socketIdToRemove];
      set({ peers: newPeers });
    }
  },

  // 4. Các hành động Media
  toggleMute: () => {
    const { localStream, isMuted } = get();
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = isMuted;
      });
      set({ isMuted: !isMuted });
    }
  },

  toggleVideo: async () => {
    const { localStream, peers, isVideoOn, isScreenSharing } = get();
    
    // Nếu đang share màn hình thì không cho bật cam (đơn giản hóa luồng)
    if (isScreenSharing) {
      alert("Vui lòng tắt chia sẻ màn hình trước khi bật Camera.");
      return;
    }

    if (isVideoOn) {
      // Tắt camera
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.stop();
        localStream.removeTrack(track);
        Object.values(peers).forEach(p => {
          const sender = p.peerConnection.getSenders().find(s => s.track === track);
          if (sender) p.peerConnection.removeTrack(sender);
        });
      });
      set({ isVideoOn: false });
    } else {
      // Bật camera
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const videoTrack = stream.getVideoTracks()[0];
        
        // Khi camera bị dừng đột ngột (rút dây, etc)
        videoTrack.onended = () => {
          if (get().isVideoOn) get().toggleVideo();
        };

        localStream.addTrack(videoTrack);
        Object.values(peers).forEach(p => {
          p.peerConnection.addTrack(videoTrack, localStream);
        });
        set({ isVideoOn: true });
      } catch (e) {
        console.error('Lỗi bật camera:', e);
        alert('Không thể truy cập Camera!');
      }
    }
  },

  toggleScreenShare: async () => {
    const { localStream, peers, isScreenSharing, isVideoOn } = get();
    
    if (isVideoOn) {
      alert("Vui lòng tắt Camera trước khi chia sẻ màn hình.");
      return;
    }

    if (isScreenSharing) {
      // Tắt share
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.stop();
        localStream.removeTrack(track);
        Object.values(peers).forEach(p => {
          const sender = p.peerConnection.getSenders().find(s => s.track === track);
          if (sender) p.peerConnection.removeTrack(sender);
        });
      });
      set({ isScreenSharing: false });
    } else {
      // Bật share
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = stream.getVideoTracks()[0];
        
        // Khi người dùng bấm "Stop sharing" trên trình duyệt
        screenTrack.onended = () => {
          if (get().isScreenSharing) get().toggleScreenShare();
        };

        localStream.addTrack(screenTrack);
        Object.values(peers).forEach(p => {
          p.peerConnection.addTrack(screenTrack, localStream);
        });
        set({ isScreenSharing: true });
      } catch (e) {
        console.error('Lỗi share screen:', e);
      }
    }
  }
}));
