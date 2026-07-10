import { useState } from 'react';
import { useRoomStore } from '../../store/roomStore';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { Shield, User, Crown, UserMinus, LogOut, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function RoomMembers({ roomId }) {
  const { currentRoom, kickMember, changeMemberRole, leaveRoom } = useRoomStore();
  const { user: currentUser } = useAuthStore();
  const { onlineUsers } = useChatStore();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(false);

  if (!currentRoom) return null;

  const members = currentRoom.members || [];
  
  // Phân loại thành viên
  const owner = members.find(m => m.role === 'owner');
  const admins = members.filter(m => m.role === 'admin');
  const normalMembers = members.filter(m => m.role === 'member');

  // Quyền hiện tại
  const myRole = members.find(m => m.id === currentUser.id)?.role;
  const isOwner = myRole === 'owner';
  const isAdmin = myRole === 'admin';

  const handleKick = async (userId, username) => {
    if (window.confirm(`Bạn có chắc muốn đuổi ${username} khỏi phòng?`)) {
      setIsLoading(true);
      await kickMember(roomId, userId);
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    setIsLoading(true);
    await changeMemberRole(roomId, userId, newRole);
    setIsLoading(false);
  };

  const handleLeave = async () => {
    if (window.confirm('Bạn có chắc muốn rời phòng này?')) {
      setIsLoading(true);
      const success = await leaveRoom(roomId);
      setIsLoading(false);
      if (success) navigate('/');
    }
  };

  const renderMember = (member) => {
    const isMe = member.id === currentUser.id;
    return (
      <div key={member.id} className="group flex items-center justify-between p-2 hover:bg-white/10 rounded-xl transition-all cursor-default">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="relative w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
            {member.avatar_url ? (
              <img src={member.avatar_url} alt={member.display_name || member.username} className="w-full h-full object-cover" />
            ) : (
              <User className="w-5 h-5 text-white/70" />
            )}
            
            <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-black/40 ${
              onlineUsers.includes(member.id) ? 'bg-green-500' : 'bg-gray-500'
            }`}></div>
          </div>
          <div className="flex flex-col overflow-hidden text-left">
            <span className="text-sm font-bold text-white truncate leading-tight drop-shadow-sm">
              {member.display_name || member.username} {isMe && <span className="text-white/50 text-xs font-normal">(Bạn)</span>}
            </span>
            {(member.display_name && member.display_name !== member.username) && (
              <span className="text-[10px] text-white/50 truncate leading-tight">@{member.username}</span>
            )}
          </div>
        </div>

        {/* Các nút hành động */}
        <div className="hidden group-hover:flex items-center gap-1">
          {/* Owner thăng cấp member thành admin */}
          {isOwner && !isMe && member.role === 'member' && (
            <button 
              onClick={() => handleRoleChange(member.id, 'admin')}
              disabled={isLoading}
              className="flex items-center justify-center p-1.5 text-green-300 hover:bg-green-500/30 hover:text-green-100 rounded-lg transition-colors"
              title="Thăng cấp làm Quản trị viên"
            >
              <ArrowUpCircle className="w-4 h-4" />
            </button>
          )}

          {/* Owner giáng cấp admin thành member */}
          {isOwner && !isMe && member.role === 'admin' && (
            <button 
              onClick={() => handleRoleChange(member.id, 'member')}
              disabled={isLoading}
              className="flex items-center justify-center p-1.5 text-yellow-300 hover:bg-yellow-500/30 hover:text-yellow-100 rounded-lg transition-colors"
              title="Giáng cấp thành viên"
            >
              <ArrowDownCircle className="w-4 h-4" />
            </button>
          )}

          {/* Nút Kick: Owner kick ai cũng được (trừ mình), Admin kick được member */}
          {((isOwner && !isMe) || (isAdmin && member.role === 'member')) && (
            <button 
              onClick={() => handleKick(member.id, member.username)}
              disabled={isLoading}
              className="flex items-center justify-center p-1.5 text-red-300 hover:bg-red-500/30 hover:text-red-100 rounded-lg transition-colors"
              title="Đuổi khỏi phòng"
            >
              <UserMinus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-64 bg-black/20 backdrop-blur-md flex flex-col border-l border-white/10 shrink-0">
      <div className="h-14 flex items-center px-4 border-b border-white/10 font-bold text-white shadow-sm bg-black/10">
        Thành viên ({members.length})
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
        
        {/* Chủ phòng */}
        {owner && (
          <div>
            <div className="text-xs font-bold text-yellow-300/80 uppercase tracking-wider mb-2 px-2 flex items-center gap-1 drop-shadow-sm">
              <Crown className="w-3 h-3 text-yellow-400" />
              Chủ phòng - 1
            </div>
            {renderMember(owner)}
          </div>
        )}

        {/* Quản trị viên */}
        {admins.length > 0 && (
          <div>
            <div className="text-xs font-bold text-indigo-300/80 uppercase tracking-wider mb-2 px-2 flex items-center gap-1 drop-shadow-sm">
              <Shield className="w-3 h-3 text-indigo-400" />
              Quản trị viên - {admins.length}
            </div>
            {admins.map(renderMember)}
          </div>
        )}

        {/* Thành viên */}
        {normalMembers.length > 0 && (
          <div>
            <div className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 px-2 drop-shadow-sm">
              Thành viên - {normalMembers.length}
            </div>
            {normalMembers.map(renderMember)}
          </div>
        )}

      </div>

      {/* Rời phòng */}
      {!isOwner && (
        <div className="p-4 border-t border-white/10">
          <button 
            onClick={handleLeave}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 text-sm font-medium text-red-300 hover:bg-red-500/20 hover:text-red-100 py-2.5 rounded-xl transition-colors border border-red-500/20 shadow-sm"
          >
            <LogOut className="w-4 h-4" />
            Rời phòng
          </button>
        </div>
      )}
    </div>
  );
}
