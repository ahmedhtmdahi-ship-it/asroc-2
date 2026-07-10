// حالات طلب الكشف الطبي وقواعد الانتقال بينها انتقلت لـ packages/shared
// عشان تبقى نفس القواعد المستخدمة في الباك (requests.workflow.ts) بالظبط.
export type { RequestStatus } from "@asroc/shared/workflow.js";
// الحد الشهري من policy المشتركة — نفس الرقم اللي السيرفر بيحاسب بيه.
export { MONTHLY_CHECKUP_LIMIT } from "@asroc/shared/policy.js";
export {
  REQUEST_STATUSES,
  statusFlow,
  canMove,
  statusLabels as requestStatusLabels,
  closedRequestStatuses,
  activeCheckupStatuses,
  activeMonthlyTreatmentStatuses,
  isClosedStatus,
  isMonthlyTreatmentStatus,
  isCheckupStatus,
} from "@asroc/shared/workflow.js";
