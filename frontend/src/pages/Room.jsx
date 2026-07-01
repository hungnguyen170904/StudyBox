import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRoomStore } from '../store/roomStore';
import { useChatStore } from '../store/chatStore';
import { Hash, Volume2, Music, ArrowLeft, UserPlus, PenTool } from 'lucide-react';
import MessageList from '../components/Chat/MessageList';
import MessageInput from '../components/Chat/MessageInput';
import MusicChannel from '../components/MusicPlayer/MusicChannel';
import VoiceChannel from '../components/VoiceChannel/VoiceChannel';
import RoomMembers from '../components/Room/RoomMembers';
import InviteModal from '../components/Room/InviteModal';
import Whiteboard from '../components/Whiteboard/Whiteboard';
import { useAuthStore } from '../store/authStore';

export default function Room() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentRoom, fetchRoomDetails, clearCurrentRoom, isLoading } = useRoomStore();
  const { initSocket, disconnectSocket, joinChannel, leaveChannel } = useChatStore();
  const { user } = useAuthStore();
  
  const [activeChannel, setActiveChannel] = useState(null);
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  useEffect(() => {
    fetchRoomDetails(id);
    initSocket();

    return () => {
      clearCurrentRoom();
      disconnectSocket();
    };
  }, [id, fetchRoomDetails, initSocket, clearCurrentRoom, disconnectSocket]);

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
      default: return <Hash className="w-4 h-4" />;
    }
  };

  const isOwner = currentRoom.members?.find(m => m.id === user?.id)?.role === 'owner';

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
          <div className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 px-2 mt-2 drop-shadow-sm">
            Kênh Text & Voice
          </div>
          {currentRoom.channels.map(channel => (
            <button
              key={channel.id}
              onClick={() => setActiveChannel(channel)}
              className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg transition-all text-sm font-medium ${
                activeChannel?.id === channel.id 
                  ? 'bg-white/20 text-white shadow-sm' 
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              {getChannelIcon(channel.type)}
              {channel.name}
            </button>
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

          {/* Icon Mời bạn bè */}
          {isOwner && (
            <button 
              onClick={() => setIsInviteOpen(true)}
              className="flex items-center gap-2 text-sm font-bold text-white/70 hover:text-white hover:bg-white/10 px-3 py-1.5 rounded-lg transition-all"
            >
              <UserPlus className="w-4 h-4" />
              Mời
            </button>
          )}
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

      {/* Modal Invite */}
      <InviteModal 
        isOpen={isInviteOpen} 
        onClose={() => setIsInviteOpen(false)} 
        roomId={id} 
      />
    </div>
  );
}
