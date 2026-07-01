import { useEffect, useState } from 'react';
import { useFriendStore } from '../../store/friendStore';
import { useAuthStore } from '../../store/authStore';
import { User, Check, X, UserPlus, Clock } from 'lucide-react';

export default function FriendList({ onStartDm }) {
  const { friends, pending, sent, fetchFriends, sendRequest, respondRequest, isLoading } = useFriendStore();
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'pending', 'add'
  const [usernameInput, setUsernameInput] = useState('');
  const [addMessage, setAddMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  const handleSendRequest = async (e) => {
    e.preventDefault();
    if (!usernameInput.trim()) return;
    
    setAddMessage({ text: 'Đang gửi...', type: 'info' });
    const success = await sendRequest(usernameInput.trim());
    if (success) {
      setAddMessage({ text: `Đã gửi yêu cầu kết bạn đến ${usernameInput}`, type: 'success' });
      setUsernameInput('');
    } else {
      setAddMessage({ text: 'Lỗi: Không tìm thấy người dùng hoặc đã gửi yêu cầu rồi.', type: 'error' });
    }
    setTimeout(() => setAddMessage({ text: '', type: '' }), 4000);
  };

  const handleRespond = async (friendId, action) => {
    await respondRequest(friendId, action);
  };

  const renderFriend = (friend) => (
    <div key={friend.friendship_id} className="flex items-center justify-between p-3 glass-panel hover:bg-white/20 rounded-xl transition-all border-none">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
          {friend.avatar_url ? (
            <img src={friend.avatar_url} alt={friend.display_name || friend.username} className="w-full h-full object-cover" />
          ) : (
            <User className="w-6 h-6 text-white/70" />
          )}
        </div>
        <div className="flex flex-col text-left">
          <span className="font-bold text-white leading-tight text-[15px] drop-shadow-sm">{friend.display_name || friend.username}</span>
          {(friend.display_name && friend.display_name !== friend.username) && (
            <span className="text-xs text-white/50 leading-tight">@{friend.username}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button 
          onClick={() => onStartDm && onStartDm(friend)}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-sm font-medium text-white rounded-lg transition-all border border-white/20 shadow-sm"
        >
          Nhắn tin
        </button>
      </div>
    </div>
  );

  const renderPending = (request, isSent = false) => (
    <div key={request.friendship_id} className="flex items-center justify-between p-3 glass-panel hover:bg-white/20 rounded-xl transition-all border-none">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
          {request.avatar_url ? (
            <img src={request.avatar_url} alt={request.display_name || request.username} className="w-full h-full object-cover" />
          ) : (
            <User className="w-6 h-6 text-white/70" />
          )}
        </div>
        <div className="flex flex-col text-left">
          <span className="font-bold text-white leading-tight text-[15px] drop-shadow-sm">{request.display_name || request.username}</span>
          <span className="text-xs text-white/70 leading-tight">
            {isSent ? 'Yêu cầu bạn đã gửi' : 'Yêu cầu kết bạn tới'} {request.display_name && request.display_name !== request.username ? `(@${request.username})` : ''}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {!isSent ? (
          <>
            <button 
              onClick={() => handleRespond(request.id, 'accept')}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-green-500 text-white flex items-center justify-center transition-all border border-white/20 shadow-sm"
              title="Chấp nhận"
            >
              <Check className="w-5 h-5" />
            </button>
            <button 
              onClick={() => handleRespond(request.id, 'reject')}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-red-500 text-white flex items-center justify-center transition-all border border-white/20 shadow-sm"
              title="Từ chối"
            >
              <X className="w-5 h-5" />
            </button>
          </>
        ) : (
          <button 
            onClick={() => handleRespond(request.id, 'reject')} // Hủy yêu cầu đã gửi
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-red-500 text-white flex items-center justify-center transition-all border border-white/20 shadow-sm"
            title="Hủy yêu cầu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-transparent">
      {/* Top Navigation */}
      <div className="h-14 border-b border-white/10 flex items-center px-4 gap-6 shrink-0 shadow-sm backdrop-blur-sm bg-black/10">
        <div className="flex items-center gap-2 text-white font-semibold border-r border-white/20 pr-6">
          <User className="w-5 h-5 text-white/70" />
          Bạn bè
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'all' ? 'bg-white/20 text-white shadow-sm' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
          >
            Tất cả
          </button>
          <button 
            onClick={() => setActiveTab('pending')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'pending' ? 'bg-white/20 text-white shadow-sm' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
          >
            Đang chờ
            {pending.length > 0 && (
              <span className="bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                {pending.length}
              </span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('add')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'add' ? 'bg-green-500 text-white shadow-md' : 'bg-green-500/80 text-white hover:bg-green-500'}`}
          >
            Thêm bạn
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-black/20 backdrop-blur-sm">
        {isLoading && friends.length === 0 ? (
          <div className="flex justify-center mt-10">
            <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
          </div>
        ) : activeTab === 'all' ? (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xs font-bold text-white/70 uppercase tracking-wider mb-4 drop-shadow-sm">
              Tất cả bạn bè — {friends.length}
            </h2>
            {friends.length === 0 ? (
              <div className="text-center text-white/50 mt-10 p-8 glass-panel rounded-xl">Bạn chưa có người bạn nào. Hãy thêm bạn mới!</div>
            ) : (
              <div className="space-y-2">
                {friends.map(renderFriend)}
              </div>
            )}
          </div>
        ) : activeTab === 'pending' ? (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xs font-bold text-white/70 uppercase tracking-wider mb-4 drop-shadow-sm">
              Đang chờ xử lý — {pending.length + sent.length}
            </h2>
            {pending.length === 0 && sent.length === 0 ? (
              <div className="text-center text-white/50 mt-10 p-8 glass-panel rounded-xl">Không có lời mời nào đang chờ.</div>
            ) : (
              <div className="space-y-2">
                {pending.map(p => renderPending(p, false))}
                {sent.map(s => renderPending(s, true))}
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-2xl mx-auto glass-panel p-8 rounded-2xl mt-4">
            <h2 className="text-xl font-bold text-white mb-2 drop-shadow-sm">Thêm bạn</h2>
            <p className="text-sm text-white/70 mb-6">
              Bạn có thể thêm bạn bè bằng tên người dùng (username) định danh của họ.
            </p>
            <form onSubmit={handleSendRequest} className="relative flex gap-3">
              <input 
                type="text" 
                placeholder="Nhập tên định danh..."
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                className="flex-1 glass-input rounded-xl px-4 py-3 text-white placeholder:text-white/50"
              />
              <button 
                type="submit"
                disabled={!usernameInput.trim()}
                className="bg-[#5865F2] hover:bg-[#4752C4] disabled:bg-[#5865F2]/50 text-white px-6 py-3 rounded-xl font-medium transition-all shadow-md shrink-0"
              >
                Gửi yêu cầu
              </button>
            </form>
            {addMessage.text && (
              <div className={`mt-4 text-sm font-medium p-3 rounded-lg backdrop-blur-sm ${addMessage.type === 'success' ? 'bg-green-500/20 text-green-200 border border-green-500/30' : addMessage.type === 'error' ? 'bg-red-500/20 text-red-200 border border-red-500/30' : 'bg-white/10 text-white'}`}>
                {addMessage.text}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
