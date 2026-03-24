import { useState, useRef, useEffect } from 'react';
import { Bell, Check, CheckCheck, Package, ArrowDownLeft, ArrowUpRight, AlertTriangle } from 'lucide-react';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

const NotificationBell = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'movement_in': return <ArrowDownLeft className="w-4 h-4 text-emerald-500" />;
      case 'movement_out': return <ArrowUpRight className="w-4 h-4 text-blue-500" />;
      case 'low_stock':
      case 'out_of_stock': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      default: return <Package className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const timeAgo = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ar });
    } catch {
      return '';
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-secondary transition-colors"
      >
        <Bell className="w-5 h-5 text-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-80 sm:w-96 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden" style={{ maxHeight: '70vh' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
            <h3 className="text-sm font-bold text-foreground">الإشعارات</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1 text-[11px] text-primary hover:underline font-medium"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                تعليم الكل كمقروء
              </button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(70vh - 50px)' }}>
            {notifications.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                لا توجد إشعارات
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.is_read && markAsRead(n.id)}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-border/50 cursor-pointer transition-colors hover:bg-muted/40 ${
                    !n.is_read ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className="mt-0.5 p-1.5 rounded-lg bg-muted/60 shrink-0">
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground leading-relaxed">{n.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.is_read && (
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
