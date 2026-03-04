import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrgScoped } from "@/lib/auth";

export async function GET() {
  try {
    const { org } = await getOrgScoped();
    const opportunities = await db.opportunity.findMany({
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
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(opportunities);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await getOrgScoped();
    const body = await req.json();

    const opportunity = await db.opportunity.create({
      data: {
        matchId: body.matchId,
        stage: body.stage ?? "QUALIFICATION",
        estimatedValue: body.estimatedValue
          ? parseInt(body.estimatedValue)
          : null,
        probability: body.probability ? parseInt(body.probability) : 0,
        closeDate: body.closeDate ? new Date(body.closeDate) : null,
        notes: body.notes,
      },
    });
    return NextResponse.json(opportunity, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
