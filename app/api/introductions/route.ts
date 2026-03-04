import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrgScoped } from "@/lib/auth";

export async function GET() {
  try {
    const { org } = await getOrgScoped();
    const introductions = await db.introduction.findMany({
      where: {
        match: {
          OR: [
            { demandBrief: { createdByOrgId: org.id } },
            { inventory: { ownerOrgId: org.id } },
            { sharedOrgId: org.id },
          ],
        },
      },
      include: {
        match: {
          include: {
            demandBrief: { select: { title: true } },
            inventory: { select: { propertyName: true } },
          },
        },
        deliveryCycle: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(introductions);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { org } = await getOrgScoped();
    const body = await req.json();

    // Find an active delivery cycle for the org
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    let deliveryCycle = await db.deliveryCycle.findUnique({
      where: { orgId_month: { orgId: org.id, month: monthStart } },
    });

    // Check quota
    if (deliveryCycle && deliveryCycle.deliveredCount >= deliveryCycle.introQuota) {
      return NextResponse.json(
        { error: "Monthly introduction quota exceeded" },
        { status: 429 }
      );
    }

    const introduction = await db.introduction.create({
      data: {
        matchId: body.matchId,
        notes: body.notes,
        deliveryCycleId: deliveryCycle?.id,
      },
    });

    // Increment delivered count
    if (deliveryCycle) {
      await db.deliveryCycle.update({
        where: { id: deliveryCycle.id },
        data: { deliveredCount: { increment: 1 } },
      });
    }

    // Update match status
    await db.match.update({
      where: { id: body.matchId },
      data: { status: "INTRO_SENT" },
    });

    return NextResponse.json(introduction, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
