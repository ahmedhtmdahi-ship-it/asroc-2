import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { prisma } from "../../db/prisma.js";
import { requirePermission } from "../../middleware/requirePermission.js";

const medicineSchema = z.object({
  name: z.string().min(1).max(300),
  unit: z.string().min(1).max(50),
  currentStock: z.number().int().min(0).max(10_000_000).nullable().optional(),
  minimumStock: z.number().int().min(0).max(10_000_000).nullable().optional(),
  category: z.string().max(100).optional(),
  activeIngredient: z.string().max(300).optional(),
  isActive: z.boolean().optional(),
});

const createMedicineSchema = medicineSchema.extend({
  isActive: z.boolean().optional().default(true),
});

const updateMedicineSchema = medicineSchema.partial();

// بحث + حد على مستوى السيرفر — عشان الواجهة (صيدلية/طبيب) ما تحمّلش الـ 19 ألف
// دواء كلهم كل مرة. بدون باراميترات بيرجّع الكل (توافق خلفي).
const listMedicinesQuery = z.object({
  search: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional(),
  activeOnly: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});

export async function medicineRoutes(app: FastifyInstance) {
  // GET /medicines?search=&limit=&activeOnly= — بحث بالاسم + حد اختياري.
  app.get("/", { preHandler: [app.authenticate] }, async (req) => {
    const { search, limit, activeOnly } = listMedicinesQuery.parse(req.query);
    return prisma.medicine.findMany({
      where: {
        ...(search ? { name: { contains: search } } : {}),
        ...(activeOnly ? { isActive: true } : {}),
      },
      orderBy: { name: "asc" },
      ...(limit ? { take: limit } : {}),
    });
  });

  app.post(
    "/",
    { preHandler: [app.authenticate, requirePermission("manage_inventory")] },
    async (req, reply) => {
      const body = createMedicineSchema.parse(req.body);
      const created = await prisma.medicine.create({
        data: {
          name: body.name.trim(),
          unit: body.unit.trim(),
          currentStock: body.currentStock ?? null,
          minimumStock: body.minimumStock ?? null,
          category: body.category?.trim() || null,
          activeIngredient: body.activeIngredient?.trim() || null,
          isActive: body.isActive,
        },
      });
      return reply.code(201).send(created);
    },
  );

  app.patch(
    "/:id",
    { preHandler: [app.authenticate, requirePermission("manage_inventory")] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const body = updateMedicineSchema.parse(req.body);

      const existing = await prisma.medicine.findUnique({ where: { id } });
      if (!existing) {
        return reply.code(404).send({ error: "Not Found", message: "الدواء غير موجود" });
      }

      const updated = await prisma.medicine.update({
        where: { id },
        data: {
          ...(body.name !== undefined ? { name: body.name.trim() } : {}),
          ...(body.unit !== undefined ? { unit: body.unit.trim() } : {}),
          ...(body.currentStock !== undefined ? { currentStock: body.currentStock } : {}),
          ...(body.minimumStock !== undefined ? { minimumStock: body.minimumStock } : {}),
          ...(body.category !== undefined ? { category: body.category?.trim() || null } : {}),
          ...(body.activeIngredient !== undefined
            ? { activeIngredient: body.activeIngredient?.trim() || null }
            : {}),
          ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        },
      });

      return updated;
    },
  );

  app.delete(
    "/:id",
    { preHandler: [app.authenticate, requirePermission("manage_inventory")] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const existing = await prisma.medicine.findUnique({ where: { id } });
      if (!existing) {
        return reply.code(404).send({ error: "Not Found", message: "الدواء غير موجود" });
      }

      await prisma.medicine.delete({ where: { id } });
      return { ok: true };
    },
  );
}
