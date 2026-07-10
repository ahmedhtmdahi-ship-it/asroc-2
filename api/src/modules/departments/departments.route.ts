import type { FastifyInstance } from "fastify";

import { prisma } from "../../db/prisma.js";

/**
 * الأقسام من جدول departments (المزروع من seed-data/departments.json).
 * ده مصدر الحقيقة لأسماء الأقسام ومديريها — الفرونت كان بيستنتجها من
 * حقل department بتاع المديرين وده اللي كان مكسّر إيجاد المدير المسؤول.
 */
export async function departmentRoutes(app: FastifyInstance) {
  // GET /departments — لأي مستخدم مسجّل (الموظف محتاجها لإيجاد مدير إدارته).
  app.get("/", { preHandler: [app.authenticate] }, async () => {
    const departments = await prisma.department.findMany({
      orderBy: { name: "asc" },
    });

    // إكمال اسم المدير الحالي من جدول المستخدمين في استعلام واحد.
    const financialNumbers = departments
      .map((d) => d.managerFinancialNumber)
      .filter((v): v is string => Boolean(v));

    const managers = financialNumbers.length
      ? await prisma.user.findMany({
          where: {
            financialNumber: { in: financialNumbers },
            role: { in: ["manager", "office_manager"] },
            isActive: true,
          },
          select: { financialNumber: true, name: true },
        })
      : [];
    const managerByFin = new Map(managers.map((m) => [m.financialNumber, m.name]));

    return departments.map((d) => ({
      id: d.id,
      name: d.name,
      managerId: d.managerId,
      managerFinancialNumber: d.managerFinancialNumber,
      managerName: d.managerFinancialNumber
        ? managerByFin.get(d.managerFinancialNumber) ?? null
        : null,
    }));
  });
}
