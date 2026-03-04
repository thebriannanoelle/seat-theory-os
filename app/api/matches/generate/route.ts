import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { generateMatches } from "@/lib/match-engine";

export async function POST(req: NextRequest) {
  try {
    await requireRole(["OWNER", "OPERATOR"]);
    const body = await req.json();
    const { demandBriefId } = body;

    if (!demandBriefId) {
      return NextResponse.json(
        { error: "demandBriefId is required" },
        { status: 400 }
      );
    }

    const brief = await db.demandBrief.findUnique({
      where: { id: demandBriefId },
    });
    if (!brief) {
      return NextResponse.json(
        { error: "DemandBrief not found" },
        { status: 404 }
      );
    }

    const inventories = await db.inventory.findMany();
    const matchResults = generateMatches(brief, inventories);

    const created = [];
    for (const result of matchResults) {
      // Skip if match already exists
      const existing = await db.match.findFirst({
        where: {
          demandBriefId,
          inventoryId: result.inventoryId,
        },
      });
      if (existing) continue;

      const match = await db.match.create({
        data: {
          demandBriefId,
          inventoryId: result.inventoryId,
          matchScore: result.matchScore,
          reasonCodes: result.reasonCodes,
          status: "DRAFT",
          visibility: "INTERNAL",
        },
      });
      created.push(match);
    }

    return NextResponse.json({
      generated: created.length,
      matches: created,
    });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}
