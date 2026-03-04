import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrgScoped } from "@/lib/auth";

export async function GET() {
  try {
    const { org } = await getOrgScoped();
    const briefs = await db.demandBrief.findMany({
      where: { createdByOrgId: org.id },
      include: { _count: { select: { matches: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(briefs);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { org, user } = await getOrgScoped();
    const body = await req.json();

    const brief = await db.demandBrief.create({
      data: {
        title: body.title,
        goals: body.goals,
        audienceTags: body.audienceTags ?? [],
        geography: body.geography,
        budgetMin: body.budgetMin ? parseInt(body.budgetMin) : null,
        budgetMax: body.budgetMax ? parseInt(body.budgetMax) : null,
        categoryConstraints: body.categoryConstraints ?? [],
        activationRequirements: body.activationRequirements,
        timelineStart: body.timelineStart ? new Date(body.timelineStart) : null,
        timelineEnd: body.timelineEnd ? new Date(body.timelineEnd) : null,
        createdByOrgId: org.id,
        createdByUserId: user.id,
      },
    });
    return NextResponse.json(brief, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
