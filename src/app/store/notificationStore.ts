import { listNotificationsApi, markNotificationsReadApi } from "@/app/lib/dataApi";

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

class NotificationStore {
  private notifications: AppNotification[] = [];

  private setNotifications(notifications: AppNotification[]) {
    this.notifications = notifications;
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
      unread: true,
      ...raw,
    };
    this.notifications.unshift(notification);
    if (this.notifications.length > 200) this.notifications = this.notifications.slice(0, 200);
    return notification;
  }

  markAsRead(id: string) {
    const n = this.notifications.find((item) => item.id === id);
    if (!n) return null;
    n.unread = false;
    markNotificationsReadApi([id]).catch(() => {});
    return n;
  }

  markAllAsRead(userId?: string) {
    this.notifications.forEach((n) => {
      if (!userId || n.userId === userId || n.userId === "broadcast") {
        n.unread = false;
      }
    });
    markNotificationsReadApi().catch(() => {});
  }

  async syncFromApi(userId: string): Promise<void> {
    try {
      const data = await listNotificationsApi(userId, 100);
      this.setNotifications(
        data.map((n) => ({
          id:        n.id,
          userId:    n.userId,
          title:     n.title,
          message:   n.message,
          requestId: n.requestId ?? undefined,
          unread:    n.unread,
          icon:      n.icon ?? undefined,
          color:     n.color ?? undefined,
          bg:        n.bg ?? undefined,
          createdAt: n.createdAt,
        })),
      );
    } catch {
      // keep in-memory data if sync fails
    }
  }

  clear() {
    this.notifications = [];
  }
}

export const notificationStore = new NotificationStore();
