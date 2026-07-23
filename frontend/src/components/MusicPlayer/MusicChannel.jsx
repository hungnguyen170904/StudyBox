import { useState, useEffect, useRef, useCallback } from 'react';
import { useMusicStore } from '../../store/musicStore';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { useRoomStore } from '../../store/roomStore';
import { Plus, ListMusic, PlaySquare, X, Play, Pause, SkipForward, Repeat, Repeat1 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';

/* ───── Helpers ───── */

function getYoutubeId(url) {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function getSource(url) {
  if (!url) return null;
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('soundcloud.com')) return 'soundcloud';
  return null;
}

function loadScript(src) {
  return new Promise((resolve) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    document.head.appendChild(s);
  });
}

/* ───── Component ───── */

export default function MusicChannel({ channelId }) {
  const [urlInput, setUrlInput] = useState('');

  // Refs cho player instances
  const ytPlayerRef = useRef(null);
  const scWidgetRef = useRef(null);
  const ytDivRef = useRef(null);
  const scIframeRef = useRef(null);
  const prevUrlRef = useRef(null); // theo dõi URL trước đó

  const {
    queue, setQueue, playbackState, setPlaybackState,
    addTrack, removeTrack, playTrack, pauseTrack,
    nextTrack, trackEnded, setLoopMode, requestSync
  } = useMusicStore();

  const { getSocket } = useChatStore();
  const socket = getSocket();
  const { user } = useAuthStore();
  const { currentRoom } = useRoomStore();

  const isOwner = currentRoom?.members?.find(m => m.id === user?.id)?.role === 'owner';
  const currentUrl = playbackState.url || (queue.length > 0 ? queue[0].url : null);
  const source = getSource(currentUrl);
  const loopMode = playbackState.loopMode || 'off';

  /* ───── Callback: Bài hát kết thúc ───── */
  const handleTrackEnded = useCallback(() => {
    if (!isOwner || !socket) return;
    console.log('[Music] Track ended, requesting next...');
    trackEnded(socket, channelId);
  }, [isOwner, socket, channelId, trackEnded]);

  /* ───── Socket listeners ───── */
  useEffect(() => {
    if (!socket) return;
    requestSync(socket, channelId);

    const onStateSync = (state) => setPlaybackState(state);
    const onQueueUpdated = (q) => setQueue(q);

    socket.on('music:state_sync', onStateSync);
    socket.on('music:queue_updated', onQueueUpdated);
    return () => {
      socket.off('music:state_sync', onStateSync);
      socket.off('music:queue_updated', onQueueUpdated);
    };
  }, [socket, channelId]);

  /* ───── YouTube IFrame API ───── */
  useEffect(() => {
    if (source !== 'youtube' || !currentUrl) return;
    const videoId = getYoutubeId(currentUrl);
    if (!videoId) return;

    const init = () => {
      // Nếu player đã tồn tại → chỉ load video mới
      if (ytPlayerRef.current && typeof ytPlayerRef.current.loadVideoById === 'function') {
        ytPlayerRef.current.loadVideoById(videoId);
        return;
      }
      // Tạo player mới
      if (!ytDivRef.current) return;
      ytPlayerRef.current = new window.YT.Player(ytDivRef.current, {
        videoId,
        playerVars: { autoplay: 1, rel: 0, modestbranding: 1 },
        events: {
          onStateChange: (e) => {
            if (e.data === window.YT.PlayerState.ENDED) handleTrackEnded();
          }
        }
      });
    };

    if (window.YT && window.YT.Player) {
      init();
    } else {
      loadScript('https://www.youtube.com/iframe_api');
      const prevCb = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { if (prevCb) prevCb(); init(); };
    }
  }, [currentUrl, source, handleTrackEnded]);

  /* ───── SoundCloud Widget API ───── */
  useEffect(() => {
    if (source !== 'soundcloud' || !currentUrl) return;
    if (!scIframeRef.current) return;

    const scEmbedUrl = `https://w.soundcloud.com/player/?url=${encodeURIComponent(currentUrl)}&auto_play=true&visual=true&hide_related=true&show_comments=false&show_teaser=false`;

    // Nếu URL thay đổi → cập nhật iframe src
    if (prevUrlRef.current !== currentUrl) {
      scIframeRef.current.src = scEmbedUrl;
      prevUrlRef.current = currentUrl;
    }

    const initWidget = () => {
      if (!window.SC || !window.SC.Widget) return;
      const widget = window.SC.Widget(scIframeRef.current);
      scWidgetRef.current = widget;
      widget.bind(window.SC.Widget.Events.FINISH, () => handleTrackEnded());
    };

    if (window.SC && window.SC.Widget) {
      // Widget API đã load → đợi iframe load xong rồi bind
      scIframeRef.current.onload = initWidget;
    } else {
      loadScript('https://w.soundcloud.com/player/api.js').then(() => {
        scIframeRef.current.onload = initWidget;
      });
    }
  }, [currentUrl, source, handleTrackEnded]);

  /* ───── Sync playback từ server (cho tất cả clients) ───── */
  useEffect(() => {
    if (!currentUrl) return;
    if (source === 'youtube' && ytPlayerRef.current) {
      try {
        if (playbackState.isPlaying) ytPlayerRef.current.playVideo?.();
        else ytPlayerRef.current.pauseVideo?.();
      } catch (e) {}
    }
    if (source === 'soundcloud' && scWidgetRef.current) {
      try {
        if (playbackState.isPlaying) scWidgetRef.current.play();
        else scWidgetRef.current.pause();
      } catch (e) {}
    }
  }, [playbackState.isPlaying, playbackState.url]);

  /* ───── Cleanup khi unmount ───── */
  useEffect(() => {
    return () => {
      if (ytPlayerRef.current && ytPlayerRef.current.destroy) {
        try { ytPlayerRef.current.destroy(); } catch (e) {}
        ytPlayerRef.current = null;
      }
    };
  }, []);

  /* ───── Control handlers (chỉ Owner) ───── */
  const handlePlay = () => {
    if (!isOwner || !currentUrl) return;
    if (source === 'youtube' && ytPlayerRef.current) ytPlayerRef.current.playVideo?.();
    if (source === 'soundcloud' && scWidgetRef.current) scWidgetRef.current.play();
    playTrack(socket, channelId, currentUrl, 0);
  };

  const handlePause = () => {
    if (!isOwner || !currentUrl) return;
    if (source === 'youtube' && ytPlayerRef.current) ytPlayerRef.current.pauseVideo?.();
    if (source === 'soundcloud' && scWidgetRef.current) scWidgetRef.current.pause();
    pauseTrack(socket, channelId, currentUrl, 0);
  };

  const handleNext = () => {
    if (!isOwner) return;
    nextTrack(socket, channelId);
  };

  const handleLoop = () => {
    if (!isOwner) return;
    const modes = ['off', 'track', 'queue'];
    const next = modes[(modes.indexOf(loopMode) + 1) % modes.length];
    setLoopMode(socket, channelId, next);
  };

  const handleAddTrack = (e) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    addTrack(socket, channelId, urlInput, urlInput);
    toast.success('Đã thêm bài hát vào hàng đợi!');
    setUrlInput('');
  };

  const handleDeleteTrack = (trackId) => {
    removeTrack(socket, channelId, trackId);
  };

  /* ───── Loop icon ───── */
  const LoopIcon = () => {
    if (loopMode === 'track') return <Repeat1 className="w-5 h-5" />;
    return <Repeat className="w-5 h-5" />;
  };
  const loopLabel = loopMode === 'off' ? 'Lặp: Tắt' : loopMode === 'track' ? 'Lặp: Bài' : 'Lặp: DS';

  /* ───── Render ───── */
  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
      {/* Player + Controls */}
      <div className="flex-1 bg-black/30 flex flex-col relative">
        {currentUrl ? (
          <>
            {/* Player Area */}
            <div className="flex-1 relative overflow-hidden">
              {/* YouTube Player */}
              {source === 'youtube' && (
                <div className="absolute inset-0">
                  <div ref={ytDivRef} style={{ width: '100%', height: '100%' }} />
                </div>
              )}

              {/* SoundCloud Player */}
              {source === 'soundcloud' && (
                <div className="absolute inset-0">
                  <iframe
                    ref={scIframeRef}
                    width="100%"
                    height="100%"
                    style={{ border: 'none' }}
                    allow="autoplay"
                    title="SoundCloud Player"
                  />
                </div>
              )}

              {/* Unsupported */}
              {!source && (
                <div className="absolute inset-0 flex items-center justify-center text-white/50">
                  Không hỗ trợ nguồn nhạc này (chỉ YouTube / SoundCloud)
                </div>
              )}

              {/* Nhãn bài hát */}
              <div className="absolute top-3 left-3 z-10 bg-black/70 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full font-medium max-w-[60%] truncate pointer-events-none border border-white/10 shadow-lg">
                🎵 {queue.find(t => t.url === currentUrl)?.title || currentUrl}
              </div>
            </div>

            {/* Control Bar — chỉ Owner */}
            {isOwner && (
              <div className="h-16 bg-black/40 backdrop-blur-md border-t border-white/10 flex items-center justify-center gap-4 px-4 shrink-0 shadow-lg">
                {/* Loop */}
                <button
                  onClick={handleLoop}
                  className={`p-2.5 rounded-full transition-all shadow-sm ${
                    loopMode !== 'off'
                      ? 'bg-blue-500/30 text-blue-300 border border-blue-500/30'
                      : 'text-white/50 hover:text-white hover:bg-white/10 border border-transparent'
                  }`}
                  title={loopLabel}
                >
                  <LoopIcon />
                </button>

                {/* Play */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handlePlay}
                  className={`p-3 rounded-full transition-all shadow-md ${
                    playbackState.isPlaying
                      ? 'bg-primary/20 text-primary border border-primary/30 shadow-[0_0_15px_rgba(139,92,246,0.3)]'
                      : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
                  }`}
                  title="Phát"
                >
                  <Play className="w-6 h-6 fill-current" />
                </motion.button>

                {/* Pause */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handlePause}
                  className={`p-3 rounded-full transition-all shadow-md ${
                    !playbackState.isPlaying
                      ? 'bg-primary/20 text-primary border border-primary/30 shadow-[0_0_15px_rgba(139,92,246,0.3)]'
                      : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
                  }`}
                  title="Tạm dừng"
                >
                  <Pause className="w-6 h-6 fill-current" />
                </motion.button>

                {/* Next */}
                <button
                  onClick={handleNext}
                  className="p-2.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-all border border-transparent hover:border-white/10"
                  title="Bài tiếp theo"
                >
                  <SkipForward className="w-5 h-5" />
                </button>

                {/* Loop mode label */}
                <span className="text-[11px] font-medium text-white/50 ml-2 select-none min-w-[50px] drop-shadow-sm">
                  {loopLabel}
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-white/50 bg-transparent p-6 text-center">
            <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-6 shadow-inner border border-white/10">
              <PlaySquare className="w-12 h-12 text-white/30" />
            </div>
            <p className="font-bold text-lg text-white mb-2 drop-shadow-sm">Chưa có bài hát nào đang phát.</p>
            <p className="text-sm">Dán link YouTube, SoundCloud... vào ô bên phải để thêm nhạc!</p>
          </div>
        )}
      </div>

      {/* Playlist Sidebar */}
      <div className="w-full md:w-80 bg-black/20 backdrop-blur-md border-l border-white/10 flex flex-col shrink-0">
        <div className="p-4 border-b border-white/10 bg-black/10">
          <h3 className="font-bold text-white flex items-center gap-2 mb-4 drop-shadow-sm">
            <ListMusic className="w-5 h-5 text-blue-400" /> Hàng đợi nhạc
          </h3>
          <form onSubmit={handleAddTrack} className="flex gap-2">
            <input
              type="text"
              placeholder="Dán link bài hát..."
              className="flex-1 glass-input rounded-xl text-sm text-white px-4 py-2.5 outline-none placeholder:text-white/40"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
            />
            <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2.5 rounded-xl transition-all shadow-md shrink-0 border border-blue-500/50">
              <Plus className="w-5 h-5" />
            </button>
          </form>
        </div>

        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
          {queue.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-white/30">
              <ListMusic className="w-8 h-8 mb-2" />
              <p className="text-sm">Danh sách trống</p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {queue.map((track, idx) => (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    layout
                    key={track.id}
                    className={`relative p-3 rounded-xl flex flex-col gap-1 transition-all cursor-default border ${
                      currentUrl === track.url ? 'bg-primary/20 border-primary/40 shadow-[0_0_15px_rgba(139,92,246,0.15)]' : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10'
                    }`}
                  >
                    <div className="text-sm font-bold text-white truncate pr-8 drop-shadow-sm" title={track.title}>
                      <span className="text-white/40 mr-1.5 font-normal">{idx + 1}.</span>
                      {track.title}
                    </div>
                    <div className="text-[11px] text-white/50 flex justify-between items-center mt-1">
                      <span>Thêm bởi: {track.addedBy}</span>
                      {currentUrl === track.url && (
                        <span className="text-primary font-bold uppercase tracking-wider bg-primary/20 px-1.5 py-0.5 rounded backdrop-blur-sm animate-pulse">
                          {playbackState.isPlaying ? '▶ Đang phát' : '⏸ Đã dừng'}
                        </span>
                      )}
                    </div>
                    {isOwner && (
                      <button
                        onClick={() => handleDeleteTrack(track.id)}
                        className="absolute top-3 right-3 text-white/30 hover:text-red-400 hover:bg-red-500/20 transition-all p-1.5 rounded-lg shadow-sm opacity-50 hover:opacity-100 backdrop-blur-sm"
                        title="Xóa khỏi danh sách"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
