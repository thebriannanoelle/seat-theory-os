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

    const inventoryMap = new Map(inventories.map((inv) => [inv.id, inv]));

    const created = [];
    const existing_matches = [];

    for (const result of matchResults) {
      const existing = await db.match.findFirst({
        where: {
          demandBriefId,
          inventoryId: result.inventoryId,
        },
      });

      const inventory = inventoryMap.get(result.inventoryId);

      if (existing) {
        existing_matches.push({
          matchId: existing.id,
          inventoryId: result.inventoryId,
          propertyName: inventory?.propertyName ?? "Unknown",
          matchScore: existing.matchScore,
          reasonCodes: existing.reasonCodes,
          assetsAvailable: inventory?.assetsAvailable ?? [],
          dealSizeMin: inventory?.dealSizeMin ?? null,
          dealSizeMax: inventory?.dealSizeMax ?? null,
          status: existing.status,
          alreadyExists: true,
        });
        continue;
      }

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

      created.push({
        matchId: match.id,
        inventoryId: result.inventoryId,
        propertyName: inventory?.propertyName ?? "Unknown",
        matchScore: result.matchScore,
        reasonCodes: result.reasonCodes,
        assetsAvailable: inventory?.assetsAvailable ?? [],
        dealSizeMin: inventory?.dealSizeMin ?? null,
        dealSizeMax: inventory?.dealSizeMax ?? null,
        status: match.status,
        alreadyExists: false,
      });
    }

    const allResults = [...created, ...existing_matches].sort(
      (a, b) => b.matchScore - a.matchScore
    );

    return NextResponse.json({
      generated: created.length,
      total: allResults.length,
      results: allResults,
    });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}
