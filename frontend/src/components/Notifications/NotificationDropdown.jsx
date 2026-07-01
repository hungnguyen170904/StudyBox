import React, { useEffect, useRef } from 'react';
import { useNotificationStore } from '../../store/notificationStore';
import { UserPlus, UserCheck, Bell, Info, CheckCheck, X } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

export default function NotificationDropdown({ isOpen, onClose }) {
  const dropdownRef = useRef(null);
  const { notifications, unreadCount, markAsRead, markAllAsRead, fetchNotifications } = useNotificationStore();

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getIcon = (type) => {
    switch (type) {
      case 'friend_request': return <UserPlus className="w-5 h-5 text-blue-400" />;
      case 'friend_accept': return <UserCheck className="w-5 h-5 text-green-400" />;
      case 'room_invite': return <Bell className="w-5 h-5 text-yellow-400" />;
      default: return <Info className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div 
      ref={dropdownRef} 
      className="absolute bottom-full left-0 mb-3 w-80 max-h-[28rem] flex flex-col glass-panel shadow-2xl border border-white/10 rounded-2xl z-50 overflow-hidden backdrop-blur-xl animate-in slide-in-from-bottom-4 fade-in duration-200"
    >
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/20">
        <h3 className="font-bold text-white drop-shadow-sm flex items-center gap-2">
          Thông báo
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
              {unreadCount} mới
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button 
              onClick={markAllAsRead}
              className="text-xs text-white/50 hover:text-white transition-colors flex items-center gap-1"
              title="Đánh dấu tất cả đã đọc"
            >
              <CheckCheck className="w-4 h-4" />
            </button>
          )}
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
        {notifications.length === 0 ? (
          <div className="text-center text-white/50 py-8 text-sm">
            Bạn không có thông báo nào.
          </div>
        ) : (
          notifications.map((notif) => (
            <div 
              key={notif.id}
              onClick={() => {
                if (!notif.is_read) markAsRead(notif.id);
              }}
              className={`p-3 rounded-xl flex items-start gap-3 cursor-pointer transition-all ${
                notif.is_read 
                  ? 'hover:bg-white/5 opacity-70' 
                  : 'bg-white/10 hover:bg-white/20'
              }`}
            >
              <div className="mt-0.5 shrink-0 relative">
                {notif.sender_avatar ? (
                  <img src={notif.sender_avatar} alt="Avatar" className="w-10 h-10 rounded-full object-cover border border-white/10" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-black/30 border border-white/10 flex items-center justify-center">
                    {getIcon(notif.type)}
                  </div>
                )}
                {!notif.is_read && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-[#1E1F22]"></span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white/90 leading-tight mb-1">
                  {notif.sender_display_name && (
                    <span className="font-bold mr-1">{notif.sender_display_name}</span>
                  )}
                  {notif.content}
                </p>
                <p className="text-xs text-white/40">
                  {format(new Date(notif.created_at), 'HH:mm dd/MM', { locale: vi })}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
