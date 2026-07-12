import type { FastifyInstance } from "fastify";
import { z } from "zod";
import bcrypt from "bcryptjs";

import { prisma } from "../../db/prisma.js";
import { parsePermissions } from "../../lib/permissions.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { newPasswordSchema } from "../auth/auth.schema.js";
import { USER_ROLES, PERMISSIONS, type UserRole } from "@asroc/shared/roles.js";

const BCRYPT_ROUNDS = 10;

// نفلتر أي قيمة role مش معروفة بدل ما نمررها زي ما هي لـ Prisma (بيرفضها برمي خطأ).
function isUserRole(value: string): value is UserRole {
  return (USER_ROLES as readonly string[]).includes(value);
}

const listUsersQuerySchema = z.object({
  roles: z
    .string()
    .optional()
    .transform((s) =>
      s
        ? s.split(",").map((r) => r.trim()).filter(isUserRole)
        : undefined,
    ),
});

const patchUserSchema = z.object({
  role:        z.enum(USER_ROLES).optional(),
  permissions: z.array(z.enum(PERMISSIONS)).optional(),
  isActive:    z.boolean().optional(),
});

const createUserSchema = z.object({
  username:        z.string().min(1, "اسم المستخدم مطلوب"),
  password:        newPasswordSchema,
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

// ✅ نوع صريح بدل any
interface DbUser {
  id: string;
  username: string;
  passwordHash: string;
  name: string;
  role: string;
  permissions: string;
  isActive: boolean;
  financialNumber: string | null;
  jobTitle: string | null;
  workPlace: string | null;
  department: string | null;
  nationalId: string | null;
  phone: string | null;
  workType: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ✅ select صريح — مفيش حقل هيترجع بالغلط
function formatUser(u: DbUser) {
  return {
    id:              u.id,
    username:        u.username,
    name:            u.name,
    role:            u.role,
    permissions:     parsePermissions(u.permissions),
    isActive:        u.isActive,
    financialNumber: u.financialNumber,
    jobTitle:        u.jobTitle,
    workPlace:       u.workPlace,
    department:      u.department,
    nationalId:      u.nationalId,
    phone:           u.phone,
    workType:        u.workType,
    createdAt:       u.createdAt.toISOString(),
    updatedAt:       u.updatedAt.toISOString(),
  };
}

export async function userRoutes(app: FastifyInstance) {
  // GET /users/lookup — دليل مصغّر لأي مستخدم مسجّل (إيجاد المدير/طبيب العلاج الشهري).
  // بيانات تعريف فقط — ممنوع رجوع nationalId أو phone من هنا (PII).
  // البيانات الكاملة من GET /users المحمي بـ manage_system.
  app.get(
    "/lookup",
    { preHandler: [app.authenticate] },
    async (req) => {
      const { roles } = listUsersQuerySchema.parse(req.query);
      // بيانات تعريف فقط لاختيار المدير/طبيب العلاج الشهري. عمدًا:
      //  • مفيش permissions — كانت بتكشف خريطة صلاحيات المؤسسة كلها لأي مستخدم مسجّل.
      //  • مفيش nationalId/phone (PII).
      // financialNumber بيفضل لأنه مفتاح مطابقة المدير بالإدارة (managersStore/managerResolver).
      const users = await prisma.user.findMany({
        where: roles?.length ? { role: { in: roles } } : {},
        select: {
          id: true,
          name: true,
          role: true,
          department: true,
          financialNumber: true,
          jobTitle: true,
          isActive: true,
        },
        orderBy: { name: "asc" },
      });
      return users;
    },
  );

  // GET /users
  app.get(
    "/",
    { preHandler: [app.authenticate, requirePermission("manage_system")] },
    async (req) => {
      const { roles } = listUsersQuerySchema.parse(req.query);
      const users = await prisma.user.findMany({
        where: roles?.length ? { role: { in: roles } } : {},
        orderBy: { name: "asc" },
      });
      return users.map(formatUser);
    },
  );

  // POST /users
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

  // PATCH /users/:id
  app.patch(
    "/:id",
    { preHandler: [app.authenticate, requirePermission("manage_system")] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const body = patchUserSchema.parse(req.body);
      const currentUserId = req.user.sub;

      // ✅ منع تغيير دور نفسك أو صلاحياتك
      if (id === currentUserId) {
        if (body.role !== undefined || body.permissions !== undefined) {
          return reply.code(403).send({
            error: "Forbidden",
            message: "لا يمكنك تعديل دورك أو صلاحياتك الخاصة",
          });
        }
        // ✅ السماح بتعديل isActive لنفسك؟ الأفضل تمنعه أيضاً
        if (body.isActive !== undefined) {
          return reply.code(403).send({
            error: "Forbidden",
            message: "لا يمكنك تعديل حالة حسابك",
          });
        }
      }

      const existing = await prisma.user.findUnique({ where: { id } });
      if (!existing) return reply.code(404).send({ error: "المستخدم غير موجود" });

      // ✅ منع تعطيل الحساب الوحيد لسوبر أدمن
      if (body.isActive === false && existing.role === "super_admin") {
        const activeSuperAdmins = await prisma.user.count({
          where: { role: "super_admin", isActive: true },
        });
        if (activeSuperAdmins <= 1) {
          return reply.code(400).send({
            error: "Bad Request",
            message: "لا يمكن تعطيل آخر حساب مدير نظام",
          });
        }
      }

      const data: Record<string, unknown> = {};
      if (body.role        !== undefined) data.role        = body.role;
      if (body.isActive    !== undefined) data.isActive    = body.isActive;
      if (body.permissions !== undefined) data.permissions = JSON.stringify(body.permissions);

      const updated = await prisma.user.update({ where: { id }, data });
      return formatUser(updated);
    },
  );
}