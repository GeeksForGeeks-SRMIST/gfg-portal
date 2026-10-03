// src/types/notifications.d.ts

interface NotificationOptions {
  vibrate?: number[];
  badge?: string;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}