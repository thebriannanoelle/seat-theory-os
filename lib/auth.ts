import { auth } from "@clerk/nextjs/server";
import { db } from "./db";
import { Role } from "@prisma/client";

export async function getCurrentUser() {
  const { userId, orgId } = await auth();

  if (!userId) return null;

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    include: {
      memberships: {
        include: { org: true },
      },
    },
  });

  return user;
}

export async function getCurrentOrg() {
  const { orgId } = await auth();
  if (!orgId) return null;

  return db.org.findUnique({
    where: { clerkOrgId: orgId },
  });
}

export async function requireRole(allowedRoles: Role[]) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });
  if (!user) throw new Error("User not found");

  const org = await db.org.findUnique({
    where: { clerkOrgId: orgId },
  });
  if (!org) throw new Error("Org not found");

  const membership = await db.orgMembership.findUnique({
    where: { orgId_userId: { orgId: org.id, userId: user.id } },
  });

  if (!membership || !allowedRoles.includes(membership.role)) {
    throw new Error("Forbidden");
  }

  return { user, org, membership };
}

export async function getOrgScoped() {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });
  if (!user) throw new Error("User not found");

  const org = await db.org.findUnique({
    where: { clerkOrgId: orgId },
  });
  if (!org) throw new Error("Org not found");

  return { user, org };
}
