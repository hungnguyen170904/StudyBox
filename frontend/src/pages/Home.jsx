import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useRoomStore } from '../store/roomStore';
import { useFriendStore } from '../store/friendStore';
import { useChatStore } from '../store/chatStore';
import { LogOut, Plus, Users, Compass, User, MessageCircle } from 'lucide-react';
import FriendList from '../components/Friends/FriendList';
import DirectMessage from '../components/Friends/DirectMessage';
import ProfileSettings from '../components/ProfileSettings';
import NotificationDropdown from '../components/Notifications/NotificationDropdown';
import { useNotificationStore } from '../store/notificationStore';
import { Bell, Search, Lock } from 'lucide-react';

export default function Home() {
  const { user, logout } = useAuthStore();
  const { rooms, fetchRooms, createRoom, isLoading } = useRoomStore();
  const { friends, fetchFriends } = useFriendStore();
  const { onlineUsers } = useChatStore();
  
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('rooms'); // 'rooms', 'friends', 'dm_xxx'
  const [newRoomName, setNewRoomName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [activeDmUser, setActiveDmUser] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { fetchNotifications, listenSocketEvents, unreadCount } = useNotificationStore();

  useEffect(() => {
    fetchFriends();
    fetchNotifications();
  }, [fetchFriends, fetchNotifications]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRooms(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, fetchRooms]);

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    
    setIsCreating(true);
    const room = await createRoom(newRoomName);
    setIsCreating(false);
    
    if (room) {
      setNewRoomName('');
      navigate(`/room/${room.id}`);
    }
  };

  const handleStartDm = (friend) => {
    setActiveDmUser(friend);
    setActiveTab(`dm_${friend.id || friend.friendship_id}`);
  };

  return (
    <div className="h-screen bg-transparent flex overflow-hidden text-textMain">
      
      {/* Cột trái (Sidebar DM & Friends) */}
      <div className="w-60 glass-sidebar flex flex-col shrink-0">
        <div className="h-14 flex items-center justify-center border-b border-white/10 shadow-sm px-4">
          <input 
            type="text" 
            placeholder="Tìm kiếm hoặc bắt chuyện" 
            className="w-full glass-input text-xs px-3 py-1.5 rounded-full outline-none placeholder-white/50" 
          />
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          <button 
            onClick={() => setActiveTab('friends')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${activeTab === 'friends' ? 'bg-surfaceLight/70 text-white' : 'text-textMuted hover:bg-surfaceLight/30 hover:text-white'}`}
          >
            <Users className="w-5 h-5" />
            <span className="font-medium">Bạn bè</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('rooms')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${activeTab === 'rooms' ? 'bg-surfaceLight/70 text-white' : 'text-textMuted hover:bg-surfaceLight/30 hover:text-white'}`}
          >
            <Compass className="w-5 h-5" />
            <span className="font-medium">Phòng học</span>
          </button>

          <div className="mt-4 pt-4 border-t border-surfaceLight/20">
            <h3 className="text-xs font-bold text-textMuted uppercase tracking-wider px-3 mb-2 flex justify-between items-center hover:text-white cursor-pointer">
              Tin nhắn trực tiếp
              <Plus className="w-3 h-3" />
            </h3>
            
            {friends.map(friend => (
              <button 
                key={friend.friendship_id}
                onClick={() => handleStartDm(friend)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${activeTab === 'dm_' + (friend.id || friend.friendship_id) ? 'bg-surfaceLight/70 text-white' : 'text-textMuted hover:bg-surfaceLight/30 hover:text-white'}`}
              >
                <div className="relative w-8 h-8 rounded-full bg-surfaceLight flex items-center justify-center shrink-0 overflow-hidden">
                  {friend.avatar_url ? (
                    <img src={friend.avatar_url} alt={friend.username} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-textMuted" />
                  )}
                  {/* Hiệu ứng online thực tế qua socket */}
                  <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-black/40 ${
                    onlineUsers.includes(friend.id || friend.friendship_id) ? 'bg-green-500' : 'bg-gray-500'
                  }`}></div>
                </div>
                <div className="flex flex-col truncate text-left w-full">
                  <span className="truncate text-sm">{friend.display_name || friend.username}</span>
                  {(friend.display_name && friend.display_name !== friend.username) && (
                    <span className="text-[10px] text-textMuted truncate">@{friend.username}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* User profile ở đáy sidebar */}
        <div className="h-14 bg-black/40 flex items-center px-2 justify-between shrink-0 border-t border-white/10 relative">
          <div 
            onClick={() => setIsProfileOpen(true)}
            className="flex items-center gap-2 hover:bg-white/10 p-1 rounded cursor-pointer transition-colors max-w-[120px]"
          >
            <div className="relative w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0 overflow-hidden">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={user.display_name || user?.username} className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5 text-white/70" />
              )}
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-black/40"></div>
            </div>
            <div className="flex flex-col truncate">
              <span className="text-sm font-bold text-white truncate">{user?.display_name || user?.username}</span>
              <span className="text-[10px] text-white/50 truncate">@{user?.username}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="relative p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-md transition-colors"
              title="Thông báo"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-[#1E1F22]"></span>
              )}
            </button>
            <button 
              onClick={logout}
              className="p-2 text-white/50 hover:text-red-400 hover:bg-white/10 rounded-md transition-colors"
              title="Đăng xuất"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
          <NotificationDropdown isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col bg-transparent min-w-0">
        
        {activeTab === 'friends' && (
          <FriendList onStartDm={handleStartDm} />
        )}

        {activeTab.startsWith('dm_') && (
          <DirectMessage friend={activeDmUser} />
        )}

        {activeTab === 'rooms' && (
          <div className="flex-1 overflow-y-auto">
            <header className="border-b border-surfaceLight/30 h-14 flex items-center px-6 shadow-sm shrink-0 font-semibold text-textMain gap-2">
              <Compass className="w-5 h-5 text-textMuted" /> Khám phá phòng học
            </header>
            
            <div className="p-6 max-w-5xl mx-auto flex flex-col md:flex-row gap-8">
              <div className="w-full md:w-1/3">
                <div className="glass-panel p-6 rounded-xl">
                  <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2 drop-shadow-sm">
                    <Plus className="w-5 h-5 text-white" />
                    Tạo phòng mới
                  </h2>
                  <form onSubmit={handleCreateRoom}>
                    <input
                      type="text"
                      placeholder="Tên phòng (VD: Nhóm học Toán)"
                      className="w-full glass-input rounded-lg px-4 py-2.5 mb-4 text-sm"
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                    />
                    <button
                      type="submit"
                      disabled={isCreating || !newRoomName.trim()}
                      className="w-full py-2.5 bg-white/20 hover:bg-white/30 border border-white/30 text-white rounded-lg font-medium transition-all shadow-lg backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {isCreating ? 'Đang tạo...' : 'Tạo phòng'}
                    </button>
                  </form>
                </div>
              </div>

              <div className="w-full md:w-2/3">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-white drop-shadow-sm flex-1">Phòng cộng đồng</h2>
                  <div className="relative flex-1 max-w-xs mx-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                    <input 
                      type="text"
                      placeholder="Tìm kiếm phòng..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-full py-1.5 pl-9 pr-4 text-sm text-white placeholder-white/50 focus:outline-none focus:border-white/40 transition-colors"
                    />
                  </div>
                  <button onClick={() => fetchRooms(searchQuery)} className="text-sm text-white/70 hover:text-white hover:underline font-medium transition-colors shrink-0">Làm mới</button>
                </div>

                {isLoading ? (
                  <div className="flex justify-center p-8">
                    <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                  </div>
                ) : rooms.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {rooms.map(room => (
                      <div 
                        key={room.id}
                        onClick={() => navigate(`/room/${room.id}`)}
                        className="bg-black/20 hover:bg-black/40 backdrop-blur-sm border border-white/10 p-5 rounded-xl cursor-pointer transition-all group flex flex-col relative"
                      >
                        {!room.is_public && (
                          <div className="absolute top-3 right-3 text-white/40" title="Phòng riêng tư">
                            <Lock className="w-4 h-4" />
                          </div>
                        )}
                        <h3 className="font-bold text-white mb-1 group-hover:text-blue-300 transition-colors pr-6 truncate">{room.name}</h3>
                        <p className="text-sm text-white/60">Tạo bởi: {room.owner_name}</p>
                        <div className="mt-4 flex justify-between items-center text-xs font-semibold">
                          <span className="text-white/50">{new Date(room.created_at).toLocaleDateString('vi-VN')}</span>
                          <span className="bg-white/10 text-white px-3 py-1.5 rounded-lg group-hover:bg-white group-hover:text-black transition-colors">Tham gia</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-12 border-2 border-dashed border-white/20 rounded-xl text-white/60 glass-panel">
                    Chưa có phòng nào. Hãy là người đầu tiên tạo phòng!
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      <ProfileSettings isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </div>
  );
}
