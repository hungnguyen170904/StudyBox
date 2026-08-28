import { useEffect, useState, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRoomStore } from '../store/roomStore';
import { useChatStore } from '../store/chatStore';
import {
  Hash, Volume2, Music, ArrowLeft, UserPlus,
  PenTool, FileText, Settings, CheckSquare, Plus, ChevronDown, Menu
} from 'lucide-react';
import MessageList from '../components/Chat/MessageList';
import MessageInput from '../components/Chat/MessageInput';
import RoomMembers from '../components/Room/RoomMembers';
import InviteModal from '../components/Room/InviteModal';
import RoomSettingsModal from '../components/Room/RoomSettingsModal';
import CreateChannelModal from '../components/Room/CreateChannelModal';
import RoomTasksModal from '../components/Room/RoomTasksModal';
import PomodoroTimer from '../components/Room/PomodoroTimer';

// Lazy-loaded components for better performance
const MusicChannel = lazy(() => import('../components/MusicPlayer/MusicChannel'));
const VoiceChannel = lazy(() => import('../components/VoiceChannel/VoiceChannel'));
const Whiteboard = lazy(() => import('../components/Whiteboard/Whiteboard'));
const DocumentChannel = lazy(() => import('../components/DocumentChannel/DocumentChannel'));
import { useAuthStore } from '../store/authStore';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Channel meta ────────────────────────────────────────────────────────────
const CHANNEL_META = {
  text:       { icon: Hash,     color: 'text-violet-400',  bg: 'bg-violet-500/10', label: 'VĂN BẢN'    },
  voice:      { icon: Volume2,  color: 'text-green-400',   bg: 'bg-green-500/10',  label: 'GIỌNG NÓI'  },
  music:      { icon: Music,    color: 'text-amber-400',   bg: 'bg-amber-500/10',  label: 'ÂM NHẠC'    },
  whiteboard: { icon: PenTool,  color: 'text-pink-400',    bg: 'bg-pink-500/10',   label: 'BẢNG TRẮNG' },
  document:   { icon: FileText, color: 'text-cyan-400',    bg: 'bg-cyan-500/10',   label: 'TÀI LIỆU'   },
};

function ChannelIcon({ type, className = 'w-4 h-4' }) {
  const meta = CHANNEL_META[type] || CHANNEL_META.text;
  const Icon = meta.icon;
  return <Icon className={`${className} ${meta.color}`} />;
}

// Group channels by type for sidebar sections
function groupChannels(channels) {
  const order = ['text', 'voice', 'whiteboard', 'music', 'document'];
  const groups = {};
  channels.forEach(ch => {
    if (!groups[ch.type]) groups[ch.type] = [];
    groups[ch.type].push(ch);
  });
  return order.filter(t => groups[t]).map(t => ({ type: t, channels: groups[t] }));
}

export default function Room() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentRoom, fetchRoomDetails, clearCurrentRoom, isLoading } = useRoomStore();
  const { joinChannel, leaveChannel, getSocket } = useChatStore();
  const { user } = useAuthStore();

  const [activeChannel, setActiveChannel] = useState(null);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [isTasksOpen, setIsTasksOpen] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetchRoomDetails(id);
    const socket = getSocket();
    if (socket) socket.emit('join_room', id);
    return () => {
      clearCurrentRoom();
      if (socket) socket.emit('leave_room', id);
    };
  }, [id, fetchRoomDetails, clearCurrentRoom, getSocket]);

  useEffect(() => {
    if (currentRoom?.channels?.length > 0 && !activeChannel) {
      const textChannel = currentRoom.channels.find(c => c.type === 'text');
      if (textChannel) setActiveChannel(textChannel);
    }
  }, [currentRoom, activeChannel]);

  useEffect(() => {
    if (activeChannel) joinChannel(activeChannel.id);
    return () => { if (activeChannel) leaveChannel(activeChannel.id); };
  }, [activeChannel, joinChannel, leaveChannel]);

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (isLoading || !currentRoom) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-surfaceLight border-t-primary rounded-full animate-spin" />
          <p className="text-white/40 text-sm">Đang tải phòng học…</p>
        </div>
      </div>
    );
  }

  const currentUserRole = currentRoom.members?.find(m => m.id === user?.id)?.role;
  const isOwner = currentUserRole === 'owner';
  const isAdminOrOwner = ['owner', 'admin'].includes(currentUserRole);
  const onlineCount = currentRoom.members?.length || 0;
  const channelGroups = groupChannels(currentRoom.channels || []);

  const handleDeleteChannel = async (channelId) => {
    if (window.confirm('Bạn có chắc muốn xoá kênh này?')) {
      const { deleteChannel } = useRoomStore.getState();
      await deleteChannel(id, channelId);
      if (activeChannel?.id === channelId) setActiveChannel(currentRoom.channels[0]);
    }
  };

  const toggleGroupCollapse = (type) => {
    setCollapsedGroups(prev => ({ ...prev, [type]: !prev[type] }));
  };

  return (
    <div className="h-screen bg-transparent flex overflow-hidden relative">

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* ── Sidebar kênh ──────────────────────────────────────────── */}
      <div className={`fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 w-60 flex flex-col shrink-0 bg-black/80 md:bg-black/50 backdrop-blur-xl border-r border-white/[0.06] shadow-2xl md:shadow-none ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>

        {/* Room header */}
        <div
          onClick={() => navigate('/')}
          className="h-14 flex items-center gap-2.5 px-4 border-b border-white/[0.06] cursor-pointer group hover:bg-white/[0.03] transition-colors"
        >
          <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 group-hover:bg-primary/30 transition-colors">
            <ArrowLeft className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm truncate">{currentRoom.room.name}</p>
            <p className="text-white/40 text-[10px]">{onlineCount} thành viên</p>
          </div>
        </div>

        {/* Channel list */}
        <div className="flex-1 overflow-y-auto py-3 px-2 custom-scrollbar space-y-1">
          {channelGroups.map(({ type, channels }) => {
            const meta = CHANNEL_META[type] || CHANNEL_META.text;
            const isCollapsed = collapsedGroups[type];

            return (
              <div key={type} className="mb-1">
                {/* Group header */}
                <div
                  className="flex items-center justify-between px-2 py-1 cursor-pointer group/grp"
                  onClick={() => toggleGroupCollapse(type)}
                >
                  <div className="flex items-center gap-1.5">
                    <ChevronDown
                      className={`w-3 h-3 text-white/30 transition-transform duration-200 group-hover/grp:text-white/60 ${isCollapsed ? '-rotate-90' : ''}`}
                    />
                    <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider group-hover/grp:text-white/60 transition-colors">
                      {meta.label}
                    </span>
                  </div>
                  {isAdminOrOwner && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setIsCreateChannelOpen(true); }}
                      className="opacity-0 group-hover/grp:opacity-100 p-0.5 rounded text-white/40 hover:text-white hover:bg-white/10 transition-all"
                      title="Tạo kênh mới"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Channels in group */}
                <AnimatePresence initial={false}>
                  {!isCollapsed && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.18 }}
                      className="overflow-hidden"
                    >
                      {channels.map(channel => {
                        const isActive = activeChannel?.id === channel.id;
                        return (
                          <div key={channel.id} className="group/ch flex items-center pl-1">
                            <button
                              onClick={() => { setActiveChannel(channel); setIsMobileMenuOpen(false); }}
                              className={`relative flex-1 flex items-center gap-2 pl-2 pr-2 py-1.5 rounded-md text-sm font-medium transition-all duration-150 ${
                                isActive
                                  ? `${meta.bg} ${meta.color} channel-active`
                                  : 'text-white/50 hover:bg-white/[0.06] hover:text-white/80'
                              }`}
                            >
                              <ChannelIcon type={channel.type} className="w-4 h-4 shrink-0" />
                              <span className="truncate">{channel.name}</span>
                            </button>

                            {isAdminOrOwner && currentRoom.channels.length > 1 && (
                              <button
                                onClick={() => handleDeleteChannel(channel.id)}
                                className="opacity-0 group-hover/ch:opacity-100 p-1 mr-0.5 text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded transition-all shrink-0"
                                title="Xoá kênh"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6"/>
                                </svg>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Main area ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <div className="h-14 border-b border-white/[0.06] flex items-center justify-between px-3 md:px-5 shrink-0 bg-black/20 backdrop-blur-sm">
          {/* Left: breadcrumb */}
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-1 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors mr-1">
              <Menu className="w-5 h-5" />
            </button>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${activeChannel ? (CHANNEL_META[activeChannel.type]?.bg || 'bg-white/10') : 'bg-white/10'} hidden sm:flex`}>
              <ChannelIcon type={activeChannel?.type || 'text'} className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm truncate">
                {activeChannel?.name || 'Chưa chọn kênh'}
              </p>
              <p className="text-white/30 text-[10px] truncate">{currentRoom.room.name}</p>
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setIsTasksOpen(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-violet-300 hover:text-violet-200 hover:bg-violet-500/15 px-2 md:px-3 py-1.5 rounded-lg transition-all border border-violet-500/20"
              title="Kanban Tasks"
            >
              <CheckSquare className="w-4 h-4 md:w-3.5 md:h-3.5" />
              <span className="hidden sm:inline">Tasks</span>
            </button>

            {isOwner && (
              <>
                <button
                  onClick={() => setIsInviteOpen(true)}
                  className="flex items-center gap-1.5 text-xs font-medium text-white/60 hover:text-white hover:bg-white/10 px-2 md:px-3 py-1.5 rounded-lg transition-all"
                  title="Mời thành viên"
                >
                  <UserPlus className="w-4 h-4 md:w-3.5 md:h-3.5" />
                  <span className="hidden sm:inline">Mời</span>
                </button>
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                  title="Cài đặt phòng"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Content + Members panel */}
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col min-w-0">
            {activeChannel?.type === 'text' ? (
              <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)]">
                <MessageList channelId={activeChannel.id} onReply={(msg) => setReplyTo(msg)} />
                <MessageInput
                  channelId={activeChannel.id}
                  replyTo={replyTo}
                  onCancelReply={() => setReplyTo(null)}
                />
              </div>
            ) : (
              <Suspense fallback={
                <div className="flex-1 flex items-center justify-center text-white/50">
                  <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                </div>
              }>
                {activeChannel?.type === 'music' ? (
                  <MusicChannel channelId={activeChannel.id} />
                ) : activeChannel?.type === 'voice' ? (
                  <VoiceChannel channelId={activeChannel.id} />
                ) : activeChannel?.type === 'whiteboard' ? (
                  <Whiteboard channelId={activeChannel.id} />
                ) : activeChannel?.type === 'document' ? (
                  <DocumentChannel channelId={activeChannel.id} roomId={id} />
                ) : (
                  <div className="flex-1 flex items-center justify-center text-white/30 text-sm">
                    Kênh chưa được hỗ trợ.
                  </div>
                )}
              </Suspense>
            )}
          </div>

          <RoomMembers roomId={id} />
        </div>
      </div>

      {/* ── Modals ────────────────────────────────────────────────── */}
      <InviteModal isOpen={isInviteOpen} onClose={() => setIsInviteOpen(false)} roomId={id} />
      <RoomSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} roomId={id} />
      <CreateChannelModal isOpen={isCreateChannelOpen} onClose={() => setIsCreateChannelOpen(false)} roomId={id} />
      <RoomTasksModal isOpen={isTasksOpen} onClose={() => setIsTasksOpen(false)} roomId={id} />
      <PomodoroTimer roomId={id} />
    </div>
  );
}
