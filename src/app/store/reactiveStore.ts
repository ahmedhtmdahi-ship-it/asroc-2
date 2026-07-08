import { useSyncExternalStore } from "react";

/**
 * أساس تفاعلي بسيط لكل الـ stores.
 *
 * المشكلة الجذرية قبل كده: الـ stores كانت كلاسات singleton بتتقري مباشرة أثناء
 * الـ render من غير أي آلية اشتراك، فإعادة الرسم كانت بتحصل «بالصدفة» (من re-render
 * عرضي في WorkflowContext) — ولو الصدفة محصلتش الواجهة تفضل بايتة، ولذلك كان فيه
 * window.location.reload() كـ patch.
 *
 * الحل: كل store بيورث من ReactiveStore وبينادي emit() بعد أي تغيير في الحالة،
 * والمكوّنات بتشترك بـ useStore(store, selector) المبني على useSyncExternalStore.
 *
 * قاعدة مهمة: الـ selector لازم يرجّع مرجع «مستقر» (زي s.getAll() اللي بيرجّع نفس
 * مرجع المصفوفة الداخلية لغاية ما تتغيّر). ممنوع يرجّع مصفوفة مفلترة جديدة كل مرة
 * (زي s.getForUser(id)) عشان ما يدخلش في loop — الفلترة تتعمل في المكوّن.
 */
export abstract class ReactiveStore {
  private listeners = new Set<() => void>();

  /** ثابت لكل نسخة store — مطلوب لـ useSyncExternalStore. */
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** ينادى من الـ store بعد أي تعديل على الحالة عشان الواجهة تتحدّث. */
  protected emit(): void {
    for (const listener of this.listeners) listener();
  }
}

/**
 * الاشتراك في store داخل مكوّن React.
 * @param store   نسخة الـ store التفاعلي
 * @param select  دالة بترجّع لقطة مستقرة من الـ store (يفضّل s.getAll())
 */
export function useStore<S extends ReactiveStore, T>(
  store: S,
  select: (store: S) => T,
): T {
  const getSnapshot = () => select(store);
  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}
