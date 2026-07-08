import { listNotificationsApi, markNotificationsReadApi } from "@/app/lib/dataApi";
import { ReactiveStore } from "./reactiveStore";

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  requestId?: string;
  unread: boolean;
  createdAt: string;
  icon?: string;
  color?: string;
  bg?: string;
}

class NotificationStore extends ReactiveStore {
  private notifications: AppNotification[] = [];

  private setNotifications(notifications: AppNotification[]) {
    this.notifications = notifications;
    this.emit();
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
    this.notifications = [notification, ...this.notifications].slice(0, 200);
    this.emit();
    return notification;
  }

  markAsRead(id: string) {
    const exists = this.notifications.some((item) => item.id === id);
    if (!exists) return null;
    this.notifications = this.notifications.map((item) =>
      item.id === id ? { ...item, unread: false } : item,
    );
    this.emit();
    markNotificationsReadApi([id]).catch(() => {});
    return this.notifications.find((item) => item.id === id) ?? null;
  }

  markAllAsRead(userId?: string) {
    this.notifications = this.notifications.map((n) =>
      !userId || n.userId === userId || n.userId === "broadcast"
        ? { ...n, unread: false }
        : n,
    );
    this.emit();
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
    this.emit();
  }
}

export const notificationStore = new NotificationStore();
