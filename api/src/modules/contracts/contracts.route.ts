import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { prisma } from "../../db/prisma.js";
import { requirePermission } from "../../middleware/requirePermission.js";

const contractSchema = z.object({
  name: z.string().min(1),
  specialty: z.string().min(1),
  address: z.string().optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
});

const updateContractSchema = contractSchema.partial();

export async function contractRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [app.authenticate] }, async (req) => {
    const { specialty, active } = req.query as {
      specialty?: string;
      active?: string;
    };
    return prisma.contract.findMany({
      where: {
        ...(specialty ? { specialty } : {}),
        ...(active !== undefined ? { isActive: active === "true" } : {}),
      },
      orderBy: { name: "asc" },
    });
  });

  app.get("/:id", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const contract = await prisma.contract.findUnique({ where: { id } });
    if (!contract)
      return reply
        .code(404)
        .send({ error: "Not Found", message: "جهة التعاقد غير موجودة" });
    return contract;
  });

  app.post(
    "/",
    { preHandler: [app.authenticate, requirePermission("manage_contracts")] },
    async (req, reply) => {
      const body = contractSchema.parse(req.body);
      const created = await prisma.contract.create({
        data: {
          name: body.name.trim(),
          specialty: body.specialty.trim(),
          address: body.address?.trim() || null,
          phone: body.phone?.trim() || null,
          isActive: body.isActive ?? true,
        },
      });
      return reply.code(201).send(created);
    },
  );

  app.patch(
    "/:id",
    { preHandler: [app.authenticate, requirePermission("manage_contracts")] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const body = updateContractSchema.parse(req.body);

      const existing = await prisma.contract.findUnique({ where: { id } });
      if (!existing)
        return reply
          .code(404)
          .send({ error: "Not Found", message: "جهة التعاقد غير موجودة" });

      const updated = await prisma.contract.update({
        where: { id },
        data: {
          ...(body.name !== undefined ? { name: body.name.trim() } : {}),
          ...(body.specialty !== undefined
            ? { specialty: body.specialty.trim() }
            : {}),
          ...(body.address !== undefined
            ? { address: body.address?.trim() || null }
            : {}),
          ...(body.phone !== undefined
            ? { phone: body.phone?.trim() || null }
            : {}),
          ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        },
      });
      return updated;
    },
  );

  app.delete(
    "/:id",
    { preHandler: [app.authenticate, requirePermission("manage_contracts")] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const existing = await prisma.contract.findUnique({ where: { id } });
      if (!existing)
        return reply
          .code(404)
          .send({ error: "Not Found", message: "جهة التعاقد غير موجودة" });

      await prisma.contract.delete({ where: { id } });
      return { ok: true };
    },
  );
}
