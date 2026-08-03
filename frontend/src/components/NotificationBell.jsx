import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';

function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data || []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id, alreadyRead) => {
    if (alreadyRead) return;
    try {
      await api.put(`/notifications/${id}/read`);
      // Update local state
      setNotifications(prev =>
        prev.map(n => (n._id === id ? { ...n, read: true } : n))
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return '';
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now - then;
    if (diffMs < 0) return 'Just now';
    
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'money_received':
        return 'payments';
      case 'account_approved':
        return 'verified_user';
      case 'pin_unlocked':
        return 'lock_open';
      case 'account_frozen':
        return 'gpp_bad';
      default:
        return 'notifications';
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-on-surface-variant hover:text-on-surface transition-colors rounded-full hover:bg-surface-container relative cursor-pointer"
        aria-label="Notifications"
      >
        <span className="material-symbols-outlined block">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-[16px] flex items-center justify-center bg-error text-white text-[9px] font-bold rounded-full px-1 border border-surface-container-lowest">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 mt-2 w-80 max-h-[400px] overflow-hidden bg-surface-container-lowest border border-outline-variant rounded-xl premium-shadow z-50 flex flex-col"
          >
            <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-low shrink-0">
              <span className="font-semibold text-sm text-on-surface">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-[11px] font-medium text-error-container bg-error/10 px-2 py-0.5 rounded-full border border-error/20">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="overflow-y-auto flex-1 divide-y divide-outline-variant/40">
              {notifications.length > 0 ? (
                notifications.map((n) => (
                  <button
                    key={n._id}
                    onClick={() => handleMarkAsRead(n._id, n.read)}
                    className={`w-full text-left p-4 hover:bg-surface-container transition-colors flex gap-3 items-start cursor-pointer focus:outline-none ${
                      !n.read ? 'bg-surface-container-low/50' : 'bg-transparent'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-full flex items-center justify-center shrink-0 ${
                        !n.read
                          ? 'bg-secondary-container text-on-secondary-container'
                          : 'bg-surface-container text-on-surface-variant'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {getNotificationIcon(n.type)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs leading-normal break-words ${!n.read ? 'font-semibold text-on-surface' : 'text-on-surface-variant'}`}>
                        {n.message}
                      </p>
                      <span className="text-[10px] text-outline mt-1 block">
                        {formatRelativeTime(n.timestamp)}
                      </span>
                    </div>
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-error shrink-0 mt-1.5" />
                    )}
                  </button>
                ))
              ) : (
                <div className="p-8 text-center text-on-surface-variant text-xs flex flex-col items-center gap-2">
                  <span className="material-symbols-outlined text-[32px] text-outline">notifications_off</span>
                  <span>No notifications yet.</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default NotificationBell;
