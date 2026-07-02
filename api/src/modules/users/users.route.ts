import type { FastifyInstance } from "fastify";
import { z } from "zod";
import bcrypt from "bcryptjs";

import { prisma } from "../../db/prisma.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { USER_ROLES, PERMISSIONS } from "@asroc/shared/roles.js";

const BCRYPT_ROUNDS = 10;

const listUsersQuerySchema = z.object({
  roles: z
    .string()
    .optional()
    .transform((s) => (s ? s.split(",").map((r) => r.trim()).filter(Boolean) : undefined)),
});

const patchUserSchema = z.object({
  role:        z.enum(USER_ROLES).optional(),
  permissions: z.array(z.enum(PERMISSIONS)).optional(),
  isActive:    z.boolean().optional(),
});

const createUserSchema = z.object({
  username:        z.string().min(1, "اسم المستخدم مطلوب"),
  password:        z.string().min(4, "كلمة المرور يجب أن تكون 4 أحرف على الأقل"),
  name:            z.string().min(1, "الاسم مطلوب"),
  role:            z.enum(USER_ROLES),
  permissions:     z.array(z.enum(PERMISSIONS)).default([]),
  financialNumber: z.string().optional(),
  jobTitle:        z.string().optional(),
  workPlace:       z.string().optional(),
  department:      z.string().optional(),
  nationalId:      z.string().optional(),
  phone:           z.string().optional(),
  workType:        z.string().optional(),
});

function parsePerms(raw: string): string[] {
  try { return JSON.parse(raw); } catch { return []; }
}

function formatUser({ passwordHash: _omit, permissions, ...u }: any) {
  return { ...u, permissions: parsePerms(permissions) };
}

export async function userRoutes(app: FastifyInstance) {
  // GET /users/lookup?roles=manager,office_manager
  // يعيد بيانات المستخدمين العامة المناسبة للبحث وأغراض ملء القوائم.
  app.get(
    "/lookup",
    { preHandler: [app.authenticate] },
    async (req) => {
      const { roles } = listUsersQuerySchema.parse(req.query);
      const users = await prisma.user.findMany({
        where: roles?.length ? { role: { in: roles as never } } : {},
        select: {
          id: true,
          name: true,
          role: true,
          department: true,
          financialNumber: true,
          jobTitle: true,
          workPlace: true,
          workType: true,
          nationalId: true,
          phone: true,
          isActive: true,
        },
        orderBy: { name: "asc" },
      });
      return users;
    },
  );

  // GET /users?roles=manager,office_manager
  // هذا الراوت محمي: بيانات المستخدمين حساسة ولا يجب أن تُعطى لأي مستخدم عادي.
  app.get(
    "/",
    { preHandler: [app.authenticate, requirePermission("manage_system")] },
    async (req) => {
      const { roles } = listUsersQuerySchema.parse(req.query);
      const users = await prisma.user.findMany({
        where: roles?.length ? { role: { in: roles as never } } : {},
        orderBy: { name: "asc" },
      });
      return users.map(formatUser);
    },
  );

  // POST /users — إنشاء مستخدم جديد (سوبر أدمن فقط)
  app.post(
    "/",
    { preHandler: [app.authenticate, requirePermission("manage_system")] },
    async (req, reply) => {
      const body = createUserSchema.parse(req.body);

      const existing = await prisma.user.findUnique({ where: { username: body.username } });
      if (existing) {
        return reply.code(409).send({ error: "Conflict", message: "اسم المستخدم مستخدم بالفعل" });
      }

      const passwordHash = await bcrypt.hash(body.password, BCRYPT_ROUNDS);

      const created = await prisma.user.create({
        data: {
          username: body.username,
          passwordHash,
          name: body.name,
          role: body.role,
          permissions: JSON.stringify(body.permissions),
          financialNumber: body.financialNumber ?? null,
          jobTitle: body.jobTitle ?? null,
          workPlace: body.workPlace ?? null,
          department: body.department ?? null,
          nationalId: body.nationalId ?? null,
          phone: body.phone ?? null,
          workType: body.workType ?? null,
        },
      });

      return reply.code(201).send(formatUser(created));
    },
  );

  // PATCH /users/:id  — تعديل الدور أو الصلاحيات أو تفعيل/تعطيل الحساب (سوبر أدمن فقط)
  app.patch(
    "/:id",
    { preHandler: [app.authenticate, requirePermission("manage_system")] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const body = patchUserSchema.parse(req.body);

      const existing = await prisma.user.findUnique({ where: { id } });
      if (!existing) return reply.code(404).send({ error: "المستخدم غير موجود" });

      const data: Record<string, unknown> = {};
      if (body.role        !== undefined) data.role        = body.role;
      if (body.isActive    !== undefined) data.isActive    = body.isActive;
      if (body.permissions !== undefined) data.permissions = JSON.stringify(body.permissions);

      const updated = await prisma.user.update({ where: { id }, data });
      return formatUser(updated);
    },
  );
}
