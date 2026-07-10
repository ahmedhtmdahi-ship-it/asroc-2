// سياسات العمل المشتركة بين الباك والفرونت — مصدر واحد للأرقام والقواعد
// عشان ما يبقاش الحد مكتوب 3 في الواجهة و5 في السيرفر.

/** أقصى عدد كشوفات عادية مكتملة للموظف في الشهر الميلادي الواحد. */
export const MONTHLY_CHECKUP_LIMIT = 3;

/** سياسة الباسورد — بتتطبق في إنشاء المستخدم وتغيير الباسورد (السيرفر هو الحكم). */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_POLICY_MESSAGE =
  "كلمة المرور: 8 أحرف على الأقل وتحتوي على حرف ورقم";

export function isValidPassword(value: string): boolean {
  return (
    value.length >= PASSWORD_MIN_LENGTH &&
    /[a-zA-Z]/.test(value) &&
    /[0-9]/.test(value)
  );
}
