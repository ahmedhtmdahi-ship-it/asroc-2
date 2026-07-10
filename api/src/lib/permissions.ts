import type { Permission } from "@asroc/shared/roles.js";

// عمود permissions في الداتابيز نص JSON — أي قيمة تالفة بترجع [] بدل ما ترمي
// (كانت النسخة اللي في jwt.ts بتعمل JSON.parse من غير حماية).
export function parsePermissions(raw: string): Permission[] {
  try {
    return JSON.parse(raw) as Permission[];
  } catch {
    return [];
  }
}
