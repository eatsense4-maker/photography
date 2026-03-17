import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Bell, Check, Trash2, CheckCheck } from 'lucide-react';
import { Button, Card, EmptyState, Badge } from '@/components/ui';
import { useNotificationStore } from '@/stores';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationsPage() {
  const { t } = useTranslation();
  const { notifications, markAsRead, markAllAsRead, removeNotification } =
    useNotificationStore();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filtered =
    filter === 'unread'
      ? notifications.filter((n) => !n.read)
      : notifications;

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return '🎉';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return '📢';
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">
            {t('user.notifications')}
          </h1>
          <p className="text-surface-400 text-sm mt-1">
            Stay updated on your submissions and competition news
          </p>
        </div>
        {notifications.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            icon={<CheckCheck className="h-4 w-4" />}
            onClick={markAllAsRead}
          >
            Mark all read
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'unread'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              filter === f
                ? 'bg-primary-500/10 text-primary-400'
                : 'text-surface-400 hover:text-white hover:bg-surface-800'
            }`}
          >
            {f === 'all' ? 'All' : 'Unread'}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-12 w-12" />}
          title="No notifications"
          description={
            filter === 'unread'
              ? "You've read all your notifications!"
              : 'No notifications yet. We will notify you about important updates.'
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((notif, i) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card
                className={`p-4 transition-colors ${
                  !notif.read
                    ? 'border-primary-500/20 bg-primary-500/5'
                    : ''
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <span className="text-xl">{getIcon(notif.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-white truncate">
                          {notif.title}
                        </h3>
                        {!notif.read && (
                          <Badge variant="primary" className="text-[10px]">
                            New
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-surface-400 mt-1">
                        {notif.message}
                      </p>
                      <p className="text-xs text-surface-500 mt-2">
                        {formatDistanceToNow(new Date(notif.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!notif.read && (
                      <button
                        onClick={() => markAsRead(notif.id)}
                        className="p-1.5 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800 transition-colors cursor-pointer"
                        title="Mark as read"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => removeNotification(notif.id)}
                      className="p-1.5 rounded-lg text-surface-400 hover:text-red-400 hover:bg-surface-800 transition-colors cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
