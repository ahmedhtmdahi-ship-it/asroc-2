// حالات طلب الكشف الطبي وقواعد الانتقال بينها انتقلت لـ packages/shared
// عشان تبقى نفس القواعد المستخدمة في الباك (requests.workflow.ts) بالظبط.
export type { RequestStatus } from "@asroc/shared/workflow.js";
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
