import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrgScoped } from "@/lib/auth";
import { generateIntroPack } from "@/lib/intro-pack";
import { generateIntroEmail } from "@/lib/intro-email";

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
    await getOrgScoped();
    const body = await req.json();
    const { matchId, notes } = body;

    if (!matchId) {
      return NextResponse.json(
        { error: "matchId is required" },
        { status: 400 }
      );
    }

    // Resolve the client org from the match's DemandBrief (include full data for intro pack)
    const match = await db.match.findUnique({
      where: { id: matchId },
      include: {
        demandBrief: {
          include: {
            createdByOrg: { select: { name: true } },
          },
        },
        inventory: true,
      },
    });

    if (!match) {
      return NextResponse.json(
        { error: "Match not found" },
        { status: 404 }
      );
    }

    const clientOrgId = match.demandBrief.createdByOrgId;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Find or create the DeliveryCycle for this client org + current month
    let deliveryCycle = await db.deliveryCycle.findUnique({
      where: { orgId_month: { orgId: clientOrgId, month: monthStart } },
    });

    if (!deliveryCycle) {
      deliveryCycle = await db.deliveryCycle.create({
        data: {
          orgId: clientOrgId,
          month: monthStart,
          introQuota: 0,
          deliveredCount: 0,
          status: "ACTIVE",
        },
      });
    }

    // Enforce quota
    if (deliveryCycle.introQuota > 0 && deliveryCycle.deliveredCount >= deliveryCycle.introQuota) {
      return NextResponse.json(
        {
          error: "Quota reached\u2014upgrade plan or wait until next cycle",
          code: "QUOTA_EXCEEDED",
          deliveredCount: deliveryCycle.deliveredCount,
          introQuota: deliveryCycle.introQuota,
        },
        { status: 429 }
      );
    }

    // Atomic transaction: create introduction + increment delivered count + update match
    const introduction = await db.$transaction(async (tx) => {
      const intro = await tx.introduction.create({
        data: {
          matchId,
          notes: notes ?? null,
          deliveryCycleId: deliveryCycle.id,
        },
      });

      await tx.deliveryCycle.update({
        where: { id: deliveryCycle.id },
        data: { deliveredCount: { increment: 1 } },
      });

      await tx.match.update({
        where: { id: matchId },
        data: { status: "INTRO_SENT" },
      });

      return intro;
    });

    // Generate Intro Pack document
    const brandName = match.demandBrief.createdByOrg.name;
    const { title: packTitle, markdown } = generateIntroPack(
      match,
      match.demandBrief,
      match.inventory,
      brandName
    );

    await db.document.create({
      data: {
        title: packTitle,
        content: markdown,
        fileType: "intro_pack",
        relatedType: "Introduction",
        relatedId: introduction.id,
      },
    });

    // Generate intro email
    const { subject: emailSubject, body: emailBody } = generateIntroEmail(
      match,
      match.demandBrief,
      match.inventory,
      brandName,
      introduction.id
    );

    const updatedIntro = await db.introduction.update({
      where: { id: introduction.id },
      data: {
        introEmailSubject: emailSubject,
        introEmailBody: emailBody,
      },
    });

    // Fetch updated cycle to return current counts
    const updatedCycle = await db.deliveryCycle.findUnique({
      where: { id: deliveryCycle.id },
    });

    return NextResponse.json(
      {
        ...updatedIntro,
        deliveryCycle: updatedCycle
          ? {
              deliveredCount: updatedCycle.deliveredCount,
              introQuota: updatedCycle.introQuota,
            }
          : null,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
