import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRoomStore } from '../store/roomStore';
import { useChatStore } from '../store/chatStore';
import { Hash, Volume2, Music, ArrowLeft, UserPlus, PenTool, FileText, Settings } from 'lucide-react';
import MessageList from '../components/Chat/MessageList';
import MessageInput from '../components/Chat/MessageInput';
import MusicChannel from '../components/MusicPlayer/MusicChannel';
import VoiceChannel from '../components/VoiceChannel/VoiceChannel';
import RoomMembers from '../components/Room/RoomMembers';
import InviteModal from '../components/Room/InviteModal';
import RoomSettingsModal from '../components/Room/RoomSettingsModal';
import CreateChannelModal from '../components/Room/CreateChannelModal';
import Whiteboard from '../components/Whiteboard/Whiteboard';
import DocumentChannel from '../components/DocumentChannel/DocumentChannel';
import { useAuthStore } from '../store/authStore';

export default function Room() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentRoom, fetchRoomDetails, clearCurrentRoom, isLoading } = useRoomStore();
  const { joinChannel, leaveChannel } = useChatStore();
  const { user } = useAuthStore();
  
  const [activeChannel, setActiveChannel] = useState(null);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);

  useEffect(() => {
    fetchRoomDetails(id);

    return () => {
      clearCurrentRoom();
    };
  }, [id, fetchRoomDetails, clearCurrentRoom]);

  useEffect(() => {
    // Tự động chọn kênh text đầu tiên khi load xong phòng
    if (currentRoom?.channels?.length > 0 && !activeChannel) {
      const textChannel = currentRoom.channels.find(c => c.type === 'text');
      if (textChannel) {
        setActiveChannel(textChannel);
      }
    }
  }, [currentRoom, activeChannel]);

  useEffect(() => {
    if (activeChannel) {
      joinChannel(activeChannel.id);
    }
    return () => {
      if (activeChannel) {
        leaveChannel(activeChannel.id);
      }
    };
  }, [activeChannel, joinChannel, leaveChannel]);

  if (isLoading || !currentRoom) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-surfaceLight border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  const getChannelIcon = (type) => {
    switch (type) {
      case 'text': return <Hash className="w-4 h-4" />;
      case 'voice': return <Volume2 className="w-4 h-4" />;
      case 'music': return <Music className="w-4 h-4" />;
      case 'whiteboard': return <PenTool className="w-4 h-4" />;
      case 'document': return <FileText className="w-4 h-4" />;
      default: return <Hash className="w-4 h-4" />;
    }
  };

  const currentUserRole = currentRoom.members?.find(m => m.id === user?.id)?.role;
  const isOwner = currentUserRole === 'owner';
  const isAdminOrOwner = ['owner', 'admin'].includes(currentUserRole);

  const handleDeleteChannel = async (channelId) => {
    if (window.confirm('Bạn có chắc muốn xoá kênh này? Toàn bộ dữ liệu bên trong sẽ biến mất.')) {
      const { deleteChannel } = useRoomStore.getState();
      await deleteChannel(id, channelId);
      if (activeChannel?.id === channelId) {
        setActiveChannel(currentRoom.channels[0]); // Chuyển về kênh đầu tiên
      }
    }
  };

  return (
    <div className="h-screen bg-transparent flex overflow-hidden">
      {/* Sidebar Channels */}
      <div className="w-64 bg-black/40 backdrop-blur-md flex flex-col border-r border-white/10 shrink-0">
        <div className="h-14 flex items-center justify-between px-4 border-b border-white/10 font-semibold text-white shadow-sm transition-colors bg-black/20">
          <div className="flex items-center gap-2 cursor-pointer hover:text-white/70 truncate drop-shadow-sm" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 text-white/70" />
            <span className="truncate">{currentRoom.room.name}</span>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
          <div className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 px-2 mt-2 drop-shadow-sm flex items-center justify-between">
            KÊNH TRONG PHÒNG
            {isAdminOrOwner && (
              <button 
                onClick={() => setIsCreateChannelOpen(true)}
                className="hover:bg-white/10 p-1 rounded transition-colors text-white/50 hover:text-white"
                title="Tạo kênh mới"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
              </button>
            )}
          </div>
          {currentRoom.channels.map(channel => (
            <div key={channel.id} className="group flex items-center w-full">
              <button
                onClick={() => setActiveChannel(channel)}
                className={`flex-1 flex items-center gap-2 px-2 py-2 rounded-lg transition-all text-sm font-medium ${
                  activeChannel?.id === channel.id 
                    ? 'bg-white/20 text-white shadow-sm' 
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                {getChannelIcon(channel.type)}
                <span className="truncate">{channel.name}</span>
              </button>
              
              {isAdminOrOwner && currentRoom.channels.length > 1 && (
                <button
                  onClick={() => handleDeleteChannel(channel.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 ml-1 text-white/50 hover:text-red-400 hover:bg-white/10 rounded transition-all shrink-0"
                  title="Xoá kênh"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6"/></svg>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-black/20 backdrop-blur-sm min-w-0">
        {/* Header */}
        <div className="h-14 border-b border-white/10 flex items-center justify-between px-6 shadow-sm shrink-0">
          <h2 className="font-bold text-white flex items-center gap-2 drop-shadow-sm">
            {activeChannel ? (
              <>
                <span className="text-white/50">{getChannelIcon(activeChannel.type)}</span>
                {activeChannel.name}
              </>
            ) : 'Đang chọn kênh...'}
          </h2>

          {/* Các nút hành động (Mời & Cài đặt) */}
          <div className="flex items-center gap-2">
            {isOwner && (
              <>
                <button 
                  onClick={() => setIsInviteOpen(true)}
                  className="flex items-center gap-2 text-sm font-bold text-white/70 hover:text-white hover:bg-white/10 px-3 py-1.5 rounded-lg transition-all"
                  title="Mời bạn bè"
                >
                  <UserPlus className="w-4 h-4" />
                  Mời
                </button>
                <button 
                  onClick={() => setIsSettingsOpen(true)}
                  className="flex items-center gap-2 text-sm font-bold text-white/70 hover:text-white hover:bg-white/10 px-2 py-1.5 rounded-lg transition-all"
                  title="Cài đặt phòng"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Cấu trúc Content + Sidebar Thành viên */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Content (Chat / Music / Voice / Whiteboard) */}
          <div className="flex-1 flex flex-col min-w-0">
            {activeChannel?.type === 'text' ? (
              <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)]">
                <MessageList channelId={activeChannel.id} />
                <MessageInput channelId={activeChannel.id} />
              </div>
            ) : activeChannel?.type === 'music' ? (
              <MusicChannel channelId={activeChannel.id} />
            ) : activeChannel?.type === 'voice' ? (
              <VoiceChannel channelId={activeChannel.id} />
            ) : activeChannel?.type === 'whiteboard' ? (
              <Whiteboard channelId={activeChannel.id} />
            ) : activeChannel?.type === 'document' ? (
              <DocumentChannel channelId={activeChannel.id} roomId={id} />
            ) : (
              <div className="flex-1 flex items-center justify-center text-white/50">
                Kênh này chưa được hỗ trợ.
              </div>
            )}
          </div>

          {/* Danh sách thành viên bên phải (Chỉ hiện khi ở kênh Text/Voice, Music thì không cần hoặc tùy chỉnh) */}
          <RoomMembers roomId={id} />

        </div>
      </div>

      {/* Modals */}
      <InviteModal 
        isOpen={isInviteOpen} 
        onClose={() => setIsInviteOpen(false)} 
        roomId={id} 
      />
      <RoomSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        roomId={id}
      />
      <CreateChannelModal
        isOpen={isCreateChannelOpen}
        onClose={() => setIsCreateChannelOpen(false)}
        roomId={id}
      />
    </div>
  );
}
