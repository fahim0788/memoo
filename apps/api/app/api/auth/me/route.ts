import { NextRequest } from "next/server";
import { prisma } from "@memolist/db";
import * as bcrypt from "bcryptjs";
import { json, OPTIONS } from "../../../_lib/cors";
import { requireAuth } from "../../../_lib/auth";
import { validateBody, UpdateProfileSchema } from "../../../_lib/validation";

export const dynamic = "force-dynamic";
export { OPTIONS };

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if ("error" in auth) return auth.error;

  const user = await prisma.user.findUnique({
    where: { id: auth.user.userId },
    select: { id: true, email: true, firstName: true, lastName: true, isActive: true, createdAt: true },
  });

  if (!user) {
    return json({ error: "user not found" }, req, 404);
  }

  return json({ user }, req);
}

export async function PUT(req: NextRequest) {
  const auth = requireAuth(req);
  if ("error" in auth) return auth.error;

  const parsed = await validateBody(req, UpdateProfileSchema);
  if (parsed.error) return parsed.error;
  const { firstName, lastName, email, currentPassword, newPassword } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { id: auth.user.userId },
  });

  if (!user) {
    return json({ error: "user not found" }, req, 404);
  }

  const updateData: Record<string, string> = {};

  if (firstName !== undefined) updateData.firstName = firstName ? firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase() : firstName;
  if (lastName !== undefined) updateData.lastName = lastName;

  // Email or password change requires current password verification
  if (email && email !== user.email) {
    if (!currentPassword) {
      return json({ error: "current password required" }, req, 400);
    }
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return json({ error: "invalid password" }, req, 403);
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return json({ error: "email already registered" }, req, 409);
    }
    updateData.email = email;
  }

  if (newPassword) {
    if (!currentPassword) {
      return json({ error: "current password required" }, req, 400);
    }
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return json({ error: "invalid password" }, req, 403);
    }
    updateData.password = await bcrypt.hash(newPassword, 10);
  }

  if (Object.keys(updateData).length === 0) {
    return json({ error: "no changes" }, req, 400);
  }

  const updated = await prisma.user.update({
    where: { id: auth.user.userId },
    data: updateData,
    select: { id: true, email: true, firstName: true, lastName: true, isActive: true, createdAt: true },
  });

  return json({ user: updated }, req);
}
