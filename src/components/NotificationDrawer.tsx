import React, { useState, useEffect } from 'react';
import {
  X,
  Bell,
  CheckCheck,
  Send,
  Sparkles,
  Volume2,
  CheckCircle,
  MessageSquare,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { AppNotification } from '../types';
import {
  requestNotificationPermission,
  getNotificationPermission,
  dispatchPushNotification,
} from '../lib/pushNotifications';

interface NotificationDrawerProps {
  notifications: AppNotification[];
  isOpen: boolean;
  onClose: () => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onSelectTask?: (taskId: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  notifications,
  isOpen,
  onClose,
  onMarkRead,
  onMarkAllRead,
  onSelectTask,
}) => {
  const [permission, setPermission] = useState<NotificationPermission>(getNotificationPermission());

  useEffect(() => {
    setPermission(getNotificationPermission());
  }, [isOpen]);

  const handleRequestPermission = async () => {
    const res = await requestNotificationPermission();
    setPermission(res);
    if (res === 'granted') {
      dispatchPushNotification('Push Notifications Activated', {
        body: 'You will receive real-time alerts when team tasks update.',
      });
    }
  };

  const handleTestPushNotification = () => {
    dispatchPushNotification('Task Review Requested', {
      body: 'Marcus Chen assigned you to "Implement Web Push & Audio Chimes"',
      tag: `test-push-${Date.now()}`,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 text-xs">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-indigo-500" />
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">Notifications</h3>
          <span className="px-1.5 py-0.2 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-[10px]">
            {notifications.filter((n) => !n.read).length} new
          </span>
        </div>
        <div className="flex items-center gap-1">
          {notifications.some((n) => !n.read) && (
            <button
              onClick={onMarkAllRead}
              className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              title="Mark all as read"
            >
              <CheckCheck className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Browser Push Permission Banner */}
      <div className="p-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-indigo-500" />
            System Web Push Alerts
          </span>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
              permission === 'granted'
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                : permission === 'denied'
                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
            }`}
          >
            {permission}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {permission !== 'granted' ? (
            <button
              id="btn-request-push-perm"
              onClick={handleRequestPermission}
              className="flex-1 py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[11px] shadow-xs transition"
            >
              Enable Push Notifications
            </button>
          ) : (
            <button
              id="btn-test-push-notification"
              onClick={handleTestPushNotification}
              className="flex-1 py-1.5 px-3 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-semibold text-[11px] transition flex items-center justify-center gap-1.5"
            >
              <Send className="w-3 h-3 text-indigo-500" />
              <span>Send Test Push Notification</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications Stream */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {notifications.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Bell className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
            <p className="font-medium">No notifications yet</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Task assignments and real-time updates appear here.
            </p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => {
                onMarkRead(n.id);
                if (n.taskId && onSelectTask) onSelectTask(n.taskId);
              }}
              className={`p-3 rounded-xl border transition cursor-pointer ${
                n.read
                  ? 'bg-white dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-800/80 text-slate-600 dark:text-slate-400'
                  : 'bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800 text-slate-900 dark:text-white font-medium shadow-xs'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="font-semibold text-xs leading-tight">{n.title}</span>
                <span className="text-[10px] text-slate-400 shrink-0">
                  {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">{n.body}</p>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-3 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          End-to-End WebSocket Sync
        </span>
        <button
          onClick={onClose}
          className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
        >
          Close
        </button>
      </div>
    </div>
  );
};
