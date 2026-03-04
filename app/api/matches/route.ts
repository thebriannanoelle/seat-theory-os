import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrgScoped } from "@/lib/auth";

export async function GET() {
  try {
    const { org } = await getOrgScoped();
    const matches = await db.match.findMany({
      where: {
        OR: [
          { demandBrief: { createdByOrgId: org.id } },
          { inventory: { ownerOrgId: org.id } },
          { sharedOrgId: org.id },
        ],
      },
      include: {
        demandBrief: { select: { title: true } },
        inventory: { select: { propertyName: true } },
        _count: { select: { introductions: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(matches);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await getOrgScoped();
    const body = await req.json();

    const match = await db.match.create({
      data: {
        demandBriefId: body.demandBriefId,
        inventoryId: body.inventoryId,
        matchScore: body.matchScore ?? 0,
        reasonCodes: body.reasonCodes ?? [],
        status: body.status ?? "DRAFT",
        visibility: body.visibility ?? "INTERNAL",
        sharedOrgId: body.sharedOrgId,
      },
    });
    return NextResponse.json(match, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
