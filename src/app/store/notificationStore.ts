import { mockNotifications } from "@/app/data/mockNotifications";

const STORAGE_KEY = "asorc_notifications";

function loadNotifications(): any[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [...mockNotifications];
  } catch {
    return [...mockNotifications];
  }
}

class NotificationStore {
  private notifications: any[] = loadNotifications();

  private persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.notifications));
  }

  getAll() {
    return this.notifications;
  }

  add(notification: any) {
    this.notifications.push(notification);
    this.persist();
    return notification;
  }

  markAsRead(id: string) {
    const notification = this.notifications.find((item: any) => item.id === id);

    if (!notification) {
      return null;
    }

    notification.isRead = true;
    this.persist();
    return notification;
  }

  clear() {
    this.notifications = [...mockNotifications];
    this.persist();
  }
}

export const notificationStore = new NotificationStore();
