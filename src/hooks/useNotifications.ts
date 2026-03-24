import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { playNotificationSound, showBrowserNotification, requestNotificationPermission } from '@/utils/notificationSound';
import { LocalNotifications } from '@capacitor/local-notifications';

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: any;
  is_read: boolean;
  created_by: string | null;
  created_at: string;
}

// Initialize local notifications plugin
const initLocalNotifications = async () => {
  try {
    await LocalNotifications.requestPermissions();
    await LocalNotifications.registerActionTypes({
      types: [
        {
          id: 'stock-buddy-notification',
          actions: [
            {
              id: 'mark-read',
              title: 'تحديد كمقروء',
            },
            {
              id: 'open',
              title: 'فتح',
            },
          ],
        },
      ],
    });
  } catch (error) {
    console.warn('Failed to initialize local notifications:', error);
  }
};

// Show local notification with sound
const showLocalNotification = async (title: string, body: string) => {
  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          title,
          body,
          id: Date.now(),
          sound: 'default',
          actionTypeId: 'stock-buddy-notification',
        },
      ],
    });
  } catch (error) {
    console.warn('Failed to show local notification:', error);
  }
};

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();

  const fetchNotifications = useCallback(async () => {
    const { data } = await supabase
      .from('notifications' as any)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) {
      const notifs = data as any as Notification[];
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.is_read).length);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    
    // Initialize local notifications and request permissions
    initLocalNotifications();
    requestNotificationPermission();
    
    fetchNotifications();

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications(prev => [newNotif, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // Play sound and show notification
          playNotificationSound();
          showBrowserNotification(newNotif.title, newNotif.message);
          showLocalNotification(newNotif.title, newNotif.message);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications' },
        (payload) => {
          const updated = payload.new as Notification;
          setNotifications(prev =>
            prev.map(n => (n.id === updated.id ? updated : n))
          );
          setUnreadCount(prev => {
            const oldNotif = notifications.find(n => n.id === updated.id);
            if (oldNotif && !oldNotif.is_read && updated.is_read) return Math.max(0, prev - 1);
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    await supabase
      .from('notifications' as any)
      .update({ is_read: true } as any)
      .eq('id', id);
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;
    await supabase
      .from('notifications' as any)
      .update({ is_read: true } as any)
      .in('id', unreadIds);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }, [notifications]);

  const createNotification = useCallback(
    async (type: string, title: string, message: string, data: any = {}) => {
      if (!user?.id) return;
      await supabase.from('notifications' as any).insert({
        type,
        title,
        message,
        data,
        created_by: user.id,
      } as any);
    },
    [user]
  );

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    createNotification,
    refetch: fetchNotifications,
  };
}
