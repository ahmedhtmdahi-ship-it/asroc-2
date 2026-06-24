const STORAGE_KEY = "asorc_notifications";

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  requestId?: string;
  unread: boolean;
  createdAt: string;
  icon?: any;
  color?: string;
  bg?: string;
}

function load(): AppNotification[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

class NotificationStore {
  private notifications: AppNotification[] = load();

  private persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.notifications));
  }

  getAll(): AppNotification[] {
    return this.notifications;
  }

  getForUser(userId: string): AppNotification[] {
    return this.notifications.filter(
      (n) => n.userId === userId || n.userId === "broadcast"
    );
  }

  add(raw: Partial<AppNotification> & { id: string; userId: string; title: string; message: string }) {
    const notification: AppNotification = {
      createdAt: new Date().toISOString(),
      ...raw,
      unread: raw.unread !== undefined ? raw.unread : !(raw as any).isRead,
    };
    this.notifications.unshift(notification);
    if (this.notifications.length > 200) this.notifications = this.notifications.slice(0, 200);
    this.persist();
    return notification;
  }

  markAsRead(id: string) {
    const n = this.notifications.find((item) => item.id === id);
    if (!n) return null;
    n.unread = false;
    this.persist();
    return n;
  }

  markAllAsRead(userId?: string) {
    this.notifications.forEach((n) => {
      if (!userId || n.userId === userId || n.userId === "broadcast") {
        n.unread = false;
      }
    });
    this.persist();
  }

  clear() {
    this.notifications = [];
    this.persist();
  }
}

export const notificationStore = new NotificationStore();
